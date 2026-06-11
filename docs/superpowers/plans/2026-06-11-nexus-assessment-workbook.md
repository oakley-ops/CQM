# NEXUS Assessment Workbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single guided "Assessment Workbook" page that mirrors the cqmAP V3.A document — scope-driven chapters, one-tap conformity rows, doc-faithful readiness math, and export to the official CQMAP xlsx + an internal readiness PDF.

**Architecture:** New read-only aggregate/readiness/export endpoints under the existing `/api/nexus` mount (writes reuse existing endpoints); a pure readiness-math util mirrors the official xlsx formulas; one new React page + small components under `components/nexus/workbook/`. No schema changes, no migrations.

**Tech Stack:** Node/Express + Sequelize (backend), Jest + supertest (backend tests), exceljs (xlsx export), puppeteer via `services/pdfService` (PDF), React 18 + MUI + TypeScript (frontend).

**Spec:** `docs/superpowers/specs/2026-06-11-nexus-assessment-workbook-design.md`

## Verified facts the plan relies on (do not re-derive)

These were extracted from the official workbook `docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx` and the codebase. Trust them:

1. **Percentage math (sheet "Audit Scope & Compliance", rows 12+):** per scope row, the xlsx counts six conformity buckets `NCC, NC+, nc-, RI, Full, tbd`; `Sum = NCC+NC+ + nc- + RI + Full + tbd` (tbd **included**); each `%` column = `count / Sum`. `n/a` is not one of the six counted buckets.
2. **Rank is NOT computed in the xlsx** — it is auditor-entered (SelectionLists "Auditor Verdict": `A,B,C,D,n/a,tbd`). We therefore define our own *suggestion* heuristic (severity ladder): `NCC>0 → D`, else `NC+>0 → C`, else `nc->0 → B`, else (something assessed) `A`, else no suggestion. This is a documented spec deviation.
3. **Official sheet layouts** (1-based rows; data starts at row 7):
   - **Coversheet:** `D5`=Company, `D6`=Site, `D7`=Street, `D8`=City, `D9`=Province/State, `D10`=Country, `D11`=Primary contact ("Name: / E-mail: / Phone:" one cell), `D12`=Audit contact, `D13`=Customer ID, `D14`=CVCS Reference, `C33`=Staff total, `D33`=Staff in production, rows 36–45: `B`=category code / `C`=total volume / `D`=banking volume.
   - **"Audit Scope & Compliance":** product rows 12–200; col `B`=product label (e.g. `kIC - contact IC`), `C`=Include (Yes/No), `D`=Audited (Yes/No), `E`=Rank. Match rows by reading column B, never by hardcoded row numbers.
   - **QMS sheets** (`QMS - has 9001 Cert`, `QMS - NO 9001 Cert`): col `A`=requirement tag, `B`=section, `C`=title, `I`=vendor comment, `J`=auditor conformity. Match rows by column A tag.
   - **Category sheets** (`ic icm il cb icc p iacicm bsm iacil iac`): col `A`=process tag, `C`=name, `J`=vendor compliance (Yes/Procedure only/Practice only/No/tbd/n/a), `K`=vendor site, `M`=process spec ref, `P`=control plan ref, `S`=production equipment, `T`=test equipment, `V`=conformity, `X`=auditor notes. Match rows by column A tag.
4. **CAPAs are auto-created** by `backend/utils/nexusCapa.js#ensureCapaForFinding` whenever a QMS row or process step is updated to `NC+/nc-/NCC` — the workbook UI shows a CAPA **badge** (with link), it does NOT need a "Create CAPA?" prompt. (Spec deviation: simpler than spec'd.)
5. **`POST /api/nexus/audits/:id/scope` seeds all process steps** for the scope's category from `seed-data/nexus/process-steps.json` (productScopeController.js:30). Multiple scope rows per category each get their own duplicate step set — that's why Task 3 adds a `seed_steps:false` option for variant rows.
6. **Conformity values in `nexus_process_step_assessments`** include suffixed variants (`'NC+ (Subcontractor)'`, `'Not assessed (timing constraints)'`, …) — readiness math must normalize them (strip ` (Subcontractor)`, map `Not assessed*` → `tbd`).
7. **`TestDefinition.test_id`** uses the same canonical tags as cqmAP product requirements (e.g. `#3015#`), so "evidence available" = row tag exists in the `test_definitions` table.
8. **Existing write endpoints reused by the workbook UI** (never duplicate them):
   - `PATCH /api/nexus/audits/:id` (audit fields), `PATCH .../qms/:requirementId`, `POST .../scope`, `PATCH .../scope/:scopeId`, `PATCH .../scope/:scopeId/steps/:stepId`, plan/review/item endpoints (`routes/nexus.js:61-68`).
   - `PATCH .../scope/:scopeId` already enforces the #0706# gate when setting rank A/B/C (productScopeController.js:59) — the readiness UI must surface its 422 response, not bypass it.
9. **Backend tests** run serially against a force-synced `cqm_test` DB; each new test file does its own `sequelize.sync({force:true})` + user seeding (copy the pattern from `tests/integration/cqm.integration.test.js:32-71`). Auth header: `Authorization: Bearer <token>` from `POST /api/auth/login`.
10. **Frontend has no test infra.** Verification = `npx tsc --noEmit` + `npm run lint` + manual run. There is no `npm run test:frontend`.

## File structure

**Backend (create):**
- `backend/utils/nexusReadiness.js` — pure math: normalize, summarize, suggestRank (no DB).
- `backend/controllers/nexus/workbookController.js` — `getWorkbook`, `getReadiness`.
- `backend/services/cqmapExportService.js` — fills the official template; returns an ExcelJS workbook.
- `backend/controllers/nexus/exportController.js` — `exportCqmap` (xlsx), `exportReadiness` (PDF).
- `backend/seed-data/nexus/scope-catalog.json` — the doc's scope table (categories → variants).
- `backend/templates/cqmAP-3a-template.xlsx` — copy of the official workbook (committed binary).
- `backend/tests/unit/nexusReadiness.test.js`, `backend/tests/integration/workbook.integration.test.js`

**Backend (modify):**
- `backend/routes/nexus.js` — mount 4 GET routes.
- `backend/controllers/nexus/productScopeController.js` — honor `seed_steps:false` in createScope.

**Frontend (create):**
- `frontend/src/types/nexus/workbook.ts` — workbook/readiness types.
- `frontend/src/services/nexus/workbookService.ts` — typed API wrappers.
- `frontend/src/pages/nexus/WorkbookPage.tsx` — page shell, chapter state, optimistic saves.
- `frontend/src/components/nexus/workbook/ChapterRail.tsx` — left nav + progress.
- `frontend/src/components/nexus/workbook/ConformityChips.tsx` — one-tap conformity.
- `frontend/src/components/nexus/workbook/RequirementRow.tsx` — universal row.
- `frontend/src/components/nexus/workbook/SiteProfileChapter.tsx`
- `frontend/src/components/nexus/workbook/ScopeChapter.tsx`
- `frontend/src/components/nexus/workbook/AssessmentChapter.tsx` — shared QMS/category list (keyboard nav, next-unassessed).
- `frontend/src/components/nexus/workbook/PlanDrawer.tsx` — qualification plan side drawer.
- `frontend/src/components/nexus/workbook/ReadinessChapter.tsx`

**Frontend (modify):**
- `frontend/src/App.tsx` — route `nexus/audits/:id/workbook`.
- `frontend/src/pages/nexus/AuditDetailPage.tsx` — "Open Workbook" primary CTA.

---

### Task 1: Readiness math util (`nexusReadiness.js`)

**Files:**
- Create: `backend/utils/nexusReadiness.js`
- Test: `backend/tests/unit/nexusReadiness.test.js`

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/unit/nexusReadiness.test.js
const {
  normalizeConformity,
  summarizeConformities,
  suggestRank,
} = require('../../utils/nexusReadiness');

describe('normalizeConformity', () => {
  test.each([
    ['Full', 'Full'],
    ['NC+', 'NC+'],
    ['NC+ (Subcontractor)', 'NC+'],
    ['Full (Subcontractor)', 'Full'],
    ['Not assessed (timing constraints)', 'tbd'],
    ['Not assessed (Subcontractor)', 'tbd'],
    ['n/a', 'n/a'],
    [null, 'tbd'],
    [undefined, 'tbd'],
    ['garbage', 'tbd'],
  ])('maps %s → %s', (input, expected) => {
    expect(normalizeConformity(input)).toBe(expected);
  });
});

describe('summarizeConformities (xlsx-faithful: % = count / total-incl-tbd, n/a excluded)', () => {
  test('hand-computed fixture: 2 Full, 1 RI, 1 nc-, 1 NC+, 1 NCC, 2 tbd, 1 n/a', () => {
    const s = summarizeConformities([
      'Full', 'Full', 'RI', 'nc-', 'NC+', 'NCC', 'tbd', 'tbd', 'n/a',
    ]);
    expect(s.counts).toEqual({ NCC: 1, 'NC+': 1, 'nc-': 1, RI: 1, Full: 2, tbd: 2, 'n/a': 1 });
    expect(s.total).toBe(8);            // 9 rows minus the n/a row
    expect(s.assessed).toBe(6);         // total minus tbd
    expect(s.pct.Full).toBe(25);        // 2/8
    expect(s.pct.NCC).toBe(12.5);       // 1/8
    expect(s.pct.tbd).toBe(25);         // 2/8 — tbd is in the denominator, per the xlsx
    expect(s.complete).toBe(false);
  });

  test('subcontractor variants are folded into base buckets', () => {
    const s = summarizeConformities(['Full (Subcontractor)', 'NC+ (Subcontractor)']);
    expect(s.counts.Full).toBe(1);
    expect(s.counts['NC+']).toBe(1);
  });

  test('empty input → null percentages, not NaN', () => {
    const s = summarizeConformities([]);
    expect(s.total).toBe(0);
    expect(s.pct.Full).toBeNull();
    expect(s.complete).toBe(false);
  });

  test('complete when no tbd remains', () => {
    expect(summarizeConformities(['Full', 'RI']).complete).toBe(true);
  });
});

describe('suggestRank (severity ladder — OURS, not in the official xlsx)', () => {
  const sum = (vals) => summarizeConformities(vals);
  test('NCC anywhere → D', () => expect(suggestRank(sum(['Full', 'NCC']))).toBe('D'));
  test('NC+ (no NCC) → C', () => expect(suggestRank(sum(['Full', 'NC+']))).toBe('C'));
  test('nc- (no NC+/NCC) → B', () => expect(suggestRank(sum(['Full', 'nc-']))).toBe('B'));
  test('only Full/RI → A', () => expect(suggestRank(sum(['Full', 'RI']))).toBe('A'));
  test('partially assessed still suggests from findings so far', () =>
    expect(suggestRank(sum(['nc-', 'tbd']))).toBe('B'));
  test('nothing assessed → null', () => expect(suggestRank(sum(['tbd', 'tbd']))).toBeNull());
  test('empty → null', () => expect(suggestRank(sum([]))).toBeNull());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/unit/nexusReadiness.test.js`
Expected: FAIL — `Cannot find module '../../utils/nexusReadiness'`

- [ ] **Step 3: Write the implementation**

```js
// backend/utils/nexusReadiness.js
/**
 * Pure readiness math for the NEXUS Assessment Workbook.
 *
 * Percentage semantics mirror the official cqmAP V3.A workbook
 * ("Audit Scope & Compliance" rows 12+): six buckets, tbd included in the
 * denominator, n/a outside the table math entirely.
 *
 * Rank suggestion is OURS (the official workbook leaves Rank to the auditor):
 * severity ladder NCC→D, NC+→C, nc-→B, else A.
 */

const BASE_BUCKETS = ['NCC', 'NC+', 'nc-', 'RI', 'Full', 'tbd'];

function normalizeConformity(value) {
  if (!value) return 'tbd';
  if (String(value).startsWith('Not assessed')) return 'tbd';
  const base = String(value).replace(/ \(Subcontractor\)$/, '');
  if (base === 'n/a') return 'n/a';
  return BASE_BUCKETS.includes(base) ? base : 'tbd';
}

function summarizeConformities(values) {
  const counts = { NCC: 0, 'NC+': 0, 'nc-': 0, RI: 0, Full: 0, tbd: 0, 'n/a': 0 };
  for (const v of values) counts[normalizeConformity(v)] += 1;

  const total = BASE_BUCKETS.reduce((acc, k) => acc + counts[k], 0); // excludes n/a
  const pct = {};
  for (const k of BASE_BUCKETS) {
    pct[k] = total > 0 ? Math.round((counts[k] / total) * 1000) / 10 : null;
  }
  const assessed = total - counts.tbd;
  return { counts, total, assessed, pct, complete: total > 0 && counts.tbd === 0 };
}

function suggestRank(summary) {
  if (!summary || summary.assessed === 0) return null;
  const c = summary.counts;
  if (c.NCC > 0) return 'D';
  if (c['NC+'] > 0) return 'C';
  if (c['nc-'] > 0) return 'B';
  return 'A';
}

module.exports = { normalizeConformity, summarizeConformities, suggestRank, BASE_BUCKETS };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/unit/nexusReadiness.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add backend/utils/nexusReadiness.js backend/tests/unit/nexusReadiness.test.js
git commit -m "feat(nexus): readiness math util - xlsx-faithful percentages, rank ladder"
```

---

### Task 2: Scope catalog seed + `seed_steps` flag on createScope

**Files:**
- Create: `backend/seed-data/nexus/scope-catalog.json`
- Modify: `backend/controllers/nexus/productScopeController.js:29-41`
- Test: `backend/tests/integration/workbook.integration.test.js` (started here, extended in Tasks 3–4)

- [ ] **Step 1: Create the scope catalog**

Content is the doc's "Audit Scope & Conformity Levels" table (`docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.md` lines 17–142). The `label` strings MUST match the doc/xlsx exactly (they are the xlsx row-match keys). First entry of each category is the "Any" row — the workbook treats it as the category's **primary** row (owns the steps + chapter).

```json
{
  "qms": {
    "label": "QMS",
    "variants": [
      { "label": "QMS - Vendor has 9001 Certificate" },
      { "label": "QMS - Vendor has NO ISO 9001 Certificate" }
    ]
  },
  "ic": {
    "label": "IC - Integrated Circuit",
    "variants": [
      { "label": "IC - Any IC Activity", "primary": true },
      { "label": "kIC - contact IC" },
      { "label": "pIC - proximity IC" },
      { "label": "tstIC - test IC Wafer" },
      { "label": "bckIC - backside treatment of IC Wafer" },
      { "label": "rdlIC - Apply redistribution layer onto IC Wafer" },
      { "label": "bmpIC - bumping the IC Wafer" },
      { "label": "sawIC - sawing the IC Wafer" },
      { "label": "venIC - Vendor for IC" },
      { "label": "subIC - Subcontractor to IC Vendor" },
      { "label": "devIC - develop IC" },
      { "label": "quaIC - qualify IC" },
      { "label": "prdIC - produce IC" }
    ]
  },
  "icm": {
    "label": "ICM - IC Module",
    "variants": [
      { "label": "ICM - Any ICM Activity", "primary": true },
      { "label": "kICM - contact ICM" },
      { "label": "pICM - proximity ICM" },
      { "label": "aICM - antenna ICM" },
      { "label": "venICM - Vendor for ICM" },
      { "label": "subICM - Subcontractor to ICM Vendor" },
      { "label": "devICM - develop ICM" },
      { "label": "quaICM - qualify ICM" },
      { "label": "prdICM - produce ICM" }
    ]
  },
  "il": {
    "label": "IL - Inlay",
    "variants": [
      { "label": "IL - Any Inlay Activity", "primary": true },
      { "label": "aIL - antenna Inlay" },
      { "label": "kIL - contact Inlay" },
      { "label": "pIL - proximity Inlay" },
      { "label": "icIL - IC Inlay" },
      { "label": "mIL - Module Inlay" },
      { "label": "venIL - Vendor for IL" },
      { "label": "subIL - Subcontractor to IL Vendor" },
      { "label": "devIL - develop IL" },
      { "label": "quaIL - qualify IL" },
      { "label": "prdIL - produce IL" }
    ]
  },
  "cb": {
    "label": "CB - Cardbody",
    "variants": [
      { "label": "CB - Any Cardbody", "primary": true },
      { "label": "ilCB - inlay Cardbody" },
      { "label": "plCB - plastic Cardbody" },
      { "label": "meCB - metal Cardbody" },
      { "label": "woCB - wooden Cardbody" },
      { "label": "paCB - paper Cardbody" },
      { "label": "venCB - Vendor for CB" },
      { "label": "subCB - Subcontractor to CB Vendor" },
      { "label": "devCB - develop CB" },
      { "label": "quaCB - qualify CB" },
      { "label": "prdCB - produce CB" }
    ]
  },
  "icc": {
    "label": "ICC - IC Card - Card containing an IC",
    "variants": [
      { "label": "ICC - Any IC Card", "primary": true },
      { "label": "kICC - contact ICC" },
      { "label": "pICC - proximity ICC" },
      { "label": "mICC - module based ICC" },
      { "label": "ilICC - inlay based ICC" },
      { "label": "plICC - plastic ICC" },
      { "label": "meICC - metal ICC" },
      { "label": "woICC - wooden ICC" },
      { "label": "paICC - paper ICC" },
      { "label": "ledICC - led ICC" },
      { "label": "venICC - Vendor for ICC" },
      { "label": "subICC - Subcontractor to ICC Vendor" },
      { "label": "devICC - develop ICC" },
      { "label": "quaICC - qualify ICC" },
      { "label": "prdICC - produce ICC" }
    ]
  },
  "p": {
    "label": "P - Personalized card",
    "variants": [
      { "label": "P - Any Personalisation activity", "primary": true },
      { "label": "kP - contact Personalization" },
      { "label": "pP - proximity Personalization" },
      { "label": "mP - magnetic stripe Personalization" },
      { "label": "eP - embossing Personalization" },
      { "label": "tP - thermal transfer Personalization" },
      { "label": "iP - indent Personalization" },
      { "label": "lP - laser Personalization" },
      { "label": "dP - drop-on-demand Personalization" },
      { "label": "ic2P - indent CVC2 Personalization" },
      { "label": "venP - Vendor for Personalization" },
      { "label": "subP - Subcontractor to Personalization Vendor" },
      { "label": "devP - develop Personalization Profiles" },
      { "label": "quaP - qualify Personalization Profiles" },
      { "label": "prdP - produce Personalization" }
    ]
  },
  "iacicm": {
    "label": "iacICM - Module for producing IAC",
    "variants": [
      { "label": "IACICM - Any IACICM Activity", "primary": true },
      { "label": "kIACICM - contact IACICM" },
      { "label": "pIACICM - proximity IACICM" },
      { "label": "aIACICM - antenna IACICM" },
      { "label": "dIACICM - display IACICM" },
      { "label": "venIACICM - Vendor for IACICM" },
      { "label": "subIACICM - Subcontractor to IACICM Vendor" },
      { "label": "devIACICM - develop IACICM" },
      { "label": "quaIACICM - qualify IACICM" },
      { "label": "prdIACICM - produce IACICM" }
    ]
  },
  "bsm": {
    "label": "BSM - Biometric Sensor Module",
    "variants": [
      { "label": "BSM - any Biometric Sensor Module", "primary": true },
      { "label": "fpBSM - fingerprint BSM" },
      { "label": "vcBSM - voice BSM" },
      { "label": "imBSM - Biometric Sensor Module with an Image Sensor" },
      { "label": "venBSM - Vendor for BSM" },
      { "label": "subBSM - Subcontractor to BSM Vendor" },
      { "label": "devBSM - develop BSM" },
      { "label": "quaBSM - qualify BSM" },
      { "label": "prdBSM - produce BSM" }
    ]
  },
  "iacil": {
    "label": "iacIL - Inlay for producing IAC",
    "variants": [
      { "label": "IACIL - Any IACIL", "primary": true },
      { "label": "aIACIL - antenna IACIL" },
      { "label": "kIACIL - contact IACIL" },
      { "label": "pIACIL - proximity IACIL" },
      { "label": "icIACIL - ic IACIL" },
      { "label": "ledIACIL - led IACIL" },
      { "label": "mIACIL - module IACIL" },
      { "label": "cIACIL - chip IACIL" },
      { "label": "venIACIL - Vendor for IACIL" },
      { "label": "subIACIL - Subcontractor to IACIL Vendor" },
      { "label": "devIACIL - develop IACIL" },
      { "label": "quaIACIL - qualify IACIL" },
      { "label": "prdIACIL - produce IACIL" }
    ]
  },
  "iac": {
    "label": "IAC - Interactive Card",
    "variants": [
      { "label": "IAC - Any InterActive Card", "primary": true },
      { "label": "kIAC - contact IAC" },
      { "label": "pIAC - proximity IAC" },
      { "label": "mIAC - module IAC" },
      { "label": "ilIAC - inlay IAC" },
      { "label": "icIAC - ic IAC" },
      { "label": "dIAC - display IAC" },
      { "label": "fpIAC - fingerprint IAC" },
      { "label": "vcIAC - voice IAC" },
      { "label": "ledIAC - led IAC" },
      { "label": "btIAC - bluetooth IAC" },
      { "label": "venIAC - Vendor for IAC" },
      { "label": "subIAC - Subcontractor to IAC Vendor" },
      { "label": "devIAC - develop IAC" },
      { "label": "quaIAC - qualify IAC" },
      { "label": "prdIAC - produce IAC" }
    ]
  }
}
```

Note: the `qms` key exists only for the export's scope-sheet rows; the workbook UI does not render a QMS entry in the Scope chapter (QMS is its own chapter driven by `iso_9001_certified`).

- [ ] **Step 2: Start the integration test file with a failing test for `seed_steps:false`**

```js
// backend/tests/integration/workbook.integration.test.js
/**
 * NEXUS Assessment Workbook integration tests.
 * Own DB rebuild + user seeding (same pattern as cqm.integration.test.js).
 */
const request = require('supertest');
const app = require('../../server');
const {
  sequelize, User, NexusProcessStepAssessment,
} = require('../../models');

const PASSWORD = 'Passw0rd!';
let token;
let auditId;

const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
  await sequelize.sync({ force: true });

  await User.create({
    username: 'wb_admin', email: 'wb_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'WB', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'wb_admin', password: PASSWORD });
  token = login.body.data.token;

  const audit = await request(app).post('/api/nexus/audits').set(auth())
    .send({ site_name: 'WB Test Site', company: 'WB Test Co', iso_9001_certified: true });
  auditId = audit.body.id;
});

afterAll(async () => { await sequelize.close(); });

describe('createScope seed_steps flag', () => {
  test('default POST /scope seeds process steps', async () => {
    const res = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
      .send({ product_category: 'icc', product_variant: 'ICC - Any IC Card', in_scope: true });
    expect(res.status).toBe(201);
    expect(res.body.steps_seeded).toBeGreaterThan(0);
    const steps = await NexusProcessStepAssessment.count({ where: { product_scope_id: res.body.id } });
    expect(steps).toBe(res.body.steps_seeded);
  });

  test('POST /scope with seed_steps:false creates the scope row but NO steps', async () => {
    const res = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
      .send({ product_category: 'icc', product_variant: 'plICC - plastic ICC', in_scope: true, seed_steps: false });
    expect(res.status).toBe(201);
    expect(res.body.steps_seeded).toBe(0);
    const steps = await NexusProcessStepAssessment.count({ where: { product_scope_id: res.body.id } });
    expect(steps).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify the second case fails**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: first test PASS, `seed_steps:false` test FAIL (steps still seeded)

- [ ] **Step 4: Implement the flag in createScope**

In `backend/controllers/nexus/productScopeController.js`, replace the body of `createScope` (lines 22–48) with:

```js
exports.createScope = async (req, res) => {
  try {
    const { seed_steps, ...scopeFields } = req.body;
    const scope = await NexusProductScope.create({
      audit_record_id: Number(req.params.id),
      ...scopeFields,
    });

    // Seed process steps for this product category. Variant rows created by the
    // workbook's Scope chapter pass seed_steps:false — only the category's
    // primary scope row owns an assessment step set.
    let seeded = 0;
    if (seed_steps !== false) {
      const steps = processStepsData[scope.product_category] || [];
      if (steps.length > 0) {
        await NexusProcessStepAssessment.bulkCreate(
          steps.map(s => ({
            product_scope_id: scope.id,
            process_tag: s.process_tag,
            process_name: s.process_name,
            conformity: 'tbd',
          }))
        );
        seeded = steps.length;
        logger.info(`NEXUS: Seeded ${seeded} process steps for scope ${scope.id} (${scope.product_category})`);
      }
    }

    res.status(201).json({ ...scope.toJSON(), steps_seeded: seeded });
  } catch (err) {
    logger.error('createScope error', err);
    res.status(500).json({ error: 'Failed to create product scope' });
  }
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: PASS (both tests)

- [ ] **Step 6: Commit**

```bash
git add backend/seed-data/nexus/scope-catalog.json backend/controllers/nexus/productScopeController.js backend/tests/integration/workbook.integration.test.js
git commit -m "feat(nexus): scope catalog seed + seed_steps flag for variant scope rows"
```

---

### Task 3: Workbook aggregate + readiness endpoints

**Files:**
- Create: `backend/controllers/nexus/workbookController.js`
- Modify: `backend/routes/nexus.js` (after line 52, the scope block)
- Test: `backend/tests/integration/workbook.integration.test.js` (extend)

- [ ] **Step 1: Add failing integration tests**

Append to `backend/tests/integration/workbook.integration.test.js`:

```js
describe('GET /api/nexus/audits/:id/workbook', () => {
  test('returns chapters in doc order with rows and progress', async () => {
    const res = await request(app).get(`/api/nexus/audits/${auditId}/workbook`).set(auth());
    expect(res.status).toBe(200);

    const kinds = res.body.chapters.map(c => c.kind);
    expect(kinds[0]).toBe('site-profile');
    expect(kinds[1]).toBe('scope');
    expect(kinds[2]).toBe('qms');
    expect(kinds[kinds.length - 1]).toBe('readiness');

    // icc was put in scope in the previous describe block → category chapter exists
    const icc = res.body.chapters.find(c => c.kind === 'category' && c.category === 'icc');
    expect(icc).toBeDefined();
    expect(icc.rows.length).toBeGreaterThan(0);
    expect(icc.rows[0]).toHaveProperty('process_tag');
    expect(icc.rows[0]).toHaveProperty('conformity');
    expect(icc.progress.total).toBe(icc.rows.length);

    const qms = res.body.chapters.find(c => c.kind === 'qms');
    expect(qms.rows.length).toBeGreaterThan(0);
    expect(qms.rows[0]).toHaveProperty('requirement_id');

    expect(res.body).toHaveProperty('scopeCatalog');
    expect(res.body).toHaveProperty('capas');
    expect(Array.isArray(res.body.testEvidenceTags)).toBe(true);
  });

  test('404 for a missing audit', async () => {
    const res = await request(app).get('/api/nexus/audits/999999/workbook').set(auth());
    expect(res.status).toBe(404);
  });
});

describe('GET /api/nexus/audits/:id/readiness', () => {
  test('computes xlsx-faithful summaries and a rank suggestion', async () => {
    // Grade one icc step NC+ so a blocker + rank C suggestion appears.
    const wb = await request(app).get(`/api/nexus/audits/${auditId}/workbook`).set(auth());
    const icc = wb.body.chapters.find(c => c.kind === 'category' && c.category === 'icc');
    const step = icc.rows[0];
    await request(app)
      .patch(`/api/nexus/audits/${auditId}/scope/${icc.scopeId}/steps/${step.id}`)
      .set(auth()).send({ conformity: 'NC+' });

    const res = await request(app).get(`/api/nexus/audits/${auditId}/readiness`).set(auth());
    expect(res.status).toBe(200);

    const cat = res.body.categories.find(c => c.category === 'icc');
    expect(cat.summary.counts['NC+']).toBe(1);
    expect(cat.rankSuggestion).toBe('C');

    const blockerTags = res.body.blockers.map(b => b.tag);
    expect(blockerTags).toContain(step.process_tag);
    expect(res.body.qms.summary.total).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: new describes FAIL with 404 (routes don't exist)

- [ ] **Step 3: Implement the controller**

```js
// backend/controllers/nexus/workbookController.js
const {
  NexusAuditRecord, NexusQmsAssessment, NexusProductScope,
  NexusProcessStepAssessment, NexusCapaItem, NexusQualificationPlan,
  TestDefinition,
} = require('../../models');
const { summarizeConformities, suggestRank } = require('../../utils/nexusReadiness');
const { evaluateGate } = require('../../utils/nexusGate');
const scopeCatalog = require('../../seed-data/nexus/scope-catalog.json');
const logger = require('../../utils/logger');

const CATEGORY_ORDER = ['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac'];

// The cqmAP qualification/D&D spine tags get the "Open Qualification Plan" action.
const QUALIFICATION_SPINE = new Set([
  '#0651#', '#0582#', '#0654#', '#0652#', '#0653#', '#0571#', '#0706#',
  '#0552#', '#0553#', '#0581#', '#0501#', '#0502#',
]);

const SITE_PROFILE_FIELDS = [
  'company', 'site_name', 'address_line1', 'city', 'country_code',
  'primary_contact_name', 'primary_contact_email',
];

function progressOf(rows, conformityOf) {
  const total = rows.length;
  const done = rows.filter(r => {
    const c = conformityOf(r);
    return c && c !== 'tbd' && !String(c).startsWith('Not assessed');
  }).length;
  return { done, total };
}

/** Group steps into the doc's three sub-sections by tag shape. */
function sectionOf(tag) {
  if (QUALIFICATION_SPINE.has(tag)) return 'qualification';
  if (/^#\d{4}#$/.test(tag)) return /^#[2-3]\d{3}#$/.test(tag) ? 'product' : 'qualification';
  return 'process'; // #A10#, #B20#, #L10#, #X00#, #Y10#, ...
}

async function loadWorkbookData(auditId) {
  const audit = await NexusAuditRecord.findByPk(auditId);
  if (!audit) return null;

  const [qmsRows, scopes, capas, testDefs] = await Promise.all([
    NexusQmsAssessment.findAll({ where: { audit_record_id: auditId }, order: [['section', 'ASC']] }),
    NexusProductScope.findAll({ where: { audit_record_id: auditId }, order: [['product_category', 'ASC'], ['id', 'ASC']] }),
    NexusCapaItem.findAll({ where: { audit_record_id: auditId } }),
    TestDefinition.findAll({ attributes: ['test_id'] }),
  ]);

  // Primary scope row per in-scope category owns the chapter + steps.
  const primaryByCategory = new Map();
  for (const cat of CATEGORY_ORDER) {
    const catScopes = scopes.filter(s => s.product_category === cat && s.in_scope);
    if (catScopes.length === 0) continue;
    const primaryLabel = (scopeCatalog[cat]?.variants || []).find(v => v.primary)?.label;
    const primary = catScopes.find(s => s.product_variant === primaryLabel) || catScopes[0];
    primaryByCategory.set(cat, primary);
  }

  const stepsByScope = new Map();
  await Promise.all([...primaryByCategory.values()].map(async (scope) => {
    const steps = await NexusProcessStepAssessment.findAll({
      where: { product_scope_id: scope.id }, order: [['id', 'ASC']],
    });
    stepsByScope.set(scope.id, steps);
  }));

  return { audit, qmsRows, scopes, capas, testDefs, primaryByCategory, stepsByScope };
}

// GET /api/nexus/audits/:id/workbook
exports.getWorkbook = async (req, res) => {
  try {
    const data = await loadWorkbookData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Audit not found' });
    const { audit, qmsRows, scopes, capas, testDefs, primaryByCategory, stepsByScope } = data;

    const chapters = [];

    const filledProfile = SITE_PROFILE_FIELDS.filter(f => audit[f]).length;
    chapters.push({
      key: 'site-profile', kind: 'site-profile', title: 'Site Profile',
      progress: { done: filledProfile, total: SITE_PROFILE_FIELDS.length },
    });

    chapters.push({
      key: 'scope', kind: 'scope', title: 'Audit Scope',
      scopes: scopes.map(s => s.toJSON()),
      progress: { done: scopes.filter(s => s.in_scope).length > 0 ? 1 : 0, total: 1 },
    });

    chapters.push({
      key: 'qms', kind: 'qms',
      title: `QMS Requirements (${audit.iso_9001_certified ? 'ISO 9001 certified' : 'non-certified'})`,
      rows: qmsRows.map(r => r.toJSON()),
      progress: progressOf(qmsRows, r => r.conformity),
    });

    for (const cat of CATEGORY_ORDER) {
      const scope = primaryByCategory.get(cat);
      if (!scope) continue;
      const steps = stepsByScope.get(scope.id) || [];
      chapters.push({
        key: `cat-${cat}`, kind: 'category', category: cat, scopeId: scope.id,
        title: `${scopeCatalog[cat]?.label ?? cat.toUpperCase()} — Requirements`,
        rows: steps.map(s => ({ ...s.toJSON(), section: sectionOf(s.process_tag) })),
        progress: progressOf(steps, s => s.conformity),
      });
    }

    chapters.push({ key: 'readiness', kind: 'readiness', title: 'Readiness & Export', progress: null });

    // CAPA badges, keyed by "<source_type>:<source_entity_id>"
    const capaIndex = {};
    for (const c of capas) {
      if (c.source_type && c.source_entity_id) {
        capaIndex[`${c.source_type}:${c.source_entity_id}`] = {
          id: c.id, action_id: c.action_id, status: c.status, severity: c.severity,
        };
      }
    }

    res.json({
      audit: audit.toJSON(),
      chapters,
      capas: capaIndex,
      testEvidenceTags: testDefs.map(d => d.test_id).filter(Boolean),
      scopeCatalog,
    });
  } catch (err) {
    logger.error('getWorkbook error', err);
    res.status(500).json({ error: 'Failed to build workbook' });
  }
};

// GET /api/nexus/audits/:id/readiness
exports.getReadiness = async (req, res) => {
  try {
    const data = await loadWorkbookData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Audit not found' });
    const { qmsRows, primaryByCategory, stepsByScope } = data;

    const blockers = [];

    const qmsSummary = summarizeConformities(qmsRows.map(r => r.conformity));
    for (const r of qmsRows) {
      if (['NC+', 'NCC'].includes(r.conformity)) {
        blockers.push({ type: 'finding', chapterKey: 'qms', tag: r.requirement_id, title: r.title, detail: r.conformity });
      }
    }

    const categories = [];
    for (const [cat, scope] of primaryByCategory) {
      const steps = stepsByScope.get(scope.id) || [];
      const summary = summarizeConformities(steps.map(s => s.conformity));
      for (const s of steps) {
        const base = String(s.conformity).replace(/ \(Subcontractor\)$/, '');
        if (['NC+', 'NCC'].includes(base)) {
          blockers.push({ type: 'finding', chapterKey: `cat-${cat}`, tag: s.process_tag, title: s.process_name, detail: s.conformity });
        }
      }

      // #0706# gate state from the scope's latest qualification plan
      let gate = { hasPlan: false, passed: false, conditions: [] };
      const plan = await NexusQualificationPlan.findOne({
        where: { product_scope_id: scope.id }, order: [['created_at', 'DESC']],
      });
      if (plan) gate = { hasPlan: true, planId: plan.id, ...(await evaluateGate(plan)) };
      if (!gate.passed) {
        blockers.push({
          type: 'gate', chapterKey: `cat-${cat}`, tag: '#0706#',
          title: 'Qualification gate not passed',
          detail: gate.hasPlan ? 'One or more gate conditions failing' : 'No qualification plan exists',
        });
      }
      if (!summary.complete) {
        blockers.push({
          type: 'unassessed', chapterKey: `cat-${cat}`, tag: null,
          title: `${scopeCatalog[cat]?.label ?? cat}`, detail: `${summary.counts.tbd} requirement(s) unassessed`,
        });
      }

      categories.push({
        category: cat, scopeId: scope.id, label: scopeCatalog[cat]?.label ?? cat,
        currentRank: scope.rank === 't' ? null : scope.rank,
        summary, rankSuggestion: suggestRank(summary), gate,
      });
    }

    if (!qmsSummary.complete && qmsSummary.total > 0) {
      blockers.push({
        type: 'unassessed', chapterKey: 'qms', tag: null,
        title: 'QMS Requirements', detail: `${qmsSummary.counts.tbd} requirement(s) unassessed`,
      });
    }

    const ranks = categories.map(c => c.rankSuggestion).filter(Boolean);
    const worstRank = ['D', 'C', 'B', 'A'].find(r => ranks.includes(r)) ?? null;

    res.json({
      qms: { summary: qmsSummary, rankSuggestion: suggestRank(qmsSummary) },
      categories,
      blockers,
      overall: {
        complete: qmsSummary.complete && categories.every(c => c.summary.complete),
        worstRank,
      },
    });
  } catch (err) {
    logger.error('getReadiness error', err);
    res.status(500).json({ error: 'Failed to compute readiness' });
  }
};
```

(`NexusQualificationPlan` is already in the destructured import at the top of the file.)

- [ ] **Step 4: Mount the routes**

In `backend/routes/nexus.js`, add below the scope block (after line 52):

```js
const workbookCtrl = require('../controllers/nexus/workbookController');

// ── Assessment Workbook ───────────────────────────────────────────────────────
router.get('/audits/:id/workbook',   workbookCtrl.getWorkbook);
router.get('/audits/:id/readiness',  workbookCtrl.getReadiness);
```

(Put the `require` at the top with the other controller imports, line 17.)

- [ ] **Step 5: Run tests**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: PASS (all describes)

- [ ] **Step 6: Run the full backend suite to catch regressions**

Run: `cd backend && npm test`
Expected: PASS (pre-existing suites unaffected)

- [ ] **Step 7: Commit**

```bash
git add backend/controllers/nexus/workbookController.js backend/routes/nexus.js backend/tests/integration/workbook.integration.test.js
git commit -m "feat(nexus): workbook aggregate + readiness endpoints"
```

---

### Task 4: Official CQMAP xlsx export

**Files:**
- Create: `backend/templates/cqmAP-3a-template.xlsx` (copied binary), `backend/services/cqmapExportService.js`, `backend/controllers/nexus/exportController.js`
- Modify: `backend/routes/nexus.js`
- Test: `backend/tests/integration/workbook.integration.test.js` (extend)

- [ ] **Step 1: Copy the official template into the backend**

```powershell
New-Item -ItemType Directory -Force C:\Users\Fiser\CQM\CQM\backend\templates
Copy-Item "C:\Users\Fiser\CQM\CQM\docs\cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx" "C:\Users\Fiser\CQM\CQM\backend\templates\cqmAP-3a-template.xlsx"
```

- [ ] **Step 2: Write the failing test**

Append to `backend/tests/integration/workbook.integration.test.js`:

```js
const ExcelJS = require('exceljs');
const { buildCqmapWorkbook } = require('../../services/cqmapExportService');

describe('CQMAP xlsx export', () => {
  test('buildCqmapWorkbook fills coversheet, scope, QMS, and category cells', async () => {
    // Make the data distinctive first.
    await request(app).patch(`/api/nexus/audits/${auditId}`).set(auth())
      .send({ city: 'Burlington', country_code: 'US', primary_contact_name: 'Jane QA' });
    const qms = await request(app).get(`/api/nexus/audits/${auditId}/qms`).set(auth());
    const firstQms = qms.body[0];
    await request(app).patch(`/api/nexus/audits/${auditId}/qms/${firstQms.requirement_id}`).set(auth())
      .send({ conformity: 'Full', vendor_compliance: 'Documented in QM-001' });

    const wb = await buildCqmapWorkbook(auditId);

    const cover = wb.getWorksheet('Coversheet');
    expect(cover.getCell('D5').value).toBe('WB Test Co');
    expect(cover.getCell('D6').value).toBe('WB Test Site');
    expect(cover.getCell('D8').value).toBe('Burlington');

    // Scope sheet: the icc "Any" row was put in scope in Task 2's tests.
    const scopeWs = wb.getWorksheet('Audit Scope & Compliance');
    let iccRowFound = false;
    scopeWs.eachRow((row) => {
      if (row.getCell('B').value === 'ICC - Any IC Card') {
        iccRowFound = true;
        expect(row.getCell('C').value).toBe('Yes');
      }
    });
    expect(iccRowFound).toBe(true);

    // QMS sheet (ISO-certified variant): matched by tag in column A.
    const qmsWs = wb.getWorksheet('QMS - has 9001 Cert');
    let qmsRowFound = false;
    qmsWs.eachRow((row) => {
      if (row.getCell('A').value === firstQms.requirement_id) {
        qmsRowFound = true;
        expect(row.getCell('J').value).toBe('Full');
        expect(row.getCell('I').value).toBe('Documented in QM-001');
      }
    });
    expect(qmsRowFound).toBe(true);

    // Category sheet: the NC+ step from Task 3's readiness test.
    const iccWs = wb.getWorksheet('icc');
    let stepFound = false;
    iccWs.eachRow((row) => {
      if (row.getCell('V').value === 'NC+') stepFound = true;
    });
    expect(stepFound).toBe(true);
  });

  test('GET /export/cqmap streams an xlsx attachment', async () => {
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/export/cqmap`).set(auth())
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/CQMAP.*\.xlsx/);
    // Round-trip: the streamed buffer must be a parseable workbook.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    expect(wb.getWorksheet('Coversheet')).toBeDefined();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: FAIL — `Cannot find module '../../services/cqmapExportService'`

- [ ] **Step 4: Implement the export service**

```js
// backend/services/cqmapExportService.js
/**
 * Fills the official CQMAP V3.A template with the audit's data.
 * Row matching is always by tag/label column, never by hardcoded row numbers
 * (see plan "Verified facts" §3 for the cell map).
 *
 * KNOWN RISK: exceljs round-trips of complex workbooks can drop some styling
 * or conditional formatting. The template has no macros (.xlsx). If a filled
 * export turns out broken when opened in Excel, the fallback is to generate a
 * from-scratch workbook with the same sheet names/columns — keep that decision
 * in this service so callers don't change.
 */
const ExcelJS = require('exceljs');
const path = require('path');
const {
  NexusAuditRecord, NexusQmsAssessment, NexusProductScope, NexusProcessStepAssessment,
} = require('../models');
const { normalizeConformity } = require('../utils/nexusReadiness');
const scopeCatalog = require('../seed-data/nexus/scope-catalog.json');

const TEMPLATE = path.join(__dirname, '../templates/cqmAP-3a-template.xlsx');
const CATEGORIES = ['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac'];

function contactCell(name, email, phone) {
  return `Name: ${name ?? ''}\nE-mail: ${email ?? ''}\nPhone: ${phone ?? ''}`;
}

function fillCoversheet(ws, audit) {
  ws.getCell('D5').value = audit.company;
  ws.getCell('D6').value = audit.site_name;
  ws.getCell('D7').value = audit.address_line1 ?? audit.address ?? null;
  ws.getCell('D8').value = audit.city ?? null;
  ws.getCell('D9').value = audit.state_province ?? null;
  ws.getCell('D10').value = audit.country_code ?? audit.country ?? null;
  ws.getCell('D11').value = contactCell(audit.primary_contact_name, audit.primary_contact_email, audit.primary_contact_phone);
  ws.getCell('D12').value = contactCell(audit.audit_contact_name, audit.audit_contact_email, audit.audit_contact_phone);
  ws.getCell('D13').value = audit.customer_id ?? null;
  ws.getCell('D14').value = audit.cvcs_reference ?? null;
  ws.getCell('C33').value = audit.staff_total ?? null;
  ws.getCell('D33').value = audit.staff_in_production ?? null;

  // Production volumes: rows 36-45 list category codes in column B.
  const volumes = audit.production_volumes || {};
  for (let r = 36; r <= 45; r++) {
    const cat = String(ws.getCell(`B${r}`).value ?? '').trim();
    if (volumes[cat]) {
      ws.getCell(`C${r}`).value = volumes[cat].total ?? null;
      ws.getCell(`D${r}`).value = volumes[cat].banking ?? null;
    }
  }
}

function fillScopeSheet(ws, audit, scopes) {
  const byLabel = new Map(scopes.map(s => [s.product_variant, s]));
  // QMS rows in the scope table are driven by the ISO flag, not scope rows.
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 12) return;
    const label = row.getCell('B').value;
    if (typeof label !== 'string') return;
    if (label === 'QMS - Vendor has 9001 Certificate') {
      row.getCell('C').value = audit.iso_9001_certified ? 'Yes' : 'No';
      return;
    }
    if (label === 'QMS - Vendor has NO ISO 9001 Certificate') {
      row.getCell('C').value = audit.iso_9001_certified ? 'No' : 'Yes';
      return;
    }
    const scope = byLabel.get(label.trim());
    if (!scope) return;
    row.getCell('C').value = scope.in_scope ? 'Yes' : 'No';
    row.getCell('D').value = scope.audited ? 'Yes' : 'No';
    if (scope.rank && scope.rank !== 't') row.getCell('E').value = scope.rank;
  });
}

function fillQmsSheet(ws, qmsRows) {
  const byTag = new Map(qmsRows.map(r => [r.requirement_id, r]));
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return;
    const tag = row.getCell('A').value;
    const rec = typeof tag === 'string' ? byTag.get(tag.trim()) : null;
    if (!rec) return;
    if (rec.vendor_compliance) row.getCell('I').value = rec.vendor_compliance;
    row.getCell('J').value = normalizeConformity(rec.conformity);
  });
}

function fillCategorySheet(ws, steps) {
  const byTag = new Map(steps.map(s => [s.process_tag, s]));
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return;
    const tag = row.getCell('A').value;
    const step = typeof tag === 'string' ? byTag.get(tag.trim()) : null;
    if (!step) return;
    if (step.vendor_compliance) row.getCell('J').value = step.vendor_compliance;
    if (step.vendor_site) row.getCell('K').value = step.vendor_site;
    if (step.vendor_process_spec_ref) row.getCell('M').value = step.vendor_process_spec_ref;
    if (step.vendor_control_plan_ref) row.getCell('P').value = step.vendor_control_plan_ref;
    if (step.production_equipment) row.getCell('S').value = step.production_equipment;
    if (step.test_equipment) row.getCell('T').value = step.test_equipment;
    row.getCell('V').value = step.conformity;
    if (step.auditor_notes) row.getCell('X').value = step.auditor_notes;
  });
}

async function buildCqmapWorkbook(auditId) {
  const audit = await NexusAuditRecord.findByPk(auditId);
  if (!audit) throw Object.assign(new Error('Audit not found'), { status: 404 });

  const [qmsRows, scopes] = await Promise.all([
    NexusQmsAssessment.findAll({ where: { audit_record_id: auditId } }),
    NexusProductScope.findAll({ where: { audit_record_id: auditId } }),
  ]);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE);

  fillCoversheet(wb.getWorksheet('Coversheet'), audit);
  fillScopeSheet(wb.getWorksheet('Audit Scope & Compliance'), audit, scopes);
  fillQmsSheet(
    wb.getWorksheet(audit.iso_9001_certified ? 'QMS - has 9001 Cert' : 'QMS - NO 9001 Cert'),
    qmsRows
  );

  for (const cat of CATEGORIES) {
    const catScopes = scopes.filter(s => s.product_category === cat && s.in_scope);
    if (catScopes.length === 0) continue;
    const primaryLabel = (scopeCatalog[cat]?.variants || []).find(v => v.primary)?.label;
    const primary = catScopes.find(s => s.product_variant === primaryLabel) || catScopes[0];
    const steps = await NexusProcessStepAssessment.findAll({ where: { product_scope_id: primary.id } });
    if (steps.length > 0) fillCategorySheet(wb.getWorksheet(cat), steps);
  }

  return wb;
}

module.exports = { buildCqmapWorkbook };
```

- [ ] **Step 5: Implement the export controller + routes**

```js
// backend/controllers/nexus/exportController.js
const { buildCqmapWorkbook } = require('../../services/cqmapExportService');
const { NexusAuditRecord } = require('../../models');
const logger = require('../../utils/logger');

// GET /api/nexus/audits/:id/export/cqmap
exports.exportCqmap = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const wb = await buildCqmapWorkbook(req.params.id);
    const safe = (s) => String(s ?? '').replace(/[^A-Za-z0-9-]+/g, '_').slice(0, 40);
    const filename = `CQMAP-V3A-${safe(audit.company)}-${safe(audit.site_name)}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    logger.error('exportCqmap error', err);
    res.status(500).json({ error: 'Failed to export CQMAP workbook' });
  }
};
```

In `backend/routes/nexus.js` add next to the workbook routes:

```js
const exportCtrl = require('../controllers/nexus/exportController');
router.get('/audits/:id/export/cqmap', exportCtrl.exportCqmap);
```

- [ ] **Step 6: Run tests**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: PASS

- [ ] **Step 7: Manual sanity check (one-time)**

Start the dev backend, hit the export for a real dev audit, open the downloaded file in Excel. Verify: no corruption warning, Coversheet/scope/QMS values landed, formulas in the scope sheet recalculate. If Excel reports corruption → switch this service to from-scratch generation (decision documented in the service header) and tell the user.

- [ ] **Step 8: Commit**

```bash
git add backend/templates/cqmAP-3a-template.xlsx backend/services/cqmapExportService.js backend/controllers/nexus/exportController.js backend/routes/nexus.js backend/tests/integration/workbook.integration.test.js
git commit -m "feat(nexus): official CQMAP xlsx export from template"
```

---

### Task 5: Internal readiness PDF export

**Files:**
- Modify: `backend/controllers/nexus/exportController.js`, `backend/routes/nexus.js`
- Test: `backend/tests/integration/workbook.integration.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to the integration test file. Puppeteer may be unavailable in CI, so assert the endpoint contract loosely: 200 + pdf content type, or a 500 whose body names the PDF engine (acceptable on machines without Chrome — manual step verifies locally).

```js
describe('GET /api/nexus/audits/:id/export/readiness', () => {
  test('returns a PDF attachment (or a clear engine error on Chrome-less machines)', async () => {
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/export/readiness`).set(auth())
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    if (res.status === 200) {
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    } else {
      expect(res.status).toBe(500);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js`
Expected: FAIL with 404 (route missing)

- [ ] **Step 3: Implement**

Append to `backend/controllers/nexus/exportController.js` (model the HTML/PDF flow on `reportController.js:219-226`):

```js
const pdfService = require('../../services/pdfService');

const RANK_COLORS = { A: '#388e3c', B: '#1976d2', C: '#f57c00', D: '#d32f2f' };

function pctRow(label, summary, rankSuggestion) {
  const p = (k) => summary.pct[k] === null ? '—' : `${summary.pct[k]}%`;
  const rank = rankSuggestion
    ? `<span style="background:${RANK_COLORS[rankSuggestion]};color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;">${rankSuggestion}</span>`
    : '—';
  return `<tr>
    <td>${label}</td><td>${p('NCC')}</td><td>${p('NC+')}</td><td>${p('nc-')}</td>
    <td>${p('RI')}</td><td>${p('Full')}</td><td>${p('tbd')}</td>
    <td>${summary.assessed}/${summary.total}</td><td style="text-align:center">${rank}</td>
  </tr>`;
}

// GET /api/nexus/audits/:id/export/readiness
exports.exportReadiness = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    // Reuse the readiness computation rather than duplicating it.
    const workbookCtrl = require('./workbookController');
    let readiness;
    const fakeRes = { json: (b) => { readiness = b; }, status: () => fakeRes };
    await workbookCtrl.getReadiness(req, fakeRes);
    if (!readiness) return res.status(500).json({ error: 'Failed to compute readiness' });

    const blockerRows = readiness.blockers.map(b =>
      `<tr><td>${b.type}</td><td>${b.tag ?? ''}</td><td>${b.title}</td><td>${b.detail ?? ''}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#222;margin:32px}
      h1{font-size:20px} h2{font-size:15px;margin-top:24px}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#f5f5f5}
    </style></head><body>
      <h1>CQM Readiness — ${audit.company} / ${audit.site_name}</h1>
      <p>Dry-run readiness against cqmAP V3.A · generated ${new Date().toISOString().slice(0, 10)} ·
         Overall: <strong>${readiness.overall.complete ? 'fully assessed' : 'assessment incomplete'}</strong>
         · Worst rank suggestion: <strong>${readiness.overall.worstRank ?? '—'}</strong></p>
      <h2>Conformity percentages (per the official workbook's math)</h2>
      <table><tr><th>Area</th><th>NCC%</th><th>NC+%</th><th>nc-%</th><th>RI%</th><th>Full%</th><th>tbd%</th><th>Assessed</th><th>Rank sugg.</th></tr>
        ${pctRow('QMS', readiness.qms.summary, readiness.qms.rankSuggestion)}
        ${readiness.categories.map(c => pctRow(c.label, c.summary, c.rankSuggestion)).join('')}
      </table>
      <h2>Blockers (${readiness.blockers.length})</h2>
      <table><tr><th>Type</th><th>Tag</th><th>Item</th><th>Detail</th></tr>${blockerRows || '<tr><td colspan="4">None 🎉</td></tr>'}</table>
    </body></html>`;

    const pdfBuffer = await pdfService.generatePDF(html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CQM-Readiness-${audit.id}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('exportReadiness error', err);
    res.status(500).json({ error: 'Failed to generate readiness PDF' });
  }
};
```

Route in `backend/routes/nexus.js`:

```js
router.get('/audits/:id/export/readiness', exportCtrl.exportReadiness);
```

- [ ] **Step 4: Run tests + full suite**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/nexus/exportController.js backend/routes/nexus.js backend/tests/integration/workbook.integration.test.js
git commit -m "feat(nexus): internal readiness PDF export"
```

---

### Task 6: Frontend types + workbook service

**Files:**
- Create: `frontend/src/types/nexus/workbook.ts`, `frontend/src/services/nexus/workbookService.ts`

- [ ] **Step 1: Types**

```ts
// frontend/src/types/nexus/workbook.ts
import type {
  Conformity, NexusAuditRecord, NexusProcessStepAssessment,
  NexusProductScope, NexusQmsAssessment, ProductCategory,
} from './index';

export interface ChapterProgress { done: number; total: number }

export type StepSection = 'process' | 'qualification' | 'product';

export interface WorkbookStepRow extends NexusProcessStepAssessment {
  section: StepSection;
  vendor_compliance?: string;
  vendor_process_spec_ref?: string;
  vendor_control_plan_ref?: string;
  production_equipment?: string;
  test_equipment?: string;
  auditor_notes?: string;
}

export type WorkbookChapter =
  | { key: 'site-profile'; kind: 'site-profile'; title: string; progress: ChapterProgress }
  | { key: 'scope'; kind: 'scope'; title: string; scopes: NexusProductScope[]; progress: ChapterProgress }
  | { key: 'qms'; kind: 'qms'; title: string; rows: NexusQmsAssessment[]; progress: ChapterProgress }
  | { key: string; kind: 'category'; category: ProductCategory; scopeId: number; title: string; rows: WorkbookStepRow[]; progress: ChapterProgress }
  | { key: 'readiness'; kind: 'readiness'; title: string; progress: null };

export interface CapaBadge { id: number; action_id: string; status: string; severity?: string }

export interface ScopeCatalogVariant { label: string; primary?: boolean }
export type ScopeCatalog = Record<string, { label: string; variants: ScopeCatalogVariant[] }>;

export interface WorkbookData {
  audit: NexusAuditRecord;
  chapters: WorkbookChapter[];
  capas: Record<string, CapaBadge>;           // "qms:<id>" | "process-step:<id>"
  testEvidenceTags: string[];
  scopeCatalog: ScopeCatalog;
}

export interface ConformitySummary {
  counts: Record<Conformity, number>;
  total: number;
  assessed: number;
  pct: Record<Exclude<Conformity, 'n/a'>, number | null>;
  complete: boolean;
}

export interface GateState { hasPlan: boolean; planId?: number; passed: boolean; conditions: { label: string; passed: boolean; detail: string | null }[] }

export interface ReadinessCategory {
  category: ProductCategory; scopeId: number; label: string;
  currentRank: string | null;
  summary: ConformitySummary; rankSuggestion: 'A' | 'B' | 'C' | 'D' | null;
  gate: GateState;
}

export interface ReadinessBlocker {
  type: 'finding' | 'gate' | 'unassessed';
  chapterKey: string; tag: string | null; title: string; detail: string | null;
}

export interface ReadinessData {
  qms: { summary: ConformitySummary; rankSuggestion: 'A' | 'B' | 'C' | 'D' | null };
  categories: ReadinessCategory[];
  blockers: ReadinessBlocker[];
  overall: { complete: boolean; worstRank: string | null };
}
```

- [ ] **Step 2: Service**

```ts
// frontend/src/services/nexus/workbookService.ts
import api from '../api';
import type { Conformity, NexusProcessStepAssessment, NexusProductScope, NexusQmsAssessment } from '../../types/nexus';
import type { ReadinessData, WorkbookData } from '../../types/nexus/workbook';

export const getWorkbook = async (auditId: number): Promise<WorkbookData> => {
  const res = await api.get(`/nexus/audits/${auditId}/workbook`);
  return res.data;
};

export const getReadiness = async (auditId: number): Promise<ReadinessData> => {
  const res = await api.get(`/nexus/audits/${auditId}/readiness`);
  return res.data;
};

export const patchQmsRow = async (
  auditId: number, requirementId: string,
  data: Partial<Pick<NexusQmsAssessment, 'conformity' | 'vendor_compliance' | 'auditor_comment'>>,
): Promise<NexusQmsAssessment> => {
  const res = await api.patch(`/nexus/audits/${auditId}/qms/${encodeURIComponent(requirementId)}`, data);
  return res.data;
};

export const patchStep = async (
  auditId: number, scopeId: number, stepId: number,
  data: Partial<NexusProcessStepAssessment> & { conformity?: Conformity },
): Promise<NexusProcessStepAssessment> => {
  const res = await api.patch(`/nexus/audits/${auditId}/scope/${scopeId}/steps/${stepId}`, data);
  return res.data;
};

export const createScopeRow = async (
  auditId: number,
  data: { product_category: string; product_variant: string; in_scope: boolean; seed_steps?: boolean },
): Promise<NexusProductScope> => {
  const res = await api.post(`/nexus/audits/${auditId}/scope`, data);
  return res.data;
};

export const patchScopeRow = async (
  auditId: number, scopeId: number, data: Partial<NexusProductScope>,
): Promise<NexusProductScope> => {
  const res = await api.patch(`/nexus/audits/${auditId}/scope/${scopeId}`, data);
  return res.data;
};

const download = async (url: string, fallbackName: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  const dispo: string = res.headers['content-disposition'] ?? '';
  const name = /filename="?([^";]+)"?/.exec(dispo)?.[1] ?? fallbackName;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([res.data]));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadCqmapXlsx = (auditId: number) =>
  download(`/nexus/audits/${auditId}/export/cqmap`, `CQMAP-${auditId}.xlsx`);

export const downloadReadinessPdf = (auditId: number) =>
  download(`/nexus/audits/${auditId}/export/readiness`, `CQM-Readiness-${auditId}.pdf`);
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/nexus/workbook.ts frontend/src/services/nexus/workbookService.ts
git commit -m "feat(nexus): workbook types + service"
```

---

### Task 7: Conformity chips + universal requirement row

**Files:**
- Create: `frontend/src/components/nexus/workbook/ConformityChips.tsx`, `frontend/src/components/nexus/workbook/RequirementRow.tsx`

- [ ] **Step 1: ConformityChips**

One-tap conformity selector. Chip order is the canonical keyboard order **1=Full … 7=tbd** (spec §3.2).

```tsx
// frontend/src/components/nexus/workbook/ConformityChips.tsx
import { Chip, CircularProgress, Stack, Tooltip } from '@mui/material';
import type { Conformity } from '../../../types/nexus';

export const CHIP_ORDER: Conformity[] = ['Full', 'RI', 'nc-', 'NC+', 'NCC', 'n/a', 'tbd'];

const CHIP_COLORS: Record<Conformity, string> = {
  Full: '#388e3c', RI: '#1976d2', 'nc-': '#f57c00',
  'NC+': '#d32f2f', NCC: '#7b1fa2', 'n/a': '#bdbdbd', tbd: '#9e9e9e',
};

interface Props {
  value: Conformity;
  onChange: (c: Conformity) => void;
  saving?: boolean;
}

export default function ConformityChips({ value, onChange, saving }: Props) {
  if (saving) return <CircularProgress size={18} />;
  return (
    <Stack direction="row" spacing={0.5}>
      {CHIP_ORDER.map((c, i) => (
        <Tooltip key={c} title={`${c} (key ${i + 1})`}>
          <Chip
            label={c}
            size="small"
            onClick={() => onChange(c)}
            sx={{
              fontSize: 10, height: 22, cursor: 'pointer',
              bgcolor: value === c ? CHIP_COLORS[c] : 'transparent',
              color: value === c ? '#fff' : 'text.secondary',
              border: '1px solid', borderColor: value === c ? CHIP_COLORS[c] : 'divider',
              fontWeight: value === c ? 700 : 400,
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 2: RequirementRow**

```tsx
// frontend/src/components/nexus/workbook/RequirementRow.tsx
import { useState, type ReactNode } from 'react';
import {
  Box, Chip, Collapse, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { conformityRowTint } from '../ConformityBadge';
import ConformityChips from './ConformityChips';
import type { Conformity } from '../../../types/nexus';
import type { CapaBadge } from '../../../types/nexus/workbook';

interface Props {
  tag: string;
  title: string;
  conformity: Conformity;
  saving?: boolean;
  focused?: boolean;
  capa?: CapaBadge;
  hasTestEvidence?: boolean;
  onConformity: (c: Conformity) => void;
  onFocus: () => void;
  onOpenPlan?: () => void;          // qualification-spine rows only
  children?: ReactNode;             // expandable detail fields
}

export default function RequirementRow({
  tag, title, conformity, saving, focused, capa, hasTestEvidence,
  onConformity, onFocus, onOpenPlan, children,
}: Props) {
  const [open, setOpen] = useState(false);
  // normalize suffixed values for tinting ('NC+ (Subcontractor)' → 'NC+')
  const base = (conformity.startsWith('Not assessed') ? 'tbd' : conformity.replace(/ \(Subcontractor\)$/, '')) as Conformity;

  return (
    <Box
      onClick={onFocus}
      data-row-tag={tag}
      sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.75,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: conformityRowTint(base),
        outline: focused ? '2px solid' : 'none', outlineColor: 'primary.main', outlineOffset: -2,
      }}
    >
      <Chip label={tag} size="small" sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: 'action.hover', minWidth: 76 }} />
      <Typography variant="body2" sx={{ flex: 1 }} fontWeight={base === 'NC+' || base === 'NCC' ? 700 : 400}>
        {title}
      </Typography>

      {capa && (
        <Tooltip title={`CAPA ${capa.action_id} — ${capa.status}`}>
          <Chip label={capa.action_id} size="small" color="error" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
        </Tooltip>
      )}
      {hasTestEvidence && (
        <Tooltip title="Physical test data exists for this requirement (see Test Sessions)">
          <ScienceIcon fontSize="small" color="info" />
        </Tooltip>
      )}
      {onOpenPlan && (
        <Tooltip title="Open Qualification Plan">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenPlan(); }}>
            <AssignmentIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <ConformityChips value={base} onChange={onConformity} saving={saving} />

      {children && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
          <ExpandMoreIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </IconButton>
      )}
      {children && (
        <Collapse in={open} sx={{ width: '100%', flexBasis: '100%' }} unmountOnExit>
          <Stack sx={{ py: 1, pl: 6 }} spacing={1}>{children}</Stack>
        </Collapse>
      )}
    </Box>
  );
}
```

(The outer Box uses `flexWrap: 'wrap'` so the `Collapse` renders full-width below the row.)

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: clean (lint may flag pre-existing issues in untouched files only)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/nexus/workbook/ConformityChips.tsx frontend/src/components/nexus/workbook/RequirementRow.tsx
git commit -m "feat(nexus): workbook conformity chips + universal requirement row"
```

---

### Task 8: Page shell, chapter rail, route, Audit Detail CTA

**Files:**
- Create: `frontend/src/components/nexus/workbook/ChapterRail.tsx`, `frontend/src/pages/nexus/WorkbookPage.tsx`
- Modify: `frontend/src/App.tsx` (imports ~line 39, routes ~line 117), `frontend/src/pages/nexus/AuditDetailPage.tsx`

- [ ] **Step 1: ChapterRail**

```tsx
// frontend/src/components/nexus/workbook/ChapterRail.tsx
import { Box, LinearProgress, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { WorkbookChapter } from '../../../types/nexus/workbook';

interface Props {
  chapters: WorkbookChapter[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function ChapterRail({ chapters, activeKey, onSelect }: Props) {
  const totals = chapters.reduce(
    (acc, c) => c.progress ? { done: acc.done + c.progress.done, total: acc.total + c.progress.total } : acc,
    { done: 0, total: 0 },
  );
  const overallPct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <Box sx={{ width: 270, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', pr: 1 }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Overall progress
        </Typography>
        <LinearProgress variant="determinate" value={overallPct} sx={{ height: 8, borderRadius: 4, my: 0.5 }} />
        <Typography variant="caption" color="text.secondary">{totals.done} / {totals.total} assessed · {overallPct}%</Typography>
      </Box>
      <List dense>
        {chapters.map((c, i) => (
          <ListItemButton key={c.key} selected={c.key === activeKey} onClick={() => onSelect(c.key)} sx={{ borderRadius: 1 }}>
            <ListItemText
              primary={`${i + 1}. ${c.title}`}
              secondary={c.progress ? `${c.progress.done} / ${c.progress.total}` : undefined}
              primaryTypographyProps={{ fontSize: 13, fontWeight: c.key === activeKey ? 700 : 400 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
```

- [ ] **Step 2: WorkbookPage shell**

Owns the workbook data, optimistic row saves, and chapter switching. Chapter bodies arrive in Tasks 9–11; until then render a placeholder `<Typography>` for unbuilt kinds so the page compiles and runs after this task.

```tsx
// frontend/src/pages/nexus/WorkbookPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import ChapterRail from '../../components/nexus/workbook/ChapterRail';
import { getWorkbook } from '../../services/nexus/workbookService';
import type { WorkbookData } from '../../types/nexus/workbook';

export default function WorkbookPage() {
  const { id } = useParams<{ id: string }>();
  const auditId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<WorkbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState('site-profile');
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getWorkbook(auditId)); }
    catch { setError('Failed to load the workbook.'); }
    finally { setLoading(false); }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => data?.chapters.find(c => c.key === activeKey), [data, activeKey]);
  const activeIdx = useMemo(() => data?.chapters.findIndex(c => c.key === activeKey) ?? -1, [data, activeKey]);
  const next = data && activeIdx >= 0 && activeIdx < data.chapters.length - 1 ? data.chapters[activeIdx + 1] : null;

  if (loading) return <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (error || !data) return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error ?? 'Workbook unavailable'}</Alert>
      <Button variant="contained" onClick={load}>Retry</Button>
    </Box>
  );

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2, maxWidth: 1500, mx: 'auto' }}>
      <ChapterRail chapters={data.chapters} activeKey={activeKey} onSelect={setActiveKey} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
          <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
            {data.audit.site_name}
          </Button>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>{active?.title}</Typography>
          {next && (
            <Button variant="outlined" size="small" onClick={() => setActiveKey(next.key)}>
              Next: {next.title}
            </Button>
          )}
        </Stack>

        {/* Chapter bodies are mounted by kind; Tasks 9-11 replace the placeholders. */}
        {active && (
          <Typography color="text.secondary" sx={{ p: 4 }}>
            Chapter "{active.title}" — content arrives in a later task.
          </Typography>
        )}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity="error" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
```

- [ ] **Step 3: Route + CTA**

In `frontend/src/App.tsx` add with the other nexus imports (after line 39):

```tsx
import WorkbookPage from './pages/nexus/WorkbookPage';
```

and with the nexus routes (after line 117, the audit-detail route):

```tsx
<Route path="nexus/audits/:id/workbook" element={<WorkbookPage />} />
```

In `frontend/src/pages/nexus/AuditDetailPage.tsx`, add a primary button in the page header actions (find the header `Stack`/`Box` near the top of the JSX — it holds the page title and existing buttons):

```tsx
<Button variant="contained" onClick={() => navigate(`/nexus/audits/${auditId}/workbook`)}>
  Open Workbook
</Button>
```

(Reuse the page's existing `navigate` and audit id variable names — check the file's actual local names before pasting.)

- [ ] **Step 4: Typecheck + run**

Run: `cd frontend && npx tsc --noEmit`
Then `npm run dev` from the repo root, log in, open an audit → "Open Workbook" → rail renders chapters with progress, placeholders show.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/nexus/workbook/ChapterRail.tsx frontend/src/pages/nexus/WorkbookPage.tsx frontend/src/App.tsx frontend/src/pages/nexus/AuditDetailPage.tsx
git commit -m "feat(nexus): workbook page shell, chapter rail, route, audit CTA"
```

---

### Task 9: Site Profile + Scope chapters

**Files:**
- Create: `frontend/src/components/nexus/workbook/SiteProfileChapter.tsx`, `frontend/src/components/nexus/workbook/ScopeChapter.tsx`
- Modify: `frontend/src/pages/nexus/WorkbookPage.tsx` (mount them)

- [ ] **Step 1: SiteProfileChapter**

```tsx
// frontend/src/components/nexus/workbook/SiteProfileChapter.tsx
import { useState } from 'react';
import { Box, Button, FormControlLabel, Grid, Switch, TextField, Typography } from '@mui/material';
import { updateAudit } from '../../../services/nexus/nexusService';
import type { NexusAuditRecord } from '../../../types/nexus';

const FIELDS: { key: keyof NexusAuditRecord; label: string; type?: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'site_name', label: 'Site' },
  { key: 'address_line1', label: 'Street' },
  { key: 'city', label: 'City' },
  { key: 'state_province', label: 'Province / State' },
  { key: 'country_code', label: 'Country code (ISO, e.g. US)' },
  { key: 'primary_contact_name', label: 'CQM Primary Contact — name' },
  { key: 'primary_contact_email', label: 'Primary Contact — e-mail' },
  { key: 'primary_contact_phone', label: 'Primary Contact — phone' },
  { key: 'audit_contact_name', label: 'Audit Contact — name' },
  { key: 'audit_contact_email', label: 'Audit Contact — e-mail' },
  { key: 'audit_contact_phone', label: 'Audit Contact — phone' },
  { key: 'customer_id', label: 'Customer ID (CID)' },
  { key: 'cvcs_reference', label: 'CVCS Reference' },
  { key: 'staff_total', label: 'Staff — total', type: 'number' },
  { key: 'staff_in_production', label: 'Staff — in production', type: 'number' },
];

interface Props {
  audit: NexusAuditRecord;
  onSaved: (a: NexusAuditRecord) => void;
  onError: (msg: string) => void;
}

export default function SiteProfileChapter({ audit, onSaved, onError }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...audit });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of FIELDS) payload[f.key] = form[f.key] === '' ? null : form[f.key];
      payload.iso_9001_certified = form.iso_9001_certified;
      onSaved(await updateAudit(audit.id, payload));
    } catch { onError('Failed to save site profile'); }
    finally { setSaving(false); }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Mirrors the cqmAP Coversheet, Section 1 (vendor fills prior to the audit).
      </Typography>
      <FormControlLabel
        control={<Switch checked={!!form.iso_9001_certified}
          onChange={e => setForm(f => ({ ...f, iso_9001_certified: e.target.checked }))} />}
        label="Site holds an ISO 9001 certificate (selects the 31- vs 60-requirement QMS set)"
        sx={{ mb: 2 }}
      />
      <Grid container spacing={2}>
        {FIELDS.map(f => (
          <Grid item xs={12} sm={6} md={4} key={String(f.key)}>
            <TextField
              fullWidth size="small" label={f.label} type={f.type ?? 'text'}
              value={form[f.key] ?? ''}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) || null : e.target.value }))}
            />
          </Grid>
        ))}
      </Grid>
      <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Site Profile'}
      </Button>
    </Box>
  );
}
```

Note: changing `iso_9001_certified` swaps which QMS set applies — after a successful save, `WorkbookPage` must call its `load()` to refresh chapters (wire `onSaved` to do both `setData`-merge and `load()`).

- [ ] **Step 2: ScopeChapter**

```tsx
// frontend/src/components/nexus/workbook/ScopeChapter.tsx
import { useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Switch, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { createScopeRow, patchScopeRow } from '../../../services/nexus/workbookService';
import type { NexusProductScope } from '../../../types/nexus';
import type { ScopeCatalog } from '../../../types/nexus/workbook';

interface Props {
  auditId: number;
  scopes: NexusProductScope[];
  catalog: ScopeCatalog;
  onChanged: () => void;          // refetch workbook (chapters appear/disappear)
  onError: (msg: string) => void;
}

export default function ScopeChapter({ auditId, scopes, catalog, onChanged, onError }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const rowFor = (label: string) => scopes.find(s => s.product_variant === label);

  const toggle = async (category: string, label: string, isPrimary: boolean, field: 'in_scope' | 'audited', value: boolean) => {
    setBusy(label);
    try {
      const existing = rowFor(label);
      if (existing) {
        await patchScopeRow(auditId, existing.id, { [field]: value });
      } else {
        // New row: primary rows seed the category's process steps; variants don't.
        await createScopeRow(auditId, {
          product_category: category, product_variant: label,
          in_scope: field === 'in_scope' ? value : false,
          seed_steps: isPrimary,
        });
      }
      onChanged();
    } catch { onError(`Failed to update scope for ${label}`); }
    finally { setBusy(null); }
  };

  const categories = Object.entries(catalog).filter(([key]) => key !== 'qms');

  // "Common case" quick-start: pre-ticks the typical card-vendor scope rows.
  const QUICK_PICKS: { label: string; rows: { category: string; variant: string; primary: boolean }[] }[] = [
    {
      label: 'We make personalized plastic ICCs',
      rows: [
        { category: 'icc', variant: 'ICC - Any IC Card', primary: true },
        { category: 'icc', variant: 'plICC - plastic ICC', primary: false },
        { category: 'p', variant: 'P - Any Personalisation activity', primary: true },
      ],
    },
  ];

  const applyQuickPick = async (pick: typeof QUICK_PICKS[number]) => {
    setBusy(pick.label);
    try {
      for (const r of pick.rows) {
        const existing = rowFor(r.variant);
        if (existing) {
          if (!existing.in_scope) await patchScopeRow(auditId, existing.id, { in_scope: true });
        } else {
          await createScopeRow(auditId, {
            product_category: r.category, product_variant: r.variant,
            in_scope: true, seed_steps: r.primary,
          });
        }
      }
      onChanged();
    } catch { onError('Quick-start failed'); }
    finally { setBusy(null); }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Tick what this site does (the doc's "Audit Scope" table). Ticking a category's first
        ("Any") row creates its requirements chapter. Rank and percentages are computed in
        Readiness — never entered here. Unticking hides a chapter but keeps its data.
      </Typography>
      <Stack direction="row" spacing={1} mb={2}>
        {QUICK_PICKS.map(p => (
          <Chip key={p.label} label={`Quick start: ${p.label}`} onClick={() => applyQuickPick(p)}
            disabled={busy !== null} variant="outlined" color="primary" />
        ))}
      </Stack>
      {categories.map(([key, cat]) => {
        const anyInScope = cat.variants.some(v => rowFor(v.label)?.in_scope);
        return (
          <Accordion key={key} defaultExpanded={anyInScope} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography fontWeight={700} variant="body2">{cat.label}</Typography>
                {anyInScope && <Chip label="in scope" color="primary" size="small" sx={{ height: 20, fontSize: 10 }} />}
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {cat.variants.map(v => {
                const row = rowFor(v.label);
                return (
                  <Stack key={v.label} direction="row" alignItems="center" spacing={2}
                    sx={{ py: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {v.label}{v.primary ? ' ★' : ''}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">In scope</Typography>
                      <Switch size="small" checked={!!row?.in_scope} disabled={busy === v.label}
                        onChange={e => toggle(key, v.label, !!v.primary, 'in_scope', e.target.checked)} />
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">Audited</Typography>
                      <Switch size="small" checked={!!row?.audited} disabled={busy === v.label || !row}
                        onChange={e => toggle(key, v.label, !!v.primary, 'audited', e.target.checked)} />
                    </Stack>
                  </Stack>
                );
              })}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 3: Mount both in WorkbookPage**

Replace the placeholder block in `WorkbookPage.tsx` with a kind-switch (the category/qms/readiness kinds keep placeholders until Tasks 10–11):

```tsx
{active?.kind === 'site-profile' && (
  <SiteProfileChapter
    audit={data.audit}
    onSaved={() => load()}
    onError={setToast}
  />
)}
{active?.kind === 'scope' && (
  <ScopeChapter
    auditId={auditId}
    scopes={active.scopes}
    catalog={data.scopeCatalog}
    onChanged={load}
    onError={setToast}
  />
)}
{(active?.kind === 'qms' || active?.kind === 'category' || active?.kind === 'readiness') && (
  <Typography color="text.secondary" sx={{ p: 4 }}>Chapter content arrives in a later task.</Typography>
)}
```

(Add the two imports at the top of the file.)

- [ ] **Step 4: Typecheck + manual verify**

Run: `cd frontend && npx tsc --noEmit`
Manual: fill site profile fields → Save → reload page → values persist. Tick "ICC - Any IC Card" in Scope → the rail gains an "ICC … — Requirements" chapter; untick → it disappears; re-tick → reappears with prior data intact.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/nexus/workbook/SiteProfileChapter.tsx frontend/src/components/nexus/workbook/ScopeChapter.tsx frontend/src/pages/nexus/WorkbookPage.tsx
git commit -m "feat(nexus): workbook site profile + scope chapters"
```

---

### Task 10: Assessment chapters (QMS + category) with keyboard flow and plan drawer

**Files:**
- Create: `frontend/src/components/nexus/workbook/AssessmentChapter.tsx`, `frontend/src/components/nexus/workbook/PlanDrawer.tsx`
- Modify: `frontend/src/pages/nexus/WorkbookPage.tsx`

- [ ] **Step 1: AssessmentChapter**

Shared by QMS and category chapters. Handles: row list (grouped for categories), one-tap conformity with optimistic save + revert, keyboard nav (↑/↓ move, 1–7 set per `CHIP_ORDER`), "next unassessed" jump, expandable detail fields.

```tsx
// frontend/src/components/nexus/workbook/AssessmentChapter.tsx
import { useMemo, useState } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import RequirementRow from './RequirementRow';
import { CHIP_ORDER } from './ConformityChips';
import type { Conformity } from '../../../types/nexus';
import type { CapaBadge } from '../../../types/nexus/workbook';

export interface AssessmentRowVM {
  id: number | string;
  tag: string;
  title: string;
  conformity: Conformity;
  section?: 'process' | 'qualification' | 'product';
  capa?: CapaBadge;
  hasTestEvidence?: boolean;
  detailFields: { key: string; label: string; value: string; multiline?: boolean }[];
}

const SECTION_TITLES: Record<string, string> = {
  process: 'Process Steps',
  qualification: 'Qualification & Design (D&D spine)',
  product: 'Product Requirements',
};

interface Props {
  rows: AssessmentRowVM[];
  grouped?: boolean;                      // category chapters group by section
  savingIds: Set<number | string>;
  onConformity: (row: AssessmentRowVM, c: Conformity) => void;
  onDetailSave: (row: AssessmentRowVM, key: string, value: string) => void;
  onOpenPlan?: (row: AssessmentRowVM) => void;
}

export default function AssessmentChapter({ rows, grouped, savingIds, onConformity, onDetailSave, onOpenPlan }: Props) {
  const [focusIdx, setFocusIdx] = useState(0);

  const sections = useMemo(() => {
    if (!grouped) return [{ title: null as string | null, rows }];
    return (['process', 'qualification', 'product'] as const)
      .map(s => ({ title: SECTION_TITLES[s], rows: rows.filter(r => r.section === s) }))
      .filter(s => s.rows.length > 0);
  }, [rows, grouped]);

  const flat = useMemo(() => sections.flatMap(s => s.rows), [sections]);

  const isUnassessed = (r: AssessmentRowVM) =>
    r.conformity === 'tbd' || r.conformity.startsWith('Not assessed');

  const jumpNextUnassessed = () => {
    const start = (focusIdx + 1) % flat.length;
    for (let i = 0; i < flat.length; i++) {
      const idx = (start + i) % flat.length;
      if (isUnassessed(flat[idx])) { setFocusIdx(idx); return; }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    else if (/^[1-7]$/.test(e.key)) {
      e.preventDefault();
      const row = flat[focusIdx];
      if (row) onConformity(row, CHIP_ORDER[Number(e.key) - 1]);
    }
  };

  let runningIdx = -1;
  return (
    <Box tabIndex={0} onKeyDown={onKeyDown} sx={{ outline: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="caption" color="text.secondary">
          Keyboard: ↑/↓ select row · 1–7 set conformity (1=Full … 7=tbd)
        </Typography>
        <Button size="small" startIcon={<SkipNextIcon />} onClick={jumpNextUnassessed}>
          Next unassessed
        </Button>
      </Stack>
      {sections.map((s, si) => (
        <Box key={s.title ?? si} mb={2}>
          {s.title && (<><Typography variant="subtitle2" fontWeight={700} sx={{ my: 1 }}>{s.title}</Typography><Divider /></>)}
          {s.rows.map((r) => {
            runningIdx += 1;
            const idx = runningIdx;
            return (
              <RequirementRow
                key={r.id}
                tag={r.tag} title={r.title} conformity={r.conformity}
                saving={savingIds.has(r.id)} focused={idx === focusIdx}
                capa={r.capa} hasTestEvidence={r.hasTestEvidence}
                onConformity={(c) => onConformity(r, c)}
                onFocus={() => setFocusIdx(idx)}
                onOpenPlan={onOpenPlan && r.section === 'qualification' ? () => onOpenPlan(r) : undefined}
              >
                {r.detailFields.length > 0 ? r.detailFields.map(f => (
                  <TextField
                    key={f.key} label={f.label} size="small" fullWidth multiline={f.multiline}
                    defaultValue={f.value}
                    onBlur={(e) => { if (e.target.value !== f.value) onDetailSave(r, f.key, e.target.value); }}
                  />
                )) : undefined}
              </RequirementRow>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
```

- [ ] **Step 2: PlanDrawer**

Opens the scope's qualification plan in context (existing endpoints; creates a product plan if none exists).

```tsx
// frontend/src/components/nexus/workbook/PlanDrawer.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Drawer, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import api from '../../../services/api';
import type { GateState } from '../../../types/nexus/workbook';

interface PlanItem { id: number; requirement_id?: string; title: string; status: string }
interface Review { id: number; review_type: string; outcome: string }
interface Plan { id: number; plan_type: string; status: string; product_scope_id?: number; items?: PlanItem[]; designReviews?: Review[] }

const ITEM_STATUSES = ['pending', 'in-progress', 'complete', 'not-applicable'];

interface Props {
  auditId: number;
  scopeId: number | null;       // null = closed
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function PlanDrawer({ auditId, scopeId, onClose, onError }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!scopeId) return;
    setLoading(true);
    try {
      const list = (await api.get(`/nexus/audits/${auditId}/plans`)).data as Plan[];
      let p = list.find(x => x.product_scope_id === scopeId) ?? null;
      if (!p) {
        p = (await api.post(`/nexus/audits/${auditId}/plans`, {
          plan_type: 'product', product_scope_id: scopeId,
        })).data;
      }
      const detail = (await api.get(`/nexus/audits/${auditId}/plans/${p!.id}`)).data as Plan;
      setPlan(detail);
      setGate((await api.get(`/nexus/audits/${auditId}/plans/${p!.id}/gate`)).data);
    } catch { onError('Failed to load qualification plan'); }
    finally { setLoading(false); }
  }, [auditId, scopeId, onError]);

  useEffect(() => { load(); }, [load]);

  const setItemStatus = async (item: PlanItem, status: string) => {
    if (!plan) return;
    try {
      await api.patch(`/nexus/audits/${auditId}/plans/${plan.id}/items/${item.id}`, { status });
      load();
    } catch { onError('Failed to update checklist item'); }
  };

  return (
    <Drawer anchor="right" open={scopeId !== null} onClose={onClose}
      PaperProps={{ sx: { width: 460, p: 2 } }}>
      <Typography variant="h6" fontWeight={700} mb={1}>Qualification Plan</Typography>
      {loading && <CircularProgress size={24} />}
      {!loading && plan && (
        <Box>
          <Stack direction="row" spacing={1} mb={2}>
            <Chip label={plan.plan_type} size="small" />
            <Chip label={plan.status} size="small" variant="outlined" />
            {gate && (
              <Chip label={gate.passed ? '#0706# gate: PASS' : '#0706# gate: FAIL'} size="small"
                color={gate.passed ? 'success' : 'error'} />
            )}
          </Stack>
          {gate && !gate.passed && (
            <Box mb={2}>
              {gate.conditions.filter(c => !c.passed).map(c => (
                <Typography key={c.label} variant="caption" color="error" display="block">
                  ✗ {c.label}{c.detail ? ` — ${c.detail}` : ''}
                </Typography>
              ))}
            </Box>
          )}
          {(plan.items ?? []).map(item => (
            <Stack key={item.id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.requirement_id ? `${item.requirement_id} ` : ''}{item.title}
              </Typography>
              <TextField select size="small" value={item.status} sx={{ width: 150 }}
                onChange={e => setItemStatus(item, e.target.value)}>
                {ITEM_STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
          ))}
          <Typography variant="subtitle2" fontWeight={700} mt={2}>Design Reviews</Typography>
          {(plan.designReviews ?? []).map(r => (
            <Typography key={r.id} variant="body2">{r.review_type}: {r.outcome}</Typography>
          ))}
          <Button size="small" sx={{ mt: 2 }} href={`/nexus/audits/${auditId}/plans`}>
            Open full Qualification Hub →
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
```

Before coding, check `getPlan`'s actual response field names for items/reviews in `backend/controllers/nexus/qualificationPlanController.js` (the associations are aliased `items` and `designReviews` in `models/index.js:186-190`) — adjust the `Plan` interface if the controller nests them differently.

- [ ] **Step 3: Wire QMS + category chapters in WorkbookPage**

Replace the remaining qms/category placeholder. Add to `WorkbookPage.tsx`:

```tsx
const [savingIds, setSavingIds] = useState<Set<number | string>>(new Set());
const [drawerScopeId, setDrawerScopeId] = useState<number | null>(null);

const markSaving = (id: number | string, on: boolean) =>
  setSavingIds(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

// Optimistic mutate: update local chapter state, call API, revert on failure.
const mutateRow = async (
  chapterKey: string, rowId: number | string,
  patch: Record<string, unknown>,
  call: () => Promise<unknown>,
) => {
  const prev = data;
  setData(d => !d ? d : ({
    ...d,
    chapters: d.chapters.map(c =>
      c.key === chapterKey && 'rows' in c
        ? { ...c, rows: (c.rows as { id: number | string }[]).map(r => r.id === rowId ? { ...r, ...patch } : r) } as typeof c
        : c),
  }));
  markSaving(rowId, true);
  try { await call(); }
  catch { setData(prev); setToast('Save failed — value reverted.'); }
  finally { markSaving(rowId, false); }
};
```

QMS chapter mount (conformity changes can spawn CAPAs server-side → refresh CAPA index afterwards with a background `load()`):

```tsx
{active?.kind === 'qms' && (
  <AssessmentChapter
    rows={active.rows.map(r => ({
      id: r.id, tag: r.requirement_id, title: r.title, conformity: r.conformity,
      capa: data.capas[`qms:${r.id}`],
      detailFields: [{ key: 'vendor_compliance', label: 'Vendor compliance / notes', value: r.vendor_compliance ?? '', multiline: true }],
    }))}
    savingIds={savingIds}
    onConformity={(row, c) =>
      mutateRow('qms', row.id, { conformity: c },
        () => patchQmsRow(auditId, row.tag, { conformity: c }).then(() => { if (['NC+', 'NCC', 'nc-'].includes(c)) load(); }))}
    onDetailSave={(row, key, value) =>
      mutateRow('qms', row.id, { [key]: value }, () => patchQmsRow(auditId, row.tag, { [key]: value }))}
  />
)}
```

Category chapter mount:

```tsx
{active?.kind === 'category' && (
  <AssessmentChapter
    grouped
    rows={active.rows.map(r => ({
      id: r.id, tag: r.process_tag, title: r.process_name, conformity: r.conformity,
      section: r.section,
      capa: data.capas[`process-step:${r.id}`],
      hasTestEvidence: data.testEvidenceTags.includes(r.process_tag),
      detailFields: [
        { key: 'vendor_site', label: 'Vendor site (name, city, country)', value: r.vendor_site ?? '' },
        { key: 'vendor_process_spec_ref', label: 'Process spec ref', value: r.vendor_process_spec_ref ?? '' },
        { key: 'vendor_control_plan_ref', label: 'Control plan ref', value: r.vendor_control_plan_ref ?? '' },
        { key: 'production_equipment', label: 'Production equipment', value: r.production_equipment ?? '' },
        { key: 'test_equipment', label: 'Test equipment', value: r.test_equipment ?? '' },
        { key: 'auditor_notes', label: 'Notes', value: r.auditor_notes ?? '', multiline: true },
      ],
    }))}
    savingIds={savingIds}
    onConformity={(row, c) =>
      mutateRow(active.key, row.id, { conformity: c },
        () => patchStep(auditId, active.scopeId, Number(row.id), { conformity: c }).then(() => { if (['NC+', 'NCC', 'nc-'].includes(c)) load(); }))}
    onDetailSave={(row, key, value) =>
      mutateRow(active.key, row.id, { [key]: value }, () => patchStep(auditId, active.scopeId, Number(row.id), { [key]: value }))}
    onOpenPlan={() => setDrawerScopeId(active.scopeId)}
  />
)}

<PlanDrawer auditId={auditId} scopeId={drawerScopeId} onClose={() => setDrawerScopeId(null)} onError={setToast} />
```

(Add the imports: `AssessmentChapter`, `PlanDrawer`, `patchQmsRow`, `patchStep`.)

- [ ] **Step 4: Typecheck + manual verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Manual checklist:
- QMS chapter: click a chip → row tints instantly, spinner shows, value persists on reload.
- Set a row to NC+ → after the background refresh, a CAPA badge appears on it.
- Category chapter: three groups render; expanding a row shows the six detail fields; blur saves.
- Keyboard: click a row, ↓↓, press `1` → third row becomes Full.
- "Next unassessed" jumps over assessed rows.
- A qualification-spine row (e.g. `#0651#`) shows the plan icon → drawer opens, gate chip visible, item status changes persist.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/nexus/workbook/AssessmentChapter.tsx frontend/src/components/nexus/workbook/PlanDrawer.tsx frontend/src/pages/nexus/WorkbookPage.tsx
git commit -m "feat(nexus): workbook assessment chapters with keyboard flow + plan drawer"
```

---

### Task 11: Readiness chapter + exports

**Files:**
- Create: `frontend/src/components/nexus/workbook/ReadinessChapter.tsx`
- Modify: `frontend/src/pages/nexus/WorkbookPage.tsx`

- [ ] **Step 1: ReadinessChapter**

```tsx
// frontend/src/components/nexus/workbook/ReadinessChapter.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  downloadCqmapXlsx, downloadReadinessPdf, getReadiness, patchScopeRow,
} from '../../../services/nexus/workbookService';
import type { ConformitySummary, ReadinessData } from '../../../types/nexus/workbook';

const RANK_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error'> =
  { A: 'success', B: 'info', C: 'warning', D: 'error' };

const pct = (s: ConformitySummary, k: keyof ConformitySummary['pct']) =>
  s.pct[k] === null ? '—' : `${s.pct[k]}%`;

interface Props {
  auditId: number;
  onJump: (chapterKey: string) => void;
  onError: (msg: string) => void;
}

export default function ReadinessChapter({ auditId, onJump, onError }: Props) {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getReadiness(auditId)); }
    catch { onError('Failed to compute readiness'); }
  }, [auditId, onError]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const confirmRank = async (scopeId: number, rank: string) => {
    setBusy(true);
    try { await patchScopeRow(auditId, scopeId, { rank: rank as never }); load(); }
    catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onError(msg ?? 'Rank rejected — the #0706# qualification gate must pass first.');
    } finally { setBusy(false); }
  };

  const startExport = () => data.overall.complete ? doExport() : setConfirmExport(true);
  const doExport = async () => {
    setConfirmExport(false);
    try { await downloadCqmapXlsx(auditId); } catch { onError('Export failed'); }
  };

  const unassessedCount = data.blockers.filter(b => b.type === 'unassessed').length;

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">WOULD WE PASS TODAY?</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <Chip
              label={data.overall.worstRank ? `Worst rank suggestion: ${data.overall.worstRank}` : 'Not enough assessed'}
              color={data.overall.worstRank ? RANK_COLOR[data.overall.worstRank] : 'default'}
            />
            <Chip
              label={data.overall.complete ? 'Fully assessed' : 'Assessment incomplete'}
              variant="outlined"
              color={data.overall.complete ? 'success' : 'warning'}
            />
          </Stack>
        </Paper>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={startExport}>
          Export official CQMAP (xlsx)
        </Button>
        <Button variant="outlined" startIcon={<PictureAsPdfIcon />}
          onClick={() => downloadReadinessPdf(auditId).catch(() => onError('PDF export failed'))}>
          Readiness PDF
        </Button>
      </Stack>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Conformity percentages (official workbook math — tbd counts in the denominator)
      </Typography>
      <Table size="small" component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Area</TableCell><TableCell>NCC%</TableCell><TableCell>NC+%</TableCell>
            <TableCell>nc-%</TableCell><TableCell>RI%</TableCell><TableCell>Full%</TableCell>
            <TableCell>tbd%</TableCell><TableCell>Assessed</TableCell>
            <TableCell>Rank (suggested)</TableCell><TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {[{ label: 'QMS', summary: data.qms.summary, rankSuggestion: data.qms.rankSuggestion, scopeId: null as number | null, currentRank: null as string | null },
            ...data.categories.map(c => ({ label: c.label, summary: c.summary, rankSuggestion: c.rankSuggestion, scopeId: c.scopeId as number | null, currentRank: c.currentRank }))]
            .map(row => (
              <TableRow key={row.label}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{pct(row.summary, 'NCC')}</TableCell>
                <TableCell>{pct(row.summary, 'NC+')}</TableCell>
                <TableCell>{pct(row.summary, 'nc-')}</TableCell>
                <TableCell>{pct(row.summary, 'RI')}</TableCell>
                <TableCell>{pct(row.summary, 'Full')}</TableCell>
                <TableCell>{pct(row.summary, 'tbd')}</TableCell>
                <TableCell>{row.summary.assessed}/{row.summary.total}</TableCell>
                <TableCell>
                  {row.rankSuggestion
                    ? <Chip size="small" label={row.currentRank ?? `→ ${row.rankSuggestion}`} color={RANK_COLOR[row.rankSuggestion]} />
                    : '—'}
                </TableCell>
                <TableCell>
                  {row.scopeId && row.rankSuggestion && row.currentRank !== row.rankSuggestion && (
                    <Button size="small" disabled={busy} onClick={() => confirmRank(row.scopeId!, row.rankSuggestion!)}>
                      Confirm {row.rankSuggestion}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Blockers ({data.blockers.length})
      </Typography>
      <Paper variant="outlined">
        {data.blockers.length === 0 && <Typography sx={{ p: 2 }} color="success.main">None — ready for the auditor. 🎉</Typography>}
        {data.blockers.map((b, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="center"
            sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Chip size="small" label={b.type} color={b.type === 'finding' ? 'error' : b.type === 'gate' ? 'warning' : 'default'} sx={{ width: 96 }} />
            {b.tag && <Chip size="small" label={b.tag} sx={{ fontFamily: 'monospace', fontSize: 10 }} />}
            <Typography variant="body2" sx={{ flex: 1 }}>{b.title}{b.detail ? ` — ${b.detail}` : ''}</Typography>
            <Link component="button" variant="caption" onClick={() => onJump(b.chapterKey)}>Go to chapter →</Link>
          </Stack>
        ))}
      </Paper>

      <Dialog open={confirmExport} onClose={() => setConfirmExport(false)}>
        <DialogTitle>Assessment incomplete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {unassessedCount} area(s) still have unassessed requirements. The exported CQMAP
            will contain "tbd" cells. Export anyway?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmExport(false)}>Keep working</Button>
          <Button variant="contained" onClick={doExport}>Export anyway</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 2: Mount in WorkbookPage**

Replace the readiness placeholder:

```tsx
{active?.kind === 'readiness' && (
  <ReadinessChapter auditId={auditId} onJump={setActiveKey} onError={setToast} />
)}
```

- [ ] **Step 3: Typecheck + manual verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Manual checklist:
- Readiness table shows QMS + each in-scope category with live percentages matching what you marked.
- A category with an NC+ shows rank suggestion C; "Confirm C" without a passing gate → error toast naming #0706# (the backend 422).
- Blocker rows link back to their chapters.
- "Export official CQMAP" with unassessed rows → confirmation dialog → downloads an `.xlsx` that opens in Excel with your values in the right sheets.
- "Readiness PDF" downloads and matches the on-screen numbers.

- [ ] **Step 4: Run the full backend suite once more**

Run: `cd backend && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/nexus/workbook/ReadinessChapter.tsx frontend/src/pages/nexus/WorkbookPage.tsx
git commit -m "feat(nexus): workbook readiness chapter + CQMAP/PDF exports"
```

---

### Task 12: Readiness trend (delta since previous check)

**Files:**
- Create: `backend/db/migrations/041_nexus_readiness_snapshots.sql`
- Modify: `backend/models/index.js`, create `backend/models/NexusReadinessSnapshot.js`, modify `backend/controllers/nexus/workbookController.js`, `frontend/src/types/nexus/workbook.ts`, `frontend/src/components/nexus/workbook/ReadinessChapter.tsx`
- Test: `backend/tests/integration/workbook.integration.test.js` (extend)

- [ ] **Step 1: Migration**

```sql
-- backend/db/migrations/041_nexus_readiness_snapshots.sql
-- One row per readiness computation whose numbers changed; powers the
-- dry-run → fix → re-check trend in the Assessment Workbook.
CREATE TABLE IF NOT EXISTS nexus_readiness_snapshots (
  id SERIAL PRIMARY KEY,
  audit_record_id INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,            -- { qms: {...summary}, categories: [...], blockerCount }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_audit
  ON nexus_readiness_snapshots (audit_record_id, created_at DESC);
```

Run: `npm run migrate` (from repo root). Expected: `041_nexus_readiness_snapshots.sql` applied once.

- [ ] **Step 2: Model + association**

```js
// backend/models/NexusReadinessSnapshot.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusReadinessSnapshot = sequelize.define('NexusReadinessSnapshot', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  payload: { type: DataTypes.JSONB, allowNull: false },
}, {
  tableName: 'nexus_readiness_snapshots',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = NexusReadinessSnapshot;
```

In `backend/models/index.js`: require it alongside the other Nexus models (after line 15), associate after the alert block (~line 175), and export it:

```js
NexusAuditRecord.hasMany(NexusReadinessSnapshot, { foreignKey: 'audit_record_id', as: 'readinessSnapshots' });
NexusReadinessSnapshot.belongsTo(NexusAuditRecord, { foreignKey: 'audit_record_id', as: 'auditRecord' });
```

- [ ] **Step 3: Failing test**

Append to the integration test file:

```js
describe('readiness trend', () => {
  test('second readiness call returns previous snapshot for delta display', async () => {
    // First call records a snapshot…
    await request(app).get(`/api/nexus/audits/${auditId}/readiness`).set(auth());
    // …change something…
    const wb = await request(app).get(`/api/nexus/audits/${auditId}/workbook`).set(auth());
    const icc = wb.body.chapters.find(c => c.kind === 'category' && c.category === 'icc');
    await request(app)
      .patch(`/api/nexus/audits/${auditId}/scope/${icc.scopeId}/steps/${icc.rows[1].id}`)
      .set(auth()).send({ conformity: 'Full' });
    // …second call exposes the previous numbers.
    const res = await request(app).get(`/api/nexus/audits/${auditId}/readiness`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.previous).not.toBeNull();
    expect(res.body.previous.categories.find(c => c.category === 'icc').summary.counts.Full)
      .toBeLessThan(res.body.categories.find(c => c.category === 'icc').summary.counts.Full);
  });
});
```

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js` — Expected: FAIL (`previous` undefined)

- [ ] **Step 4: Implement in `getReadiness`**

In `workbookController.js`, import `NexusReadinessSnapshot` with the other models. Just before `res.json(...)` in `getReadiness`, add:

```js
    // Trend: expose the previous snapshot, then record this one if it differs.
    const current = {
      qms: { summary: qmsSummary },
      categories: categories.map(c => ({ category: c.category, summary: c.summary, rankSuggestion: c.rankSuggestion })),
      blockerCount: blockers.length,
    };
    const last = await NexusReadinessSnapshot.findOne({
      where: { audit_record_id: req.params.id }, order: [['created_at', 'DESC']],
    });
    const previous = last ? last.payload : null;
    if (!last || JSON.stringify(last.payload) !== JSON.stringify(current)) {
      await NexusReadinessSnapshot.create({ audit_record_id: req.params.id, payload: current });
    }
```

and include `previous` plus its timestamp in the response object:

```js
    res.json({
      qms: { summary: qmsSummary, rankSuggestion: suggestRank(qmsSummary) },
      categories,
      blockers,
      previous,
      previousAt: last ? last.created_at : null,
      overall: { /* unchanged */ },
    });
```

- [ ] **Step 5: Frontend delta display**

In `frontend/src/types/nexus/workbook.ts` extend `ReadinessData`:

```ts
export interface ReadinessSnapshot {
  qms: { summary: ConformitySummary };
  categories: { category: string; summary: ConformitySummary; rankSuggestion: string | null }[];
  blockerCount: number;
}
// add to ReadinessData:
//   previous: ReadinessSnapshot | null;
//   previousAt: string | null;
```

In `ReadinessChapter.tsx`, under the "WOULD WE PASS TODAY?" block, add a delta line:

```tsx
{data.previous && data.previousAt && (
  <Typography variant="caption" color="text.secondary">
    Since {new Date(data.previousAt).toLocaleString()}: blockers{' '}
    {data.blockers.length - data.previous.blockerCount >= 0 ? '+' : ''}
    {data.blockers.length - data.previous.blockerCount},{' '}
    Full {data.categories.reduce((a, c) => a + c.summary.counts.Full, 0) -
      data.previous.categories.reduce((a, c) => a + c.summary.counts.Full, 0) >= 0 ? '+' : ''}
    {data.categories.reduce((a, c) => a + c.summary.counts.Full, 0) -
      data.previous.categories.reduce((a, c) => a + c.summary.counts.Full, 0)}
  </Typography>
)}
```

- [ ] **Step 6: Run tests + typecheck**

Run: `cd backend && npx jest tests/integration/workbook.integration.test.js && npm test`
Run: `cd frontend && npx tsc --noEmit`
Expected: PASS / clean

- [ ] **Step 7: Commit**

```bash
git add backend/db/migrations/041_nexus_readiness_snapshots.sql backend/models/NexusReadinessSnapshot.js backend/models/index.js backend/controllers/nexus/workbookController.js backend/tests/integration/workbook.integration.test.js frontend/src/types/nexus/workbook.ts frontend/src/components/nexus/workbook/ReadinessChapter.tsx
git commit -m "feat(nexus): readiness trend snapshots + delta display"
```

---

## Spec deviations (agreed during planning)

1. **Rank suggestion heuristic is ours** — the official xlsx leaves Rank to the auditor (SelectionLists "Auditor Verdict"). We suggest via severity ladder and write back only on explicit user confirmation, which still goes through the existing #0706# gate enforcement.
2. **No "Create CAPA?" prompt** — the backend already auto-creates CAPAs on NC+/nc-/NCC (`utils/nexusCapa.js`); the workbook shows the resulting badge instead.
3. **Percentage denominators include tbd** (xlsx-faithful) — intentionally different from the existing `qmsSummary` score, which stays untouched for the legacy QMS page.
4. **Variant scope rows don't seed steps** (`seed_steps:false`) — one assessment set per category, owned by the primary ("Any …") scope row.
5. **Document Register drawer deferred** — assessment rows have no document-ref field to anchor it to; spec/control-plan references are free-text fields on each row, and the Documents page stays reachable from Audit Detail. Revisit if users ask for it.

## Out of scope (per spec §8)

No Test Entry workflow changes, no migrations, no removal of existing NEXUS pages, no AI auto-assessment.
