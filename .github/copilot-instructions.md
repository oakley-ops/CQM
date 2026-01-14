<!-- Copilot / AI agent instructions for quick onboarding -->
# Copilot instructions — PMBOK-ProjectManagement

Purpose: give an AI coding agent exactly the knowledge needed to be productive in this repository.

- Architecture (big picture):
  - Backend: Node.js + Express + Sequelize (Postgres). Entry: `backend/server.js`. DB config: `backend/config/database.js`. Models: `backend/models`. Migrations: `backend/db`.
  - Frontend: React + Vite + TypeScript. Dev server config & proxy: `frontend/vite.config.ts`. API client layer: `frontend/src/services`.
  - Communication: frontend calls backend REST endpoints under `/api` (proxied to `http://localhost:5000` in dev). Real-time uses `socket.io` (backend dependency).
  - Auth: JWT-based middleware under `backend/middleware` and `backend/controllers/authController.js`.

- Quick developer workflows (commands you can run):
  - Install all: `npm run install:all` (root) — installs root, backend, frontend deps.
  - Start both dev servers: `npm run dev` (root) — runs `dev:backend` + `dev:frontend` concurrently.
  - Backend dev: `npm run dev:backend` (root) → runs `cd backend && npm run dev` (nodemon)
  - Frontend dev: `npm run dev:frontend` (root) → runs `cd frontend && npm run dev` (vite)
  - Migrate DB: `npm run migrate` (root) → runs backend migration script (`backend` has `migrate` script).
  - Seed data: `npm run seed` (root) runs several `backend` seed scripts (scope/resources/communications).
  - Create admin: `npm run create-admin` (root) → `backend/create-admin.js`.
  - Run backend tests: `npm run test:backend` (root) → `backend` uses `jest` + `supertest`.

- Important files to inspect when changing behavior:
  - Backend API & routes: `backend/routes/`, `backend/controllers/`, `backend/server.js` (middleware registration, swagger mounting at `/api-docs`).
  - Database & migrations: `backend/models/`, `backend/db/` (migrations), and seed scripts like `backend/seed-*.js`.
  - Frontend structure: `frontend/src/services` (api layer), `frontend/src/store` (redux), `frontend/src/pages` and `frontend/src/components`.
  - Configs: `backend/.env` (DB, PORT, JWT secret), `backend/config/google-credentials.json` (Google integrations), and `frontend/vite.config.ts` (proxy and port).

- Project-specific patterns & conventions (do not assume defaults):
  - Database-first: changes to models must be followed by a migration in `backend/db` (avoid editing schema ad-hoc).
  - Seeds live as scripts at `backend/seed-*.js` (package scripts call them directly). Use these for test data rather than ad-hoc inserts.
  - Controllers implement request/response and call models directly (look for small helpers in `backend/utils`). Prefer adding service helpers in `backend/utils` when logic grows.
  - Logging is centralized (winston) — follow existing logger usage instead of console.log.
  - Validation uses `express-validator` in route definitions — add validators in the routes file near the handler.

- Integrations & external dependencies to be aware of:
  - Postgres (pg + sequelize) — DB connection in `backend/config/database.js`.
  - Google APIs (`backend/config/google-credentials.json`) and `googleapis` dependency.
  - Email via `nodemailer` and the `backend/utils` email helpers.
  - Swagger is served at `/api-docs` (see `backend/swagger.js`).
  - Docker: `backend/docker-compose.yml` exists for containerized DB/service testing.

- When you generate code or make edits:
  - Update or add a migration under `backend/db` for schema changes.
  - Add seed scripts under `backend` and expose them via `package.json` if reusable.
  - Run `npm run migrate` and the relevant seed script locally before opening a PR.
  - Keep controllers thin; add shared business logic to `backend/utils`.

- Testing & verification tips:
  - Backend tests run with `jest` and use `supertest` for endpoints (`backend` `test` script).
  - Frontend dev server runs on port 3000 (vite); backend runs on 5000 by default. Proxy is configured in `frontend/vite.config.ts`.

- Examples (copyable):
  - Start everything locally:
    ```bash
    npm run install:all
    npm run migrate
    npm run seed
    npm run dev
    ```
  - Run backend tests only:
    ```bash
    npm run test:backend
    ```

If anything in these notes seems incomplete or you want me to expand a specific section (migrations, testing, or integration setup), tell me which area and I'll iterate. 
