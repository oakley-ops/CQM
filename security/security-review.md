# CQM Security Review

**Date:** 2026-03-05
**Branch:** cqm-transformation
**Status:** All identified issues resolved

---

## What's Done Well

| Area | Status |
|------|--------|
| HTTP headers | `helmet.js` applied globally |
| CORS | Whitelist-based, not wildcard |
| Password hashing | `bcryptjs` with salt rounds 10, via Sequelize hooks |
| JWT auth | All routes protected with `protect` middleware |
| Password not leaked | `password_hash` excluded from all user queries |
| JWT token errors | Handled and return clean 401s |
| Input validation | `express-validator` on auth routes |
| Rate limiting | General + auth + export + PDF limiters all active |
| Raw SQL | Uses parameterized queries (`:replacements`) — no SQL injection |
| `syncModels` in prod | Gated behind `NODE_ENV === 'development'` |
| `.gitignore` | `.env`, credentials, keys, certs all excluded |
| Error responses | Stack traces only in development |
| Input sanitization | `sanitizeInput` applied globally in `server.js` |

---

## Fixed Issues

### CRITICAL

#### 1. Open role escalation on registration — FIXED
- **File:** `backend/controllers/authController.js`
- **Fixed:** 2026-03-05
- **Change:** Removed `role` from destructured request body. Registration now always creates `team_member`. Role assignment requires admin action via a separate endpoint.

---

### HIGH

#### 2. `authLimiter` never applied to auth routes — FIXED
- **File:** `backend/server.js`
- **Fixed:** 2026-03-05
- **Change:** Imported `authLimiter` from `middleware/rateLimiter.js` and applied it to `/api/auth/login` and `/api/auth/register` (5 attempts / 15 min, brute-force protection).

#### 3. Any authenticated user could list all users — FIXED
- **File:** `backend/routes/auth.js`
- **Fixed:** 2026-03-05
- **Change:** Added `authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER)` to `GET /api/auth/users`.

---

### MEDIUM

#### 4. Inconsistent RBAC — destructive routes lacked `authorize()` — FIXED
- **Files:** `testSessions.js`, `testEntries.js`, `defects.js`, `inspections.js`
- **Fixed:** 2026-03-05
- **Changes:**

| Route | Action | Now Requires |
|-------|--------|-------------|
| `DELETE /test-sessions/:id` | Delete session | ADMIN, PROJECT_MANAGER |
| `PUT /test-sessions/:id/approve` | Approve session | ADMIN, PROJECT_MANAGER |
| `PUT /test-sessions/:id/reject` | Reject session | ADMIN, PROJECT_MANAGER |
| `DELETE /test-entries/:id` | Delete entry | ADMIN, PROJECT_MANAGER, TEAM_LEAD |
| `DELETE /defects/:id` | Delete defect | ADMIN, PROJECT_MANAGER |
| `PUT /defects/:id/assign` | Assign defect | ADMIN, PROJECT_MANAGER, TEAM_LEAD |
| `PUT /defects/:id/resolve` | Resolve defect | ADMIN, PROJECT_MANAGER, TEAM_LEAD |
| `PUT /defects/:id/close` | Close defect | ADMIN, PROJECT_MANAGER |
| `DELETE /inspections/:id` | Delete inspection | ADMIN, PROJECT_MANAGER |
| `PUT /inspections/:id/complete` | Complete inspection | ADMIN, PROJECT_MANAGER, TEAM_LEAD |
| `PUT /inspections/:id/approve` | Approve inspection | ADMIN, PROJECT_MANAGER |
| `PUT /inspections/:id/reject` | Reject inspection | ADMIN, PROJECT_MANAGER |

#### 5. `sanitizeInput` middleware not applied globally — FIXED
- **File:** `backend/server.js`
- **Fixed:** 2026-03-05
- **Change:** Added `app.use(sanitizeInput)` after body parser in `server.js`.
- **Note:** The regex implementation strips `<script>` tags only. For stronger XSS protection, consider replacing with `sanitize-html` or `xss` package in a future iteration. React's built-in escaping provides the primary XSS defense on the frontend.

#### 6. Swagger docs publicly accessible in production — FIXED
- **File:** `backend/server.js`
- **Fixed:** 2026-03-05
- **Change:** Wrapped Swagger middleware registration in `if (process.env.NODE_ENV !== 'production')`. Docs are now unavailable in production.

#### 7. Weak password minimum length — FIXED
- **File:** `backend/routes/auth.js`
- **Fixed:** 2026-03-05
- **Change:** Raised minimum from 6 to 8 characters.

#### 8. Export routes bypassed from global rate limiter — FIXED
- **File:** `backend/server.js`
- **Fixed:** 2026-03-05
- **Change:** Removed the `skip` function from the general limiter. Imported `exportLimiter` from `middleware/rateLimiter.js` and applied it directly to `/api/export` and `/api/excel-export`.

---

### LOW

#### 9. No body size limit on `express.json()` — FIXED
- **File:** `backend/server.js`
- **Fixed:** 2026-03-05
- **Change:** `express.json({ limit: '1mb' })` and `express.urlencoded({ extended: true, limit: '1mb' })`.

#### 10. JWT expiry too long (7 days) — PARTIALLY ADDRESSED
- **File:** `backend/.env.example`
- **Fixed:** 2026-03-05
- **Change:** Default `JWT_EXPIRE` reduced to `1d` in `.env.example`.
- **Remaining:** No token blocklist implemented. If a user is deactivated, their current token is valid until expiry. Full fix requires Redis-based token blocklist or refresh token rotation — tracked as a future improvement.

#### 11. `console.log` in production startup path — FIXED
- **File:** `backend/server.js`
- **Fixed:** 2026-03-05
- **Change:** Replaced `console.log` startup banner with `logger.info()` calls.

---

## Outstanding / Future Improvements

| Item | Description | Priority |
|------|-------------|----------|
| Token blocklist | Invalidate JWTs on user deactivation (requires Redis) | Medium |
| CQM role definitions | `constants.js` still has PMBOK roles (`project_manager`, `team_lead`, etc.). Should be updated to CQM roles (`quality_manager`, `auditor`, `tester`) with a DB migration | Medium |
| Stronger XSS sanitization | Replace regex-based `sanitizeInput` with `sanitize-html` package | Low |
| RBAC on remaining routes | `communications`, `resources`, `scope`, `quotes`, `clients` — read operations are low risk but write/delete could use role checks | Low |
| Password complexity | Add uppercase + number requirements beyond length minimum | Low |
