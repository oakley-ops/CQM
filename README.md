# CQM Tracking System

A **Card Quality Management (CQM) Tracking System** for smart card manufacturing with ISO compliance tracking.

## Overview

This is a comprehensive quality management application with separate frontend and backend services designed for smart card manufacturing facilities.

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment:**
   - Edit `backend/.env` with your PostgreSQL credentials
   - Default database: `cqm_db`

3. **Set up database:**
   ```bash
   npm run migrate
   ```

4. **Create admin user:**
   ```bash
   npm run create-admin
   ```
   - Username: `admin` (email: `admin@cqm.com`)
   - Password: `cqm123`

5. **Start both servers:**
   ```bash
   npm run dev
   ```

   Or start them separately:
   ```bash
   npm run dev:backend    # Starts backend on port 5000
   npm run dev:frontend   # Starts frontend on port 3000
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## Project Structure

```
CQM/
├── backend/              # Node.js + Express + Sequelize API
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers (NEXUS handlers under controllers/nexus/)
│   ├── models/          # Sequelize models (associations defined in models/index.js)
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware (auth, validation, rate limiting)
│   ├── services/        # Business logic (RAG, autodata pipeline)
│   ├── utils/           # Helpers (logger, email, redis)
│   ├── db/              # Migrations (db/migrations/*.sql)
│   └── .env            # Environment variables
│
├── frontend/            # React + Vite + TypeScript UI
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   ├── store/       # Redux store
│   │   └── types/       # TypeScript types
│   └── vite.config.ts   # Vite configuration
│
├── package.json         # Root package file
└── README.md           # This file
```

## Features

### Core Quality Test Entry
- **Test Sessions** - Create and manage quality test sessions (Draft → Submitted → Approved/Rejected)
- **Test Entries** - Record pass/fail outcomes and numeric measurements with min/max spec validation
- **Test Categories & Definitions** - Organize tests by category (CB, ICM, PL, etc.) with per-test specs and ISO references
- **Jobs** - Group test sessions under an umbrella work record
- **Quality Dashboard & KPIs** - Real-time metrics, rejection breakdown, and SPC charts
- **Excel / PDF Export** - Export sessions and reports

### NEXUS Qualification Hub
- Supplier/product qualification and ISO compliance: audits, QMS assessments, product scope & process-step assessments, qualification plans, CAPA items, documents, and a background compliance watchdog with AI-assisted analysis

### Additional Modules
- **Kappa / MSA** - Attribute agreement (measurement system) analysis studies
- **Autodata Pipeline** - Agentic generation of ML training datasets from test data
- **Knowledge Base (RAG)** - Document upload with retrieval-augmented Q&A
- **Quote Tracker** - Client quotes, milestones, actions, and activity logs
- **Adhesion Log** and **Personal Tasks**

### Platform
- **Authentication & Authorization** - JWT-based access with role support (admin, quality_manager, auditor, tester, viewer)
- **API Documentation** - Interactive Swagger/OpenAPI docs at `/api-docs` (development)

## Development

### Backend Development

```bash
cd backend
npm run dev          # Start with auto-reload
npm run migrate      # Run database migrations
npm test            # Run tests
```

### Frontend Development

```bash
cd frontend
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Database Management

```bash
# Create admin user
npm run create-admin

# Seed CQM data
cd backend && npm run seed-cqm

# Reset database (caution!)
psql -U postgres -c "DROP DATABASE cqm_db;"
psql -U postgres -c "CREATE DATABASE cqm_db;"
npm run migrate
```

## Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cqm_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=1d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration

The frontend proxy is configured in `frontend/vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:5000/api-docs

## Testing

Backend tests (Jest + Supertest) run against a dedicated **`cqm_test`** database that is
created automatically from the Postgres credentials in `backend/.env`. The dev `cqm_db`
is never modified.

```bash
npm run test:backend          # integration + unit suites, with coverage
cd backend && npm run test:watch
```

> The frontend has no test suite configured, so `npm run test:frontend` and `npm run test:all` are not currently usable — run `npm run test:backend` directly.

## Deployment

### Production Build

```bash
# Build frontend
npm run build:frontend

# The build output will be in frontend/dist/
```

### Environment Setup

1. Set `NODE_ENV=production` in backend/.env
2. Update `CORS_ORIGIN` to your production domain
3. Use a strong `JWT_SECRET`
4. Configure production database credentials

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `Get-Service postgresql*`
- Verify database credentials in `backend/.env`
- Ensure port 5000 is available

### Frontend won't start
- Ensure backend is running first
- Check port 3000 is available
- Clear node_modules and reinstall: `npm run install:frontend`

### Database connection errors
- Verify PostgreSQL is running
- Check database name and credentials
- Ensure `cqm_db` database exists

### Port conflicts
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.ts`

## License

MIT License

---

**CQM Tracking System - Built with React, Node.js, and PostgreSQL**
