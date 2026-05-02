# TeamHub

A full-stack project and task management app with JWT authentication, Google OAuth, role-based access (Admin/Member), Kanban boards, global search, and comprehensive team/project tracking.

## Tech Stack

- **Frontend**: React 19, Vite 8, Axios, lucide-react, CSS (port 5000)
- **Backend**: Node.js 22+, Express 5, JWT (jsonwebtoken), bcrypt (port 3000)
- **Database**: SQLite via Node's built-in `node:sqlite` (Node.js >= 22.5.0 required)
- **Auth**: Google Identity Services (GIS) + email/password JWT

## Project Structure

```
/
├── backend/
│   ├── index.js          # Express server, all API routes, SQLite schema
│   ├── package.json
│   └── data/             # SQLite DB file (auto-created on first run)
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # All React components (~2000 lines, single-file)
│   │   ├── App.css       # Styles (~2400 lines)
│   │   └── main.jsx      # Entry point
│   ├── index.html        # Loads Google GIS script
│   ├── vite.config.js    # Dev server: port 5000, proxy /api → localhost:3000
│   └── package.json
└── replit.md
```

## Architecture

- Frontend dev server runs on port 5000 (Vite), proxies `/api/*` to backend at port 3000
- Frontend API URL auto-detects: uses `/api/v1` (proxied) when not on localhost
- Backend creates SQLite tables automatically on startup (no migrations needed)
- JWT tokens expire in 7 days; stored in localStorage
- Production: `PORT=5000 node backend/index.js` (backend serves built frontend statically)

## Key Features

- **Authentication**: Google OAuth (GIS button) + email/password signup/login
- **Role-based access**: Admin (full control) and Member (assigned work only)
- **Dashboard**: Stats cards, overdue tasks, project progress, team workload
- **Projects**: Create, edit, delete, member assignment, per-project progress
- **Tasks**: Create, assign, set priority/due date, filter, search
- **Kanban Board**: Drag-and-drop Kanban view on Tasks and Project Detail pages (toggle between list/kanban)
- **Global Search**: ⌘K / Ctrl+K overlay — searches tasks and projects in real time
- **Toast Notifications**: Bottom-right auto-dismiss toasts replacing old banner
- **Profile Settings**: Click sidebar avatar to update name / change password
- **Mobile Sidebar**: Hamburger menu with slide-in drawer and backdrop overlay
- **Sidebar Badges**: Overdue task count shown inline on nav items
- **Comments & Proof-of-Work**: Per-task activity feed with typed comments
- **Task Completion Flow**: Mark done with completion note + proof link

## Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/signup` | Register |
| POST | `/api/v1/auth/login` | Login (email/password) |
| POST | `/api/v1/auth/google` | Login / register via Google |
| GET  | `/api/v1/auth/me` | Current user info |
| PATCH | `/api/v1/auth/profile` | Update name / change password |
| GET  | `/api/v1/dashboard` | Stats, overdue tasks, team load |
| GET/POST | `/api/v1/projects` | List / create projects |
| GET/PUT/DELETE | `/api/v1/projects/:id` | Project CRUD |
| GET/POST | `/api/v1/tasks` | List / create tasks |
| PUT/DELETE | `/api/v1/tasks/:id` | Task CRUD |
| PATCH | `/api/v1/tasks/:id/status` | Update task status |
| GET/POST | `/api/v1/tasks/:id/comments` | Task comments |
| GET | `/api/v1/users` | List users (admin only) |
| PATCH | `/api/v1/users/:id/role` | Change role (admin only) |
| DELETE | `/api/v1/users/:id` | Remove user (admin only) |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend server port |
| `JWT_SECRET` | dev default | JWT signing secret (change in production!) |
| `SQLITE_PATH` | `./data/teamhub.db` | Path to SQLite database file |
| `CORS_ORIGIN` | `true` (all) | Comma-separated allowed frontend origins |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID (shared env var) |

## Google OAuth Setup

- Client ID: `404424116320-...` set as shared env var `VITE_GOOGLE_CLIENT_ID`
- Authorized JavaScript Origins must include both dev URL and production URL
- Dev URL: `https://46178a66-dc98-448e-a4db-ccae6b0dda4b-00-1w8rkud6t8848.sisko.replit.dev`
- Production URL: `https://team-hub--kellagayatri944.replit.app`

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
- The `docker-compose.yml` and Prisma schema are legacy artifacts from an earlier design
- VITE_* env vars are baked in at build time — shared env var ensures they appear in prod builds
