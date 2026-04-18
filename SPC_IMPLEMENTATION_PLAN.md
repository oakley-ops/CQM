# SPC Implementation Plan — IT-PHY-002 Thickness Monitoring

## Goal

One clean control chart on the KPI page showing thickness monitoring data for:

> **Thickness outside Contacts, Embossed Areas, and Add-on Areas [IS7810]**
> Test ID: `IT-PHY-002` | Spec: 0.76 – 0.84 mm | Method: #8040#

---

## Target Chart Design

Based on reference screenshot — simple X-bar style control chart:

```
Thickness (mm)
  │
  │  UCL ─────────────────────────────────────  (red line)
  │       ●─●     ●─●─●
  │  X̄  ──────●──────────●─●──────────────────  (green line)
  │               ●             ●─●
  │  LCL ─────────────────────────────────────  (red line)
  │
  └──────────────────────────────────────────→
       Observation / Session Number
```

- **UCL** — red horizontal line (Upper Control Limit = X̄ + 3σ)
- **X̄** — green horizontal line (process mean)
- **LCL** — red horizontal line (Lower Control Limit = X̄ − 3σ)
- Data points connected by a line
- Out-of-control points highlighted (different color or circled)
- Tooltip on hover: value, date, job number
- Period selector: 30D / 90D / 180D / 1Y

**No MR chart. No histogram. No capability panel. One chart.**

---

## Spec Limits (IS7810 / #3003#)

| Limit | Value |
|-------|-------|
| LSL (min) | 0.76 mm |
| USL (max) | 0.84 mm |
| Already set in DB | ✓ (`min_acceptable_value`, `max_acceptable_value`) |

---

## Data Source

**File:** `NEWESTUpdatedCard Dimension Log 1.23.17181.accdb` → table `Sheet1`
- 2,153 rows | Oct 2016 → Jul 2025
- Up to 10 cards per row, each with 4 measurement points (ThickA/B/C/D)
- Session number = **Job Number** (e.g. `37111`)
- Skip cards where all 4 thickness fields are blank

**Measurement value per card:** average of ThickA + ThickB + ThickC + ThickD
**Session type:** `Monitoring` only

---

## SPC Control Limit Formulas (I-MR method)

```
MR_i     = |X_i − X_(i-1)|          moving range between consecutive points
MR̄       = mean of all MR_i
σ_mr     = MR̄ / 1.128              (d2 constant for subgroup size = 2)

UCL      = X̄ + 3 × σ_mr
LCL      = X̄ − 3 × σ_mr           (floor at 0 if negative)
```

Out-of-control = point above UCL or below LCL.

---

## Build Steps

### Step 1 — Export Access DB to JSON (PowerShell)
Script: `backend/scripts/export-thickness-accdb.ps1`
- Read `Sheet1` from the `.accdb` file
- For each row: compute per-card average thickness, skip blank cards
- Output: `backend/scripts/data/thickness-monitoring.json`

```json
[
  {
    "jobNumber": "37111",
    "testDate": "2024-01-08",
    "operator": "nr",
    "cards": [
      { "cardNumber": 1, "thickAvg": 0.7980, "pass": true },
      { "cardNumber": 2, "thickAvg": 0.8030, "pass": true }
    ]
  }
]
```

### Step 2 — Node.js seeder
Script: `backend/scripts/import-thickness-monitoring.js`
- Reads `thickness-monitoring.json`
- For each job entry → create one `TestSession` (`session_type: 'Monitoring'`, `session_number: jobNumber`)
- For each card → create one `TestEntry` linked to IT-PHY-002
- Uses `findOrCreate` on session_number — safe to re-run
- Pass/fail: 0.76 ≤ avg ≤ 0.84

### Step 3 — Backend SPC filter
Update `GET /dashboard/spc-data`:
- Add optional `?sessionType=Monitoring` param
- Filter query: `WHERE ts.session_type = :sessionType` when provided

### Step 4 — KPI Page chart
Update `frontend/src/pages/cqm/KPIPage.tsx`:
- Pass `sessionType=Monitoring` to `getSpcData`
- Replace current ComposedChart with a clean `LineChart`:
  - `<Line>` connecting data points
  - `<ReferenceLine>` for UCL (red), X̄ (green), LCL (red)
  - `<ReferenceLine>` for USL/LSL (orange dashed) — spec limits
  - Out-of-control dots rendered in red, in-control in blue
  - Tooltip: value (mm), date, job number, card #
- Remove histogram, stats strip, capability chips

---

## Current Database State

| Item | Status |
|------|--------|
| IT-PHY-002 definition | ✓ exists, spec limits set (0.76–0.84 mm) |
| IT-PHY-002 test entries | ✗ none — ready to import |
| Previous IMP-DIM / IMP-LAM data | ✓ deleted (clean slate) |
| Remaining sessions | 1 (TS-20260414-001, manual draft) |

---

## Decision Log

| Decision | Choice |
|----------|--------|
| Chart type | Single I-chart (X-bar style) — no MR chart |
| Measurement per card | Average of ThickA/B/C/D |
| Session type filter | Monitoring only |
| Session number | Job Number from Access DB |
| Blank cards | Skip silently |
| Source database | Card Dimension Log only (Card Add-on deferred) |
