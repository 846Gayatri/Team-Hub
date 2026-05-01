# Team Task Manager (Full-Stack)

A full-stack web application for creating projects, assigning tasks, and tracking progress with role-based access.

## Tech Stack
- **Frontend**: React (Vite), React Router, Axios, Vanilla CSS
- **Backend**: Node.js, Express, Prisma ORM, JWT Authentication
- **Database**: PostgreSQL
- **Deployment Ready**: Railway and Docker Compose

## Local Development Setup

### 1. Database Setup
You will need PostgreSQL running. You can use the provided Docker Compose file:
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### URLs
- **Admin/Member Portal**: `http://localhost:5173/auth` (Default Vite URL, check terminal if it differs)
- **API Base URL**: `http://localhost:3000/api/v1`

*Note: The application has a single login portal for both roles. Sign up with the 'Admin' role to access admin features (like creating projects and inviting team members), or sign up as a 'Member' to only see assigned tasks and projects.*

## Railway Deployment
This repository is structured to be deployed easily on Railway.
1. Create a new project on Railway.
2. Add a PostgreSQL database service.
3. Connect your GitHub repository.
4. Railway will detect the `backend` and `frontend` folders. 
   - Deploy `backend` and set the `DATABASE_URL` and `JWT_SECRET` variables.
   - Deploy `frontend` (it uses Vite, set build command to `npm run build` and output dir to `dist`).
