require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcrypt');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret-before-deploying';
const CLIENT_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

const dbDir = path.join(__dirname, 'data');
fs.mkdirSync(dbDir, { recursive: true });

const configuredDbPath = process.env.SQLITE_PATH;
const dbPath = configuredDbPath
  ? path.resolve(__dirname, configuredDbPath)
  : path.join(dbDir, 'teamhub.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    ownerId INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    UNIQUE(projectId, userId),
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'TODO',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    dueDate TEXT,
    projectId INTEGER NOT NULL,
    assigneeId INTEGER,
    completionNote TEXT,
    completedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigneeId) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'comment',
    createdAt TEXT NOT NULL,
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const ROLES = new Set(['ADMIN', 'MEMBER']);
const STATUSES = new Set(['TODO', 'IN_PROGRESS', 'DONE']);
const PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);

app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json({ limit: '1mb' }));

function now() {
  return new Date().toISOString();
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function requireText(value, field, max = 120) {
  const text = trimString(value);
  if (!text) fail(`${field} is required`);
  if (text.length > max) fail(`${field} must be ${max} characters or fewer`);
  return text;
}

function optionalText(value, max = 1000) {
  const text = trimString(value);
  if (!text) return null;
  if (text.length > max) fail(`Description must be ${max} characters or fewer`);
  return text;
}

function parseId(value, field = 'Id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) fail(`${field} must be valid`);
  return id;
}

function parseOptionalId(value, field) {
  if (value === undefined || value === null || value === '') return null;
  return parseId(value, field);
}

function parseIdArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(Boolean).map((id) => parseId(id, 'Member id')))];
}

function normalizeRole(role) {
  const value = String(role || 'MEMBER').toUpperCase();
  if (!ROLES.has(value)) fail('Role must be ADMIN or MEMBER');
  return value;
}

function normalizeStatus(status, fallback = 'TODO') {
  const value = String(status || fallback).toUpperCase();
  if (!STATUSES.has(value)) fail('Status must be TODO, IN_PROGRESS, or DONE');
  return value;
}

function normalizePriority(priority, fallback = 'MEDIUM') {
  const value = String(priority || fallback).toUpperCase();
  if (!PRIORITIES.has(value)) fail('Priority must be LOW, MEDIUM, or HIGH');
  return value;
}

function parseDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail('Due date must be valid');
  return date.toISOString();
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return sendError(res, 401, 'Authentication required');

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return sendError(res, 401, 'Session expired or invalid');
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') return sendError(res, 403, 'Admin access required');
  return next();
}

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getProject(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function getTask(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function ensureUsersExist(userIds) {
  if (!userIds.length) return;
  const placeholders = userIds.map(() => '?').join(',');
  const count = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE id IN (${placeholders})`).get(...userIds).count;
  if (count !== userIds.length) fail('One or more selected team members do not exist');
}

function addProjectMember(projectId, userId) {
  if (!userId) return;
  db.prepare(`
    INSERT OR IGNORE INTO project_members (projectId, userId, createdAt)
    VALUES (?, ?, ?)
  `).run(projectId, userId, now());
}

function canSeeProject(user, projectId) {
  if (user.role === 'ADMIN') return Boolean(getProject(projectId));
  const row = db.prepare(`
    SELECT p.id
    FROM projects p
    WHERE p.id = ?
      AND (
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.projectId = p.id AND pm.userId = ?)
        OR EXISTS (SELECT 1 FROM tasks t WHERE t.projectId = p.id AND t.assigneeId = ?)
      )
  `).get(projectId, user.id, user.id);
  return Boolean(row);
}

function assertProjectVisible(user, projectId) {
  if (!canSeeProject(user, projectId)) fail('Project not found or unavailable for this role', 404);
}

function getProjectMembers(projectId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.createdAt
    FROM project_members pm
    JOIN users u ON u.id = pm.userId
    WHERE pm.projectId = ?
    ORDER BY u.role, u.name
  `).all(projectId).map(publicUser);
}

function serializeProject(row) {
  const owner = getUser(row.ownerId);
  const members = getProjectMembers(row.id);
  const taskCount = db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE projectId = ?').get(row.id).count;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner: publicUser(owner),
    members,
    taskCount,
    memberCount: members.length,
  };
}

function listProjects(user) {
  const sql = user.role === 'ADMIN'
    ? 'SELECT * FROM projects ORDER BY updatedAt DESC'
    : `
      SELECT DISTINCT p.*
      FROM projects p
      LEFT JOIN project_members pm ON pm.projectId = p.id
      LEFT JOIN tasks t ON t.projectId = p.id
      WHERE pm.userId = ? OR t.assigneeId = ?
      ORDER BY p.updatedAt DESC
    `;
  const rows = user.role === 'ADMIN'
    ? db.prepare(sql).all()
    : db.prepare(sql).all(user.id, user.id);
  return rows.map(serializeProject);
}

function getTaskComments(taskId) {
  return db.prepare(`
    SELECT tc.*, u.name AS userName, u.email AS userEmail, u.role AS userRole
    FROM task_comments tc
    JOIN users u ON u.id = tc.userId
    WHERE tc.taskId = ?
    ORDER BY tc.createdAt DESC
  `).all(taskId).map((row) => ({
    id: row.id,
    taskId: row.taskId,
    content: row.content,
    type: row.type,
    createdAt: row.createdAt,
    user: { id: row.userId, name: row.userName, email: row.userEmail, role: row.userRole },
  }));
}

function serializeTask(row) {
  if (!row) return null;
  const comments = getTaskComments(row.id);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    projectId: row.projectId,
    assigneeId: row.assigneeId,
    completionNote: row.completionNote,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comments,
    commentCount: comments.length,
    project: row.projectName ? { id: row.projectId, name: row.projectName } : null,
    assignee: row.assigneeName ? {
      id: row.assigneeId,
      name: row.assigneeName,
      email: row.assigneeEmail,
      role: row.assigneeRole,
    } : null,
  };
}

function listTasks(user) {
  const base = `
    SELECT
      t.*,
      p.name AS projectName,
      u.name AS assigneeName,
      u.email AS assigneeEmail,
      u.role AS assigneeRole
    FROM tasks t
    JOIN projects p ON p.id = t.projectId
    LEFT JOIN users u ON u.id = t.assigneeId
  `;
  const suffix = ' ORDER BY t.status, t.dueDate, t.updatedAt DESC';
  const sql = user.role === 'ADMIN'
    ? base + suffix
    : base + `
      WHERE t.assigneeId = ?
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.projectId = t.projectId AND pm.userId = ?)
    ` + suffix;
  const rows = user.role === 'ADMIN'
    ? db.prepare(sql).all()
    : db.prepare(sql).all(user.id, user.id);
  return rows.map(serializeTask);
}

function listUsers() {
  return db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.createdAt,
      (SELECT COUNT(*) FROM tasks t WHERE t.assigneeId = u.id) AS assignedTaskCount,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.userId = u.id) AS projectCount
    FROM users u
    ORDER BY u.role, u.name
  `).all();
}

function isOverdue(task) {
  return task.status !== 'DONE' && task.dueDate && new Date(task.dueDate) < new Date();
}

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({ ok: true, service: 'team-hub-api', database: 'sqlite' });
});

app.post('/api/v1/auth/signup', asyncRoute(async (req, res) => {
  const name = requireText(req.body.name, 'Name', 80);
  const email = requireText(req.body.email, 'Email', 160).toLowerCase();
  const password = String(req.body.password || '');
  const role = normalizeRole(req.body.role);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, 'Email must be valid');
  if (password.length < 6) return sendError(res, 400, 'Password must be at least 6 characters');

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return sendError(res, 409, 'Email already exists');
  }

  const timestamp = now();
  const hashedPassword = await bcrypt.hash(password, 12);
  const result = db.prepare(`
    INSERT INTO users (email, password, name, role, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, hashedPassword, name, role, timestamp, timestamp);

  const user = publicUser(getUser(Number(result.lastInsertRowid)));
  res.status(201).json({ token: createToken(user), user });
}));

app.post('/api/v1/auth/login', asyncRoute(async (req, res) => {
  const email = requireText(req.body.email, 'Email', 160).toLowerCase();
  const password = String(req.body.password || '');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!row || !(await bcrypt.compare(password, row.password))) {
    return sendError(res, 401, 'Invalid credentials');
  }

  const user = publicUser(row);
  res.json({ token: createToken(user), user });
}));

app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const user = publicUser(getUser(req.user.id));
  if (!user) return sendError(res, 404, 'User not found');
  return res.json({ user });
});

app.get('/api/v1/users', authenticate, requireAdmin, (req, res) => {
  res.json(listUsers());
});

app.patch('/api/v1/users/:id/role', authenticate, requireAdmin, (req, res) => {
  const id = parseId(req.params.id, 'User id');
  const role = normalizeRole(req.body.role);
  if (!getUser(id)) return sendError(res, 404, 'User not found');

  if (role === 'MEMBER') {
    const otherAdmins = db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = ? AND id != ?').get('ADMIN', id).count;
    if (otherAdmins === 0) return sendError(res, 400, 'At least one admin is required');
  }

  db.prepare('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?').run(role, now(), id);
  res.json(publicUser(getUser(id)));
});

app.get('/api/v1/projects', authenticate, (req, res) => {
  res.json(listProjects(req.user));
});

app.post('/api/v1/projects', authenticate, requireAdmin, (req, res) => {
  const name = requireText(req.body.name, 'Project name', 120);
  const description = optionalText(req.body.description);
  const memberIds = [...new Set([req.user.id, ...parseIdArray(req.body.memberIds)])];
  ensureUsersExist(memberIds);

  const timestamp = now();
  db.exec('BEGIN');
  try {
    const result = db.prepare(`
      INSERT INTO projects (name, description, ownerId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description, req.user.id, timestamp, timestamp);
    const projectId = Number(result.lastInsertRowid);
    memberIds.forEach((userId) => addProjectMember(projectId, userId));
    db.exec('COMMIT');
    res.status(201).json(serializeProject(getProject(projectId)));
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});

app.get('/api/v1/projects/:id', authenticate, (req, res) => {
  const id = parseId(req.params.id, 'Project id');
  assertProjectVisible(req.user, id);
  const project = serializeProject(getProject(id));
  project.tasks = listTasks(req.user).filter((task) => task.projectId === id);
  res.json(project);
});

app.put('/api/v1/projects/:id', authenticate, requireAdmin, (req, res) => {
  const id = parseId(req.params.id, 'Project id');
  const project = getProject(id);
  if (!project) return sendError(res, 404, 'Project not found');

  const name = req.body.name === undefined ? project.name : requireText(req.body.name, 'Project name', 120);
  const description = req.body.description === undefined ? project.description : optionalText(req.body.description);
  const hasMembers = Array.isArray(req.body.memberIds);
  const memberIds = hasMembers ? [...new Set([project.ownerId, req.user.id, ...parseIdArray(req.body.memberIds)])] : [];
  if (hasMembers) ensureUsersExist(memberIds);

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE projects SET name = ?, description = ?, updatedAt = ? WHERE id = ?')
      .run(name, description, now(), id);
    if (hasMembers) {
      db.prepare('DELETE FROM project_members WHERE projectId = ?').run(id);
      memberIds.forEach((userId) => addProjectMember(id, userId));
    }
    db.exec('COMMIT');
    res.json(serializeProject(getProject(id)));
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});

app.delete('/api/v1/projects/:id', authenticate, requireAdmin, (req, res) => {
  const id = parseId(req.params.id, 'Project id');
  if (!getProject(id)) return sendError(res, 404, 'Project not found');
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/v1/tasks', authenticate, (req, res) => {
  res.json(listTasks(req.user));
});

app.post('/api/v1/tasks', authenticate, (req, res) => {
  const title = requireText(req.body.title, 'Task title', 160);
  const description = optionalText(req.body.description);
  const projectId = parseId(req.body.projectId, 'Project id');
  const status = normalizeStatus(req.body.status);
  const priority = normalizePriority(req.body.priority);
  const dueDate = parseDate(req.body.dueDate);
  assertProjectVisible(req.user, projectId);

  let assigneeId = parseOptionalId(req.body.assigneeId, 'Assignee id');
  if (req.user.role !== 'ADMIN') assigneeId = req.user.id;
  if (assigneeId && !getUser(assigneeId)) return sendError(res, 400, 'Assignee does not exist');

  const timestamp = now();
  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, dueDate, projectId, assigneeId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, status, priority, dueDate, projectId, assigneeId, timestamp, timestamp);

  if (assigneeId) addProjectMember(projectId, assigneeId);
  res.status(201).json(listTasks(req.user).find((task) => task.id === Number(result.lastInsertRowid)));
});

app.put('/api/v1/tasks/:id', authenticate, requireAdmin, (req, res) => {
  const id = parseId(req.params.id, 'Task id');
  const task = getTask(id);
  if (!task) return sendError(res, 404, 'Task not found');

  const nextProjectId = req.body.projectId === undefined ? task.projectId : parseId(req.body.projectId, 'Project id');
  if (!getProject(nextProjectId)) return sendError(res, 400, 'Project does not exist');

  const assigneeId = req.body.assigneeId === undefined ? task.assigneeId : parseOptionalId(req.body.assigneeId, 'Assignee id');
  if (assigneeId && !getUser(assigneeId)) return sendError(res, 400, 'Assignee does not exist');

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, priority = ?, dueDate = ?, projectId = ?, assigneeId = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    req.body.title === undefined ? task.title : requireText(req.body.title, 'Task title', 160),
    req.body.description === undefined ? task.description : optionalText(req.body.description),
    req.body.status === undefined ? task.status : normalizeStatus(req.body.status),
    req.body.priority === undefined ? task.priority : normalizePriority(req.body.priority),
    req.body.dueDate === undefined ? task.dueDate : parseDate(req.body.dueDate),
    nextProjectId,
    assigneeId,
    now(),
    id
  );

  if (assigneeId) addProjectMember(nextProjectId, assigneeId);
  res.json(listTasks(req.user).find((item) => item.id === id));
});

app.patch('/api/v1/tasks/:id/status', authenticate, (req, res) => {
  const id = parseId(req.params.id, 'Task id');
  const status = normalizeStatus(req.body.status);
  const task = getTask(id);
  if (!task) return sendError(res, 404, 'Task not found');
  if (req.user.role !== 'ADMIN' && task.assigneeId !== req.user.id) {
    return sendError(res, 403, 'Members can only update tasks assigned to them');
  }

  const completionNote = status === 'DONE' ? optionalText(req.body.completionNote, 2000) : task.completionNote;
  const completedAt = status === 'DONE' ? (task.completedAt || now()) : null;
  const timestamp = now();

  db.prepare('UPDATE tasks SET status = ?, completionNote = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
    .run(status, completionNote, completedAt, timestamp, id);

  // Auto-add a completion comment if provided
  if (status === 'DONE' && completionNote) {
    db.prepare(`
      INSERT INTO task_comments (taskId, userId, content, type, createdAt)
      VALUES (?, ?, ?, 'completion', ?)
    `).run(id, req.user.id, completionNote, timestamp);
  }

  // Add status change system comment
  const fromLabel = task.status.replace('_', ' ').toLowerCase();
  const toLabel = status.replace('_', ' ').toLowerCase();
  db.prepare(`
    INSERT INTO task_comments (taskId, userId, content, type, createdAt)
    VALUES (?, ?, ?, 'status_change', ?)
  `).run(id, req.user.id, `Changed status from ${fromLabel} to ${toLabel}`, timestamp);

  res.json(listTasks(req.user).find((item) => item.id === id));
});

// Task comments endpoints
app.get('/api/v1/tasks/:id/comments', authenticate, (req, res) => {
  const id = parseId(req.params.id, 'Task id');
  const task = getTask(id);
  if (!task) return sendError(res, 404, 'Task not found');
  res.json(getTaskComments(id));
});

app.post('/api/v1/tasks/:id/comments', authenticate, (req, res) => {
  const id = parseId(req.params.id, 'Task id');
  const task = getTask(id);
  if (!task) return sendError(res, 404, 'Task not found');
  if (req.user.role !== 'ADMIN' && task.assigneeId !== req.user.id) {
    return sendError(res, 403, 'Members can only comment on tasks assigned to them');
  }

  const content = requireText(req.body.content, 'Comment', 2000);
  const type = req.body.type === 'proof' ? 'proof' : 'comment';
  const timestamp = now();

  const result = db.prepare(`
    INSERT INTO task_comments (taskId, userId, content, type, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, content, type, timestamp);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    taskId: id,
    content,
    type,
    createdAt: timestamp,
    user: publicUser(getUser(req.user.id)),
  });
});

app.delete('/api/v1/tasks/:id', authenticate, requireAdmin, (req, res) => {
  const id = parseId(req.params.id, 'Task id');
  if (!getTask(id)) return sendError(res, 404, 'Task not found');
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/v1/dashboard', authenticate, (req, res) => {
  const projects = listProjects(req.user);
  const tasks = listTasks(req.user);
  const users = req.user.role === 'ADMIN' ? listUsers() : [];
  const overdue = tasks.filter(isOverdue);
  const completed = tasks.filter((task) => task.status === 'DONE');
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS');
  const todo = tasks.filter((task) => task.status === 'TODO');
  const myTasks = tasks.filter((task) => task.assigneeId === req.user.id);
  const projectMemberIds = new Set();

  projects.forEach((project) => project.members.forEach((member) => projectMemberIds.add(member.id)));

  const projectProgress = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const done = projectTasks.filter((task) => task.status === 'DONE').length;
    return {
      id: project.id,
      name: project.name,
      totalTasks: projectTasks.length,
      completedTasks: done,
      progress: projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0,
      memberCount: project.members.length,
    };
  });

  const teamLoad = users.map((user) => {
    const assigned = tasks.filter((task) => task.assigneeId === user.id);
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      assignedTasks: assigned.length,
      completedTasks: assigned.filter((task) => task.status === 'DONE').length,
      overdueTasks: assigned.filter(isOverdue).length,
    };
  });

  res.json({
    stats: {
      projects: projects.length,
      totalTasks: tasks.length,
      myTasks: myTasks.length,
      completedTasks: completed.length,
      inProgressTasks: inProgress.length,
      todoTasks: todo.length,
      overdueTasks: overdue.length,
      teamMembers: req.user.role === 'ADMIN' ? users.length : projectMemberIds.size,
    },
    statusBreakdown: {
      TODO: todo.length,
      IN_PROGRESS: inProgress.length,
      DONE: completed.length,
      OVERDUE: overdue.length,
    },
    overdueTasks: overdue.slice(0, 8),
    upcomingTasks: tasks.filter((task) => task.status !== 'DONE' && task.dueDate).slice(0, 8),
    projectProgress,
    teamLoad,
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return sendError(res, status, status === 500 ? 'Unexpected server error' : err.message);
});

// Serve frontend
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('TeamHub API is running. Frontend build not found.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TeamHub API running on port ${PORT}`);
});
