# Adding a Specialized Test Entry Form

When a test requires more than a simple Pass/Fail or measurement input (e.g. per-card tables, equipment metadata, cycle counts), you create a dedicated form component and register it in **two files**.

---

## Step 1 — Create the form component

**Location:** `frontend/src/components/CQM/Forms/`

**File naming:** `<TestName>Form.tsx`
Example: `DynamicTorsionalStressForm.tsx`

### Required props interface (copy this pattern for every form)

```tsx
interface MyFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}
```

### Storing form-specific fields

Use `entry.specializedMetadata` for header fields shared across tests (temp, humidity, technician, etc.).

Use `entry.specializedMetadata.extraData` for fields unique to the test (e.g. machine ID, cycle count).

```tsx
const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
const extra = (meta.extraData ?? {}) as MyFormExtra;

const updateMeta = (patch: Partial<TestEntryMetadata>) =>
  onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

const updateExtra = (patch: Partial<MyFormExtra>) =>
  updateMeta({ extraData: { ...extra, ...patch } });
```

### Deriving pass/fail for per-card rows

Call `onUpdateCardEntry` with `passStatus` and `isValid: true` once a result is determined.

```tsx
onUpdateCardEntry(def.id, cardNumber, {
  cornerA: value,
  passStatus: value === 'PASS',
  isValid: true,
});
```

### Export from the forms index

Add one line to `frontend/src/components/CQM/Forms/index.ts`:

```ts
export { default as MyForm } from './MyForm';
```

---

## Step 2 — Register in TestEntryPage (the main entry page)

**File:** `frontend/src/pages/cqm/TestEntryPage.tsx`

This is the page users land on when they click a test from the session test list. It is the **primary** place to register specialized forms.

### 2a — Add the import (top of file, with other form imports)

```tsx
import MyForm from '../../components/CQM/Forms/MyForm';
```

### 2b — Add the test_id to SPECIALIZED_FORM_CODES (~line 53)

```tsx
const SPECIALIZED_FORM_CODES = new Set([
  ...existing codes...,
  '#XXXX#',       // add the test_id here
]);
```

### 2c — Add the render branch inside renderForm() (~line 280)

```tsx
if (def.test_id === '#XXXX#') return <MyForm {...sharedProps} />;
```

Place it before the closing `}` of the `if (isSpecialized)` block, after the last existing branch.

---

## Step 3 — Register in TestEntryDialog (the accordion dialog)

**File:** `frontend/src/components/CQM/Forms/TestEntryDialog.tsx`

This dialog is used in other parts of the app (category-based accordion view). Keep it in sync with TestEntryPage.

### 3a — Add the import (top of file)

```tsx
import MyForm from './MyForm';
```

### 3b — Add the test_id to SPECIALIZED_FORM_CODES (~line 49)

```tsx
const SPECIALIZED_FORM_CODES = new Set([
  ...existing codes...,
  '#XXXX#',
]);
```

### 3c — Add the render branch (~line 818)

Find the last `) : def.test_id === '...' ? (` chain and add before `) : null`:

```tsx
        ) : def.test_id === '#XXXX#' ? (
          <MyForm
            def={def}
            entry={entry}
            onUpdateEntry={updateEntry}
            onUpdateCardEntry={updateCardEntry}
          />
        ) : null
```

---

## Step 4 — Verify

```bash
cd frontend && npx tsc --noEmit
```

No output = clean. Then reload the browser.

---

## Quick reference — file locations

| What | File |
|------|------|
| Form component | `frontend/src/components/CQM/Forms/<Name>Form.tsx` |
| Forms index export | `frontend/src/components/CQM/Forms/index.ts` |
| **Primary registration** | `frontend/src/pages/cqm/TestEntryPage.tsx` |
| Secondary registration | `frontend/src/components/CQM/Forms/TestEntryDialog.tsx` |
| Types (CardEntryData, TestEntryMetadata) | `frontend/src/types/cqm/testEntry.types.ts` |

---

## Common mistakes

- **Only updating TestEntryDialog and not TestEntryPage** — the page users see when clicking a test from the session list is `TestEntryPage.tsx`, not the dialog. Both must be updated.
- **Forgetting to add the test_id to SPECIALIZED_FORM_CODES** — without this, the form is never reached and the generic input renders instead.
- **Using the test_method code instead of test_id** — always match against `def.test_id` (e.g. `#3043#`), not the test method reference (e.g. `#8150#`). Check the DB or seed file if unsure which is which.

---

## Appendix — Test Specifications

Each section below documents a specific test requirement so that the form developer has the full specification in one place before building.

---

### #3004# — Thickness within Add-on Areas

| Field | Value |
|-------|-------|
| **CQM Requirement** | `#3004#` |
| **DB test_id** | `IT-PHY-004` → migrate to `#3004#` (see migration below) |
| **Test Method** | `#8050#` — *Thickness within Add-on Areas [IS10373-1]* |
| **Standard** | ISO/IEC 10373-1 |
| **Unit** | mm (relative height / delta) |
| **Acceptance Limit** | Δ ≤ 0.05 mm |
| **Baseline Dependency** | Requires the average outside thickness from `#8040#` / IT-PHY-002 as a reference input |

#### Apparatus

A micrometer with:
- Accuracy: ± 2.5 μm
- Anvil type: flat
- Probe type: flat measurement probe
- Probe and anvil diameter: 3 mm – 8 mm
- Applied force: 3.5 N – 5.9 N

#### Procedure

1. Pre-condition the card.
2. For **each Add-On Area** (signature panel, hologram, etc. — excluding embossing):
   - Measure thickness at **three locations**: left edge, center, right edge of the Add-On Area.
   - Calculate the arithmetic average of the three values → `avgInside`.
   - Subtract the average outside thickness (from `#8040#` / `#3003#`) → `delta = avgInside − avgOutside`.
3. Repeat for every declared Add-On Area on the card.

> **Note:** If the declared Add-On is too small to measure thickness outside it, it shall not be treated as an Add-On and this requirement does not apply to that area.

#### Test Report

Report the `delta` (relative height of the Add-On Area) **separately for each Add-On Area**.

#### Acceptance Criteria

```
delta = avgInside − avgOutside ≤ 0.05 mm   for every Add-On Area
```

Pass if **all** declared Add-On Areas on all tested cards satisfy this condition.

---

#### Form Design Spec

The form must support **multiple Add-On Areas per card** and automatically compute averages and deltas.

**Header fields** (stored in `specializedMetadata`):

| Field | Key | Notes |
|-------|-----|-------|
| Micrometer ID / Serial | `micrometerSerial` | Equipment tracking |
| Applied force (N) | `appliedForceN` | 3.5 – 5.9 N range, warn if outside |
| Probe diameter (mm) | `probeDiameterMm` | 3 – 8 mm range |
| Baseline outside thickness (mm) | `baselineOutsideMm` | Copied or linked from #8040# result |

**Per-card, per-add-on-area fields** (stored in `cardEntries[n].extraData.addOnAreas[]`):

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Add-On Area label | `areaLabel` | string | e.g. "Hologram", "Signature Panel" |
| Left edge (mm) | `leftMm` | number | Raw micrometer reading |
| Center (mm) | `centerMm` | number | Raw micrometer reading |
| Right edge (mm) | `rightMm` | number | Raw micrometer reading |
| Average inside (mm) | `avgInsideMm` | computed | `(left + center + right) / 3` |
| Delta / relative height (mm) | `deltaMm` | computed | `avgInside − baselineOutsideMm` |
| Area pass | `areaPass` | computed | `deltaMm ≤ 0.05` |

Card-level `passStatus` = `true` only if **all** Add-On Areas on that card pass.

#### TypeScript `extraData` shape

```ts
interface AddOnAreaMeasurement {
  areaLabel:    string;
  leftMm:       number | null;
  centerMm:     number | null;
  rightMm:      number | null;
  avgInsideMm:  number | null;   // computed
  deltaMm:      number | null;   // computed
  areaPass:     boolean | null;  // computed
}

interface ThicknessAddOnExtra {
  micrometerSerial:  string;
  appliedForceN:     number | null;
  probeDiameterMm:   number | null;
  baselineOutsideMm: number | null;  // from #8040# / IT-PHY-002
  addOnAreas:        AddOnAreaMeasurement[];
}
```

#### Migration needed

```sql
-- backend/db/migrations/028_rename_it_phy_004_to_3004.sql
UPDATE test_definitions
SET
  test_id             = '#3004#',
  test_name           = 'Thickness within Add-on Areas [IS10373-1]',
  short_name          = 'Add-On Thickness',
  description         = 'Relative height of Add-On areas (signature panel, hologram, etc.) '
                        'per ISO/IEC 10373-1 method #8050#. '
                        'Delta = avg thickness inside Add-On − avg outside thickness (#8040#).',
  iso_standard        = 'ISO/IEC 10373-1',
  unit_of_measurement = 'mm',
  max_acceptable_value = 0.05,
  min_acceptable_value = NULL,
  updated_at          = NOW()
WHERE test_id = 'IT-PHY-004';
```

#### Registration codes

When implementing the form, register `'#3004#'` (not `'IT-PHY-004'`) in:

- `SPECIALIZED_FORM_CODES` in `TestEntryPage.tsx`
- `SPECIALIZED_FORM_CODES` in `TestEntryDialog.tsx`
- Form file: `frontend/src/components/CQM/Forms/ThicknessAddOnForm.tsx`
- Index export: `frontend/src/components/CQM/Forms/index.ts`

> **Important:** The form must accept or prompt the user for `baselineOutsideMm`. The recommended UX is a numeric input pre-filled from the session's IT-PHY-002 / #3003# result if one exists in the same session. Delta computation and pass/fail should update in real time as readings are entered.
