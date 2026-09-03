# Qualification Process Flow & Review

**Scope:** How a CQM Qualification is performed, how NEXUS implements it today, and a review against the canonical requirements doc `cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.md` (CQM Requirements 3a, Nov 2025).

---

## 1. What a "Qualification" is in CQM

In the Mastercard CQMAP world, you cannot ship a CQM product until you have **proven the product design is sound and the process that makes it is under control**. That proof is the *Qualification*. The requirements catalog splits qualification into two parallel tracks that both feed one gate:

| Track | Canonical requirements | Question it answers |
|---|---|---|
| **Product Qualification** | `#0651#` Process → `#0582#` Plan → `#0654#` Report | "Is the *design* good?" |
| **Process Qualification** | `#0652#` Process → `#0653#` Report | "Is the *line* capable & in control?" |
| **Design Reviews** | `#0571#` Intermediate + Final | Sign-off checkpoints |
| **The Gate** | `#0706#` *Only Produce Qualified Products Using Qualified Processes* | The hard stop before production |

---

## 2. The canonical process flow (per the cqmAP bible)

```
Feasibility study (#0553#) ──► Design planning (#0552#)
        │
        ▼
Product Qualification Plan (#0582#)  ◄─── runs the Product Qualification Process (#0651#)
        │
        ├─► Intermediate Design Review (#0571#)        [checkpoint]
        │
        ├─► Process Qualification (#0652#) → SPC (#0705#), Process Capability/Cpk (#0811#)
        │
        ├─► Final Design Review (#0571#)               [checkpoint, must be "approved"]
        │
        ▼
Product Qualification Report (#0654#) + Process Qualification Report (#0653#)
        │
        ▼
#0706# GATE ──► only now may you "produce qualified products using qualified processes"
```

---

## 3. How NEXUS implements this today

The app collapses both tracks into one `nexus_qualification_plans` row with a `plan_type` of `'product' | 'process'`, then runs everything through a single programmatic gate.

The hands-on flow in the UI (`frontend/src/pages/nexus/ProductQualificationHub.tsx`):

1. **Create a plan** (`POST /audits/:id/plans`) — pick *Product* or *Process*, set an owner. The backend auto-seeds a **12-item checklist** from `seed-data/nexus/qualification-items.json` (`qualificationPlanController.js:32`).
2. **Work the checklist** — each item gets an evidence ref, a responsible person, and a status (`pending → in-progress → complete / not-applicable`). Marking `complete` auto-stamps `completed_date` (`qualificationPlanController.js:106`).
3. **Record design reviews** (`#0571#`) — intermediate + final, each with an outcome (`pending/approved/conditional/rejected`).
4. **Check the gate** (`utils/nexusGate.js`) — `evaluateGate()` returns pass/fail across **6 conditions**:
   - all checklist items complete or N/A
   - intermediate review approved *or conditional*
   - final review **approved** (strict)
   - no open `NC+`/`nc-` process-step findings
   - every process step has a vendor site documented
   - plan owner assigned
5. **Promote the plan** (`draft → in-progress → submitted → approved → rejected`).

The gate is the app's encoding of `#0706#`. It pulls process-step findings from `NexusProcessStepAssessment` scoped by `product_scope_id`, so qualification is wired to the product-scope / process-step module, not standalone.

---

## 4. Review findings

### 4.1 The doc itself is sound
It is a faithful, per-product-category (IC, ICM, IL, CB, ICC, P, IAC, BSM…) listing of CQMAP V3.A requirements with conformity/coverage flags. The qualification requirement IDs are consistent across all categories (`#0651#/#0582#/#0654#/#0652#/#0653#` repeat identically in every section). No issues there.

### 4.2 ⚠️ The seed checklist has drifted from the canonical vocabulary
This matters because **CQM vocabulary is canonical to the cqmAP bible**. In `seed-data/nexus/qualification-items.json`, five requirement IDs don't match the doc:

| Seed item ID | Seed title | What that ID *actually* means in the doc |
|---|---|---|
| `#0601#` | "Equipment calibration records" | **Control of externally provided processes – General** |
| `#0602#` | "Operator training records" | **Does not exist in the doc at all** |
| `#0603#` | "Work instructions / SOPs" | **Information for external providers** |
| `#0604#` | "Product specifications / drawing package" | **Type and extent of control** |
| `#0583#` | "Non-conforming steps corrective actions" | **Does not exist** (doc has `#0582#` Plan, `#0581#` D&D Outputs) |

These look like plausible-but-invented IDs. An auditor cross-referencing the report against the real CQMAP would flag mismatched citations. The *content* (calibration/training/SOP/spec evidence) belongs in qualification — the *requirement numbers* are wrong.

### 4.3 The checklist is identical for product vs process plans
Both `plan_type` values seed the same 12 items. Per the doc, a *process* plan should cite `#0652#/#0653#`, while a *product* plan cites `#0651#/#0582#/#0654#`. Right now neither set is referenced in the seed — the two canonical "spine" requirements of qualification are missing from the checklist.

---

## 5. Recommended next step

Realign `qualification-items.json` to canonical IDs, and optionally split it into product vs process seed sets. This is a contained change to one seed file plus the controller's seeding logic.

**Suggested order:** confirm the corrected ID mapping first (vocabulary-canonical concern), then draft the realigned seed file(s).

---

## 6. Proposed corrected mapping (for review)

### 6.1 Fix the 5 drifted IDs
Each target ID/title verified against the canonical doc:

| # | Current (wrong) | Seed intent | → Proposed canonical ID | Canonical title (verified in doc) |
|---|---|---|---|---|
| 8 | `#0583#` (doesn't exist) | NC corrective actions | **`#0882#`** | Improvement – Nonconformity and Corrective Action |
| 9 | `#0601#` (= external providers) | Equipment calibration | **`#0442#`** | Monitoring & measuring resources – Measurement traceability |
| 10 | `#0602#` (doesn't exist) | Operator training | **`#0461#`** | Competence |
| 11 | `#0603#` (= info for ext. providers) | Work instructions / SOPs | **`#0482#`** | Documented Information (incl. Record Retention) |
| 12 | `#0604#` (= type/extent of control) | Product spec / drawings | **`#0501#`** | Product Specification |

The 7 already-correct items are unchanged: `#0706#`, `#0701#`, `#0702#`, `#0705#`, `#0811#`, and the two `#0571#` design reviews.

### 6.2 Add the missing qualification "spine" (split by plan type)
Split the single seed list into two so each plan type cites its own canonical spine:

- **Product plan** adds → `#0651#` Product Qualification Process, `#0582#` Product Qualification Plan, `#0654#` Product Qualification Report
- **Process plan** adds → `#0652#` Process Qualification Process, `#0653#` Process Qualification Report

This requires a small `createPlan` change: seed from the set matching `plan_type` rather than one shared file.

### 6.3 Implementation status — DONE
- Replaced `qualification-items.json` with two canonical sets: `qualification-items-product.json` (15 items) and `qualification-items-process.json` (13 items).
- `qualificationPlanController.createPlan` now seeds the set matching `plan.plan_type` (`'process'` → process set, else product set).
- UI hint in `ProductQualificationHub.tsx` no longer hard-codes a 12-item count.
- The two `#0571#` design-review items are retained in **both** sets to stay aligned with `nexusGate.js`, which enforces intermediate + final reviews regardless of plan type.
