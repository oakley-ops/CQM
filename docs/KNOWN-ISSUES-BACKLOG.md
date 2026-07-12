# CQM / NEXUS — Known Issues & Proposed Sprint Backlog

Triaged snapshot for the acceptance review and sprint kickoff. Pairs with [DEPLOYMENT-READINESS.md](./DEPLOYMENT-READINESS.md).

---

## Fixed in the current cycle

These landed on `cqm-transformation` and are verified (build green, backend unit tests pass, controller + validator logic exercised directly):

- **Coversheet data was silently dropped.** ~22 audit fields the UI edits (site code, contacts, staff counts, production volumes, audit conclusions) had no DB columns. Added migration `061` + model fields; data now persists.
- **Audit-record writes hardened.** Request bodies pass through a field allowlist (no more setting `id`/`created_by`/timestamps); a second active audit cycle is rejected with 409; an explicit `next_audit_date` is no longer overwritten by the grade recalculation.
- **Dismissed watchdog alerts stay dismissed** (previously recreated every 15 min).
- **UI aligned to real audit statuses/columns** (`closed` vs the never-existent `completed`/`archived`; correct column names so edits persist).
- **Request validation on all NEXUS mutation routes** (`nexusValidators.js`) — bad enums/types/IDs now return a clean 400.
- **Production build is green** (`npm run build`) — fixed ~30 pre-existing TypeScript errors, including wiring several test-entry form inputs that were computed on but had no control, and the previously-unreachable "Manage Tests" dialog.
- **CI pipeline** (`.github/workflows/ci.yml`) — frontend typecheck+build and backend unit tests run on every push/PR, green on first run. Dev workflow documented in [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Open issues (triaged)

Severity: **S1** blocks safe production use · **S2** should fix before or during sprint 1 · **S3** cleanup / nice-to-have.

| # | Sev | Area | Issue | Suggested fix |
|---|----|------|-------|---------------|
| 1 | **S1** | Security | Default admin `admin@cqm.com` / `cqm123` created by `create-admin`. | Force a password change on first login, or provision the real admin during setup and remove the default. |
| 2 | **S1** | Config | `ANTHROPIC_API_KEY` is required by NEXUS AI (`new Anthropic()`) but is absent from `.env.example`; AI endpoints fail without it, with no graceful fallback. | Add to `.env.example`; gate AI features behind a flag so they no-op cleanly when unconfigured. |
| 3a | **S2** | CI | Frontend ESLint config extends `react-app`, which isn't installed — `npm run lint` errors, so it's excluded from CI. | Install a working ESLint/TS config, resolve resulting violations, add a lint step to `ci.yml`. |
| 3b | **S2** | CI/Tests | Backend integration suite (`tests/integration`) has pre-existing failures (legacy `/api/facilities` test; server bootstrap on a fixed port) so it's excluded from CI; only unit tests are gated. | Fix the integration suite (see #4) and add it as a CI step with the Postgres service already wired in `ci.yml`. |
| 4 | **S2** | Tests | Integration tests boot the real server on a hard-coded port 5000 and include a broken `/api/facilities` test; fail when the port is occupied (e.g. macOS AirPlay) and on the stale facilities assertion. | Bind an ephemeral port (`PORT=0`) in the harness; fix or remove the facilities test. Unblocks #3b. |
| 5 | **S2** | Data | NEXUS demo seed (`seed-nexus-demo.js`) creates fictional Idemia France / CPI Colorado sites — wrong for a Nashville-only deployment. | Replace with a Nashville seed (needs real company name, address, site code) or ship NEXUS empty. |
| 6 | **S3** | AI | NEXUS AI calls use `claude-sonnet-4-6` (previous generation). | Move to the current default model when the AI features are next touched. |
| 7 | **S3** | Data model | `CertStatus` has two vocabularies: the DB enum on `nexus_audit_components` (short labels: "CQM Certified", …) and the official cqmAP SelectionList (supplier-relationship labels). They don't map 1:1. | Decide the canonical vocabulary and reconcile model + UI + generated types. |
| 8 | **S3** | CQM forms | `OverlayPeelForm` component exists but is routed to no `test_id` (candidate: `#3015#`, the reference peel test, which currently falls through to a generic renderer). | Confirm the intended mapping with QA and wire it, or delete the component. |
| 9 | **S3** | Verify | The test-entry form inputs and "Manage Tests" button wired up while greening the build were previously dead code — they compile and render but need a QA pass to confirm the intended behavior/spec values. | QA walk-through of the affected CQM test forms. |
| 10 | **S3** | Data integrity | `Quote.js` had its Sequelize `project_id` → `projects` foreign-key reference removed (pre-existing uncommitted change, unrelated to NEXUS). | Confirm intentional; if not, restore the reference. |
| 11 | **S3** | Frontend | Single JS bundle is ~2.1 MB (593 KB gzipped). | Code-split with dynamic imports / `manualChunks` for faster first load. |

---

## Proposed Sprint 1 backlog (prioritized)

Starting point for planning — reorder with the senior engineer.

1. **Production hardening** (issues #1, #2) — default credential, `JWT_SECRET`, AI key handling, CORS. Blocks any real deployment.
2. **Nashville data** (#5) — replace demo seed with the real site; verify the one-active-cycle flow end to end.
3. **Enforce + expand CI** (#3a, #3b, #4) — CI is live (build + unit tests). Turn on branch protection with the two checks required (see CONTRIBUTING.md); fix the integration suite and lint config, then add them as required checks.
4. **Test reliability** (#4) — ephemeral port so the integration suite runs anywhere; then expand NEXUS integration coverage (audit CRUD, CAPA, validators).
5. **User management for real plant users** — provision the actual quality engineers with correct roles; document the role model for auditors.
6. **Deployment runbook** — concrete steps for the plant's host (process manager, reverse proxy, backups, log retention), building on DEPLOYMENT-READINESS.md.
7. **QA pass on CQM test forms** (#8, #9) — confirm the wired inputs and form routing against the CQMAP spec.

---

## Design decisions worth knowing (context for reviewers)

- **One active audit cycle at a time.** NEXUS models the Nashville plant's rolling CQMAP cycle; creating a second active record is intentionally blocked (409). Closed records form the cycle history.
- **Conformity monitoring reads live test data.** The NEXUS Conformity view pulls pass rates from the CQM `TestSession`/`TestEntry` tables — the two halves of the app are integrated, not siloed.
- **Readiness math mirrors the official cqmAP workbook** (six conformity buckets, `tbd` in the denominator, `n/a` excluded). Rank suggestion is ours; the external auditor sets the official grade.
