# NEXUS — Qualification Hub
## Strategy, CQM Mapping & Implementation Plan

> **Tagline:** Connected Quality. Intelligent Future.

---

## 0. Source Document — The Bible

All NEXUS features map directly to the **Mastercard CQM Assessment Plan V3.A** (November 2025):

> `docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx` ← **active, use this**
> `docs/CQM-Assessment-Plan-V2.22 (3).xlsx` ← superseded, kept for reference only

Every requirement ID (e.g. `#0705#`) is a canonical identifier from that file. The conformity scale `NC+` / `nc-` / `RI` / `Full` / `NCC` is the vocabulary for all compliance assessments in NEXUS.

**Rule:** Every NEXUS feature must trace to a specific requirement ID from the V3.A CQMAP.

---

## 0b. V3.A vs V2.22 — Key Structural Changes

Understanding what changed from V2.22 to V3.A is critical for building NEXUS correctly.

### Sheet count: 19 → 23

| Status | Sheets |
|--------|--------|
| Renamed | `Coverpage` → `Coversheet` (more structured: split address, production volumes table) |
| New | `Audit Report` — auto-generated full audit output (1505r × 430c) |
| New | `Components` — structured supplier/subcontractor registry |
| New | `CAP` + `CAP previous` — built-in Corrective Action Plan workflow |
| New | `Docs` — document register linked to requirement IDs |
| New | `Audit Agenda`, `SelectionLists` |
| Removed | `AutoRefresh`, `CQM CoC`, `Label Recommendation` |

### THE BIG CHANGE — 12 Requirements Moved from QMS → Per-Product Sheets

V3.A removed these 12 requirements from both QMS sheets and placed them inside each product-specific sheet. They are still mandatory but now assessed **per product type**, not once at site level:

| Requirement | Title |
|-------------|-------|
| `#0502#` | Product Family Specification |
| `#0552#` | Design & Development Planning |
| `#0553#` | Feasibility Study |
| `#0571#` | Intermediate and Final Design Reviews |
| `#0581#` | Design & Development Outputs |
| `#0603#` | Information for External Providers |
| `#0604#` | Control of Externally Provided Processes |
| `#0651#` | Product Qualification Process |
| `#0702#` | Product Family Based Sampling |
| `#0705#` | **Statistical Process Control** ← now per-product |
| `#0706#` | **Only Produce Qualified Products** (the gate) ← now per-product |
| `#0811#` | **Process Capability (Cp/Cpk)** ← now per-product |

**New requirement:** `#0707#` — appears in V3.A product sheets, not in V2.22.

### QMS Requirement Counts Changed

| Sheet | V2.22 | V3.A |
|-------|-------|------|
| QMS - has 9001 Cert | 41 | **31** |
| QMS - NO 9001 Cert | 72 | **60** |

### Product Sheets Expanded

All 9 product sheets: 55 cols → **79 cols**, 60 process tags → **90 process tags**.
New IC sub-type slots: `tstIC`, `bckIC`, `rdlIC`, `bmpIC`, `sawIC`, `venIC`, `subIC`, `devIC`, `quaIC`, `prdIC`.

---

## 1. What NEXUS Is

NEXUS is the qualification and conformity strategy that sits on top of the CQM tracking system. Where CQM stores the data (test sessions, entries, measurements), NEXUS is the **framework that gives that data meaning** — it answers: *"Is this product, process, and supply chain qualified and audit-ready?"*

NEXUS has **9 modules**, each mapping directly to a section of the CQMAP V3.A:

| Module | CQMAP Section | Purpose |
|--------|--------------|---------|
| QMS Self-Assessment | QMS sheets | Site-level quality management compliance |
| Product Scope & Process Steps | Product sheets (ic/icm/il/cb/icc/p/iacicm/bsm/iacil/iac) | Per-product manufacturing process conformity |
| Product Qualification | Per-product `#0571#`, `#0651#`, `#0706#` | Formal design approval + production gate |
| Process Qualification | Per-product `#0583#`, `#0653#` | Process stability proof with SPC evidence |
| Components (Material Qual) | `Components` sheet | Supplier/subcontractor CQM cert tracking |
| CAPA | `CAP` sheet | Corrective Action Plan lifecycle |
| Document Register | `Docs` sheet | Evidence documents linked to requirements |
| Product Conformity | `#0701#`, `#0702#`, `#0721#`, `#0722#` | Ongoing batch-level monitoring |
| AI Insights | All | SPC alerts, readiness scores, risk prediction |

---

## 2. CQM Flow Diagram

```
Vendor Internal Quality       CQM Assessment Plans (V3.A)
Control Requirements               │
        │                          │
        ▼                          ▼
┌────────────────┐        ┌─────────────────────┐
│Process         │        │Quality Planning      │
│Development     │        │#0581# (per product)  │
│(Process Spec   │        │→ Qual. Plan #0582#   │──────────────────────┐
│ #0583#)        │        │→ QC Plan #0701#      │                      │
└───────┬────────┘        │→ QM Plan #0702#      │                      │
        │                 └──────────┬────────────┘                      │
        │                            │                                   │
        ▼                            ▼                                   ▼
┌────────────────┐        ┌─────────────────────┐         ┌─────────────────────┐
│Product         │        │Product Qualification │         │Quality Monitoring   │
│Development     │───────►│#0651# (per product)  │────────►│#0701# #0702#        │
│#0561# #0571#   │        │SPC: #0705# per prod  │         │                     │
│#0581#          │        │← Released Process    │         │← Rep. Product       │
└────────────────┘        │   Specification      │         │  Samples            │
                          │← Released Product    │         │← Conformity &       │
                          │   Specification      │         │  Control Indicators │
                          └──────────┬───────────┘         └──────────┬──────────┘
                                     │                                 │
                                     ▼                                 │
                          ┌─────────────────────┐                     │
                          │Volume Production     │◄────────────────────┘
                          │#0706# gate per prod  │
                          │#0721# #0722# #0703#  │
                          └──────────────────────┘
                                     │
                          ┌──────────▼───────────┐
                          │NC found? → CAP sheet  │
                          │CAPA workflow (#0882#) │
                          └──────────────────────┘
```

---

## 2b. QMS Requirements Mapping (V3.A)

The QMS sheets are a prerequisite layer. A vendor cannot be meaningfully qualified at the product level without a functioning QMS.

### Sheet Variants
| Condition | Sheet | Requirements |
|-----------|-------|-------------|
| Vendor has ISO 9001 certificate | `QMS - has 9001 Cert` | **31 requirements** (ISO cert covers the basics) |
| Vendor has NO ISO 9001 certificate | `QMS - NO 9001 Cert` | **60 requirements** (full ISO 9001 + CQM-specific) |

> Note: In V2.22 these were 41 and 73. The 12 qualification/SPC requirements were moved to product sheets.

### Critical QMS Requirements Remaining in V3.A

| ID | Section | Title | NEXUS Relevance |
|----|---------|-------|-----------------|
| `#0233#` | 4.5.3.2 | CQM Primary Contact | Site contact record |
| `#0211#` | 4.5.1.1 | Leadership and commitment | New in has-9001 variant |
| `#0236#` | 4.5.3.5 | Define Responsibilities for Managing Order Flow | New in has-9001 variant |
| `#0585#` | 4.6.1.1 | Risk Management (pFMEA, dFMEA) | Links to qualification plan risk items |
| `#0652#` | 4.8.1.3 | Process Qualification Process | Pillar 3 — Process Qualification |
| `#0821#` | 4.9.1.1.3 | Product Problem Analysis Infrastructure | Feeds CAPA module |
| `#0841#` | 4.9.2.1 | Internal Assessment / CQM Assessment Plan | NEXUS self-assessment module |
| `#0761#` | 4.8.5.6 | Control of Changes | Change notification log |
| `#0762#` | 4.8.5.6.2 | Change Notification Procedure | Change notification log |
| `#0883#` | 4.10.1.1 | Customer Complaints and Feedback | Feeds CAPA module |
| `#0882#` | 4.10.2 | Nonconformity and Corrective Action | Feeds CAPA module |

> Requirements `#0705#` (SPC), `#0811#` (Cpk), `#0651#` (Product Qualification), and `#0706#` (gate) are **no longer in QMS** — they are now assessed per-product inside each product sheet.

### QMS NEXUS Feature (`/nexus/qms-assessment`)
- ISO 9001 certification status toggle → determines which 31 or 60 requirements apply
- Self-assessment checklist: one row per requirement, status = `NC+` / `nc-` / `RI` / `Full` / `tbd`
- Evidence references (document/procedure links per requirement)
- Auditor observation + corrective action columns
- QMS compliance score auto-calculated (requirements without NC / total)

---

## 2c. Product Scope & Process Step Conformity (V3.A)

### Product Type Taxonomy (V3.A)

| Category | Sheet | Core Variants | New V3.A Expanded Variants |
|----------|-------|--------------|---------------------------|
| IC | `ic` | kIC, pIC | tstIC, bckIC, rdlIC, bmpIC, sawIC, venIC, subIC, devIC, quaIC, prdIC |
| ICM | `icm` | kICM, pICM | (similar expansion pattern) |
| IL | `il` | aIL, kIL, dIL, pIL, icIL, mIL | — |
| CB | `cb` | CB, ilCB | — |
| ICC | `icc` | kICC, pICC, mICC, ilICC | — |
| P | `p` | kP, dP, pP | — |
| iacICM | `iacicm` | iacICM, kiacICM, piacICM | — |
| BSM | `bsm` | BSM, fpBSM, vcBSM, imBSM | — |
| iacIL / IAC | `iacil` / `iac` | kIACIL, pIACIL, kIAC, pIAC, sIAC | fpIAC, imIAC, vcIAC, s+fpIAC, s+imIAC, s+vcIAC |
| Applets | — | — | fpApplet, imApplet, vcApplet (biometric software) |

### Process Step Structure (V3.A — 90 tags per sheet, up from 60)

Each product sheet contains:
- **Manufacturing process steps** (e.g. `#A10#` Wafer Processing, `#L10#` Electrical Test) — vendor fills in process spec and control plan refs
- **Qualification requirements** moved from QMS: `#0571#`, `#0651#`, `#0705#`, `#0706#`, `#0811#`, etc. — now assessed per product
- **New V3.A process step tags**: `#A00#`, `#A20#`–`#A80#`, `#B20#`–`#B50#`, `#X00#`, `#X10#`, `#Y10#`, `#3130#`, `#0707#`

Each step requires:
- Vendor self-assessment (process spec + control plan documented?)
- Site where step is performed (if outsourced — triggers Components entry)
- Equipment references (production + test equipment)
- Auditor conformity verdict: `NC+` / `nc-` / `RI` / `Full` / `n/a`

### `#0706#` Gate — Now Per-Product

In V3.A, the gate that prevents shipping unqualified product is assessed **inside each product sheet**, not at the QMS level. The NEXUS system must enforce a gate per in-scope product type, not one site-wide gate.

### Audit Grading
| Grade | Meaning |
|-------|---------|
| A | Pass — no Major Non-Conformities |
| B | Pass — only a few Non-Conformities |
| C | Pass — many Non-Conformities |
| D | Fail — too many Non-Conformities |

Certification outcome per product: **A** (CQM Approval) / **R** (CQM Recognition) / **F** (not recommended) / **N** (not in scope)

---

## 2d. Components Module — Material Qualification (V3.A)

The V3.A `Components` sheet replaces the ad-hoc vendor certification concept with a structured registry.

### Schema (from Components sheet)
| Field | Description |
|-------|-------------|
| Component ID | Auto-generated reference |
| Component/Service Type | Dropdown: IC (wafer prod), IC (wafer test), IC (backside/dicing), ICM, aIL, icIL, mIL, CB, mICC, ilICC, Perso, iacICM, fpBSM, imBSM, vcBSM, iacIL, IAC, fpApplet, imApplet, vcApplet, and more |
| Article Number / Internal ID | Vendor's internal reference |
| Used for CQM Product | Which product type this component feeds |
| Supplier Company Name | — |
| City | — |
| Country | ISO 3166-1 country code → auto-resolves to country name |
| CQM Certification Status | Supplier (CQM certified) / Supplier (pending) / Supplier (not certified) / Subcontractor (CQM certified themselves) / Subcontractor (not certified) / Other |
| CQM Label | Cert label if known |
| Comment | Free text |

### Conformity verdicts for subcontractors (new in V3.A)
`NC+ (Subcontractor)` / `nc- (Subcontractor)` / `RI (Subcontractor)` / `Full (Subcontractor)` / `NCC` / `NCC (Subcontractor)` / `Not assessed (timing constraints)` / `Not assessed (Subcontractor)`

### NEXUS Feature (`/nexus/components`)
- Component registry table (matches Components sheet structure exactly)
- ISO 3166-1 country code lookup
- CQM cert status with visual expiry alerts
- Filter by product type, by cert status
- Links non-certified subcontractors to open CAPA items

---

## 2e. CAPA Module — Corrective Action Plan (V3.A)

The V3.A `CAP` sheet introduces a built-in, structured CAPA workflow. NEXUS implements this as a live module.

### Schema (from CAP sheet)
| Field | Description |
|-------|-------------|
| Action Item ID | Format: `[YY-MM/xxxNN]` e.g. `25-11/ABC01` |
| Relates to Requirement | `#nnnn#` — links to specific CQMAP requirement |
| Severity | NC+ / nc- / RI |
| Observation | Verbal description of the finding |
| Suggested Corrective Action | Auditor's recommendation |
| Deadline | Date or "Next Audit" |
| Corrective Action | Vendor's planned response |
| Target Date for Completion | — |
| Responsibility | Named person |
| Status | Not yet started / Ongoing / Complete / Cancelled / Finding Rejected / Completed check next audit / Replaced by new Action |
| Status Description | Free text (delays, internal refs) |
| Evidence for Completion | File name or link |
| Auditor Review Status | Open / Completed / Cancelled |
| Auditor Comment | — |

### Summary Dashboard (top of CAP sheet)
- Count of NC+ / nc- / RI / OI (Opportunity for Improvement) items
- Status breakdown: Not yet started / Ongoing / Complete / Cancelled / Finding Rejected
- Auto-calculated completed and cancelled counts by severity

### NEXUS Feature (`/nexus/capa`)
- CAPA item list with severity badges and status workflow
- Link each action to the requirement that raised it (opens requirement detail)
- Deadline tracking with overdue alerts
- Evidence upload/reference per action
- Summary dashboard (mirrors CAP sheet header)
- Auto-generates CAPA items from NC+/nc- findings in QMS and product assessments

---

## 2f. Document Register (V3.A)

The V3.A `Docs` sheet introduces a formal document register.

### Schema
| Field | Description |
|-------|-------------|
| First referenced in Requirement | `#nnnn#` — which requirement first called for this document |
| Doc ID | Vendor's internal document ID |
| Title | Document title |
| Notes | Auditor notes |

### NEXUS Feature (`/nexus/documents`)
- Document register table
- Auto-populate from evidence references entered in QMS and product assessments
- Filter by requirement, by document type
- Track version/approval date

---

## 2g. Audit Report Generation (V3.A)

The V3.A `Audit Report` sheet is a 1505-row × 430-column auto-generated report that aggregates all assessment data. NEXUS should eventually generate a comparable digital output.

### NEXUS Feature (Phase 5)
- Generate a structured audit report from all NEXUS modules
- PDF export: Coversheet → Scope → QMS assessment → per-product process step results → CAPA → Document list
- Mirrors the structure of the `Audit Report` sheet

---

## 3. NEXUS in the Application — Sidebar & Navigation

The NEXUS sidebar icon is already live — an orange `Hub` icon styled with an amber gradient, separate from the main menu with a divider.

### NEXUS Sub-pages

```
/nexus                         → NEXUS Intro / Dashboard
/nexus/qms-assessment          → QMS Self-Assessment (31 or 60 requirements)
/nexus/product-scope           → Product Scope Selection + Process Step Conformity (90 tags)
/nexus/product-qualification   → Product Qualification Hub (per-product #0706# gate)
/nexus/process-qualification   → Process Qualification Hub
/nexus/components              → Components / Material Qualification
/nexus/capa                    → Corrective Action Plan
/nexus/documents               → Document Register
/nexus/conformity              → Product Conformity (monitoring view)
/nexus/ai-insights             → AI Integration (SPC + predictions)
```

---

## 4. Page-by-Page Feature Plan

### 4.1 NEXUS Intro / Dashboard (`/nexus`)
Currently a teaser page showing all 9 modules, existing capabilities, CQMAP structure, and the implementation roadmap. Will become a full command-center dashboard in Phase 5.

### 4.2 QMS Self-Assessment (`/nexus/qms-assessment`)
- ISO 9001 cert status toggle → loads 31 or 60 requirements
- Requirement table: ID, section, title, vendor compliance dropdown, evidence reference, conformity verdict (NC+/nc-/RI/Full/tbd), auditor comment
- Compliance score gauge
- Any NC+ or nc- row auto-creates a CAPA item

### 4.3 Product Scope & Process Steps (`/nexus/product-scope`)
- 9-category scope selection grid
- For each in-scope product: variant selection, then 90-row process step checklist
- Each process step: vendor compliance, site (if outsourced → triggers Components entry), equipment, conformity verdict
- Qualification requirements (`#0705#`, `#0706#`, `#0811#`, `#0651#`) appear inline per product
- Per-product conformity score + grade (A/B/C/D)
- Any NC+ or nc- row auto-creates a CAPA item

### 4.4 Product Qualification Hub (`/nexus/product-qualification`)
- Qualification Plan per job + product type
- Checklist: `#0561#` → `#0706#` grouped by phase (Design → Qualification → Release)
- Design Review sign-off chain (`#0571#`)
- `#0706#` gate per product — locked until all qualification test sessions approved
- PDF export: Product Qualification Report (`#0654#`)

### 4.5 Process Qualification Hub (`/nexus/process-qualification`)
- Process Specification tracker (`#0583#`)
- SPC evidence panel — Cp/Cpk pulled from existing test entries per product
- Process Qualification Report (`#0653#`) builder + export

### 4.6 Components / Material Qualification (`/nexus/components`)
- Component registry matching V3.A Components sheet exactly
- Cert status with expiry alerts
- Country code lookup (ISO 3166-1)
- Subcontractor vs supplier distinction
- Links to CAPA for non-certified items

### 4.7 CAPA (`/nexus/capa`)
- CAPA item list with severity/status workflow
- Auto-populated from NC findings across QMS + product assessments
- Deadline tracking + overdue alerts
- Evidence references + auditor review
- Summary dashboard (NC+ / nc- / RI counts by status)

### 4.8 Document Register (`/nexus/documents`)
- Document table with DocID, title, notes, linked requirement
- Auto-populated from evidence refs in other modules

### 4.9 Product Conformity (`/nexus/conformity`)
- Pass rate by test category over time (from existing test sessions)
- Quality Monitoring Records auto-generated (`#0701#` / `#0702#`)
- Representative sample tracker
- KPI tiles linking to existing KPI dashboard

### 4.10 AI Insights (`/nexus/ai-insights`) — Phase 5
- SPC out-of-control alerts (per product type — respects V3.A per-product structure)
- Qualification readiness score per product
- Predicted pass/fail trends
- Supplier risk score (cert expiry + defect rate from Components)

---

## 5. Data Models Needed

### New models (migrations required)

| Model | Key fields | Notes |
|-------|------------|-------|
| `AuditRecord` | `site_name`, `company`, `audit_date_start`, `audit_date_end`, `auditor`, `audit_type` (on-site/remote), `initial_or_renewal`, `iso_9001_certified` (bool), `grade` (A/B/C/D), `status` (draft/submitted/approved), `cqmap_version` | Top-level audit container — Coversheet |
| `QmsAssessment` | `audit_record_id`, `requirement_id`, `section`, `title`, `vendor_compliance` (Yes/Procedure only/Practice only/No/tbd), `vendor_evidence_ref`, `conformity` (NC+/nc-/RI/Full/tbd), `auditor_comment`, `corrective_action_ref` | Seeded (31 or 60 rows) on AuditRecord create |
| `ProductScope` | `audit_record_id`, `product_category`, `product_variant`, `in_scope` (bool), `audited` (bool), `rank` (A/B/C/D/tbd), `cert_outcome` (A/R/F/N) | Scope selection |
| `ProcessStepAssessment` | `product_scope_id`, `process_tag`, `process_name`, `vendor_compliance`, `vendor_site` (if outsourced), `vendor_process_spec_ref`, `vendor_control_plan_ref`, `production_equipment`, `test_equipment`, `conformity` (NC+/nc-/RI/Full/n/a), `auditor_notes` | Seeded (90 rows) per ProductScope |
| `AuditComponent` | `audit_record_id`, `component_type`, `article_number`, `used_for_product`, `supplier_name`, `supplier_city`, `supplier_country_code`, `cert_status`, `cert_label`, `comment` | Components sheet — one per supplier/subcontractor component |
| `CapaItem` | `audit_record_id`, `action_id` (YY-MM/xxxNN), `requirement_id`, `severity` (NC+/nc-/RI), `observation`, `suggested_action`, `deadline`, `corrective_action`, `target_date`, `responsibility`, `status`, `status_description`, `evidence_ref`, `auditor_review_status`, `auditor_comment` | CAP sheet |
| `DocumentRef` | `audit_record_id`, `requirement_id`, `doc_id`, `title`, `notes` | Docs sheet |
| `QualificationPlan` | `job_id`, `audit_record_id`, `product_scope_id`, `plan_type` (product/process), `version`, `owner`, `status` | Now linked to a specific ProductScope (per-product) |
| `QualificationItem` | `plan_id`, `requirement_id`, `section`, `title`, `status`, `evidence_type`, `evidence_ref`, `responsible`, `target_date`, `completed_date` | Seeded on create |
| `DesignReview` | `plan_id`, `review_type` (intermediate/final), `reviewer`, `review_date`, `outcome`, `notes` | `#0571#` sign-off chain |

### Existing models leveraged
| Model | How used |
|-------|----------|
| `Job` | Qualification plans attach to a Job |
| `TestSession` | Evidence for `#0651#` |
| `TestEntry` | SPC source data for `#0705#` / `#0811#` (per product) |
| `Vendor` | Supplier/subcontractor records (complemented by AuditComponent) |
| `KpiConfig` | Feeds Product Conformity dashboard |

---

## 6. Backend Routes

```
# Audit Records
POST   /api/nexus/audits                                     Create audit record
GET    /api/nexus/audits                                     List all audits
GET    /api/nexus/audits/:id                                 Full audit record
PATCH  /api/nexus/audits/:id                                 Update audit metadata / grade

# QMS Assessment
GET    /api/nexus/audits/:id/qms                             List QMS requirements (seeded)
PATCH  /api/nexus/audits/:id/qms/:requirementId              Update vendor compliance + conformity

# Product Scope & Process Steps
GET    /api/nexus/audits/:id/scope                           Scope selection
PATCH  /api/nexus/audits/:id/scope/:productScopeId           Update scope / audited / rank
GET    /api/nexus/audits/:id/scope/:productScopeId/steps     List process steps (seeded 90)
PATCH  /api/nexus/audits/:id/scope/:productScopeId/steps/:stepId  Update step conformity

# Qualification Plans (per product scope)
POST   /api/nexus/qualification-plans                        Create plan
GET    /api/nexus/qualification-plans                        List (filter by job, product, status)
GET    /api/nexus/qualification-plans/:id                    Plan + items + design reviews
PATCH  /api/nexus/qualification-plans/:id                    Update plan
PATCH  /api/nexus/qualification-plans/:id/items/:itemId      Update item
POST   /api/nexus/qualification-plans/:id/reviews            Add design review sign-off
GET    /api/nexus/qualification-plans/:id/report             Generate qualification report data
GET    /api/nexus/qualification-plans/:id/gate               #0706# gate status for this product

# Components (Material Qualification)
GET    /api/nexus/audits/:id/components                      List all components
POST   /api/nexus/audits/:id/components                      Add component
PATCH  /api/nexus/audits/:id/components/:componentId         Update component / cert status

# CAPA
GET    /api/nexus/audits/:id/capa                            List all CAPA items
POST   /api/nexus/audits/:id/capa                            Create CAPA item manually
PATCH  /api/nexus/audits/:id/capa/:capaId                    Update status / evidence
GET    /api/nexus/audits/:id/capa/summary                    NC+/nc-/RI counts by status

# Document Register
GET    /api/nexus/audits/:id/documents                       List documents
POST   /api/nexus/audits/:id/documents                       Add document reference
PATCH  /api/nexus/audits/:id/documents/:docId                Update document

# Conformity & AI
GET    /api/nexus/conformity/summary                         Batch conformity summary
GET    /api/nexus/ai/readiness/:planId                       Qualification readiness score
GET    /api/nexus/ai/spc-alerts                              Active SPC out-of-control alerts (per product)
GET    /api/nexus/audits/:id/report                          Generate full audit report data
```

---

## 7. Frontend File Structure

```
frontend/src/
├── pages/nexus/
│   ├── NexusIntro.tsx                /nexus  (teaser — live)
│   ├── QmsAssessmentPage.tsx         /nexus/qms-assessment
│   ├── ProductScopePage.tsx          /nexus/product-scope
│   ├── ProductQualificationHub.tsx   /nexus/product-qualification
│   ├── ProcessQualificationHub.tsx   /nexus/process-qualification
│   ├── ComponentsPage.tsx            /nexus/components
│   ├── CapaPage.tsx                  /nexus/capa
│   ├── DocumentsPage.tsx             /nexus/documents
│   ├── ConformityPage.tsx            /nexus/conformity
│   └── AiInsightsPage.tsx            /nexus/ai-insights
├── components/nexus/
│   ├── AuditGradeBadge.tsx           A/B/C/D grade display
│   ├── ConformityBadge.tsx           NC+/nc-/RI/Full/NCC badge
│   ├── QmsRequirementTable.tsx       QMS checklist with conformity selects
│   ├── ProductScopeSelector.tsx      9-category scope selection grid
│   ├── ProcessStepChecklist.tsx      90-row process step conformity table
│   ├── QualificationPlanList.tsx     Plan table (per product)
│   ├── QualificationChecklist.tsx    Requirement checklist with status
│   ├── DesignReviewSignOff.tsx       #0571# sign-off chain
│   ├── GateControl.tsx               Per-product #0706# gate status
│   ├── ComponentsTable.tsx           Components/supplier registry
│   ├── CapaItemTable.tsx             CAPA item list with severity/status
│   ├── CapaSummaryDashboard.tsx      NC count summary (mirrors CAP sheet header)
│   ├── DocumentRefTable.tsx          Document register table
│   └── QualReadinessScore.tsx        AI readiness gauge
├── services/nexus/
│   ├── audit.service.ts
│   ├── qmsAssessment.service.ts
│   ├── productScope.service.ts
│   ├── qualificationPlan.service.ts
│   ├── components.service.ts
│   ├── capa.service.ts
│   ├── documents.service.ts
│   └── nexusAi.service.ts
└── store/slices/nexus/
    ├── auditSlice.ts
    ├── qmsAssessmentSlice.ts
    ├── productScopeSlice.ts
    ├── qualificationPlanSlice.ts
    ├── componentsSlice.ts
    ├── capaSlice.ts
    └── documentsSlice.ts
```

---

## 8. Implementation Phases

### Phase 0 — Seed Data Prep (Before any code)
- [ ] Extract all QMS requirement IDs from V3.A CQMAP into seed files — has-9001 set (31) and no-9001 set (60)
- [ ] Extract all 90 process step tags per product category into seed data
- [ ] Extract all component types from SelectionLists sheet
- [ ] Define enums: `ConformityStatus` (NC+/nc-/RI/Full/tbd/n/a/NCC), `AuditGrade` (A/B/C/D), `CapaStatus`, `CertStatus`
- [ ] Confirm `#0707#` section and title from V3.A product sheets

### Phase 1 — Foundation + QMS + Components (Week 1–2)
- [ ] DB migrations: `audit_records`, `qms_assessments`, `product_scopes`, `process_step_assessments`, `audit_components`
- [ ] Sequelize models + associations
- [ ] Seed QMS requirements (seeded on AuditRecord create based on `iso_9001_certified`)
- [ ] Seed process steps (90 per product category)
- [ ] Backend routes: Audit CRUD, QMS PATCH, scope CRUD, step PATCH, components CRUD
- [ ] `QmsRequirementTable`, `ProductScopeSelector`, `ConformityBadge`, `AuditGradeBadge`
- [ ] `ComponentsTable` with ISO country lookup and cert status

### Phase 2 — Product Qualification + Process Qualification (Week 2–3)
- [ ] DB migrations: `qualification_plans`, `qualification_items`, `design_reviews`
- [ ] `QualificationPlanList` + create flow (now linked to ProductScope, not just Job)
- [ ] `QualificationChecklist` with status/evidence
- [ ] Per-product `#0706#` gate (each product scope has its own gate)
- [ ] `DesignReviewSignOff` for `#0571#`
- [ ] SPC evidence panel reading existing test entries per product
- [ ] Process Qualification Report (`#0653#`) builder + export

### Phase 3 — CAPA + Document Register (Week 3–4)
- [ ] DB migrations: `capa_items`, `document_refs`
- [ ] Auto-create CAPA items from NC+/nc- findings in QMS and process step assessments
- [ ] `CapaItemTable` with severity badges and status workflow
- [ ] `CapaSummaryDashboard` mirroring CAP sheet header
- [ ] `DocumentRefTable` — auto-populate from evidence refs elsewhere
- [ ] Deadline tracking + overdue alerts on CAPA

### Phase 4 — Product Conformity (Week 4–5)
- [ ] Conformity summary (curated view over test sessions + KPIs)
- [ ] Quality Monitoring Records auto-generation (`#0701#` / `#0702#`)
- [ ] Representative sample tracker

### Phase 5 — NEXUS Dashboard + Audit Report + AI (Week 5–6)
- [ ] NEXUS Dashboard — 9-module status cards + audit grade + pipeline timeline
- [ ] Full Audit Report generation (mirrors V3.A Audit Report sheet)
- [ ] Per-product SPC alert engine
- [ ] Qualification readiness score endpoint + gauge component

---

## 9. The NEXUS Gate — #0706# Enforcement (Per-Product in V3.A)

In V3.A, `#0706#` is assessed inside each product sheet, not at the QMS level. This means the NEXUS gate is enforced **per in-scope product type**.

For each `ProductScope` record with `in_scope = true`, before the Job transitions to Volume Production, the system confirms:

1. A `QualificationPlan` exists for this product scope and is in `approved` status
2. All mandatory `QualificationItem` rows are `complete` or `n_a`
3. All linked qualification `TestSession` records for the Job + product are `approved`
4. The `DesignReview` for the final review (`#0571#`) is signed off
5. A Product Qualification Report (`#0654#`) has been generated
6. No open `CapaItem` records with severity `NC+` for this product

Only when all six conditions are true for a product does its gate open.

---

## 10. Summary Table (V3.A)

| NEXUS Module | CQMAP Source | Key Requirement IDs | Status |
|---|---|---|---|
| QMS Self-Assessment | QMS sheets | All remaining QMS reqs (31 or 60) | Phase 1 |
| Product Scope & Process Steps | ic/icm/il/cb/icc/p/iacicm/bsm/iacil/iac | `#0583#` `#0584#` `#0705#` `#0811#` `#0706#` (per product) | Phase 1 |
| Product Qualification | Per-product rows | `#0561#` `#0571#` `#0582#` `#0651#` `#0654#` `#0706#` | Phase 2 |
| Process Qualification | Per-product rows | `#0583#` `#0653#` | Phase 2 |
| Components | Components sheet | `#0603#` `#0604#` | Phase 1 |
| CAPA | CAP sheet | `#0821#` `#0882#` `#0883#` | Phase 3 |
| Document Register | Docs sheet | All (cross-cutting) | Phase 3 |
| Product Conformity | Test sessions + KPIs | `#0701#` `#0702#` `#0721#` `#0722#` `#0703#` | Phase 4 |
| AI Insights | All modules | `#0705#` `#0811#` (per product) | Phase 5 |

NEXUS is the CQM system's qualification brain. Every test session already being recorded feeds into it. The work is building the **structure that frames the data** — checklists, per-product gates, CAPA workflows, and audit reports that turn raw test results into a defensible Mastercard-auditable qualification record.
