# TeamHub

TeamHub is a full-stack project and task management app with authentication, role-based access, team assignment, project progress tracking, overdue work visibility, and a polished Admin/Member workspace.

## Features

- Signup and login with JWT authentication
- Admin and Member role-based panels
- Admin project creation, editing, deletion, and team membership management
- Task creation, assignment, priority, due date, status tracking, and deletion
- Members can view accessible projects, create self-assigned tasks, and update their assigned task status
- Dashboard stats for projects, tasks, progress, overdue items, and team workload
- REST API with validation, Prisma relationships, and PostgreSQL database support
- Railway-ready backend and frontend service configs

## Tech Stack

- Frontend: React, Vite, Axios, lucide-react, CSS
- Backend: Node.js, Express, JWT, bcrypt
- Database: SQLite using Node's built-in `node:sqlite`
- Deployment: Railway

## Local Setup

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create backend environment:

```bash
cd backend
copy .env.example .env
```

Run the backend:

```bash
cd backend
npm run dev
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api/v1`
- Health check: `http://localhost:3000/health`

## API Overview

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/dashboard`
- `GET /api/v1/users` Admin only
- `PATCH /api/v1/users/:id/role` Admin only
- `GET /api/v1/projects`
- `POST /api/v1/projects` Admin only
- `GET /api/v1/projects/:id`
- `PUT /api/v1/projects/:id` Admin only
- `DELETE /api/v1/projects/:id` Admin only
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PUT /api/v1/tasks/:id` Admin only
- `PATCH /api/v1/tasks/:id/status`
- `DELETE /api/v1/tasks/:id` Admin only

## Railway Deployment

For the simplest local/demo setup this app uses SQLite, so no external database is required. For Railway, create two services:

1. Backend service from `backend/`
2. Frontend service from `frontend/`

Backend environment variables:

```bash
SQLITE_PATH="./data/teamhub.db"
JWT_SECRET=<long random secret>
CORS_ORIGIN=<your Railway frontend URL>
```

Frontend environment variables:

```bash
VITE_API_URL=<your Railway backend URL>/api/v1
```

Railway commands:

- Backend start command is configured in `backend/railway.json`
- Frontend start command is configured in `frontend/railway.json`
- Backend creates the SQLite tables automatically on startup

## Submission Checklist

- Live URL: add your Railway frontend URL here
- GitHub repo: add your GitHub repository URL here
- Demo video: record a 2-5 minute walkthrough covering signup/login, Admin project/team/task flows, Member task status updates, and dashboards
