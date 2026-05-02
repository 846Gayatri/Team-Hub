# TeamHub

A full-stack project and task management app with JWT authentication, role-based access (Admin/Member), team assignment, project progress tracking, and overdue work visibility.

## Tech Stack

- **Frontend**: React 19, Vite 8, Axios, lucide-react, CSS (port 5000)
- **Backend**: Node.js 22+, Express 5, JWT (jsonwebtoken), bcrypt (port 3000)
- **Database**: SQLite via Node's built-in `node:sqlite` (Node.js >= 22.5.0 required)

## Project Structure

```
/
├── backend/
│   ├── index.js          # Express server, all API routes, SQLite schema
│   ├── package.json
│   └── data/             # SQLite DB file (auto-created on first run)
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # All React components (single-file app)
│   │   ├── App.css       # Styles
│   │   └── main.jsx      # Entry point
│   ├── vite.config.js    # Dev server: port 5000, proxy /api → localhost:3000
│   └── package.json
└── replit.md
```

## Architecture

- Frontend dev server runs on port 5000 (Vite), proxies `/api/*` to backend at port 3000
- Frontend API URL auto-detects: uses `/api/v1` (proxied) when not on localhost
- Backend creates SQLite tables automatically on startup (no migrations needed)
- JWT tokens expire in 7 days; stored in localStorage

## Key Features

- Signup/login with JWT auth
- Admin role: full project/task/team management
- Member role: view assigned work, update task status, add comments
- Dashboard with project progress, overdue tasks, team workload
- Task completion flow with proof-of-work comments

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend server port |
| `JWT_SECRET` | dev default | JWT signing secret (change in production!) |
| `SQLITE_PATH` | `./data/teamhub.db` | Path to SQLite database file |
| `CORS_ORIGIN` | `true` (all) | Comma-separated allowed frontend origins |

## Running the App

The "Start application" workflow runs both services:
```
node backend/index.js & cd frontend && npm run dev
```

- Frontend: http://localhost:5000
- Backend API: http://localhost:3000/api/v1
- Health check: http://localhost:3000/health

## Important Notes

- **Node.js 22+ required**: The backend uses `node:sqlite` which requires Node.js >= 22.5.0
- SQLite is experimental in Node.js (warnings in logs are expected)
- The `docker-compose.yml` and Prisma schema are legacy artifacts from an earlier design — the app uses `node:sqlite` directly, not PostgreSQL/Prisma
