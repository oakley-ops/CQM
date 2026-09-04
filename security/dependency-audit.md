# Dependency Vulnerability Audit

**Date:** 2026-03-05
**Tool:** npm audit
**Branch:** cqm-transformation
**Last audit fix run:** 2026-03-05

---

## Summary

| Package Scope | Total Packages | Vulnerabilities | Status |
|---------------|---------------|-----------------|--------|
| Root | 30 | 0 | Fixed |
| Backend | 728 | 0 | Clean |
| Frontend | 399 | 4 (2 moderate, 2 high) | Partially resolved |
| **Total** | **1,157** | **4** | |

---

## Root — RESOLVED

### lodash 4.0.0 - 4.17.21
- **Severity:** Moderate
- **Advisory:** GHSA-xxjr-mmjv-4gpg
- **Issue:** Prototype Pollution in `_.unset` and `_.omit` functions.
- **Status:** Fixed via `npm audit fix` on 2026-03-05

---

## Backend — CLEAN

No vulnerabilities found.

**Notable deprecation warnings (not CVEs, but should be addressed):**

| Package | Issue | Recommended Action |
|---------|-------|--------------------|
| `multer@1.4.5-lts` | v1.x has patched vulnerabilities; v2.x available | Upgrade to `multer@2.x` |
| `glob@7.x` | Multiple old versions pulled in transitively | Update packages that depend on old glob |
| `supertest@6.3.4` | Deprecated; security fixes in v7.1.3+ | Upgrade to `supertest@^7` |
| `fstream@1.0.12` | No longer supported | Transitive dep; monitor |
| `rimraf@2.7.1` | Pre-v4 no longer supported | Transitive dep; monitor |

---

## Frontend — 6 VULNERABILITIES REMAINING

### 1. esbuild <= 0.24.2
- **Severity:** Moderate
- **Advisory:** GHSA-67mh-4wv8-2f99
- **Issue:** esbuild's development server accepts requests from any website, allowing cross-origin reads of dev server responses. **Dev environment only — not a production risk.**
- **Affected:** `node_modules/esbuild` via `vite@0.11.0 - 6.1.6`
- **Fix:** `npm audit fix --force` installs `vite@7.3.1` (breaking change — Vite config/plugin API changes required)
- **Status:** Open — blocked on Vite 7 upgrade testing

### 2. pdfjs-dist <= 4.1.392
- **Severity:** High
- **Advisory:** GHSA-wgrm-67xf-hhpq
- **Issue:** Arbitrary JavaScript execution when a user opens a malicious PDF. **Direct production risk if users upload or view external PDFs.**
- **Affected:** `node_modules/pdfjs-dist` via `react-pdf@1.6.0 - 8.0.2`
- **Fix:** `npm audit fix --force` installs `react-pdf@10.4.1` (breaking change — component API changes required)
- **Status:** Open — HIGH PRIORITY, blocked on react-pdf v10 migration

### 3. tar <= 7.5.9 (5 CVEs) — RESOLVED
- **Severity:** High
- **Advisory:** Multiple CVEs:
  - GHSA-r6q2-hw4h-h46w — Race condition via Unicode ligature collisions
  - GHSA-34x7-hfp2-rc4v — Arbitrary file creation via hardlink path traversal
  - GHSA-8qq5-rm4j-mr97 — Arbitrary file overwrite via symlink poisoning
  - GHSA-83g3-92jg-28cx — Arbitrary file read/write via hardlink symlink chain
  - GHSA-qffp-2rhf-9h96 — Hardlink path traversal via drive-relative linkpath
- **Affected:** `node_modules/tar` via `canvas` → `@mapbox/node-pre-gyp@1.0.11`
- **Fix applied:** Added `overrides: { "tar": "^7.5.10" }` to `frontend/package.json` on 2026-03-05. Forces npm to use the patched `tar@7.5.10` regardless of what `@mapbox/node-pre-gyp` requests.
- **Status:** Resolved

---

## Pending Actions

### Breaking upgrades (require testing before applying)

| Action | Command | Resolves | Risk |
|--------|---------|----------|------|
| Upgrade Vite to 7.x | `cd frontend && npm audit fix --force` | esbuild CVE | Vite config/plugin API may break |
| Upgrade react-pdf to 10.x | `cd frontend && npm audit fix --force` | pdfjs-dist CVE | PDF viewer component API changes |
| Upgrade multer to 2.x | Manual edit `backend/package.json` | multer deprecation | Middleware API changes |
| Upgrade supertest to 7.x | Manual edit `backend/package.json` | supertest deprecation | Test file changes |

### Stuck / waiting on upstream

| Package | Reason | Action |
|---------|--------|--------|
| ~~`tar` via `@mapbox/node-pre-gyp`~~ | Resolved via npm overrides on 2026-03-05 | No further action needed |

---

## Update — 2026-06-02

Re-audited and remediated.

| Workspace | Before | After |
|-----------|--------|-------|
| Frontend | 6 (this doc) | **0** — Vite 7 / react-pdf 10 / pdfjs-dist 5 upgrades already applied; `tar` override still in place |
| Backend | 16 (15 moderate, 1 high) | **3 moderate, 0 high** |

**Backend actions:**
- Removed unused deps `@anthropic-ai/sdk` and `file-type` (not imported anywhere).
- `npm audit fix` (non-breaking) → cleared the **High** `tmp` path-traversal advisory + `ws`, `engine.io`, `socket.io-adapter`, `qs`, `express`, `brace-expansion`.
- `nodemailer` **7 → 8.0.10** (fixes SMTP command-injection advisory; `emailService.js` load-verified).
- `googleapis` **128 → 173** (clears transitive `gaxios`/`googleapis-common`/`uuid`; Sheets export modules load-verified).
- `multer` **1.x → 2.1.1** (1.x is EOL; API-compatible) and `supertest` **6 → 7.2.2** (dev-only).

**Remaining (3, moderate, accepted):** transitive `uuid` "missing buffer bounds check" via `exceljs` and `sequelize`. The only npm-offered fix is a **major downgrade** of those libraries (would break the ORM / lose spreadsheet features), so it was not applied. Low real-world risk — the bug requires passing a `buf` argument to UUID v3/v5/v6 generation, which neither library does with untrusted input. Re-evaluate when `exceljs`/`sequelize` ship releases that depend on `uuid` ≥ 11.1.1.

**Not changed:** `puppeteer` (no current advisory); `socket.io` remains installed but is unused in code (`ioredis` is the only realtime/cache dep actually wired up) — candidate for removal as cleanup, not security.

## CI/CD Recommendation

Add `npm audit --audit-level=high` to the CI pipeline so new high/critical vulnerabilities are caught automatically on every dependency change.
