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
npm run create-admin          # Create admin user (admin@cqm.com / cqm123)
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
The quality-management surface is built on a small set of models. These are what the dashboard, SPC, and KPI features read from:
- `TestCategory` - groupings of tests (code, name, ISO reference)
- `TestDefinition` - individual test specs (type, spec limits, unit, ISO section)
- `TestSession` - a run against a batch (status: draft/submitted/approved/rejected)
- `TestEntry` - one result within a session (pass_status, measurement_value, assessment_value)
- `SampleCard` - card identifiers within a session
- `TestEntryMetadata` - free-form metadata on individual entries
- `KpiConfig` - KPI thresholds (target_value, warning_threshold, higher_is_better)
- `Job` - umbrella work record that a TestSession belongs to
- `AdhesionLog`, `KappaStudy`, `KappaRating` - specialized quality tests

Supporting models used by the broader app (project-management scaffolding that predates the CQM pivot): `Project`, `Task`, `Milestone`, `Risk`, `ChangeRequest`, `ProjectCharter`, `Stakeholder`, `Budget`, `Expense`, `QualityInspection`, `Defect`, `Requirement`, `Vendor`, `Contract`, `Client`, `Quote`, `PersonalTask`, etc. These are real independent models in `backend/models/index.js` — not aliases for CQM concepts. Treat them as a separate domain; do not conflate `Project` with a manufacturing facility or `Milestone` with an audit.

There is NO `ManufacturingFacility`, `Audit`, `NonConformity`, `CapaAction`, `ISOComplianceRecord`, `TestResult`, `TestParameter`, `BatchTestSession`, `CardBatch`, or `QmsDocument` model. Earlier docs listed these; the models were never built. If quality-management features need them (NC tracking, CAPA workflow, audit scheduling, ISO cert expiry), they must be designed and migrated first.

### API Routes
CQM-specific routes (all under `/api`):
- `/dashboard` - KPIs, test-entry metrics, rejection breakdown, SPC endpoints (see `backend/routes/dashboard.js`)
- `/test-categories`, `/test-sessions`, `/test-entries`, `/sample-cards`
- `/adhesion-log`, `/kappa-studies`, `/punch-tools`

App-wide routes: `/auth`, `/jobs`, `/stakeholders`, `/budgets`, `/expenses`, `/evm`, `/inspections`, `/defects`, `/resources`, `/communications`, `/scope`, `/vendors`, `/quotes`, `/clients`, `/quote-milestones`, `/personal-tasks`, `/lessons-learned`, `/email`, `/reports`, `/export`, `/excel-export`, `/launch`, `/rag`, `/health`

There is no `/test-definitions`, `/facilities`, `/audits`, `/non-conformities`, `/capa-actions`, `/card-batches`, or `/batch-test-sessions` route mounted.

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
