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

---

### #3044# — Durability: Temperature and Humidity Exposure

| Field | Value |
|-------|-------|
| **CQM Requirement** | `#3044#` |
| **DB test_id** | `#3044#` (no rename needed) |
| **Test Method** | `#8091#` — *Durability – Dimensional Stability with Temperature and Humidity* |
| **Standard** | ISO/IEC 10373-1 |
| **Type** | passfail |
| **Frequency** | Not required / Qualification only |
| **Min Sample Size** | 3 (default CQM Q-Plan) |
| **CQM Monitoring** | Not required |

#### Acceptance Criteria

A card **fails** if it shows any of the following after heat exposure:

| Failure mode | Threshold |
|---|---|
| Warpage / deflection | > 10 mm |
| Delamination | Any observed |
| Significant visual variation | Any observed |
| Loss of specified functionality | Any observed |

The card shall remain **fully functional** after 4 hours at the maximum storage temperature defined in `#3044#`.

#### Temperature Conditions

The test uses **test method `#8091#`** (climatic chamber, 23–100 °C ± 3 °C, 5–95 % r.H. ± 5 %). The specific exposure profile (temperature + humidity set-point) is defined by the card specification and `#3044#` requirement. A secondary method **`#8092#`** applies for ICM-specific testing at 85 °C ± 2 °C / 85 % r.H. ± 3 % r.H. with galvanic contact per ISO/IEC 7816-2.

**Biometric / advanced functionality cards:**

If the card fails to remain fully functional at 60 °C:
1. The vendor must obtain a **CSI letter** for the card.
2. Repeat conformity testing at **50 °C** and at **55 °C**.
3. Report whether the card remains fully functional after each exposure.

#### Procedure

1. Pre-condition samples.
2. Record chamber serial and set-point temperature.
3. Expose cards for **4 hours** at the target temperature.
4. Remove cards and allow them to return to ambient conditions.
5. Inspect each card for warpage (measure deflection), delamination, and visual changes.
6. Verify full IC functionality (ATR for contact, ATS for contactless).
7. For biometric cards: verify biometric sensor functionality.

#### Test Report

The report shall state:
- The temperature and duration applied.
- Per-card: warpage measurement (mm), delamination observed (Y/N), visual variation (Y/N), functional result (Pass/Fail).
- For biometric cards: results at each temperature tested (60 °C, 55 °C, 50 °C).
- Overall compliance result.

---

#### Form Design Spec

**Header fields** (stored in `specializedMetadata`):

| Field | Key | Notes |
|-------|-----|-------|
| Chamber serial | `chamberSerial` (`extraData`) | Equipment tracking |
| Chamber cal. valid until | `chamberCalUntil` (`extraData`) | |
| Set-point temperature (°C) | `setPointTempC` (`extraData`) | Typically 60 °C; 50/55 °C for biometric retests |
| Test stage | `testStage` (`extraData`) | `'Standard'` / `'Biometric-55'` / `'Biometric-50'` |
| Exposure duration (h) | `durationH` (`extraData`) | Default 4 |
| Card type | `cardType` (`extraData`) | Standard / Biometric / Advanced |
| CSI letter obtained | `csiLetterObtained` (`extraData`) | boolean — shown only for biometric stage |
| Sampled By | `sampledBy` | |
| Technician | `technician` | |
| Date / Time | `testDate` / `testTime` | |
| Ambient temp °C | `temperatureC` | Ambient conditions during recovery |
| Relative Humidity % | `humidityPct` | |
| Samples Preconditioned | `samplePreconditioned` | |
| # of Samples | `sampleCount` | |

**Per-card fields** (stored in `cardEntries[n]` fields + `extraData`):

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Warpage / deflection (mm) | `measurementValue` | number | Measured deflection after exposure |
| Warpage pass | computed | boolean | `measurementValue ≤ 10 mm` |
| Delamination observed | `cornerA` | `'PASS'`=none / `'FAIL'`=observed | Reuse cornerA as visual check |
| Visual variation observed | `cornerB` | `'PASS'`=none / `'FAIL'`=observed | Reuse cornerB as visual check |
| IC functional after | `cornerC` | `'PASS'` / `'FAIL'` | ATR/ATS verified |
| Biometric functional after | `cornerD` | `'PASS'` / `'FAIL'` / `'NO TEST'` | Only for biometric cards |
| Notes | `visualNote` | string | Any observations |

Card-level `passStatus` = `true` only if **all** of: warpage ≤ 10 mm AND no delamination AND no visual variation AND IC functional (AND biometric functional if applicable).

#### TypeScript `extraData` shape

```ts
interface TempHumidityExtra {
  chamberSerial?:      string;
  chamberCalUntil?:    string;
  setPointTempC?:      number | string;   // 60 | 55 | 50
  testStage?:          string;            // 'Standard' | 'Biometric-55' | 'Biometric-50'
  durationH?:          number | string;   // default 4
  cardType?:           string;            // 'Standard' | 'Biometric' | 'Advanced'
  csiLetterObtained?:  boolean;
}
```

#### Pass/fail derivation

```ts
function computeCardPass(
  warpage: number | undefined,
  delamination: string | undefined,    // cornerA
  visualVariation: string | undefined, // cornerB
  icFunctional: string | undefined,    // cornerC
  bioFunctional: string | undefined,   // cornerD
  isBiometric: boolean,
): boolean | undefined {
  if (warpage === undefined || !delamination || !visualVariation || !icFunctional) return undefined;
  if (isBiometric && !bioFunctional) return undefined;
  const warpagePass = warpage <= 10;
  const delPass = delamination === 'PASS';
  const visPass = visualVariation === 'PASS';
  const icPass = icFunctional === 'PASS';
  const bioPass = !isBiometric || bioFunctional === 'PASS';
  return warpagePass && delPass && visPass && icPass && bioPass;
}
```

#### Migration needed

No rename migration needed — `#3044#` is already the DB `test_id`. A field-update migration is recommended to add pass criteria and test method:

```sql
-- backend/db/migrations/034_update_3044_temp_humidity.sql
UPDATE test_definitions
SET
  test_method         = '#8091#: Durability – Dimensional Stability with Temperature and Humidity',
  iso_standard        = 'ISO/IEC 10373-1',
  standard_section    = 'IS10373-1',
  max_acceptable_value = 10,
  unit_of_measurement = 'mm',
  pass_criteria       = 'Card shall remain fully functional after exposure per #8091# profile. '
                        'No warpage > 10 mm, no delamination, no significant visual variation, '
                        'no loss of specified functionality. '
                        'Biometric cards failing at 60 °C: CSI letter required; retest at 55 °C and 50 °C.',
  description         = 'Expose cards to a temperature and humidity profile per #8091# '
                        '(climatic chamber: 23–100 °C ± 3 °C, 5–95 % r.H. ± 5 %). '
                        'Inspect for warpage (≤ 10 mm), delamination, visual variation, and functional integrity. '
                        'Secondary method #8092# applies for ICM testing at 85 °C / 85 % r.H. '
                        'For biometric/advanced cards failing at 60 °C: obtain CSI letter and retest at 55 °C and 50 °C. '
                        'Monitoring: not required.',
  updated_at          = NOW()
WHERE test_id = '#3044#';
```

#### Registration codes

When implementing the form, register `'#3044#'` in:

- `SPECIALIZED_FORM_CODES` in `TestEntryPage.tsx`
- `SPECIALIZED_FORM_CODES` in `TestEntryDialog.tsx`
- Form file: `frontend/src/components/CQM/Forms/TempHumidityExposureForm.tsx`
- Index export: `frontend/src/components/CQM/Forms/index.ts`

> **Important:** The biometric retest stages (55 °C, 50 °C) must only be accessible after the standard 60 °C run shows a functional failure. The `testStage` header field drives which temperature is shown; the CSI letter checkbox should appear and be required before recording a biometric retest result.

---

### #3045# — Resistance to Heat

| Field | Value |
|-------|-------|
| **CQM Requirement** | `#3045#` |
| **DB test_id** | `#3045#` (no rename needed — insert if missing) |
| **Related codes** | `#A600#`, `#B220#`, `#3044#` |
| **Test Method** | `#8110#` — *Resistance to Heat [IS10373-1]* |
| **Standard** | ISO/IEC 10373-1 (external method) |
| **Type** | passfail |
| **Frequency** | Qualification only |
| **Min Sample Size** | 3 |
| **CQM Monitoring** | Not required |

#### Relationship to `#3044#`

`#3045#` and `#3044#` share the same pass condition — if a card conforms to `#3044#` (maximum storage temperature, fully functional), it is deemed compliant to `#3045#`. The key difference:

- `#3044#` = Durability – Temperature **and** Humidity Exposure (climatic chamber: T + RH profile)
- `#3045#` = Resistance to Heat (oven: temperature only, mechanical deformation measured by influence of gravity)

In practice, if `#3044#` has already been run and passed, `#3045#` compliance can be recorded without re-testing.

#### What is measured

The ability to resist heat is determined by:
1. Exposing the card to the temperature defined in `#3045#` for a defined duration.
2. Measuring the **mechanical deformation** caused by the influence of gravity on the card during exposure (the card is held in a way that gravity can cause deflection if the material softens).
3. Verifying full IC functionality after exposure.

#### Acceptance Criteria

| Failure mode | Threshold |
|---|---|
| Warpage / deflection | > 10 mm (same limit as `#3044#`) |
| Delamination | Any observed |
| Significant visual variation | Any observed |
| Loss of specified functionality | Any observed |

#### Temperature Conditions

- Default test temperature: as defined in `#3045#` (typically **60 °C** for standard cards — same as `#3044#`).
- **Biometric / advanced functionality cards:** If the card fails to remain fully functional at 60 °C, the vendor must obtain a CSI letter and retest conformity at **55 °C** and **50 °C**, reporting the result at each temperature.

#### Sampling note

Sampling shall account for different **card constructions** (layers, materials, process flow, parameters). Artwork differences and different ICM variants are **not** required to be sampled separately.

#### Procedure

1. Record the test temperature (per `#3045#` requirement).
2. Place the card in the test fixture so gravity can act on it during exposure (per ISO/IEC 10373-1 external method `#8110#`).
3. Expose for the defined duration.
4. Remove and allow to recover to ambient conditions.
5. Measure mechanical deformation (warpage in mm).
6. Inspect for delamination and visual changes.
7. Verify IC functionality (ATR for contact, ATS for contactless).
8. For biometric cards: verify biometric sensor functionality.

#### Test Report

The report shall state:
- Temperature and duration applied.
- Per-card: warpage measurement (mm), delamination (Y/N), visual variation (Y/N), functional result.
- Whether compliance is based on own testing or deferred to `#3044#` results.
- For biometric cards: results at each temperature tested.

---

#### Form Design Spec

`#3045#` can share **`TempHumidityExposureForm.tsx`** if the test_id is added to `SPECIALIZED_FORM_CODES` and the render branch, since the per-card fields (warpage, delamination, visual, IC functional, biometric) are identical. The only form difference is the title and the absence of a humidity set-point.

Alternatively, create a dedicated `ResistanceToHeatForm.tsx` with the humidity field hidden and a `#3044# result available` checkbox that auto-fills PASS when checked.

**Recommended approach — reuse `TempHumidityExposureForm.tsx`:**

Register `'#3045#'` alongside `'#3044#'` in both `SPECIALIZED_FORM_CODES` sets and in the render branch:

```tsx
// TestEntryPage.tsx and TestEntryDialog.tsx
if (def.test_id === '#3044#' || def.test_id === '#3045#') return <TempHumidityExposureForm {...sharedProps} />;
```

The form will display the test method as `#8110#` when `def.test_id === '#3045#'` (add a check in the form title). The humidity field is still shown but optional — the user can leave it blank if not measured.

**Header fields** (stored in `specializedMetadata`):

Same as `#3044#` — see `#3044#` section above — except:

| Field | Key | Notes |
|-------|-----|-------|
| `#3044# result available` | `req3044Passed` (`extraData`) | boolean — if true, auto-sets overall PASS (deferred compliance) |
| Card construction reference | `cardConstructionRef` (`extraData`) | Layers, materials, process flow — sampling note requires this |

#### TypeScript additions to `TempHumidityExtra`

```ts
interface TempHumidityExtra {
  // ... existing fields ...
  req3044Passed?:       boolean;   // #3045# deferred compliance via #3044# result
  cardConstructionRef?: string;    // sampling note — card construction details
}
```

#### Migration needed

```sql
-- backend/db/migrations/035_insert_3045_resistance_to_heat.sql
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  max_acceptable_value, unit_of_measurement,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'ENV' LIMIT 1),
  '#3045#',
  'Resistance to Heat [IS10373-1]',
  'Resistance to Heat',
  '#8110#: Resistance to Heat [IS10373-1]',
  'ISO/IEC 10373-1',
  'IS10373-1',
  'passfail',
  'qualification',
  true,
  'active',
  10,
  'mm',
  'Card shall remain fully functional after heat exposure at temperature defined in #3045#. '
    'No warpage > 10 mm, no delamination, no significant visual variation, no loss of functionality. '
    'Biometric cards failing at 60 °C: CSI letter required; retest at 55 °C and 50 °C. '
    'Compliance to #3044# implies compliance to #3045#.',
  'Verify resistance to heat by exposing card to defined temperature per #8110# '
    '(ISO/IEC 10373-1 external method). Mechanical deformation measured under gravity influence. '
    'Inspect for warpage (≤ 10 mm), delamination, visual variation, and functional integrity. '
    'Sampling considers card construction (layers, materials, process flow) — not artwork or ICM variants. '
    'Qualification minimum: 3 samples. Monitoring: not required.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3045#');
```

#### Registration codes

Register `'#3045#'` in:

- `SPECIALIZED_FORM_CODES` in `TestEntryPage.tsx`
- `SPECIALIZED_FORM_CODES` in `TestEntryDialog.tsx`
- Render branch: reuse `TempHumidityExposureForm` (add `|| def.test_id === '#3045#'` to the existing check)
- No new form file needed if reusing `TempHumidityExposureForm.tsx`

> **Important:** When `def.test_id === '#3045#'`, the form title should display `#8110# — Resistance to Heat` rather than `#8091#`. Add a `req3044Passed` checkbox to the header — if checked, the form should auto-set all card entries to PASS and display an informational note that compliance is deferred to the `#3044#` result.

---

### #3050# — ESD Conductivity (ESC)

| Field | Value |
|-------|-------|
| **CQM Requirement** | `#3050#` |
| **DB test_id** | `#3050#` (insert if missing) |
| **Test Methods** | `#8250#` — *ESD Conductivity for Cards* · `#8260#` — *ESD Conductivity for Card Components* |
| **Standard** | ISO/IEC 10373-1 |
| **Type** | passfail (measured value drives pass/fail) |
| **Applicability** | Any Cardbody, Any IC Card, Any InterActive Card |
| **Stages** | Design, Qualification, Production |
| **Min Sample Size** | 5 (qualification) |
| **CQM Monitoring** | Not required |

#### Acceptance Criteria

| Contact scenario | Max ESD conductivity |
|---|---|
| Scenarios 1–4 | ≤ 15 % of discharge energy at 8 kV |
| Scenarios 5–6 | ≤ 25 % of discharge energy at 8 kV |

**Conformity may be assumed (no testing needed) if:**
- All components of the CHD are known to not conduct ESD at voltages of 8 kV, **or**
- The component is a homogeneous material that passes `#8260#` (ESD Conductivity for card components).

#### Apparatus

- Current probe and digital oscilloscope
- Grid electrodes (discharge set + grounded set)
- Discharge voltage: default **8 kV**

#### Calibration

Before testing, a calibration run determines the scale:
- **0 %** = only air between the discharge electrodes
- **100 %** = conductor with 0 Ω resistance inserted between the electrodes

The calibration charges Q₀% and Q₁₀₀% are recorded and used to compute the relative charge Qₙ% for each scenario.

#### Procedure

1. Place the card between the grid electrodes.
2. Apply ESD to one set of electrodes.
3. Measure the current flowing from the grounded set of grid contacts into ground.
4. Record the discharge curve.
5. Calculate the transmitted charge and express as a percentage Qₙ% (between 0 % and 100 %).
6. Repeat for each contact scenario (1–6).
7. Compare Qₙ% against the acceptance thresholds.

#### Test Report

The report shall include:
- Discharge voltage used (default 8 kV)
- Calibration charges Q₀% and Q₁₀₀%
- Relative charge Qₙ% for each contact scenario (1–6)
- Pass / Fail per scenario and overall

---

#### Form Design Spec

**Header fields** (stored in `specializedMetadata`):

| Field | Key | Notes |
|-------|-----|-------|
| Meter / probe serial | `meterSerial` (`extraData`) | Current probe ID |
| Oscilloscope serial | `oscilloscopeSerial` (`extraData`) | Digital oscilloscope ID |
| Equipment cal. valid until | `equipCalUntil` (`extraData`) | |
| Test method | `testMethod` (`extraData`) | `'#8250#'` or `'#8260#'` |
| Discharge voltage (kV) | `dischargeVoltageKv` (`extraData`) | Default 8 kV |
| Calibration Q₀% charge (nC) | `calQ0` (`extraData`) | Air-only baseline |
| Calibration Q₁₀₀% charge (nC) | `calQ100` (`extraData`) | 0 Ω conductor baseline |
| Conformity assumed (no test) | `conformityAssumed` (`extraData`) | boolean — CHD components known safe |
| Conformity reason | `conformityReason` (`extraData`) | 'Components known safe' / 'Passed #8260#' |
| Sampled By | `sampledBy` | |
| Technician | `technician` | |
| Date / Time | `testDate` / `testTime` | |
| Temp °C / RH % | `temperatureC` / `humidityPct` | Ambient conditions |
| # of Samples | `sampleCount` | Min 5 for qualification |

**Per-card fields** — one row per card, one column per contact scenario (1–6):

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Qₙ% scenario 1 | `scenario1Pct` | number | Measured relative charge % |
| Qₙ% scenario 2 | `scenario2Pct` | number | |
| Qₙ% scenario 3 | `scenario3Pct` | number | |
| Qₙ% scenario 4 | `scenario4Pct` | number | |
| Qₙ% scenario 5 | `scenario5Pct` | number | |
| Qₙ% scenario 6 | `scenario6Pct` | number | |
| Scenarios 1–4 pass | computed | boolean | All of scenario1–4 ≤ 15 % |
| Scenarios 5–6 pass | computed | boolean | Both scenario5–6 ≤ 25 % |
| Card pass | computed | boolean | All 6 scenarios pass |

Per-card scenario values are serialized into `ce.notes` as JSON (same pattern as `ThicknessAddOnForm` and `ThreeWheelTestForm`).

#### TypeScript `extraData` and per-card shape

```ts
interface ESDConductivityExtra {
  meterSerial?:          string;
  oscilloscopeSerial?:   string;
  equipCalUntil?:        string;
  testMethod?:           string;           // '#8250#' | '#8260#'
  dischargeVoltageKv?:   number | string;  // default 8
  calQ0?:                number | string;  // calibration Q 0% (nC)
  calQ100?:              number | string;  // calibration Q 100% (nC)
  conformityAssumed?:    boolean;
  conformityReason?:     string;
}

interface ESDScenarios {
  s1?: number | null;  // Qn% scenario 1
  s2?: number | null;
  s3?: number | null;
  s4?: number | null;
  s5?: number | null;
  s6?: number | null;
}
// Serialized into ce.notes as JSON: { scenarios: ESDScenarios }
```

#### Pass/fail derivation

```ts
const LIMIT_1_TO_4 = 15;   // %
const LIMIT_5_TO_6 = 25;   // %

function computeESDPass(s: ESDScenarios): boolean | undefined {
  const vals = [s.s1, s.s2, s.s3, s.s4, s.s5, s.s6];
  if (vals.some(v => v === undefined || v === null)) return undefined;
  const group1Pass = [s.s1!, s.s2!, s.s3!, s.s4!].every(v => v <= LIMIT_1_TO_4);
  const group2Pass = [s.s5!, s.s6!].every(v => v <= LIMIT_5_TO_6);
  return group1Pass && group2Pass;
}
```

#### Migration needed

```sql
-- backend/db/migrations/036_insert_3050_esd_conductivity.sql
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'ELE' LIMIT 1),
  '#3050#',
  'ESD Conductivity (ESC)',
  'ESD Conductivity',
  '#8250#: ESD Conductivity for Cards / #8260#: ESD Conductivity for Card Components',
  'ISO/IEC 10373-1',
  'IS10373-1',
  'passfail',
  'qualification',
  true,
  'active',
  'Contact scenarios 1–4: Qn% ≤ 15 % at 8 kV. '
    'Contact scenarios 5–6: Qn% ≤ 25 % at 8 kV. '
    'Conformity may be assumed if all CHD components are known safe at 8 kV '
    'or component passes #8260#.',
  'Measure ESD conductivity using current probe and digital oscilloscope. '
    'Card placed between grid electrodes; ESD applied at 8 kV (default). '
    'Relative charge Qn% computed per contact scenario (1–6) against calibration baseline. '
    'Qualification minimum: 5 samples. Monitoring: not required.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3050#');
```

#### Registration codes

When implementing the form, register `'#3050#'` in:

- `SPECIALIZED_FORM_CODES` in `TestEntryPage.tsx`
- `SPECIALIZED_FORM_CODES` in `TestEntryDialog.tsx`
- Form file: `frontend/src/components/CQM/Forms/ESDConductivityForm.tsx`
- Index export: `frontend/src/components/CQM/Forms/index.ts`

> **Important:** If `conformityAssumed` is checked, the form should skip per-card scenario inputs and auto-set all cards to PASS, displaying the conformity reason. The calibration fields (Q₀%, Q₁₀₀%) must be filled before per-card results can be entered — show a warning if they are missing.

---

### #2515# — Loading of Software into IC / ICM / IL / Card

| Field | Value |
|-------|-------|
| **CQM Requirement** | `#2515#` |
| **DB test_id** | `#2515#` (insert if missing) |
| **Test Method** | Vendor-defined (no ISO test method number) |
| **Standard** | Vendor specification |
| **Type** | passfail |
| **Frequency** | 1/Batch |
| **Min Sample Size** | Vendor-defined |
| **CQM Monitoring** | Not required |
| **Applicability** | IC, ICM, IL, card — before personalization |

#### What is verified

Three mandatory verifications:

1. **SW selection verification** — A member of staff **independent** from the operator who selected the SW shall verify that the correct SW was selected, prior to loading into the first device.
2. **SW loading verification** — After loading, the vendor shall verify that the correct SW was loaded into the ICM. At minimum, the **correct ATR shall be verified**. Details depend on the SW and ICM configuration.
3. **Full functionality test** — The loaded ICM shall be tested to ensure it is fully functioning using an appropriate electrical test program.

#### Additional obligations (header-level, not per-card)

- **Storage security**: SW storage protects against unauthorized disclosure, modification, and loss (adequate backup/restore).
- **Qualification run**: Before loading in volume, vendor shall qualify the SW each time after they have processed it — especially to confirm the SW is as intended.
- **Unique identifier**: The Device packaging unit and Device packaging shall be identified with a unique identifier for the combination of SW + Device.

#### Procedure

1. Record the SW name, version, and checksum/hash.
2. Record the independent verifier who confirmed SW selection before first load.
3. Load SW into ICM/IL/card.
4. For a sample of loaded devices:
   - Verify the ATR (contact) or ATS (contactless) matches the expected value for the loaded SW.
   - Run the full electrical test program; verify full functionality.
5. Record the packaging unique identifier for the batch.
6. Record qualification status (first-time load of this SW version → qualification run required).

#### Acceptance Criteria

- ATR/ATS matches expected value for loaded SW version → PASS
- Full electrical functionality test passes → PASS
- SW selection was independently verified → PASS
- Any mismatch or functional failure → FAIL

---

#### Form Design Spec

This form has two parts: a **batch-level process verification** (header) and a **per-card sample test** (table).

**Header fields** (stored in `specializedMetadata`):

| Field | Key | Notes |
|-------|-----|-------|
| SW name / product code | `swName` (`extraData`) | |
| SW version | `swVersion` (`extraData`) | |
| SW checksum / hash | `swChecksum` (`extraData`) | SHA-256 or vendor checksum |
| Loading tool ID / Serial | `loadingToolSerial` (`extraData`) | Programming tool or reader |
| Loading tool cal. valid until | `loadingToolCalUntil` (`extraData`) | |
| Expected ATR (hex) | `expectedATR` (`extraData`) | Reference value for comparison |
| SW selection verified by | `swSelectionVerifiedBy` (`extraData`) | Name of independent verifier |
| SW selection verified | `swSelectionVerified` (`extraData`) | boolean — must be `true` before PASS |
| Qualification run completed | `qualificationRunDone` (`extraData`) | boolean — required for new SW version |
| Packaging unique ID | `packagingUniqueId` (`extraData`) | SW + Device combination identifier |
| SW storage secure | `swStorageSecure` (`extraData`) | boolean — backup/restore confirmed |
| Sampled By | `sampledBy` | |
| Technician | `technician` | |
| Date / Time | `testDate` / `testTime` | |
| # of Samples | `sampleCount` | |

**Per-card fields** (per-card table):

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| ATR / ATS verified | `cornerA` | `'PASS'` / `'FAIL'` | Matches expected ATR |
| ATR value recorded | `cornerAExtent` | string | Actual ATR read from device |
| Full functionality test | `cornerB` | `'PASS'` / `'FAIL'` | Electrical test program result |
| Packaging ID confirmed | `cornerC` | `'PASS'` / `'FAIL'` / `'NO TEST'` | Unique ID on packaging matches |
| Notes | `visualNote` | string | Error codes, failure details |

Card-level `passStatus` = `true` only if: SW selection verified (header) AND ATR matches AND functionality passes.

#### TypeScript `extraData` shape

```ts
interface SoftwareLoadExtra {
  swName?:                  string;
  swVersion?:               string;
  swChecksum?:              string;
  loadingToolSerial?:       string;
  loadingToolCalUntil?:     string;
  expectedATR?:             string;
  swSelectionVerifiedBy?:   string;
  swSelectionVerified?:     boolean;
  qualificationRunDone?:    boolean;
  packagingUniqueId?:       string;
  swStorageSecure?:         boolean;
}
```

#### Pass/fail derivation

```ts
function computeCardPass(
  swSelectionVerified: boolean | undefined,
  atr: 'PASS' | 'FAIL' | undefined,
  functional: 'PASS' | 'FAIL' | undefined,
): boolean | undefined {
  if (!swSelectionVerified || !atr || !functional) return undefined;
  return swSelectionVerified && atr === 'PASS' && functional === 'PASS';
}
```

#### Migration needed

```sql
-- backend/db/migrations/037_insert_2515_software_load.sql
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'SMT' LIMIT 1),
  '#2515#',
  'Loading of Software into IC / ICM / IL / Card',
  'SW Loading',
  'Vendor-defined electrical test program',
  'Vendor specification',
  NULL,
  'passfail',
  '1/Batch',
  true,
  'active',
  'SW selection verified by independent staff member. '
    'Correct ATR verified after loading. '
    'Loaded ICM passes full electrical functionality test. '
    'Device packaging identified with unique SW + Device identifier.',
  'Verify correct SW selection (independent verifier), correct SW loading (ATR check), '
    'and full ICM functionality (electrical test program) before personalization. '
    'Vendor shall qualify SW before volume loading. '
    'SW storage shall be secure against unauthorized disclosure, modification, and loss.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#2515#');
```

#### Registration codes

When implementing the form, register `'#2515#'` in:

- `SPECIALIZED_FORM_CODES` in `TestEntryPage.tsx`
- `SPECIALIZED_FORM_CODES` in `TestEntryDialog.tsx`
- Form file: `frontend/src/components/CQM/Forms/SoftwareLoadForm.tsx`
- Index export: `frontend/src/components/CQM/Forms/index.ts`

---

### `#3048#` — Use Conditions

| Field | Value |
|-------|-------|
| **CQM Requirement** | `#3048#` |
| **DB test_id** | `#3048#` (insert if missing) |
| **Standard** | ICC-REQ § 10.1.9 |
| **Test Method** | Conformity by construction — no active test |
| **Category** | `ICC-REQ` |
| **Type** | `passfail` |
| **Frequency** | Not required |
| **Applicable Entity** | Vendor Subcontractor |
| **Applicable Stage** | Design · Qualification · Production |
| **Applicable Products** | Any Cardbody · Any IC Card · Any InterActive Card |

#### Requirement

Where conditions of use and storage deviate from what a card holder might expect from a normal card, the Vendor shall provide adequate guidance. Conformity is declared through the product specification — there is no active measurement or sample testing.

#### Default CQM Q-Plan

| Phase | Requirement |
|-------|-------------|
| Qualification | No testing required. Product specification shall state conformity. Conformity shall be achieved by construction. |
| Monitoring | None required. |

#### Key rules

- There is **no sample testing** for this requirement — no per-card table.
- Conformity is achieved **by construction** and stated in the **product specification**.
- If any condition of use or storage deviates from normal card-holder expectations (e.g. extended temperature range, humidity, UV exposure), the vendor **must provide guidance** to the card holder.
- The form captures a declaration and the document reference — pass/fail is derived from the completeness of the declaration.

#### Form design spec

**No per-card table.** This form is header-only: it captures a vendor declaration and sets `passStatus`/`isValid` directly on the entry.

**Section A — Conformity Declaration** (both checkboxes required for PASS):

| Field | Key | Notes |
|-------|-----|-------|
| Product Specification Reference | `productSpecRef` (`extraData`) | Document name / number / version — required |
| Spec states conformity | `specStatesConformity` (`extraData`) | Checkbox — required |
| Conformity by construction | `conformityByConstruction` (`extraData`) | Checkbox — required |

**Section B — Use Conditions Assessment:**

| Field | Key | Notes |
|-------|-----|-------|
| Conditions deviate from normal? | `conditionsDeviate` (`extraData`) | Yes / No toggle |
| Description of deviating conditions | `deviatingConditions` (`extraData`) | Multiline — shown only when `conditionsDeviate = true` |
| Guidance provided to card holders | `guidanceProvided` (`extraData`) | Checkbox — required when `conditionsDeviate = true` |
| Guidance document reference | `guidanceDocRef` (`extraData`) | e.g. user manual version, data sheet — shown when `conditionsDeviate = true` |

**Standard metadata:** `meta.sampledBy`, `meta.testDate`, `meta.jobNotes`.

#### Pass/fail derivation

There are no card entries. `passStatus` and `isValid` are set on the **entry** itself via `onUpdateEntry`.

```ts
function computePass(extra: UseConditionsExtra): boolean | undefined {
  if (!extra.specStatesConformity || !extra.conformityByConstruction) return undefined;
  if (!extra.productSpecRef?.trim()) return undefined;
  if (extra.conditionsDeviate === undefined) return undefined;
  if (extra.conditionsDeviate && !extra.guidanceProvided) return undefined;
  return true;
}
```

#### TypeScript `extraData` shape

```ts
interface UseConditionsExtra {
  productSpecRef?:        string;
  specStatesConformity?:  boolean;
  conformityByConstruction?: boolean;
  conditionsDeviate?:     boolean;
  deviatingConditions?:   string;
  guidanceProvided?:      boolean;
  guidanceDocRef?:        string;
}
```

#### Migration needed

```sql
-- backend/db/migrations/038_insert_3048_use_conditions.sql
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'ICC-REQ' LIMIT 1),
  '#3048#',
  'Use Conditions',
  'Use Conditions',
  'Conformity by construction — no active test',
  'ICC-REQ',
  '§ 10.1.9',
  'passfail',
  'Not required',
  true,
  'active',
  'Product specification states conformity. '
    'Conformity achieved by construction. '
    'Where conditions deviate from normal card-holder expectations, '
    'adequate guidance shall be provided.',
  'No active testing required. Vendor shall ensure the product specification states '
    'conformity with use and storage conditions. Where conditions deviate from what '
    'a card holder would normally expect, the Vendor shall provide adequate guidance '
    'to card holders. Conformity is achieved by construction.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3048#');
```

#### Registration codes

When implementing the form, register `'#3048#'` in:

- `SPECIALIZED_FORM_CODES` in `TestEntryPage.tsx`
- `SPECIALIZED_FORM_CODES` in `TestEntryDialog.tsx`
- Form file: `frontend/src/components/CQM/Forms/UseConditionsForm.tsx`
- Index export: `frontend/src/components/CQM/Forms/index.ts`

> **Important:** The form must block per-card entry if `swSelectionVerified` is not checked — show a prominent warning. The `expectedATR` header field should be shown alongside the per-card ATR reading so the technician can compare them visually. The `qualificationRunDone` checkbox should be flagged as required when the SW version has not been loaded before.
