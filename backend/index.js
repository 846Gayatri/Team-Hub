require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Verify Node.js version supports node:sqlite
const [major] = process.versions.node.split('.').map(Number);
if (major < 22) {
  console.error(`FATAL: Node.js ${process.versions.node} detected. node:sqlite requires Node.js >= 22.5.0`);
  process.exit(1);
}

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

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const ROLES = new Set(['ADMIN', 'MEMBER']);
const ADMIN_EMAIL = 'kellagaytri9444@gmail.com';
const ADMIN_PASSWORD = 'Gayathri_06';
const STATUSES = new Set(['TODO', 'IN_PROGRESS', 'DONE']);
const PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);

app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json({ limit: '1mb' }));

// Seed the hardcoded admin account on startup
(async () => {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!existing) {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const ts = new Date().toISOString();
    db.prepare('INSERT INTO users (email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ADMIN_EMAIL, hashed, 'Gayathri', 'ADMIN', ts, ts);
    console.log('[seed] Admin account created');
  } else {
    // Always ensure the existing account has ADMIN role and correct password
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    db.prepare('UPDATE users SET role = ?, password = ?, updatedAt = ? WHERE email = ?')
      .run('ADMIN', hashed, new Date().toISOString(), ADMIN_EMAIL);
  }
})();

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
    hasPassword: Boolean(row.password),
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
  const role = email === ADMIN_EMAIL ? 'ADMIN' : 'MEMBER';

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

  if (!row) return sendError(res, 401, 'Invalid credentials');

  // Google-only accounts have no password hash — direct them to Google Sign-In
  if (!row.password) {
    return sendError(res, 401, 'This account was created with Google. Please use "Continue with Google" to sign in.');
  }

  const match = await bcrypt.compare(password, row.password).catch(() => false);
  if (!match) return sendError(res, 401, 'Invalid credentials');

  const user = publicUser(row);
  res.json({ token: createToken(user), user });
}));

app.post('/api/v1/auth/google', asyncRoute(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return sendError(res, 400, 'Google credential required');

  const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return sendError(res, 401, 'Invalid Google credential');
  }

  const email = (tokenData.email || '').toLowerCase();
  if (!email || !tokenData.email_verified) {
    return sendError(res, 400, 'Google account email not verified');
  }

  const name = tokenData.name || email.split('@')[0];
  const timestamp = now();

  const googleRole = email === ADMIN_EMAIL ? 'ADMIN' : 'MEMBER';
  let row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row) {
    const result = db.prepare(`
      INSERT INTO users (email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, '', name, googleRole, timestamp, timestamp);
    row = getUser(Number(result.lastInsertRowid));
  } else if (row.role !== googleRole) {
    db.prepare('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?').run(googleRole, timestamp, row.id);
    row = getUser(row.id);
  }

  const user = publicUser(row);
  res.json({ token: createToken(user), user });
}));

app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const user = publicUser(getUser(req.user.id));
  if (!user) return sendError(res, 404, 'User not found');
  return res.json({ user });
});

app.patch('/api/v1/auth/profile', authenticate, asyncRoute(async (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return sendError(res, 404, 'User not found');

  const name = requireText(req.body.name || row.name, 'Name', 80);
  const { currentPassword, newPassword } = req.body;
  const timestamp = now();

  let passwordHash = row.password;
  if (newPassword) {
    if (!currentPassword) return sendError(res, 400, 'Current password is required to set a new one');
    if (!row.password) return sendError(res, 400, 'Google accounts cannot set a password here');
    const match = await bcrypt.compare(String(currentPassword), row.password).catch(() => false);
    if (!match) return sendError(res, 401, 'Current password is incorrect');
    if (String(newPassword).length < 6) return sendError(res, 400, 'New password must be at least 6 characters');
    passwordHash = await bcrypt.hash(String(newPassword), 12);
  }

  db.prepare('UPDATE users SET name = ?, password = ?, updatedAt = ? WHERE id = ?')
    .run(name, passwordHash, timestamp, req.user.id);

  const user = publicUser(getUser(req.user.id));
  res.json({ user });
}));

async function sendResetEmail(toEmail, toName, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[reset-email] RESEND_API_KEY not set — skipping email send');
    return { skipped: true };
  }
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
      <div style="margin-bottom:24px;">
        <span style="background:#4f46e5;color:#fff;font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">TeamHub</span>
      </div>
      <h2 style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">Hi ${toName}, we received a request to reset your TeamHub password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Reset password</a>
      <p style="color:#64748b;font-size:13px;margin:0;">This link expires in <strong style="color:#94a3b8;">1 hour</strong>. If you didn't request a reset, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0 0;" />
      <p style="color:#475569;font-size:12px;margin:12px 0 0;">TeamHub — Project delivery &amp; team management</p>
    </div>
  `;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TeamHub <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Reset your TeamHub password',
      html,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Email send failed');
  return json;
}

app.post('/api/v1/auth/forgot-password', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!email) return sendError(res, 400, 'Email is required');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.password) {
    return res.json({ ok: true });
  }

  db.prepare('DELETE FROM password_reset_tokens WHERE userId = ? AND usedAt IS NULL').run(user.id);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_reset_tokens (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)')
    .run(user.id, token, expiresAt, now());

  const appUrl = process.env.APP_URL || `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.app`;
  const resetUrl = `${appUrl}/?reset_token=${token}`;

  try {
    const result = await sendResetEmail(user.email, user.name, resetUrl);
    if (result.skipped) {
      return res.json({ ok: true, devResetUrl: resetUrl });
    }
  } catch (err) {
    console.error('[reset-email] send error:', err.message);
    return sendError(res, 500, 'Could not send reset email. Please try again later.');
  }

  res.json({ ok: true });
}));

app.post('/api/v1/auth/reset-password', asyncRoute(async (req, res) => {
  const token = String(req.body.token || '').trim();
  const newPassword = String(req.body.password || '');

  if (!token) return sendError(res, 400, 'Reset token is required');
  if (newPassword.length < 6) return sendError(res, 400, 'Password must be at least 6 characters');

  const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND usedAt IS NULL').get(token);
  if (!row) return sendError(res, 400, 'Invalid or expired reset link');
  if (new Date(row.expiresAt) < new Date()) {
    db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').run(row.id);
    return sendError(res, 400, 'This reset link has expired. Please request a new one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const timestamp = now();
  db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?').run(passwordHash, timestamp, row.userId);
  db.prepare('UPDATE password_reset_tokens SET usedAt = ? WHERE id = ?').run(timestamp, row.id);

  res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
}));

app.get('/api/v1/users', authenticate, requireAdmin, (req, res) => {
  res.json(listUsers());
});

app.delete('/api/v1/users/:id', authenticate, requireAdmin, (req, res) => {
  const id = parseId(req.params.id, 'User id');
  const target = getUser(id);
  if (!target) return sendError(res, 404, 'User not found');

  // Prevent deleting yourself
  if (id === req.user.id) return sendError(res, 400, 'You cannot delete your own account');

  // Prevent deleting the last admin
  if (target.role === 'ADMIN') {
    const otherAdmins = db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = ? AND id != ?').get('ADMIN', id).count;
    if (otherAdmins === 0) return sendError(res, 400, 'Cannot delete the last admin');
  }

  db.exec('BEGIN');
  try {
    // Transfer project ownership to the requesting admin
    db.prepare('UPDATE projects SET ownerId = ?, updatedAt = ? WHERE ownerId = ?').run(req.user.id, now(), id);
    // Unassign tasks from this user
    db.prepare('UPDATE tasks SET assigneeId = NULL, updatedAt = ? WHERE assigneeId = ?').run(now(), id);
    // Remove from project memberships
    db.prepare('DELETE FROM project_members WHERE userId = ?').run(id);
    // Delete comments by this user
    db.prepare('DELETE FROM task_comments WHERE userId = ?').run(id);
    // Delete the user
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.exec('COMMIT');
    res.json({ success: true });
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
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

app.patch('/api/v1/tasks/:id/status', authenticate, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id, 'Task id');
  const status = normalizeStatus(req.body.status);
  const task = getTask(id);
  if (!task) return sendError(res, 404, 'Task not found');
  if (req.user.role !== 'ADMIN' && task.assigneeId !== req.user.id) {
    return sendError(res, 403, 'Members can only update tasks assigned to them');
  }

  const completionNote = status === 'DONE' ? (optionalText(req.body.completionNote, 2000) || null) : task.completionNote;
  const completedAt = status === 'DONE' ? (task.completedAt || now()) : null;
  const timestamp = now();

  db.exec('BEGIN');
  try {
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

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  res.json(listTasks(req.user).find((item) => item.id === id));
}));

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

// Serve frontend — MUST come before error handler
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('TeamHub API is running. Frontend build not found. Run: npm run build');
  });
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return sendError(res, status, status === 500 ? 'Unexpected server error' : err.message);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TeamHub API running on port ${PORT}`);
  console.log(`Node.js ${process.versions.node} | Frontend: ${fs.existsSync(frontendDist) ? 'OK' : 'NOT FOUND'}`);
});
