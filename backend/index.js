require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- AUTH ROUTES ---

app.post('/api/v1/auth/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'MEMBER' }
    });
    
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- USER & TEAM ROUTES ---

app.get('/api/v1/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PROJECT ROUTES ---

app.get('/api/v1/projects', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({ include: { user: { select: { name: true } } } });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/projects', authenticate, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    const project = await prisma.project.create({
      data: { name, description, userId: req.user.id }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: { tasks: { include: { assignee: { select: { name: true } } } } }
    });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TASK ROUTES ---

app.get('/api/v1/tasks', authenticate, async (req, res) => {
  try {
    // Member sees their tasks or all tasks depending on requirements. Let's return all tasks.
    const tasks = await prisma.task.findMany({
      include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/tasks', authenticate, async (req, res) => {
  const { title, description, dueDate, projectId, assigneeId } = req.body;
  try {
    const task = await prisma.task.create({
      data: { 
        title, 
        description, 
        dueDate: dueDate ? new Date(dueDate) : null, 
        projectId: Number(projectId), 
        assigneeId: assigneeId ? Number(assigneeId) : null 
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/v1/tasks/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  try {
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { status }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/v1/tasks/:id', authenticate, async (req, res) => {
  const { title, description, dueDate, projectId, assigneeId, priority, status } = req.body;
  try {
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { 
        title, description, status, priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId ? Number(projectId) : undefined,
        assigneeId: assigneeId ? Number(assigneeId) : null
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/v1/tasks/:id', authenticate, async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/v1/projects/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: { name, description }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/v1/projects/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Note: This relies on Prisma cascading deletes or manual deletion if not configured
    await prisma.task.deleteMany({ where: { projectId: Number(req.params.id) } });
    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Default Dashboard Stats
app.get('/api/v1/dashboard', authenticate, async (req, res) => {
  try {
    const [totalTasks, myTasks, completedTasks, projects] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { assigneeId: req.user.id } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.project.count()
    ]);
    res.json({ totalTasks, myTasks, completedTasks, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
