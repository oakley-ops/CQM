# SPC Implementation Plan — Width & Height (Card Dimensions KPI)

## Goal

Add two more X-bar control charts to the KPI page — one for **Width** and one for **Height** —
mirroring the completed IT-PHY-002 Thickness chart. All three dimension charts will live on the
same KPI page behind a **tab selector** (Thickness · Width · Height).

Data source: same Access DB as Thickness
`NEWESTUpdatedCard Dimension Log 1.23.17181.accdb` → table `Sheet1`

---

## New Test Definitions

| Dimension | Test ID    | ISO Standard | Stored as      | Spec limits      |
|-----------|------------|--------------|----------------|------------------|
| Width     | IT-PHY-001 | IS7810 #3003# | Deviation (mm) | -0.13 – +0.13 mm |
| Height    | IT-PHY-003 | IS7810 #3003# | Deviation (mm) | -0.13 – +0.13 mm |

> **Important — deviation values:** `Card${i}Width` and `Card${i}Height` in the Access DB
> store the **deviation from nominal**, not absolute mm.
> Nominal: Width = 85.60 mm | Height = 53.98 mm. Tolerance: ±0.13 mm (IS7810).
> Therefore LSL = -0.13 mm, USL = +0.13 mm for both charts.

These definitions need to be inserted into `test_definitions` if they don't already exist.
See Step 2 for the migration SQL.

---

## Access DB Column Discovery (COMPLETED)

Ran `explore-accdb-columns.ps1` on 2026-04-18. Results:

**Card Dimension Log (`Sheet1`)** — same file as Thickness:
- Width columns: `Card1Width` … `Card10Width` ✓ (single value per card, deviation in mm)
- Height columns: `Card1Height` … `Card10Height` ✓ (single value per card, deviation in mm)
- Also contains: `WarpageTest1–10`, `CornerImpactTest1–4`, `EMV`, `Silk Screen` columns

**Card Add-on DB (`Database1`)** — thickness variants only (Card/Hologram/SigPanel/Foil).
No width or height columns. **Not used for this task.**

---

## Spec Limits (IS7810)

Values stored as deviation from nominal — charts plot deviation, not absolute mm.

| Dimension | Nominal   | Tolerance | LSL    | USL    |
|-----------|-----------|-----------|--------|--------|
| Width     | 85.60 mm  | ± 0.13 mm | -0.13  | +0.13  |
| Height    | 53.98 mm  | ± 0.13 mm | -0.13  | +0.13  |

---

## SPC Formula (same I-MR as Thickness)

```
MR_i  = |X_i − X_(i-1)|
MR̄    = mean of all MR_i
σ_mr  = MR̄ / 1.128

UCL   = X̄ + 3 × σ_mr
LCL   = X̄ − 3 × σ_mr   (floor at 0)
```

The existing `backend/utils/spcEngine.js` already implements this — no changes needed.

---

## Build Steps

### Step 1 — Column Discovery ✅ DONE

Columns confirmed: `Card${i}Width`, `Card${i}Height` (i = 1–10).
Source: `NEWESTUpdatedCard Dimension Log 1.23.17181.accdb` → `Sheet1`.
Values are deviations from nominal in mm.

---

### Step 2 — Test Definition Migration

**File:** `backend/db/migrations/026_add_width_height_test_definitions.sql`

```sql
-- Width: IT-PHY-001
INSERT INTO test_definitions (
  test_id, test_name, short_name, description,
  test_type, iso_standard, unit_of_measurement,
  min_acceptable_value, max_acceptable_value,
  is_active, created_at, updated_at
)
SELECT
  'IT-PHY-001',
  'Card Width Deviation',
  'Width',
  'Width deviation from 85.60 mm nominal per IS7810 #3003# (tolerance ±0.13 mm)',
  'Dimensional', 'IS7810', 'mm',
  -0.13, 0.13,
  true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM test_definitions WHERE test_id = 'IT-PHY-001'
);

-- Height: IT-PHY-003
INSERT INTO test_definitions (
  test_id, test_name, short_name, description,
  test_type, iso_standard, unit_of_measurement,
  min_acceptable_value, max_acceptable_value,
  is_active, created_at, updated_at
)
SELECT
  'IT-PHY-003',
  'Card Height Deviation',
  'Height',
  'Height deviation from 53.98 mm nominal per IS7810 #3003# (tolerance ±0.13 mm)',
  'Dimensional', 'IS7810', 'mm',
  -0.13, 0.13,
  true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM test_definitions WHERE test_id = 'IT-PHY-003'
);
```

Run: `npm run migrate`

---

### Step 3 — PowerShell Export Scripts

Two new scripts, one per dimension. Pattern mirrors `export-thickness-accdb.ps1`.

**`backend/scripts/export-width-accdb.ps1`**

```powershell
# Export width monitoring data from Access DB
# Fill in <WIDTH_COL> with actual column name from Step 1

$dbPath  = "C:\Users\Quali\CQM\NEWESTUpdatedCard Dimension Log 1.23.17181.accdb"
$outPath = "C:\Users\Quali\CQM\backend\scripts\data\width-monitoring.json"

$LSL = -0.13; $USL = 0.13

$conn = New-Object System.Data.OleDb.OleDbConnection(
  "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"
)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT * FROM [Sheet1] ORDER BY TestDate ASC, Time ASC"
$reader = $cmd.ExecuteReader()

$results = @(); $skipped = 0

while ($reader.Read()) {
  $jobNumber = "$($reader['JobNumber'])".Trim()
  $testDate  = $reader['TestDate']
  $operator  = "$($reader['Operator'])".Trim()

  if ([string]::IsNullOrWhiteSpace($jobNumber)) { $skipped++; continue }

  $dateStr = ''
  try { $dateStr = ([datetime]$testDate).ToString('yyyy-MM-dd') }
  catch { $skipped++; continue }

  $cards = @()
  for ($i = 1; $i -le 10; $i++) {
    $val = $reader["Card${i}Width"]

    if ($val -eq $null -or $val -eq [DBNull]::Value -or "$val".Trim() -eq '') { continue }

    $num  = [double]$val
    $pass = ($num -ge $LSL -and $num -le $USL)

    $cards += @{ cardNumber = $i; widthMm = $num; pass = $pass }
  }

  if ($cards.Count -eq 0) { $skipped++; continue }

  $results += @{ jobNumber = $jobNumber; testDate = $dateStr; operator = $operator; cards = $cards }
}

$reader.Close(); $conn.Close()
$results | ConvertTo-Json -Depth 5 | Set-Content -Path $outPath -Encoding UTF8
Write-Host "Done. $($results.Count) sessions | Skipped: $skipped"
```

**`backend/scripts/export-height-accdb.ps1`** — identical structure, replace `Card${i}Width`
with `Card${i}Height`, `widthMm` → `heightMm`, and use LSL = -0.13 / USL = +0.13.

---

### Step 4 — Node.js Seeder Scripts

**`backend/scripts/import-width-monitoring.js`**

```js
'use strict';
const path   = require('path');
const { sequelize } = require('../models');

const TEST_ID   = 'IT-PHY-001';
const JSON_FILE = path.join(__dirname, 'data/width-monitoring.json');
const LSL = 85.47, USL = 85.73;

async function run() {
  const data = JSON.parse(require('fs').readFileSync(JSON_FILE, 'utf8'));
  const [def] = await sequelize.query(
    `SELECT id FROM test_definitions WHERE test_id = '${TEST_ID}' LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  if (!def) throw new Error(`${TEST_ID} not found — run seeds/migrate first.`);
  console.log(`✅ ${TEST_ID} id = ${def.id}`);

  let created = 0, skipped = 0;
  for (const job of data) {
    const [session] = await sequelize.query(
      `INSERT INTO test_sessions (session_number, session_type, session_date, created_at, updated_at)
       VALUES (:sn, 'Monitoring', :date, NOW(), NOW())
       ON CONFLICT (session_number) DO UPDATE SET session_number = EXCLUDED.session_number
       RETURNING id`,
      { replacements: { sn: job.jobNumber, date: job.testDate },
        type: sequelize.QueryTypes.SELECT }
    );

    for (const card of job.cards) {
      const exists = await sequelize.query(
        `SELECT 1 FROM test_entries
         WHERE test_session_id = :sid AND test_definition_id = :did AND card_number = :cn LIMIT 1`,
        { replacements: { sid: session.id, did: def.id, cn: card.cardNumber },
          type: sequelize.QueryTypes.SELECT }
      );
      if (exists.length) { skipped++; continue; }

      await sequelize.query(
        `INSERT INTO test_entries
         (test_session_id, test_definition_id, card_number, measured_value, pass_fail, created_at, updated_at)
         VALUES (:sid, :did, :cn, :val, :pf, NOW(), NOW())`,
        { replacements: { sid: session.id, did: def.id, cn: card.cardNumber,
                          val: card.widthMm, pf: card.pass ? 'Pass' : 'Fail' } }
      );
      created++;
    }
  }
  console.log(`Imported: ${created} entries | Skipped (already exist): ${skipped}`);
  await sequelize.close();
}
run().catch(e => { console.error(e); process.exit(1); });
```

**`backend/scripts/import-height-monitoring.js`** — identical, swap `IT-PHY-001` → `IT-PHY-003`,
`widthMm` → `heightMm`, LSL/USL to 53.85/54.11.

Run order:
```bash
node backend/scripts/import-width-monitoring.js
node backend/scripts/import-height-monitoring.js
```

---

### Step 5 — KPI Page Refactor (Tabbed Multi-Chart)

The KPI page currently has `TARGET_TEST_ID = 'IT-PHY-002'` hardcoded.
Refactor to a **tab layout** — one tab per dimension.

```
[ Thickness | Width | Height ]
 ─────────────────────────────
   (chart + stat cards below)
```

**Key changes to `frontend/src/pages/cqm/KPIPage.tsx`:**

1. Add a `DIMENSION_TABS` config array:

```ts
const DIMENSION_TABS = [
  {
    label:   'Thickness',
    testId:  'IT-PHY-002',
    spec:    '0.76 – 0.84 mm',
    desc:    'Thickness outside Contacts, Embossed & Add-on Areas [IS7810]',
  },
  {
    label:   'Width',
    testId:  'IT-PHY-001',
    spec:    '±0.13 mm deviation (nominal 85.60 mm)',
    desc:    'Card width deviation per IS7810 #3003#',
  },
  {
    label:   'Height',
    testId:  'IT-PHY-003',
    spec:    '±0.13 mm deviation (nominal 53.98 mm)',
    desc:    'Card height deviation per IS7810 #3003#',
  },
] as const;
```

2. Replace the page-level `defId` / `spcData` state with per-tab state or a single active-tab
   state that reloads on tab change.

3. Use MUI `<Tabs>` / `<Tab>` above the date controls, keeping the rest of the chart code
   unchanged (it already accepts `unit` dynamically from the def record).

4. Page header title → `"Card Dimensions — SPC Control Charts"`, subtitle shows the active
   tab's `spec` and `desc`.

**No backend changes required** — the existing `/dashboard/spc-data?testDefinitionId=X` endpoint
already works generically for any test definition.

---

## File Checklist

| File | Action |
|------|--------|
| `backend/scripts/explore-accdb-columns.ps1` | CREATE — column discovery |
| `backend/db/migrations/026_add_width_height_test_definitions.sql` | CREATE — new defs |
| `backend/scripts/export-width-accdb.ps1` | CREATE — export width JSON |
| `backend/scripts/export-height-accdb.ps1` | CREATE — export height JSON |
| `backend/scripts/import-width-monitoring.js` | CREATE — seed width entries |
| `backend/scripts/import-height-monitoring.js` | CREATE — seed height entries |
| `frontend/src/pages/cqm/KPIPage.tsx` | UPDATE — tab selector, DIMENSION_TABS config |

---

## Execution Order

```
1. Run explore-accdb-columns.ps1  →  confirm Width/Height column names
2. Fill column names into export scripts
3. Run migration 026
4. Run both PowerShell export scripts  →  JSON files in backend/scripts/data/
5. Run both Node import scripts         →  data in DB
6. Update KPIPage.tsx (tabs)
7. Smoke-test: switch tabs, verify all 3 charts load with correct spec lines
```

---

## Decision Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Chart type | Same I-chart (X-bar) | Consistent with Thickness; spcEngine unchanged |
| Measurement per card | Single value (Width or Height column) | Likely 1 measurement per card unlike thickness which has A/B/C/D |
| Tab layout | MUI Tabs above existing date controls | Minimal page change; chart/stat code reused as-is |
| Test IDs | IT-PHY-001 (Width), IT-PHY-003 (Height) | Sequential with IT-PHY-002 Thickness |
| Column discovery | PowerShell GetSchema first | Column names unknown until Access DB inspected |
| Backend changes | None | spc-data endpoint already generic |
