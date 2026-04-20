# Specialized Form Backlog

Tests that currently use the generic standard form but require a dedicated form
with per-card measurement tables, equipment metadata, and computed pass/fail.

Reference pattern: `docs/adding-specialized-test-form.md`

---

## Already have specialized forms (complete)

| Test ID | Name | Form file |
|---------|------|-----------|
| `#3007#` / `IT-PHY-006` | Overall Card Warpage | `WarpageForm.tsx` |
| `#3021#` | Solidity – Adhesion / Blocking | `SolidityForm.tsx` |
| `#3006#` | Card Edges / Edge Burrs | `CardEdgesForm.tsx` |
| `#3046#` | Resistance to Chemicals | `ResistanceChemicalsForm.tsx` |
| `#3008#` | Peel Strength (Laminate Adhesion) | `PeelStrengthForm.tsx` |
| `#3015#` | Peel Strength of the Overlay | `OverlayPeelForm.tsx` |
| `#3016#` / `IT-CBY-001` | Core Layer Peel Strength | `CoreLayerPeelForm.tsx` |
| `#3017#` / `IT-CBY-003` | Overlay Peel after T&H Exposure | `OverlayPeelTHForm.tsx` |
| `#3018#` / `IT-CBY-002` | Resistance to Corner Impact | `CornerImpactForm.tsx` |
| `#3019#` / `IT-CBY-005` | Resistance to Impact | `ResistanceImpactForm.tsx` |
| `#8230#` / `IT-CBY-004` | Adhesion of ICM to Card | `ICMAdhesionForm.tsx` |
| `#3002#` / `IT-PHY-001` | Width and Height | `WidthHeightForm.tsx` |
| `#3042#` | Dynamic Bending Stress | `DynamicBendingStressForm.tsx` |
| `#3043#` | Dynamic Torsional Stress | `DynamicTorsionalStressForm.tsx` |
| `#3067#` | Suitability for Identification Notch | `IdentificationNotchForm.tsx` |
| `IT-ELE-001` | Q-Factor | `QFactorForm.tsx` |
| `IT-ELE-002` | Reading Distance | `ReadingDistanceForm.tsx` |

---

## Needs specialized form — Physical / Dimensional

### 1. `IT-PHY-002` — Card Thickness (Outside)
- **Standard:** ISO 7810 § 9.1.3 · Test method `#8040#`
- **Type:** measurement · **Unit:** mm
- **Spec:** 0.76 – 0.84 mm (ID-1 card)
- **Frequency:** 1/Batch · **Sample size:** 8
- **Why specialized:** ISO 10373-1 #8040# requires measuring at 5 defined points per card.
  Each point is recorded individually; the card fails if any single point falls outside 0.76–0.84 mm.
- **Form inputs needed:**
  - Equipment: micrometer serial, calibration date, applied force (3.5–5.9 N), probe diameter (3–8 mm)
  - Per card: 5 measurement values (positions defined by #8040# layout)
  - Computed: min, max, average; per-card pass if all 5 within spec
- **Suggested file:** `CardThicknessForm.tsx`
- **DB test_id to register:** `IT-PHY-002`

---

### 2. `IT-PHY-003` — Corner Radius
- **Standard:** ISO 7810
- **Type:** measurement · **Unit:** mm
- **Spec:** 3.18 mm nominal (±0.30 mm per IS7810 ID-1)
- **Frequency:** 1/Batch
- **Why specialized:** 4 independent corner radius measurements per card; all 4 must pass.
- **Form inputs needed:**
  - Equipment: radius gauge or optical comparator serial
  - Per card: Corner A, B, C, D radius values (mm)
  - Computed: per-corner pass/fail; card pass if all 4 within spec
- **Suggested file:** `CornerRadiusForm.tsx`
- **DB test_id to register:** `IT-PHY-003`

---

### 3. `#3004#` / `IT-PHY-004` — Thickness within Add-on Areas
- **Standard:** ISO/IEC 10373-1 · Test method `#8050#`
- **Type:** measurement · **Unit:** mm (delta)
- **Spec:** Δ = avgInside − avgOutside ≤ 0.05 mm per add-on area
- **Frequency:** 1/Batch
- **Why specialized:** Multiple add-on areas per card (hologram, sig panel, etc.), each with 3
  measurement points; delta computed against #8040# baseline.
  Full specification already written in `docs/adding-specialized-test-form.md` (Appendix).
- **Form inputs needed:**
  - Equipment: micrometer serial, applied force, probe diameter
  - Header: baseline outside thickness (from IT-PHY-002 / #3003# result)
  - Per card, per add-on area: left, center, right readings; computed avgInside, delta, area pass
  - Computed: card pass if all declared add-on areas pass
- **Suggested file:** `ThicknessAddOnForm.tsx`
- **DB test_id to register:** `#3004#`
- **Note:** Full TypeScript interface and migration SQL are in the appendix of the reference doc.

---

### 4. `IT-PHY-005` — Opacity
- **Standard:** ISO 7810
- **Type:** passfail
- **Spec:** Opacity ≥ specified threshold for cards with translucent/transparent core
- **Frequency:** 1/Batch
- **Why specialized:** Requires recording light transmission % and the device used;
  only applies to translucent or transparent core cards.
- **Form inputs needed:**
  - Equipment: densitometer/light meter serial
  - Header: core type (translucent / transparent), wavelength or filter used
  - Per card: measured opacity % or optical density value; pass/fail
- **Suggested file:** `OpacityForm.tsx`
- **DB test_id to register:** `IT-PHY-005`

---

### 5. `IT-CBY-006` — Card Edges (IS7810)
- **Standard:** ISO 7810
- **Type:** measurement · **Unit:** mm
- **Spec:** Edge burr height ≤ 0.05 mm (ISO 7810)
- **Frequency:** 1/Batch
- **Why specialized:** Requires measuring burr height at multiple edge locations per card;
  surface profile gauge reading with equipment traceability.
  (`#3006#` / `CardEdgesForm.tsx` covers the CQM-internal version — this is the ISO 7810 version and should mirror that form.)
- **Form inputs needed:**
  - Equipment: surface profilometer or burr gauge serial
  - Per card: top, bottom, left, right edge measurements (mm)
  - Computed: max burr; per-card pass if max ≤ 0.05 mm
- **Suggested file:** `CardEdgesISOForm.tsx` (or reuse `CardEdgesForm.tsx` if spec limits match)
- **DB test_id to register:** `IT-CBY-006`

---

## Needs specialized form — Mechanical

### 6. `IT-MCH-001` — Wrapping Test Robustness
- **Standard:** ISO 10373-1 (wrapping robustness)
- **Type:** passfail
- **Frequency:** 1/Batch
- **Why specialized:** Records machine serial and cycle count performed; visual inspection result
  (cracking, delamination, chip displacement) per card after cycling.
- **Form inputs needed:**
  - Equipment: wrapping machine serial, fixture description
  - Header: cycle count applied (typically 4 000 cycles)
  - Per card: visual result — No damage / Crack / Delamination / Chip dislodged; pass/fail
- **Suggested file:** `WrappingTestForm.tsx`
- **DB test_id to register:** `IT-MCH-001`

---

### 7. `IT-MCH-002` — Bending Stiffness
- **Standard:** ISO 7810 · Test method `#8080#`
- **Type:** measurement · **Unit:** N·mm
- **Frequency:** 1/Batch
- **Why specialized:** Two independent stiffness values per card (longitudinal + transverse);
  both must be within spec; machine serial required for traceability.
- **Form inputs needed:**
  - Equipment: stiffness tester serial, calibration date
  - Per card: longitudinal stiffness (N·mm), transverse stiffness (N·mm)
  - Computed: per-direction pass/fail; card pass if both pass
- **Suggested file:** `BendingStiffnessForm.tsx`
- **DB test_id to register:** `IT-MCH-002`

---

### 8. `IT-MCH-005` — 3 Wheel Test Robustness
- **Standard:** ISO 10373-1
- **Type:** passfail
- **Frequency:** 1/Batch
- **Why specialized:** Machine serial and cycle count; visual result per card (cracking,
  delamination, embossing damage).
- **Form inputs needed:**
  - Equipment: three-wheel machine serial
  - Header: cycle count applied
  - Per card: visual result categories; pass/fail
- **Suggested file:** `ThreeWheelTestForm.tsx`
- **DB test_id to register:** `IT-MCH-005`

---

### 9. `#3041#` — Bending Stiffness (ICC Requirement)
- **Standard:** ICC-REQ § 10.1.1 · Test method `#8080#`
- **Type:** passfail (force measurement drives pass/fail)
- **Frequency:** Not required / qualification only
- **Why specialized:** Same apparatus as IT-MCH-002 but under the ICC-REQ category;
  records force in N·mm and passes if within ICC-specified range.
- **Form inputs needed:**
  - Equipment: stiffness tester serial
  - Per card: longitudinal and transverse stiffness (N·mm); pass/fail per direction
- **Suggested file:** `BendingStiffnessICCForm.tsx` (or share `BendingStiffnessForm.tsx` if limits match)
- **DB test_id to register:** `#3041#`

---

## Needs specialized form — Environmental / Durability

### 10. `#3044#` — Temperature and Humidity Exposure
- **Standard:** ICC-REQ § 10.1.5 · Test method `#8091#`
- **Type:** passfail
- **Frequency:** Not required / qualification
- **Why specialized:** Environmental chamber conditions must be recorded; visual and functional
  checks on each card after exposure.
- **Form inputs needed:**
  - Equipment: chamber serial
  - Header: temperature (°C), humidity (%), cycle count, soak duration (h)
  - Per card: visual result (OK / Warped / Delaminated / Blistered), chip functional after (Y/N); pass/fail
- **Suggested file:** `TempHumidityExposureForm.tsx`
- **DB test_id to register:** `#3044#`

---

### 11. `#3045#` — Resistance to Heat
- **Standard:** ICC-REQ § 10.1.6 · Test method `#8110#`
- **Type:** passfail
- **Frequency:** Not required / qualification
- **Why specialized:** Chamber temperature and exposure time recorded; warpage/delamination
  checked per card after heat soak.
- **Form inputs needed:**
  - Equipment: oven/chamber serial
  - Header: set temperature (°C), duration (h)
  - Per card: visual result (warpage, bubbling, delamination, embossing integrity); pass/fail
- **Suggested file:** `ResistanceToHeatForm.tsx`
- **DB test_id to register:** `#3045#`

---

## Needs specialized form — Electrical / Other

### 12. `#3050#` — ESD Conductivity (ESC)
- **Standard:** ICC-REQ § 10.1.12 · Test method `#8250#` / `#8260#`
- **Type:** passfail (measured value drives pass/fail)
- **Frequency:** Not required / qualification
- **Why specialized:** Conductivity meter serial and measured resistance value must be recorded;
  two test methods (#8250# surface resistance, #8260# volume resistance) may both apply.
- **Form inputs needed:**
  - Equipment: conductivity/resistance meter serial, probe configuration
  - Header: method used (#8250# or #8260#), ambient conditions (temp °C, RH %)
  - Per card: measured resistance (MΩ or kΩ); pass/fail per acceptance limit
- **Suggested file:** `ESDConductivityForm.tsx`
- **DB test_id to register:** `#3050#`

---

### 13. `#2515#` — Loading of Software into IC / ICM
- **Standard:** ICC-REQ § 7.1.5 · Test method: vendor
- **Type:** passfail
- **Frequency:** 1/Batch
- **Why specialized:** Firmware version, loading tool serial, and per-card pass/fail must be
  captured; vendor-defined acceptance criteria (correct version loaded, no loading error).
- **Form inputs needed:**
  - Equipment: programming tool ID / reader serial
  - Header: firmware/software version loaded, loading protocol
  - Per card: load result (Success / Error code); pass/fail
- **Suggested file:** `SoftwareLoadForm.tsx`
- **DB test_id to register:** `#2515#`

---

### 14. `#3048#` — Use Conditions
- **Standard:** ICC-REQ § 10.1.9 · Test method: spec
- **Type:** passfail
- **Frequency:** Not required / qualification
- **Why specialized:** Requires recording which operational scenarios were exercised (card
  insertion cycles, swipe cycles, tap cycles) and per-scenario pass/fail.
- **Form inputs needed:**
  - Header: use scenario tested (Contact / Contactless / Magnetic stripe), cycle count
  - Per card: functional result per scenario; overall pass/fail
- **Suggested file:** `UseConditionsForm.tsx`
- **DB test_id to register:** `#3048#`

---

## Pure compliance / documentation — standard form is sufficient

These tests are spec reviews or certificate checks with no active measurements.
The generic pass/fail entry with a notes field is adequate.

| Test ID | Name | Reason |
|---------|------|--------|
| `#3049#` | Toxicity, Health and Environment | Certificate / spec review only |
| `#3100#` | PVC / CSI Letter compliance | Document verification |
| `#3200#` | CVCS compliance | Document verification |
| `#3052#` | Card Construction and Specification | Spec review |
| `#3056#` | IC or ICM | Spec review |

---

## Implementation priority

| Priority | Test IDs | Rationale |
|----------|----------|-----------|
| **1 — High** | `IT-PHY-002`, `#3004#` | Active monitoring data already in DB; SPC charts exist |
| **2 — High** | `IT-PHY-003`, `IT-CBY-006`, `IT-MCH-002` | Core dimensional / structural measurements, run every batch |
| **3 — Medium** | `IT-MCH-001`, `IT-MCH-005`, `#3041#` | Mechanical cycle tests, straightforward form pattern |
| **4 — Medium** | `#3044#`, `#3045#` | Environmental tests, qualification-only frequency |
| **5 — Low** | `#3050#`, `#2515#`, `IT-PHY-005`, `#3048#` | Infrequent or vendor-specific |
