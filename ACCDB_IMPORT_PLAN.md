# Import Plan: Access Databases → CQM

## What We're Mapping

| Access Field | CQM Concept | Notes |
|---|---|---|
| `Job Number` / `JobNumber` | `session_number` on `test_sessions` | This IS the session identifier |
| `Test Date` / `TestDate` | `test_date` on `test_sessions` | Direct map |
| `Test Time` / `Time` | Store in `general_notes` or new column | Access stores time separately |
| `Machine Number` / `DiePress` | `equipment_id` on `test_sessions` | Maps to machine/press |
| `Operator` | `inspector_id` → resolve to user | Fuzzy match by name |
| Thickness measurements | `measurement_value` on `test_entries` | One row per measurement per sample card |
| `EMV` (boolean) | `card_type` on `test_sessions` | True = contact EMV chip card |
| Pass/Fail results | `pass_status` on `test_entries` | Computed from delta values |

---

## The Two Files, Side by Side

| Attribute | `Card Add on 2019511.accdb` | `NEWESTUpdated Card Dimension Log` |
|---|---|---|
| Table | `Database1` | `Sheet1` |
| Rows | 5,967 | 2,153 |
| Date range | 2017-09-29 → 2025-05-21 | 2016-10-03 → 2025-07-31 |
| Unique session #s | **2,875** | **1,764** |
| Overlapping session #s | **201 shared** between both files | |
| Cards measured per row | 1 card | 10 cards (Card1–Card10) |
| Thickness points | 3 (A/B/C) | 4 (A/B/C/D) |
| What it tests | Card thickness, Hologram, Sig Panel, Foil | Card Width, Height, Thickness × 10, Warpage × 10 |

The 201 overlapping job numbers mean the same production session recorded data in **both** systems — one for the "add-on" features (holo/foil), one for dimensional data. They belong to the same `test_session` row.

---

## CQM Data Model — Where Everything Lives

```
test_sessions  (1 row per Job Number / production session)
  └── session_number   ← Job Number
  └── test_date        ← Test Date
  └── equipment_id     ← Machine Number / DiePress
  └── inspector_id     ← Operator (resolved to users.id)
  └── card_type        ← EMV flag → 'EMV' | 'Standard'
  └── batch_lot_number ← Batch Number (Dimension Log only)
  └── session_type     ← 'Monitoring' (production data = ongoing)
  └── status           ← 'approved' (historical, already done)

sample_cards  (1 row per card in the session)
  └── session_id       ← FK to test_sessions
  └── card_identifier  ← 'Card1', 'Card2', ... or row index

test_entries  (1 row per measurement per sample card)
  └── session_id          ← FK to test_sessions
  └── sample_card_id      ← FK to sample_cards
  └── test_definition_id  ← FK to test_definitions (matched by name)
  └── measurement_value   ← the numeric reading (mm)
  └── pass_status         ← derived from spec limits
```

---

## Step-by-Step Plan

### Phase 1 — Schema Additions (Migration)

Add columns to `test_sessions` to hold the extra context that doesn't fit existing fields:

```sql
-- Migration: 020_accdb_import_fields.sql
ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS source_file VARCHAR(100),      -- 'card_addon' | 'dimension_log'
  ADD COLUMN IF NOT EXISTS test_time   TIME,              -- original time from Access
  ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(50);   -- tracks which import run created it
```

**Why:** The Access files store test time separate from date. `source_file` lets us audit which rows came from which .accdb. `import_batch_id` lets us roll back a bad import.

---

### Phase 2 — Test Definition Mapping

Each measurement column in Access maps to a `TestDefinition` row. Create/verify these exist before importing:

**From `Card Add on 2019511.accdb` (Card Body Add-On tests):**

| Access Column | Test Definition Name | Category | Unit |
|---|---|---|---|
| Card Thickness A/B/C | Card Thickness (3-point) | Card Body Construction (CBY) | mm |
| Hologram Thickness A/B/C | Hologram Thickness (3-point) | Surface Features | mm |
| Sig Panel Thickness A/B/C | Signature Panel Thickness | Surface Features | mm |
| Foil Thickness A/B/C | Foil Thickness (3-point) | Surface Features | mm |
| AVG Card Thickness | (derived — calculate, don't store separately) | — | mm |
| Hologram Results | Hologram Delta (pass/fail) | Surface Features | delta mm |
| Sig Panel Results | Signature Panel Delta | Surface Features | delta mm |
| Foil Results | Foil Delta (pass/fail) | Surface Features | delta mm |

**From `NEWESTUpdated Card Dimension Log` (Card Dimensions):**

| Access Column | Test Definition Name | Category | Unit |
|---|---|---|---|
| CardN Width | Card Width | Card Body Construction (CBY) | mm |
| CardN Height | Card Height | Card Body Construction (CBY) | mm |
| CardN ThickA/B/C/D | Card Thickness (4-point) | Card Body Construction (CBY) | mm |
| WarpageTestN | Warpage | Card Body Construction (CBY) | mm |
| CornerImpactTest1-4 | Corner Impact | Card Body Construction (CBY) | pass/fail |
| Silk Screen Front/Back | Silk Screen Visual | Surface Features | pass/fail |

---

### Phase 3 — Operator / User Resolution

The Access `Operator` field contains freeform names (`xm`, `Thanh Truong`, `RACHEL`, `er`, `nr`). Strategy:

1. Extract all distinct operator strings from both files
2. Create a mapping table (JSON config file) like:
   ```json
   {
     "xm": null,
     "Thanh Truong": 3,
     "RACHEL": 5,
     "nr": 7,
     "er": 8
   }
   ```
3. `null` = unknown operator → assign to a generic "Imported Data" system user
4. Run this mapping before import so every session gets a valid `inspector_id`

---

### Phase 4 — Session Deduplication (The 201 Overlapping Jobs)

For sessions that appear in **both** files (201 shared job numbers):
- Create **one** `test_session` row using the job number as `session_number`
- Import `Card Add on` measurements as `test_entries` (holo/foil/sig panel)
- Import `Dimension Log` measurements as additional `test_entries` on the same session
- Use `sample_card_id` to link measurements to the right card within that session

For sessions that appear in **only one** file:
- Create one `test_session` row from that file's data alone

---

### Phase 5 — Row Expansion (Dimension Log is Wide, CQM is Tall)

The Dimension Log has 10 cards in a single row. CQM stores one `sample_card` + many `test_entries` per card. The transform is:

```
Sheet1 row (Job 37111):
  Card1Width=-0.049, Card1Height=-0.016, Card1ThickA=0.803, Card1ThickB=0.803, ...
  Card2Width=-0.059, Card2Height=-0.003, Card2ThickA=0.808, ...
  ...

→ test_sessions row: session_number='37111'
→ sample_cards rows: card_identifier='Card1', 'Card2', ... 'Card10' (skip NULLs)
→ test_entries rows: one per (card × measurement type)
   e.g., Card1 × Width = -0.049
         Card1 × Height = -0.016
         Card1 × ThickA = 0.803
         ...
```

---

### Phase 6 — Write the Import Script

Create `backend/import-accdb-data.js` using `node-adodb` or `pyodbc` via a Python subprocess:

```
backend/
  import-accdb-data.js          ← main orchestrator
  import-data/
    operator-map.json           ← operator name → user ID
    test-definition-map.json    ← Access column → test_definition_id
    card-addon-transform.js     ← transforms Database1 rows → CQM rows
    dimension-log-transform.js  ← transforms Sheet1 rows → CQM rows (wide→tall)
```

**Script flow:**
1. Load operator map + test definition IDs from DB
2. Read Access file via ODBC (or exported CSV)
3. For each Access row:
   - Upsert `test_session` by `session_number` (idempotent — safe to re-run)
   - Insert `sample_cards` for each card position
   - Insert `test_entries` per measurement
4. Log skipped/failed rows to `import-errors.log`
5. Print summary: X sessions created, Y test_entries inserted, Z skipped

---

### Phase 7 — Validation After Import

After running the script, verify:

```sql
-- Sessions imported
SELECT COUNT(*), MIN(test_date), MAX(test_date)
FROM test_sessions
WHERE source_file IN ('card_addon', 'dimension_log');

-- Entries per session (should be 12-40 depending on test type)
SELECT session_id, COUNT(*) as entry_count
FROM test_entries
GROUP BY session_id
ORDER BY entry_count DESC LIMIT 20;

-- Sessions with BOTH source files (should be ~201)
SELECT session_number, COUNT(DISTINCT source_file) as file_count
FROM test_sessions
WHERE source_file IS NOT NULL
GROUP BY session_number
HAVING COUNT(DISTINCT source_file) = 2;
```

---

## Recommended Order of Work

1. **[ ] Phase 1** — Write and run migration `020_accdb_import_fields.sql`
2. **[ ] Phase 2** — Seed missing `TestDefinition` rows for the Access columns
3. **[ ] Phase 3** — Extract all operators, build `operator-map.json`
4. **[ ] Phase 4/5/6** — Write `card-addon-transform.js` + `dimension-log-transform.js`
5. **[ ] Phase 6** — Write `import-accdb-data.js` orchestrator
6. **[ ] Phase 7** — Run import on a test DB, validate counts, then run on production

---

## Open Questions Before Starting

| Question | Why It Matters |
|---|---|
| Are the 201 overlapping job numbers guaranteed to be the same session, or could there be numeric collisions? | Determines whether to merge or create separate sessions |
| What is the spec limit for card thickness (pass/fail threshold)? | Needed to set `pass_status` on imported entries |
| Should imported sessions be `status='approved'` or `status='submitted'`? | Historical data — likely approved but needs confirmation |
| Which `card_type` value do EMV=False rows get? | The non-EMV cards need a type label |
| Is `Batch Number` (Dimension Log) the same concept as `batch_lot_number`? | e.g., "16/27" — is that lot 16 of 27 in a run? |
