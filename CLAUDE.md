# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Card Quality Management (CQM) Tracking System** for smart card manufacturing with ISO compliance tracking.

## Commands

### Development
```bash
npm run install:all          # Install all dependencies (root, backend, frontend)
npm run dev                   # Start both backend and frontend concurrently
npm run dev:backend           # Start backend only (nodemon on port 5000)
npm run dev:frontend          # Start frontend only (Vite on port 3000)
```

### Database
```bash
npm run migrate               # Run database migrations (backend/db/migrate.js)
npm run seed                  # Seed scope/resources/communications data
npm run create-admin          # Create admin user (admin@cqm.com / admin123)
cd backend && npm run seed-cqm    # Seed CQM test categories and definitions
```

### Testing
```bash
npm run test:backend          # Jest with coverage (backend)
npm run test:all              # Run all tests
cd backend && npm run test:watch  # Watch mode
```

### Build
```bash
npm run build:frontend        # TypeScript compile + Vite build
cd frontend && npm run lint   # ESLint for frontend
```

## Architecture

### Backend (Node.js + Express + Sequelize)
- **Entry**: `backend/server.js` - middleware registration, route mounting, Swagger at `/api-docs`
- **Database**: PostgreSQL via Sequelize, config in `backend/config/database.js`
- **Models**: `backend/models/index.js` defines all associations (critical file)
- **Migrations**: SQL files in `backend/db/migrations/` (numbered), CQM-specific in `backend/db/migrations/cqm/`
- **Validation**: `express-validator` in route definitions
- **Logging**: Winston (avoid console.log)

### Frontend (React + Vite + TypeScript)
- **Entry**: `frontend/src/App.tsx` - routing with React Router
- **State**: Redux Toolkit in `frontend/src/store/`
- **API Layer**: Axios services in `frontend/src/services/`
- **UI**: Material-UI (`@mui/material`)
- **Forms**: react-hook-form + zod validation
- **Proxy**: `/api` proxied to `http://localhost:5000` (see `frontend/vite.config.ts`)
- **Path alias**: `@/` maps to `./src/`

### CQM Domain Models (primary focus)
The system is built around card manufacturing quality management:
- `ManufacturingFacility` (aliased as `Project`) - facilities being managed
- `TestDefinition`, `TestCategory`, `TestParameter` - test specifications
- `TestResult`, `BatchTestSession` - test execution records
- `CardBatch` - production batches
- `Audit` - quality audits
- `NonConformity` - quality issues (aliased as `Risk`)
- `CapaAction` - corrective/preventive actions (aliased as `ChangeRequest`)
- `ISOComplianceRecord` - ISO standard compliance tracking
- `QmsDocument` - QMS documentation

### Model Aliases
These aliases exist in `backend/models/index.js` for convenience:
- `Project` = `ManufacturingFacility`
- `Task` = `TestResult`
- `Milestone` = `Audit`
- `Risk` = `NonConformity`
- `ChangeRequest` = `CapaAction`
- `QualityMetric` = `ISOComplianceRecord`

### API Routes
CQM core routes (all under `/api`):
- `/test-definitions`, `/test-results`, `/facilities`, `/audits`
- `/non-conformities`, `/capa-actions`, `/card-batches`, `/batch-test-sessions`
- `/dashboard` - statistics endpoints

Supporting routes: `/auth`, `/stakeholders`, `/budgets`, `/expenses`, `/quotes`, `/clients`, `/personal-tasks`

## Key Patterns

### Database Changes
1. Add migration SQL file in `backend/db/migrations/` (numbered) or `backend/db/migrations/cqm/`
2. Run `npm run migrate`
3. Update model in `backend/models/`
4. Update associations in `backend/models/index.js`

### Adding API Endpoints
1. Add route in `backend/routes/`
2. Add controller in `backend/controllers/`
3. Register in `backend/server.js`
4. Add validators in route file using `express-validator`

### Frontend Feature Development
1. Add types in `frontend/src/types/cqm/`
2. Add service in `frontend/src/services/cqm/`
3. Add Redux slice in `frontend/src/store/slices/cqm/`
4. Add page in `frontend/src/pages/cqm/`
5. Register route in `App.tsx`

### Seeds
- CQM seeds: `backend/seed-test-categories.js`, `backend/seed-test-definitions.js`
- Data files: `backend/seed-data/`
