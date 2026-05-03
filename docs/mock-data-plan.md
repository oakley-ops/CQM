# Mock / Dummy Data Plan

## Overview

This document describes all the seed data the CQM application needs to be fully functional and testable, including the upcoming Autodata feature. It covers what already exists, what order to run it in, and what still needs to be built.

---

## What Already Exists

### Seed Scripts (run from `backend/`)

| Script | What it creates | Run order |
|--------|----------------|-----------|
| `seed-test-categories.js` | TestCategory rows (PHY, CBY, ELE, ICC-REQ, SMC, etc.) | 1st |
| `seed-test-definitions.js` | TestDefinition rows tied to categories | 2nd |
| `seed-internal-tests.js` | Internal test definitions (IT-PHY-*, IT-CBY-*, IT-ELE-*) | 3rd |
| `seed-cby-tests.js` | Card Body (CBY) specific test definitions | 3rd (parallel) |
| `seed-icc-tests.js` | ICC/contactless test definitions | 3rd (parallel) |
| `seed-dummy-session.js` | 1 session (SES-DUMMY-001), job J-1002, 17 test entries — status: submitted | 4th |
| `seed-realworld-sessions.js` | 6 sessions (3 Monitoring + 3 Qualification) across Visa/MC/AMEX/Transit card types, mix of approved/rejected/submitted | 4th |
| `seed-demo-data.js` | 5 months of realistic production data (Jan–May 2026), multiple card types, failure/re-qual flows | 4th |
| `seed-peel-sessions.js` | Peel strength test sessions | 4th |
| `seed-overlay-peel.js` | Overlay peel test entries | 4th |
| `seed-peel-strength.js` | Peel strength measurement entries | 4th |

### Seed Data Files (`backend/seed-data/`)

| File | Contents |
|------|---------|
| `test-categories.json` | Full list of ISO-aligned test categories with subcategories |
| `sample-test-definitions.json` | Sample test spec definitions |

### Admin User

```bash
npm run create-admin
# Creates: admin@cqm.com / cqm123  (role: admin)
```

---

## Full Setup — Order of Operations

Run these in sequence on a fresh database:

```bash
# 1. Migrate schema
npm run migrate

# 2. Create admin user
npm run create-admin

# 3. Seed reference data (categories + definitions)
cd backend
node seed-test-categories.js
node seed-test-definitions.js
node seed-internal-tests.js
node seed-cby-tests.js
node seed-icc-tests.js

# 4. Seed session/entry data
node seed-realworld-sessions.js     # 6 deterministic sessions (good baseline)
node seed-demo-data.js              # 5 months of realistic production data
node seed-dummy-session.js          # 1 minimal dummy session for form testing
node seed-peel-sessions.js
node seed-overlay-peel.js
```

---

## What Is Missing / Needs to Be Built

### 1. KpiConfig Seed

The dashboard KPI widgets read from `kpi_configs` table. No seed script exists for this yet.

**Needs to create:**
```js
// backend/seed-kpi-config.js
// KPI rows needed:
{ kpi_key: 'overall_pass_rate',     kpi_name: 'Overall Pass Rate',      target_value: 98.0, warning_threshold: 95.0, higher_is_better: true }
{ kpi_key: 'first_pass_yield',      kpi_name: 'First Pass Yield',       target_value: 97.0, warning_threshold: 93.0, higher_is_better: true }
{ kpi_key: 'qualification_cycle',   kpi_name: 'Avg Qualification Days',  target_value: 14,   warning_threshold: 21,   higher_is_better: false }
{ kpi_key: 'open_rejections',       kpi_name: 'Open Rejections',        target_value: 0,    warning_threshold: 3,    higher_is_better: false }
{ kpi_key: 'phy_pass_rate',         kpi_name: 'PHY Category Pass Rate', target_value: 99.0, warning_threshold: 96.0, higher_is_better: true }
{ kpi_key: 'ele_pass_rate',         kpi_name: 'ELE Category Pass Rate', target_value: 97.0, warning_threshold: 94.0, higher_is_better: true }
```

### 2. Job Seed

Most sessions reference `job_id` but there is no standalone job seed. The demo/realworld scripts create jobs inline. A dedicated `seed-jobs.js` would help for manual testing.

**Needs to create 5–10 jobs covering card types:**
- Credit Card (Visa Classic, Mastercard Standard)
- Debit Card (MC Contactless)
- Transit NFC (Card Type B)
- AMEX Blue Contactless
- Government ID Card

### 3. SampleCard Seed

`seed-realworld-sessions.js` and `seed-demo-data.js` create sample cards inline. For isolated testing of the TestEntry form, a standalone sample card seed script would be useful.

### 4. Autodata Mock Runs

Once the Autodata feature is implemented (see `autodata-agentic-framework-plan.md`), seed the `autodata_runs` table with example runs in each status:

```js
// backend/seed-autodata-runs.js  (create after feature is implemented)
[
  { run_name: 'Visa PHY Batch Jan 2026', status: 'completed', sample_count: 124, dataset_format: 'jsonl' },
  { run_name: 'MC Contactless ELE Q1',   status: 'completed', sample_count: 89,  dataset_format: 'csv'  },
  { run_name: 'Transit NFC Full Run',    status: 'failed',    error_message: 'No TestEntry data matched filters' },
  { run_name: 'AMEX Overlay Peel Data',  status: 'running',   sample_count: null },
  { run_name: 'Draft — not started',     status: 'queued',    sample_count: null },
]
```

Also need mock dataset files at `backend/datasets/{runId}/`:
- `dataset.jsonl` — 10–20 lines of annotated entries
- `dataset_card.json` — schema description, sample count, quality score

### 5. RagDocument Seed

The RAG knowledge base works but requires manually uploading PDFs. A seed script that copies test PDFs into `backend/uploads/rag-docs/` and inserts `rag_documents` rows + triggers ingestion would help onboarding.

**Needs:** at least 1–2 ISO standard excerpts (public domain or synthetic) as PDF fixtures in `backend/fixtures/rag/`.

---

## Card Types to Cover in Mock Data

All seed data should include variety across these card types (mirrors real production usage):

| Card Type | Typical Test Categories | Sessions Needed |
|-----------|------------------------|----------------|
| Credit Card (Visa/MC) | PHY, CBY, ELE | Monitoring × 3, Qualification × 2 |
| Debit Card (Contactless) | PHY, ELE, ICC-REQ | Monitoring × 2, Qualification × 2 |
| Transit NFC (Type B) | PHY, CBY, ELE, ICC-REQ | Qualification × 2 (1 fail, 1 pass) |
| AMEX Contactless | PHY, ELE | Monitoring × 2 |
| Government ID | PHY, CBY | Qualification × 1 |

---

## Test Data Quality Targets

For the dashboard, SPC charts, and Autodata pipeline to show meaningful output, the seeded data should include:

- **Pass rate ~94–97%** overall (not 100% — need real failures to test KPIs)
- **At least 3 rejected sessions** to exercise rejection-breakdown chart
- **At least 1 re-qualification flow** (rejected → fix → approved)
- **Measurement values** with realistic spread (Gaussian noise around target, occasional outliers)
- **Date range** spanning at least 3 months so SPC trend charts have enough points
- **Multiple inspectors** (at least 2 user IDs) to test Kappa study functionality

The existing `seed-demo-data.js` already satisfies most of these — run it first before writing new seeds to avoid duplication.

---

## Quick Check — Is Data Loaded?

```bash
cd backend
node -e "
const {sequelize, TestCategory, TestDefinition, TestSession, TestEntry} = require('./models');
(async () => {
  await sequelize.authenticate();
  console.log('Categories:', await TestCategory.count());
  console.log('Definitions:', await TestDefinition.count());
  console.log('Sessions:', await TestSession.count());
  console.log('Entries:', await TestEntry.count());
  process.exit(0);
})();
"
```

Expected minimum for full feature testing:
- Categories ≥ 6
- Definitions ≥ 30
- Sessions ≥ 10
- Entries ≥ 200
