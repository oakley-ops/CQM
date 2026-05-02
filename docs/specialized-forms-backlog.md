# Specialized Form Backlog

Tests that currently use the generic standard form but require a dedicated form
with per-card measurement tables, equipment metadata, and computed pass/fail.
**10 new form files needed** (duplicates resolved — see notes in completed table).

Reference pattern: `docs/adding-specialized-test-form.md`

---

## Already have specialized forms (complete)

| Test ID | Name | Form file |
|---------|------|-----------|
| `#3007#` / `IT-PHY-006` | Overall Card Warpage | `WarpageForm.tsx` |
| `#3021#` | Solidity – Adhesion / Blocking | `SolidityForm.tsx` |
| `#3006#` / `IT-CBY-006` | Card Edges / Edge Burrs | `CardEdgesForm.tsx` — register both test IDs; `IT-CBY-006` spec limit is 0.05 mm vs 0.08 mm for `#3006#`, both read from `def.max_acceptable_value` |
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
| `#3003#` / `IT-PHY-002` | Card Thickness (Outside) | `CardThicknessForm.tsx` — 5-point #8040# layout, avg stored as `measurementValue` for SPC |
| `#3005#` / `IT-PHY-003` | Corners (Corner Radius) | `CornerRadiusForm.tsx` — 4-corner PASS/FAIL/NO TEST per #8060#; card passes only if all tested corners pass |
| `#3004#` / `IT-PHY-004` | Thickness within Add-on Areas | `ThicknessAddOnForm.tsx` — dynamic Add-On Area list; L/C/R readings per area; Δ = avgInside − baseline ≤ 0.05 mm |
| `#3055#` / `#3068#` | Wrapping Test Robustness | `WrappingTestForm.tsx` — cylinder diameter select (40/50 mm), front/reverse cycle counts, per-card pre/post IC functional check + visual damage category + IAC connection check; test method auto-selects #8220# or #8221# |

---

## Needs specialized form — Physical / Dimensional



## Needs specialized form — Mechanical


---



---

## Needs specialized form — Environmental / Durability


---

---
## Needs specialized form — Electrical / Other
---



---



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

| Priority | Test IDs | New form files | Rationale |
|----------|----------|----------------|-----------|
| **1 — High** | ~~`#3003#`~~ ✓, ~~`#3004#`~~ ✓ | `ThicknessAddOnForm` | Done |
| **2 — High** | ~~`IT-PHY-003`~~ ✓ | `CornerRadiusForm` | Done |
| **3 — Medium** | `IT-MCH-001`, `IT-MCH-005` | `WrappingTestForm`, `ThreeWheelTestForm` | Mechanical cycle tests, run every batch |
| **4 — Medium** | `#3044#`, `#3045#` | `TempHumidityExposureForm`, `ResistanceToHeatForm` | Environmental tests, qualification-only frequency |
| **5 — Low** | `#3050#`, `#2515#`, `IT-PHY-005`, `#3048#` | `ESDConductivityForm`, `SoftwareLoadForm`, `OpacityForm`, `UseConditionsForm` | Infrequent or vendor-specific |
