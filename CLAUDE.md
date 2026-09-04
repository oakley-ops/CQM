# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Card Quality Management (CQM) Tracking System** — a full-stack quality-management app for smart-card manufacturing with ISO/IEC compliance tracking. Internally branded "Quality Control Hub" (served at hostname `qch` via `nginx.conf`). The app is an internal/local tool: a React + Vite frontend (port 3000) talks to a Node/Express + Sequelize/PostgreSQL backend (port 5000).

> Note: the project root is the directory containing `backend/`, `frontend/`, and `package.json`. All paths below are relative to that root.

## Commands

```bash
# Setup
npm run install:all          # Install deps in root, backend, and frontend

# Develop (run from root)
npm run dev                  # Backend (nodemon:5000) + frontend (Vite:3000) concurrently
npm run dev:backend
npm run dev:frontend
# Or: ./start-dev.ps1  (checks Postgres service + backend/.env, opens two windows)

# Database
npm run migrate              # Run pending top-level SQL migrations (see Migrations below)
npm run create-admin         # Upsert admin user — login: username "admin", password "cqm123"
cd backend && npm run seed-cqm   # Seed TestCategory + TestDefinition (the core test catalog)
cd backend && npm run seed-icc / seed-internal   # Seed specific test families

# Build / lint
npm run build:frontend       # tsc + vite build → frontend/dist
cd frontend && npm run lint  # ESLint (frontend only; backend has no lint setup)

# Test
npm run test:backend         # Jest + coverage (backend). Needs a reachable Postgres.
cd backend && npm run test:watch
```

### Testing gotchas
- Backend tests live in `backend/tests/` (`integration/cqm.integration.test.js` + `unit/security.test.js`), Jest + supertest, configured by `backend/jest.config.js` (serial, `forceExit`).
- They run against a **dedicated `cqm_test` database** — `tests/global-setup.js` creates it (using the Postgres creds from `backend/.env`) and the integration suite rebuilds the schema each run via `sequelize.sync({ force: true })`. `tests/setup-env.js` forces `DB_NAME=cqm_test`, so **the dev `cqm_db` is never touched**. A guard aborts if the DB name doesn't contain `test`.
- `server.js` only starts a listener / DB+Redis connections when run directly (`require.main === module`); requiring it in tests just exports the Express `app`.
- The frontend has **no tests and no `test` script**. `npm run test:frontend` and `npm run test:all` will therefore **fail at the frontend step** — use `npm run test:backend` directly.

## Architecture

### Backend — Node + Express + Sequelize (`backend/`)
- **Entry**: `server.js` — Helmet, CORS allowlist, rate limiting, input sanitization, route mounting, Swagger at `/api-docs` (dev only), and it starts the NEXUS compliance watchdog scheduler on boot.
- **DB**: PostgreSQL via Sequelize; connection in `config/database.js`. `syncModels()` only runs `sequelize.sync({ alter:false })` in development — **schema changes come from SQL migrations, not sync**.
- **Models**: `models/index.js` is the source of truth for what exists and how it's associated. Read it before assuming a model/table exists.
- **Controllers / routes**: `controllers/*.js` + `routes/*.js`, one pair per resource. NEXUS controllers live under `controllers/nexus/`.
- **Validation**: `express-validator` in route files; shared sanitization in `middleware/validation.js`.
- **Auth**: JWT (`middleware/auth.js`). Optional Redis (`utils/redisClient.js`) backs a token blocklist for user deactivation; absent Redis degrades gracefully.
- **Logging**: Winston (`utils/logger.js`) — prefer it over `console.log`.

### Frontend — React 18 + Vite + TypeScript (`frontend/`)
- **Entry**: `src/App.tsx` — all routes live here behind a single `ProtectedRoute` → `Layout`. The index route is the CQM Dashboard.
- **State**: Redux Toolkit in `src/store/` (slices under `src/store/slices/`, CQM slices under `slices/cqm/`).
- **API layer**: Axios services in `src/services/` (shared client in `src/services/api.ts`; feature folders `cqm/`, `nexus/`, `quote/`).
- **Types**: `src/types/` with feature folders `cqm/` and `nexus/`.
- **UI**: Material-UI (`@mui/material`), Recharts for charts, react-hook-form + zod for forms, react-pdf/pdfjs for PDF rendering.
- **Proxy**: `/api` → `http://localhost:5000` (`vite.config.ts`); `@/` path alias → `./src/`.

## Domain Subsystems

The app is a collection of loosely-coupled subsystems sharing one `User` table. Understanding these boundaries is the key to navigating the code.

1. **Quality Test Entry (core)** — `TestCategory` → `TestDefinition` (specs/limits/ISO refs); a `TestSession` (draft→submitted→approved/rejected) belongs to a `Job` and contains `TestEntry` rows (one result per `SampleCard` × `TestDefinition`), plus `TestEntryMetadata` and `KpiConfig`. The Dashboard, KPIs, and SPC endpoints read from these.
2. **Kappa / MSA** — `KappaStudy` + `KappaRating` for attribute agreement analysis, linked to `TestDefinition`/`TestCategory`.
3. **NEXUS Qualification Hub** — supplier/product qualification & ISO compliance. Centered on `NexusAuditRecord`, which fans out to `NexusQmsAssessment`, `NexusProductScope` → `NexusProcessStepAssessment`, `NexusAuditComponent`, `NexusQualificationPlan` → `NexusQualificationItem`/`NexusDesignReview`, `NexusCapaItem` (CAPA), `NexusDocumentRef`, and `NexusAlert`. Includes an AI assistant (`controllers/nexus/aiController.js`) and a background compliance **watchdog** that generates alerts. Frontend under `pages/nexus/`, mounted at `/api/nexus`.
4. **Autodata pipeline** — agentic generation of ML training datasets from test data. `POST /api/autodata/runs` creates an `AutodataRun` (status queued→…) and fires `services/autodata/orchestratorService.startRun()` fire-and-forget; agents live under `services/autodata/agents/`.
5. **RAG knowledge base** — `RagDocument` + `services/ragService.js`; document upload + retrieval-augmented Q&A. Embeddings via Voyage, generation via Groq, vector store via `vectra` (local files under `backend/vector-stores/`, gitignored).
6. **Quote Tracker** — `Client`, `Quote`, `QuoteMilestone`/`QuoteMilestoneTracking`, `QuoteAction`, `QuoteDocument`, `QuoteActivityLog`.
7. **Misc** — `PersonalTask` (per-user todos), `AdhesionLog` (specialized adhesion test log).

### What does NOT exist (avoid stale assumptions)
- The app **used to** carry PMBOK-style project-management tables (`projects`, `tasks`, `milestones`, `risks`, `change_requests`, `team_members`, etc.). These were **dropped** (migrations `031_drop_pmbok_tables.sql`, `032_drop_team_members.sql`). There are no such Sequelize models. Audit/CAPA/conformity concepts now live in the **NEXUS** subsystem, not in a generic PM model.
- `config/constants.js` still defines legacy enums (`PROJECT_STATUS`, `TASK_STATUS`, `RISK_*`, etc.). These are leftovers and are **not** all backed by tables — don't infer schema from them. The live enum is `ROLES` (`admin`, `quality_manager`, `auditor`, `tester`, `viewer`).
- The AI features run on **Groq** (LLM) + **Voyage** (embeddings). `@anthropic-ai/sdk` is still in `package.json` but no `ANTHROPIC_API_KEY` is referenced in code; the `HUGGINGFACE_API_KEY` in `.env.example` is also stale.

## API Routes (mounted in `server.js`, all under `/api`)

`/auth`, `/dashboard`, `/adhesion-log`, `/test-categories`, `/test-sessions`, `/test-entries`, `/sample-cards`, `/punch-tools`, `/kappa-studies`, `/jobs`, `/email`, `/export` (Google Sheets), `/excel-export` (direct download), `/quotes`, `/clients`, `/quote-milestones`, `/personal-tasks`, `/launch`, `/rag`, `/nexus`, `/autodata`. Plus `/health` (not under `/api`).

## Migrations

`db/migrate.js` runs `db/migrations/*.sql` in **filename sort order**, recording each in the `schema_migrations` table so reruns are idempotent. Important details:
- The runner is **non-recursive** — it only picks up `.sql` files directly in `db/migrations/`, **not** the `db/migrations/cqm/` subfolder.
- `db/migrations/cqm/` holds the original CQM transformation migrations (table renames, role updates) and has its **own** runner, `db/migrations/cqm/run-cqm-migrations.js`. Any `.sql` placed in `cqm/` (e.g. `057_autodata_runs.sql`) will **not** be applied by `npm run migrate`; apply it manually (e.g. via `backend/run-migration.js`).
- Some top-level files share a numeric prefix (two `031_`, two `032_`); ordering falls back to the full filename. New top-level migrations should use the next free number and live directly in `db/migrations/`.

## Environment (`backend/.env`, template in `backend/.env.example`)

Core: `DB_HOST` `DB_PORT` `DB_NAME` (`cqm_db`) `DB_USER` `DB_PASSWORD`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRE` (note: code reads `JWT_EXPIRE`, not `JWT_EXPIRES_IN`).
Optional/feature: `GROQ_API_KEY` (NEXUS AI, alerts, RAG, autodata), `VOYAGE_API_KEY` (RAG embeddings), `GOOGLE_CREDENTIALS_PATH` (`/api/export` to Sheets), `EMAIL_USER`/`EMAIL_PASSWORD` (Gmail nodemailer), `REDIS_URL`/`REDIS_HOST`/`REDIS_PORT` (token blocklist), `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX_REQUESTS`, `TRUSTED_IPS`, `LOG_LEVEL`.

## Common change patterns

**Add a DB column/table**: write a numbered `.sql` in `db/migrations/` → `npm run migrate` → update the model in `models/` → wire associations in `models/index.js`.

**Add an API endpoint**: add/extend `routes/<x>.js` (with `express-validator`) → controller in `controllers/<x>.js` → mount in `server.js`.

**Add a frontend feature**: types in `src/types/<area>/` → service in `src/services/<area>/` → Redux slice in `src/store/slices/<area>/` (if it needs global state) → page in `src/pages/<area>/` → route in `src/App.tsx`.

## Reference docs

`docs/` contains living design notes worth consulting for the bigger subsystems: `architecture-blueprint.md`, `nexus-qualification-hub.md`, `autodata-agentic-framework-plan.md`, `adding-specialized-test-form.md`, `groq-migration-test-plan.md`. Backend API specifics: `backend/README.md`, `backend/API_TESTING_GUIDE.md`, `backend/EMAIL_API_REFERENCE.md`, and Swagger at `/api-docs` when running in dev.
