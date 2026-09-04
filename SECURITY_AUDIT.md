# CQM Security Audit Report
**Date:** 2026-04-10  
**Audited by:** Claude Code (Opus)

---

## Summary Table

| # | Severity | Category | Fix Priority |
|---|----------|----------|--------------|
| 1 | **Critical** | Secrets in `.env` | **Immediate — rotate keys now** |
| 2 | High | JWT in localStorage (XSS) | Next sprint |
| 3 | High | Shell spawn accessible to all roles | Immediate |
| 4 | High | Auth/Authz gaps — no role checks on mutations | Immediate |
| 5 | High | IDOR — no ownership checks | Immediate |
| 6 | High | Open self-registration | Immediate |
| 7 | Medium | CORS — allows all origins when header missing | Next sprint |
| 8 | Medium | Weak input sanitizer | Next sprint |
| 9 | Medium | Verbose error messages leak internals | Next sprint |
| 10 | Medium | Unbounded base64 PDF storage (DoS) | Next sprint |
| 11 | Medium | File upload — no magic-byte check | Next sprint |
| 12 | Medium | PDF regex runs synchronously (CPU DoS) | Next sprint |
| 13 | Medium | Race condition in `bulkSaveEntries` | Next sprint |
| 14 | Medium | Missing request validation on most routes | Ongoing |
| 15 | Medium | JWT algorithm not pinned; no refresh rotation | Next sprint |
| 16 | Medium | Outdated / unmaintained dependencies | Ongoing |
| 17 | Low | No CSP; HSTS not tuned | Backlog |
| 18 | Low | Rate limiter ignores proxy — IP can be spoofed | Backlog |
| 19 | Low | PDF export rate-limiter never matches route | Backlog |
| 20 | Low | `_t=Date.now()` pollutes logs | Backlog |

---

## Critical

### 1. Secrets exposed in `.env`
**File:** `backend/.env` (lines 12, 31, 32)

```
JWT_SECRET=<redacted>
GROQ_API_KEY=<redacted>
VOYAGE_API_KEY=<redacted>
```

- The JWT secret is weak and predictable. Anyone who reads it can forge valid tokens for any user.
- Both AI API keys are real live credentials. Even though `.env` is in `.gitignore`, a backup, screen-share, or log tail can leak them.
- DB password is `cqm` (trivially weak).

**Fix:**
1. **Rotate the Groq and Voyage API keys immediately** — treat them as compromised.
2. Generate a strong JWT secret: `openssl rand -base64 64`
3. Use a secrets manager (e.g., AWS Secrets Manager, Doppler, or 1Password Secrets Automation) for production.
4. Confirm `.env` has never been committed: `git log --all --full-history -- backend/.env`

---

## High

### 2. JWT stored in `localStorage` — extractable by XSS
**Files:** `frontend/src/services/api.ts:19`, `frontend/src/services/authService.ts:25,33,49`, `frontend/src/store/slices/authSlice.ts:7`

Tokens live in `localStorage`. Any XSS vector (injected script, supply-chain compromise, browser extension) can exfiltrate the token and impersonate the user until it expires (24 hours).

**Fix:** Set the token in an `httpOnly; Secure; SameSite=Strict` cookie from the `/api/auth/login` response. The frontend never needs to read it — axios will send it automatically on every request.

---

### 3. Shell spawn (`cmd.exe`) accessible to any authenticated user
**File:** `backend/controllers/launchController.js:9–19`

```js
const child = spawn('cmd.exe', ['/c', 'start', '""', VBS_PATH], ...);
```

The route is guarded by `authenticate` only. Any registered `tester` can trigger a Windows process launch on the server. If a future developer injects `req.body` values into the `spawn` array, this becomes full command injection.

**Fix:**
- Add `authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER)` to this route.
- Replace `cmd.exe /c start` with `spawn('wscript.exe', [VBS_PATH])` to remove the shell layer.
- Log every invocation with the user ID.

---

### 4. Authorization gaps — mutations are `authenticate`-only
**Files:** `backend/routes/testEntries.js:46,89,132–134`, `backend/routes/testSessions.js`, `backend/routes/quotes.js`, `backend/routes/clients.js`, `backend/routes/sampleCards.js`, `backend/routes/punchTools.js`

`POST /test-entries`, `POST /test-entries/bulk`, `POST /metadata`, all PDF-parse routes, `POST /test-sessions`, `PUT /test-sessions/:id`, `PUT /test-sessions/:id/submit`, and most CRUD routes in quotes/clients/samples have no `authorize(...)` role check. Any self-registered `tester` can create, mutate, or destroy any record.

Notably, `bulkSaveEntries` calls `TestEntry.destroy({ where: { session_id } })` — any authenticated user can wipe all entries for any session.

**Fix:** Add `authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER, ...)` (tightened per endpoint) to every mutation route. At minimum, block `tester` from destructive operations.

---

### 5. Insecure Direct Object References (IDOR) — no ownership checks
**Files:** `controllers/quoteController.js`, `controllers/testSessionController.js`, `controllers/clientController.js`, `controllers/budgetController.js`, `controllers/defectController.js`, `controllers/communicationController.js`, `controllers/expenseController.js`, `controllers/ragController.js`, and others

Every controller that mutates a resource calls `findByPk(req.params.id)` without verifying the record belongs to the requesting user or their facility. Any valid JWT grants horizontal read/write access to every row in every table.

`personalTaskController.js` is the only correct example — it scopes queries by `user_id: req.user.id`. Use it as the template.

**Fix:** Add a `where` clause with `createdBy: req.user.id` (or the tenant's `facility_id`) on every lookup that precedes a mutation, or implement a policy-layer helper function.

---

### 6. Public self-registration with no approval
**File:** `backend/controllers/authController.js:17–55`

`POST /api/auth/register` is fully public. Anyone can register as a `tester` and immediately exploit issues #4 and #5 to read/write most resources. There is also a latent bug: `models/User.js:36` sets `defaultValue: ROLES.TEAM_MEMBER` but that role does not exist in `config/constants.js`, so Sequelize will persist `undefined` for any user created without an explicit role.

**Fix:** Require an admin-generated invite token for registration, or add an `is_approved` flag that gates all non-auth endpoints. Fix the `ROLES.TEAM_MEMBER` typo in `models/User.js`.

---

## Medium

### 7. CORS — allows all origins when `Origin` header is absent
**File:** `backend/server.js:70–82`

```js
if (!origin) return callback(null, true);
```

Combined with `credentials: true`, this allows server-to-server tools and some browser contexts to bypass the allowlist entirely. The `localhost` origins are also always allowed regardless of `NODE_ENV`.

**Fix:** In production, reject requests with no `Origin` header (or at least don't credential them). Remove `localhost` entries when `NODE_ENV === 'production'`.

---

### 8. Weak input sanitizer — only strips `<script>` tags
**File:** `backend/middleware/validation.js:52–76`

The sanitizer replaces literal `<script>` tags but passes through every other XSS vector: `<img onerror=...>`, `<svg onload=...>`, `javascript:` URIs, `<iframe>`, event-handler attributes. It also only checks top-level string values — nested objects and arrays (used for metadata, `entries`, `pdf_pages`) are not sanitized.

**Fix:** Remove the custom sanitizer. React escapes output by default, preventing XSS at render time. Only run DOMPurify on fields that must render raw HTML. Continue relying on parameterized Sequelize queries for SQL safety.

---

### 9. Verbose error messages leak internals
**File:** `backend/middleware/errorHandler.js:149–170`; multiple controllers

Every 500 response includes `error: error.message`, which can expose table names, column names, constraint names, and SQL fragments from Sequelize errors.

**Fix:** In production, return only `{ success: false, message: 'Internal server error', requestId }`. Log the real error server-side. Gate `error.message` behind `NODE_ENV === 'development'`.

---

### 10. Unbounded base64 PDF page storage — easy DoS
**Files:** `backend/server.js:108–110`; `controllers/testEntryController.js` (`storePdfPages`)

`express.json({ limit: '15mb' })` means any authenticated user can POST up to 15 MB of base64 blobs to `/api/test-entries/metadata/pdf-pages` repeatedly, filling the DB with garbage. No per-page length cap, no MIME check on the base64 content, no per-user quota.

**Fix:** Cap the number of pages (e.g. ≤ 50), cap the size of each base64 string (e.g. ≤ 512 KB), and verify the magic bytes of the decoded content before persisting.

---

### 11. File upload — no magic-byte verification
**Files:** `controllers/testEntryController.js:8–9`; `routes/rag.js:8–15`

The multer instance in `testEntryController.js` has no `fileFilter` — any content type is accepted and passed directly to `pdf-parse`. The RAG upload checks `file.mimetype === 'application/pdf'`, but MIME type is client-supplied and trivially spoofed.

**Fix:** After receiving the buffer, verify the first 4 bytes are `%PDF` before parsing. Use the `file-type` package (already a dependency) for this check. Reject files that fail the check with a 400.

---

### 12. PDF regex runs synchronously — CPU DoS
**File:** `controllers/testEntryController.js`

All PDF text parsing (peel, laminate, SmartQC) runs synchronously on the Node.js event loop. A crafted or large PDF can block the event loop for seconds. Any authenticated user can submit multiple parallel requests to the parse endpoints to freeze the API.

**Fix:**
- Add a text length guard before parsing: `if (text.length > 500_000) throw new Error('PDF too large to parse')`
- Add a stricter rate limit (e.g. 5 req/min) specifically on `POST /api/test-entries/parse-*`.
- For a longer-term fix, move parsing into a worker thread.

---

### 13. Race condition in `bulkSaveEntries`
**File:** `controllers/testEntryController.js` (`bulkSaveEntries`)

The function does `TestEntry.destroy(...)` then `bulkCreate(...)` inside a transaction, but holds no row lock on the parent session. Two concurrent saves from different devices will both destroy and repopulate, resulting in lost updates.

**Fix:** Lock the session row at the start of the transaction:
```js
await session.reload({ transaction, lock: transaction.LOCK.UPDATE });
```

---

### 14. Missing request validation on most write endpoints

Only `routes/auth.js` uses `express-validator`. Routes like `testEntries.js`, `testSessions.js`, `quotes.js`, `clients.js`, `personalTasks.js` have no schema validation. Invalid types (e.g. a string where an integer ID is expected) flow into Sequelize and produce 500 responses with leaky error messages.

**Fix:** Add `express-validator` or `zod` validation middleware to every mutation route with strict types, length caps, and enum checks. This also serves as the first line of defence against unexpected input shapes.

---

### 15. JWT algorithm not pinned; no token rotation
**File:** `backend/middleware/auth.js:23–28`; `controllers/authController.js:8–12`

- `jwt.verify` accepts any algorithm the library allows by default. A crafted token could potentially exploit algorithm confusion.
- No refresh token mechanism — the 24-hour access token is the only credential.
- No `issuer`/`audience` claims, making token reuse across services undetectable.

**Fix:**
```js
// Pin the algorithm
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'cqm-api', audience: 'cqm-web' });
jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '15m', issuer: 'cqm-api', audience: 'cqm-web' });
```
Implement short-lived access tokens + longer-lived refresh tokens stored in `httpOnly` cookies.

---

### 16. Outdated / unmaintained dependencies

| Package | Issue |
|---------|-------|
| `multer@^1.4.5-lts.1` | 1.x is EOL; multiple known advisories. Upgrade to `multer@2.x`. |
| `pdf-parse@^1.1.4` | Last published 2020, unmaintained. Crashes on malformed PDFs (DoS). Replace with `pdfjs-dist` server-side or `pdf2json`. |
| `puppeteer@^24` | Full Chrome bundled; ensure `--no-sandbox` is not used in production without network isolation. |

**Fix:** Run `npm audit` in both `backend/` and `frontend/`. Add `npm audit --audit-level=high` as a CI step.

---

## Low

### 17. No Content-Security-Policy; HSTS not configured
**File:** `backend/server.js:60` — `app.use(helmet())` uses defaults only.

`helmet()` without explicit CSP configuration means no `Content-Security-Policy` header is sent for API responses. Add `app.set('trust proxy', 1)` before rate limiters for accurate IP detection behind a reverse proxy.

---

### 18. Rate limiter not proxy-aware — IP spoofing possible
**File:** `backend/server.js:85–106`

Without `app.set('trust proxy', ...)`, `express-rate-limit` uses the proxy's IP, making throttling effectively global. If `trust proxy` is set to `true` blindly, clients can spoof `X-Forwarded-For` to bypass auth throttling.

**Fix:** Set `app.set('trust proxy', <exact hop count>)` before mounting any rate limiters.

---

### 19. PDF export rate-limiter route pattern never matches
**File:** `backend/server.js:106`

```js
app.use('/api/projects/:id/reports/*/pdf', pdfLimiter);
```

Express 4 does not match `*` as a middle-segment wildcard in `app.use`. This limiter is silently disabled.

**Fix:** Attach `pdfLimiter` directly inside `routes/reports.js` on the specific export handlers.

---

### 20. `_t=Date.now()` cache-buster pollutes access logs
**File:** `frontend/src/services/api.ts:25–30`

Every GET request appends a timestamp query parameter. This prevents CDN caching and inflates access log volume. Not a security issue, but worth cleaning up.

**Fix:** Use the `Cache-Control: no-store` request header instead of a timestamp query param.

---

## Positive Findings

- Passwords are bcrypt-hashed with per-user salts (`models/User.js`).
- All Sequelize queries use parameterized `replacements` / `Op` — no raw SQL injection vectors found.
- Redis-backed token blocklist for user deactivation is correctly implemented.
- Rate limiting on `/auth/login` and `/auth/register` (5 attempts / 15 min) is in place.
- Swagger UI is gated behind `NODE_ENV !== 'production'`.
- `personalTaskController.js` correctly scopes all queries by `user_id` — use it as the template for fixing IDOR issues elsewhere.

---

## Top 5 Immediate Actions

1. **Rotate the Groq and Voyage API keys and the JWT secret.** Treat the current ones as compromised.
2. **Fix IDOR** — add ownership checks (`createdBy: req.user.id` or `facility_id`) in every controller that calls `findByPk` before a mutation.
3. **Add `authorize(...)` role checks** to mutation routes in `testEntries.js`, `testSessions.js`, `quotes.js`, `clients.js`.
4. **Disable public self-registration** or require admin approval. Fix the `ROLES.TEAM_MEMBER` bug in `models/User.js`.
5. **Move the JWT from `localStorage` to an `httpOnly` cookie** and pin `jwt.verify` to `{ algorithms: ['HS256'] }`.

---

# Remediation Follow-up
**Date:** 2026-06-02
**By:** Claude Code (Opus) — re-review of current code (incl. NEXUS / autodata / RAG subsystems added since the 2026-04-10 audit) plus fixes.

## New issues found in subsystems added after the original audit

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| N1 | High | **Path traversal → arbitrary file write/delete** in Autodata: `format` from the request body was interpolated into the dataset output path (`datasetFormatterAgent.js`), and `deleteRun` then `rmSync`'d `dirname(dataset_path)`. | ✅ Fixed |
| N2 | High | **No authorization on NEXUS or Autodata routes** — every create/update/delete (audits, CAPA, QMS, scope, components, documents, plans) plus `POST /watchdog/run` was `authenticate`-only. | ✅ Fixed |
| N3 | Medium | **Unmetered paid-LLM endpoints** (`/nexus/ai/*`, `/rag/query*`, `/autodata/runs`) — Groq/Voyage cost & quota-exhaustion DoS; autodata runs unbounded/concurrent. | ✅ Mitigated (rate-limited) |
| N4 | Low–Med | **Prompt injection** into LLM context from DB fields / uploaded docs. | ⚠️ Partially mitigated (admin-only uploads, rate limits, output rendered as JSON only) |

## Fixes applied this pass

| Ref | Fix | Files |
|-----|-----|-------|
| N1 | Whitelisted dataset `format` to `jsonl`/`csv` at intake and in the writer; coerce/validate `runId`. | `controllers/autodataController.js`, `services/autodata/agents/datasetFormatterAgent.js` |
| N2 | Non-GET NEXUS routes require `admin/quality_manager/auditor`; Autodata routes require `admin/quality_manager`. | `routes/nexus.js`, `routes/autodata.js` |
| N3 / #19 | Added `aiLimiter` (20 / 5 min) on all AI/RAG/autodata endpoints; wired the previously-unused `uploadLimiter` to uploads and PDF-parse routes. | `middleware/rateLimiter.js`, `routes/{nexus,autodata,rag,testEntries}.js` |
| #4 | RBAC on test-entry mutations — `POST /`, `/bulk` (destructive), `/metadata`, `/metadata/pdf-pages`, `parse-*` now require a recording role (excludes `viewer`). | `routes/testEntries.js` |
| #6 | Public self-registration disabled by default; opt-in via `ALLOW_PUBLIC_REGISTRATION=true`. (`ROLES.TEAM_MEMBER` bug was already fixed → `ROLES.TESTER`.) | `routes/auth.js`, `.env.example` |
| #3 | Shell-spawn `/launch/smartqc` restricted to `admin/quality_manager`. | `routes/launch.js` |
| #15 | JWT pinned to `HS256` on both sign and verify; default expiry reduced to `1d`. | `middleware/auth.js`, `controllers/authController.js` |
| #7 | CORS no longer returns a credentialed response for origin-less requests in production; localhost origins are dev-only. | `server.js` |
| #9 | 5xx responses sanitized in production via a global `sanitizeErrorResponses` wrapper (covers the 60+ controllers that returned `error: err.message` directly) + errorHandler genericizes non-operational 500 messages. | `middleware/errorHandler.js`, `server.js` |
| #8 | Input sanitizer now recurses nested objects/arrays and strips `<script>/<iframe>/<object>/<embed>`, `javascript:`/`vbscript:` URIs, and inline `on*=` handlers. | `middleware/validation.js` |
| #10 / #11 / #12 | PDF-parse handlers verify `%PDF-` magic bytes; `storePdfPages` capped at 50 pages / ~2 MB each. | `controllers/testEntryController.js` |
| #18 | `app.set('trust proxy', 1)`; removed the unsafe `127.0.0.1` bypass in `authLimiter`; nginx now forwards `X-Forwarded-For`/`X-Real-IP`. | `server.js`, `middleware/rateLimiter.js`, `nginx.conf` |

**Verification:** `node --check` on all modified files; export/import + role-constant wiring asserted; path-traversal rejection and the recursive sanitizer functionally tested.

## Still outstanding (require action outside this codebase)

- **#1 (Critical) — Rotate secrets.** Groq/Voyage API keys and the JWT secret must be rotated and confirmed never committed (`git log --all --full-history -- backend/.env`). Not fixable in code.
- **#2 — JWT in `localStorage`.** Frontend change to `httpOnly` cookies not yet done.
- **#5 — IDOR / ownership scoping.** Controllers still `findByPk` without per-user/tenant scoping. Acceptable risk for a single-tenant internal tool but not yet hardened.
- **#16 — Dependency CVEs.** Addressed this pass (see below).

## Dependency upgrade pass (2026-06-02)

`npm audit` re-run in both workspaces.

**Frontend:** 0 vulnerabilities. (The Vite 7 / react-pdf 10 / pdfjs-dist 5 breaking upgrades flagged in `security/dependency-audit.md` had already been applied — `pdfjs-dist` High and the esbuild moderate are gone.)

**Backend:** 16 → 3 (was 15 moderate + 1 high; now 3 moderate, 0 high).
- Removed unused deps **`@anthropic-ai/sdk`** and **`file-type`** (never imported — the PDF magic-byte check is done manually), eliminating 2 advisories and dead weight.
- `npm audit fix` (non-breaking) cleared the **High** `tmp` path-traversal plus `ws`, `engine.io`, `socket.io-adapter`, `qs`, `express`, `brace-expansion`.
- **`nodemailer` 7 → 8.0.10** — fixes the SMTP command-injection advisory (real: used by `utils/emailService.js`). Module load verified.
- **`googleapis` 128 → 173** — clears the transitive `gaxios`/`googleapis-common` `uuid` chain. `utils/googleSheetsService.js` + `controllers/exportController.js` load verified.
- **`multer` 1.x → 2.1.1** (EOL hygiene; API-compatible with existing `dest`/`memoryStorage`/`fileFilter`/`single` usage) and **`supertest` 6 → 7.2.2** (dev-only).
- **Remaining 3 (moderate, accepted):** transitive `uuid` "missing buffer bounds check" reachable only via `exceljs` and `sequelize`. npm's only offered "fix" is a **major downgrade** of those libraries (`sequelize`→3.x would break the ORM, `exceljs`→3.x loses features), so they were not applied. Real-world risk is low — the bug triggers only when a caller passes a `buf` argument to UUID v3/v5/v6 generation, which neither library does with untrusted input.

> Note: full integration tests were not run here (the backend test suite requires a live PostgreSQL instance). Verification was via `node --check`, module-load checks of each upgraded package's in-repo consumers, and API-compatibility checks. Recommend running `npm run test:backend` against a dev DB before deploying.
