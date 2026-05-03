# Mock / Dummy Data Plan

## Overview

This document describes all the seed data the CQM application needs to be fully functional and testable, including the upcoming Autodata feature. It covers the recommended data volume, what already exists, what order to run it in, and what still needs to be built.

---

## Recommended Data Volume: 18 Months

**Range: November 2024 → May 2026 (current date)**

### Why 18 Months

| Feature | Minimum to work | Why 18 months hits the sweet spot |
|---------|----------------|-----------------------------------|
| SPC charts (I-MR control limits) | 25 data points | 150+ points per test = statistically solid limits |
| KPI trend lines | 3 months | 18 monthly snapshots show reversals and improvements |
| Autodata training set | ~500 entries | ~25,000 entries = genuinely useful ML dataset |
| Re-qualification cycles | 1 per card type | 3–4 per card type shows realistic workflow |
| Year-over-year comparison | 24 months | 18 months gets close enough for trend analysis |

### Estimated Volume at 18 Months

- ~300 test sessions
- ~25,000 test entries (300 sessions × ~17 tests × 5 sample cards)
- ~20 qualification cycles across card types
- ~250 monitoring sessions
- 5 established card types + 2 introduced mid-way
- 3 inspectors (needed for Kappa study reliability)

---

## Data Story Arcs (Makes Data Useful, Not Just Noise)

Structure the 18 months with realistic story arcs so charts tell a coherent story:

### Period 1 — Baseline (Nov 2024 – Apr 2025, months 1–6)
- 2 card types in active monitoring (Visa Classic DI, MC Standard Contact)
- Pass rate ~95%
- 1 qualification cycle each, both approved
- Stable, clean reference period for control limit calculation

### Period 2 — Summer Stress (May – Jul 2025, months 7–9)
- Pass rate dips to ~92%
- Adhesion and peel strength failures increase (heat affects lamination)
- 2 sessions rejected, triggering re-qualification flows
- SPC charts show process going out of control then recovering

### Period 3 — Process Improvement (Aug – Oct 2025, months 10–12)
- New lamination press settings implemented
- Pass rate climbs to ~97%
- 2 new card types enter qualification pipeline (Transit NFC, AMEX Contactless)
- SPC charts show step-change improvement — useful for demonstrating feature

### Period 4 — Stable High Performance (Nov 2025 – Jan 2026, months 13–15)
- All 5 card types in active monitoring
- Pass rate ~97–98%
- Government ID card begins qualification
- Connects seamlessly into existing seed data

### Period 5 — Existing Seeds (Jan – May 2026, months 16–18)
- Already covered by `seed-demo-data.js` and `seed-realworld-sessions.js`
- Do not re-seed this range

---

## What Makes the Data "Clean"

- **Gaussian measurement noise** around target values — not random uniform spread
- **Correlated failures** — when card thickness fails, corner radius often fails too (physically realistic)
- **Consistent inspector IDs** — 3 inspectors with slightly different tendencies (required for meaningful Kappa studies)
- **Business-day sessions only** — Mon–Fri, 2–3 sessions per week per card type
- **No orphan records** — every TestEntry has a session, every session has a job
- **Continuous timeline** — no unexplained gaps longer than 2 weeks

---

## Build Plan

The existing seeds already cover Jan–May 2026. One new script handles the backfill:

```
backend/seed-historical-data.js    ← Nov 2024 – Dec 2025 (13-month backfill)
```

Run it **before** `seed-demo-data.js` so the timeline is continuous. Estimated run time: under 2 minutes.

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

# 4. Seed historical backfill (Nov 2024 – Dec 2025)  ← TO BE BUILT
node seed-historical-data.js

# 5. Seed recent/current data (Jan – May 2026)
node seed-realworld-sessions.js
node seed-demo-data.js
node seed-dummy-session.js
node seed-peel-sessions.js
node seed-overlay-peel.js
```

---

## What Is Missing / Needs to Be Built

### 1. Historical Backfill Seed — PRIORITY

`backend/seed-historical-data.js` covering Nov 2024 – Dec 2025.

Structure:
- Period 1 (Nov 2024 – Apr 2025): Visa Classic DI + MC Standard Contact baseline
- Period 2 (May – Jul 2025): Summer stress period with adhesion failures
- Period 3 (Aug – Oct 2025): Process improvement + 2 new card types enter pipeline
- Period 4 (Nov 2025 – Dec 2025): Stable high-performance bridge to existing seeds

Uses the same `genEntry()` / `rand()` pattern as `seed-demo-data.js` for consistency.

### 2. KpiConfig Seed

The dashboard KPI widgets read from `kpi_configs` table. No seed script exists yet.

```js
// backend/seed-kpi-config.js
{ kpi_key: 'overall_pass_rate',   kpi_name: 'Overall Pass Rate',       target_value: 98.0, warning_threshold: 95.0, higher_is_better: true }
{ kpi_key: 'first_pass_yield',    kpi_name: 'First Pass Yield',        target_value: 97.0, warning_threshold: 93.0, higher_is_better: true }
{ kpi_key: 'qualification_cycle', kpi_name: 'Avg Qualification Days',  target_value: 14,   warning_threshold: 21,   higher_is_better: false }
{ kpi_key: 'open_rejections',     kpi_name: 'Open Rejections',         target_value: 0,    warning_threshold: 3,    higher_is_better: false }
{ kpi_key: 'phy_pass_rate',       kpi_name: 'PHY Category Pass Rate',  target_value: 99.0, warning_threshold: 96.0, higher_is_better: true }
{ kpi_key: 'ele_pass_rate',       kpi_name: 'ELE Category Pass Rate',  target_value: 97.0, warning_threshold: 94.0, higher_is_better: true }
```

### 3. Job Seed

Most sessions create jobs inline. A standalone `seed-jobs.js` helps manual testing and Autodata pipeline filtering.

Card types to cover:
- Credit Card (Visa Classic DI, Mastercard Standard Contact)
- Debit Card (MC Contactless)
- Transit NFC (Type A, Type B)
- AMEX Blue Contactless
- Government ID Card

### 4. Autodata Mock Runs

After the Autodata feature is implemented (see `autodata-agentic-framework-plan.md`), seed the `autodata_runs` table with example runs in each status:

```js
// backend/seed-autodata-runs.js  (create after feature is built)
[
  { run_name: 'Visa PHY Batch — Period 1',  status: 'completed', sample_count: 312, dataset_format: 'jsonl' },
  { run_name: 'MC Contactless ELE Full Run', status: 'completed', sample_count: 198, dataset_format: 'csv'  },
  { run_name: 'Transit NFC 18-Month Pull',  status: 'failed',    error_message: 'No TestEntry data matched filters' },
  { run_name: 'AMEX Overlay Peel Dataset',  status: 'running',   sample_count: null },
  { run_name: 'Government ID Qualification', status: 'queued',   sample_count: null },
]
```

Also need fixture dataset files at `backend/datasets/{runId}/`:
- `dataset.jsonl` — 20–30 lines of annotated entries
- `dataset_card.json` — schema, sample count, date range, quality score

### 5. RagDocument Seed

RAG knowledge base requires manually uploading PDFs. A seed script placing fixture PDFs in `backend/uploads/rag-docs/` and triggering ingestion would streamline setup.

Needs 1–2 synthetic ISO standard excerpt PDFs in `backend/fixtures/rag/`.

---

## Card Types to Cover Across All Seeds

| Card Type | Test Categories | Monitoring Sessions | Qualification Cycles |
|-----------|----------------|---------------------|----------------------|
| Credit Card (Visa Classic DI) | PHY, CBY, ELE | ~60 over 18 months | 3 (all approved) |
| Mastercard Standard Contact | PHY, CBY, ELE | ~50 over 18 months | 2 (1 fail → re-qual) |
| Debit MC Contactless | PHY, ELE, ICC-REQ | ~40 over 18 months | 2 (approved) |
| Transit NFC Type A | PHY, CBY, ELE, ICC-REQ | ~30 (introduced month 10) | 2 (1 fail → re-qual) |
| AMEX Blue Contactless | PHY, ELE | ~25 (introduced month 10) | 1 (approved) |
| Government ID | PHY, CBY | ~10 (introduced month 14) | 1 (in progress) |

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

Expected counts after full 18-month seed:

| Table | Minimum | Target (18 months) |
|-------|---------|-------------------|
| TestCategory | 6 | 8 |
| TestDefinition | 30 | 50+ |
| TestSession | 10 | 280–320 |
| TestEntry | 200 | 23,000–27,000 |
