# CQM / NEXUS — Deployment Readiness

**Audience:** Acceptance project team and plant IT provisioning the CQM Quality Control Hub (incl. the NEXUS audit-readiness module) for the **Nashville** site.
**Status:** Pre-production. See [KNOWN-ISSUES-BACKLOG.md](./KNOWN-ISSUES-BACKLOG.md) for the triaged issue list and the proposed first sprint.

---

## 1. What this is

A web application for tracking smart-card manufacturing quality against the Mastercard CQMAP V3.A framework. Two halves share one database:

- **CQM test tracking** — test categories/definitions, test sessions and entries, SPC and KPI dashboards.
- **NEXUS Hub** — continuous internal audit readiness: QMS self-assessment, product scope, qualification plans and gates, CAPA tracking, document/component registers, a compliance watchdog, and CQMAP/PDF exports. Intended to run **one active audit cycle at a time** for the Nashville plant.

---

## 2. System requirements

| Component | Requirement | Notes |
|---|---|---|
| Node.js | **20 LTS** recommended | `package.json` declares `>=14`, but the frontend build (Vite 7) needs Node 18+; standardize on 20 LTS. |
| PostgreSQL | 14+ | Primary datastore. |
| Redis | Optional | Only used for the JWT blocklist on user deactivation. Absent = graceful degradation. |
| OS | Linux server (typical) | Dev is on macOS/Windows; production target should be a plant-managed Linux host. |

---

## 3. First-time setup

```bash
npm run install:all          # root + backend + frontend deps
cp backend/.env.example backend/.env   # then edit — see §4
npm run migrate              # apply all SQL migrations (incl. NEXUS)
npm run create-admin         # creates admin@cqm.com — CHANGE THE PASSWORD (see §6)
npm run seed                 # scope/resources/communications reference data
cd backend && npm run seed-cqm   # CQM test categories + definitions
npm run build:frontend       # production build → frontend/dist
```

Run backend (`npm run start:backend`) behind a process manager (pm2/systemd) and serve `frontend/dist` from a static host or reverse proxy. Point the proxy's `/api` at the backend port.

---

## 4. Environment variables (`backend/.env`)

| Variable | Required | Purpose / notes |
|---|---|---|
| `NODE_ENV` | yes | `production` in the plant. |
| `PORT` | yes | Backend port (default 5000). |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | yes | PostgreSQL connection. |
| `JWT_SECRET` | **yes** | Must be a strong random value in production — do **not** ship the example default. |
| `JWT_EXPIRE` | no | Token lifetime (default `1d`). |
| `CORS_ORIGIN` | yes | Set to the deployed frontend origin. |
| `ANTHROPIC_API_KEY` | **conditional** | **Not in `.env.example` but required** by NEXUS AI features (readiness score, SPC analysis, alert advice). Without it those endpoints error. Set it, or treat AI as disabled. |
| `GROQ_API_KEY` | conditional | RAG chat service. |
| `VOYAGE_API_KEY` | conditional | Embeddings for RAG. |
| `EMAIL_USER` / `EMAIL_PASSWORD` | conditional | Gmail SMTP for outbound email/reports. |
| `MAX_FILE_SIZE` / `UPLOAD_DIR` | no | Upload limits/path. |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | no | API rate limiting. |
| `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`) | no | Optional JWT blocklist. |

> **Action for the acceptance review:** add `ANTHROPIC_API_KEY` to `.env.example` (or gate the AI features behind a feature flag) so the AI dependency is explicit.

---

## 5. Roles & access control

Authentication is JWT (`backend/middleware/auth.js`). Roles (`backend/config/constants.js`):

| Role | Capability in NEXUS |
|---|---|
| `admin` | Full access; user management. |
| `quality_manager` | Create/edit audit records, QMS, CAPA, scope, plans, documents, components. |
| `auditor` | Same mutation access as quality_manager for audit content. |
| `tester` | Test-entry focused; read NEXUS. |
| `viewer` | Read-only. |

NEXUS enforces this at the route layer: **all reads require authentication; every mutation requires `admin`, `quality_manager`, or `auditor`.** All mutation routes additionally validate request bodies/params (`backend/middleware/nexusValidators.js`).

---

## 6. Pre-production hardening checklist

- [ ] **Change the default admin password.** `create-admin` seeds `admin@cqm.com` / `cqm123`. Change it immediately (or delete and recreate the admin with a real credential) before the plant can reach the app.
- [ ] **Set a strong `JWT_SECRET`.** The example value must not reach production.
- [ ] **Set `CORS_ORIGIN`** to the real frontend origin.
- [ ] **Decide on AI:** set `ANTHROPIC_API_KEY` (and `GROQ_API_KEY`/`VOYAGE_API_KEY` if RAG is wanted), or confirm the AI features are out of scope for launch.
- [ ] **Replace the NEXUS demo seed** (currently ships non-Nashville sites — see backlog) with the real Nashville audit record, or start from an empty NEXUS.
- [ ] **Database backups** scheduled on the Postgres instance (the entire audit history lives there).

---

## 7. What data leaves the plant network

Relevant for IT/security sign-off. All are **optional** — the core app functions without them:

| Feature | External service | Data sent |
|---|---|---|
| NEXUS AI (readiness / SPC / alert advice) | Anthropic API | Audit/alert summary text, requirement IDs, conformity counts, SPC measurement stats. |
| RAG chat | Groq API | User questions and retrieved document context. |
| RAG embeddings | Voyage API | Document/text to embed. |
| Email / reports | Gmail SMTP | Report contents and recipient addresses. |

If the plant cannot approve outbound AI/email traffic, leave the corresponding keys unset and the app runs without those features.

---

## 8. Operational notes

- **Compliance watchdog** runs in-process every 15 minutes (and once on startup), raising alerts for NC+ without CAPA, overdue/soon-due CAPAs, low QMS score, and approaching audits.
- **Migrations** are tracked in `schema_migrations`; re-running `npm run migrate` is safe (already-applied files are skipped).
- **Logs** use Winston (not console). Wire up log retention on the host.
- **Health check:** `GET /health`. API docs (non-production) at `/api-docs`.
