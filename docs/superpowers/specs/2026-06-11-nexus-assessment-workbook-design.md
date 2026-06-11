# NEXUS Assessment Workbook — Design Spec

**Date:** 2026-06-11
**Status:** Approved design, pending implementation plan
**Canonical source:** `docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.md` (CQM Requirements 3a, Nov 2025; CQMAP template V03-00)

## 1. Problem

NEXUS holds a faithful copy of the cqmAP catalog (QMS requirement sets, 919 per-category
process/requirement rows in `backend/seed-data/nexus/process-steps.json`), but the workflow
on top of it is wrong for the primary user — a Quality person dry-running the Mastercard
CQM audit before the real auditor visits. Four confirmed pain points:

1. **No guided order** — work is scattered across seven pages (QMS Assessment, Product
   Scope, Qualification Hub, Conformity, Components, Documents, CAPA) with no "do this
   first, then this" path.
2. **cqmAP mapping unclear** — hard to trust that finishing the app means covering the doc.
3. **Entry is too heavy** — dropdown + multiline field per requirement across 60+ rows.
4. **No progress visibility** — no single view of what is done, missing, or blocking.

## 2. Goal

One guided experience whose structure **is** the cqmAP document. Completing it means the
document is covered. Deliverables at the end:

- an **internal readiness verdict** (scores, blockers, rank suggestion), and
- an **exported official CQMAP workbook** (xlsx matching the V03-00 template).

Non-goals: no schema rewrite, no data migration, no removal of existing NEXUS pages
(they remain as power-user/drill-down views over the same tables).

## 3. Decided approach (Approach A — Guided Assessment Workbook)

A single new page, `/nexus/audits/:id/workbook`, becomes the Quality person's primary
surface. Audit Detail keeps existing content but its primary CTA becomes "Open Workbook".

### 3.1 Chapter structure (mirrors the doc)

Left rail lists chapters in cqmAP order; each shows per-chapter progress (n of m assessed)
plus an overall progress bar. Navigation is free, but chapter order is the recommended
path and each chapter ends with a "Next: …" button.

| # | Chapter | Backing data |
|---|---------|--------------|
| 1 | Site Profile | `NexusAuditRecord` coversheet fields (already exist) |
| 2 | Audit Scope | `NexusProductScope` rows (`in_scope`, `audited`, `product_variant`, `product_name`) |
| 3 | QMS Requirements | `NexusQmsAssessment` (31 rows ISO-certified / 60 non-certified, per `iso_9001_certified`) |
| 4+ | One chapter per **in-scope** category (ic, icm, il, cb, icc, p, iacicm, bsm, iacil, iac) | `NexusProcessStepAssessment` rows seeded from `process-steps.json` |
| last | Readiness & Export | computed |

Category chapters are generated from scope: ticking a category in Chapter 2 makes its
chapter appear; unticking hides the chapter but **keeps** its assessment data.

Every row displays its canonical tag (`#0xxx#`, `#A10#`, `#2001#`…) so doc traceability
is ambient. Vocabulary stays canonical to the cqmAP bible (NEXUS enums match the xlsx
`SelectionLists`; regenerate with `npm run gen:vocab`).

### 3.2 The universal row pattern

`tag chip · title · conformity chips · expandable note`

- **Conformity is one tap**: seven toggle chips (`Full / RI / nc- / NC+ / NCC / n/a / tbd`)
  replace the dropdown. Current state always visible; one click to change.
- **Notes collapse**: vendor-compliance text sits behind an expand icon; closed by default.
- **Keyboard flow**: ↑/↓ moves rows; keys 1–7 set conformity in chip order
  (1=`Full`, 2=`RI`, 3=`nc-`, 4=`NC+`, 5=`NCC`, 6=`n/a`, 7=`tbd`).
- **"Next unassessed"** jump button per chapter.

The same pattern is used in QMS and category chapters — learn once, use everywhere.

### 3.3 Chapter specifics

**Chapter 2 — Audit Scope.** The doc's scope table as a picker grouped by category,
collapsible per category. Quality person sets only **In Scope** / **Audited** toggles and
optional product name. `rank` and the % columns are computed (Section 3.5), never entered.
A "common case" shortcut pre-ticks typical rows (e.g. "personalized plastic ICCs" →
`ICC` + `P` rows) to tame the 100+-row table.

**Category chapters.** Rows grouped into the doc's three natural sub-sections (collapsible):

1. **Process steps** (`#A..#`/`#B..#`/`#C..#`/`#L..#`/`#X..#`/`#Y..#`) — row pattern plus
   per-step fields (vendor site, process spec ref, control plan ref, equipment) inside the
   expandable area.
2. **Qualification & D&D spine** (`#0651#`, `#0582#`, `#0654#`, `#0652#`, `#0653#`,
   `#0571#`, `#0706#`, `#0501#`…) — each row gets a context action **"Open Qualification
   Plan"** that opens the existing plan/checklist/design-review UI in a side drawer. The
   row's conformity may be **auto-suggested** from `utils/nexusGate.js` state (gate passing
   → suggest `Full`), but a human always confirms; no auto-write.
3. **Product requirements** (`#2001#`+) — plain rows; where a requirement maps to a
   physical test already recorded in TestSessions, show an "evidence available" hint
   linking to it (read-only hint, not a hard dependency).

**NC+ / NCC handling (modules behind requirements).** Selecting `NC+` or `NCC` shows an
inline one-click **"Create CAPA?"** prompt pre-filled with the requirement tag/title;
created via existing CAPA endpoints without navigation; the row then shows a CAPA badge.
Documents open in a drawer from evidence links. The workbook is the only place the user
*works*; plans, CAPAs, documents are drawers summoned in context.

### 3.4 Readiness chapter

- **Per category and QMS:** the doc's own columns computed live — `NCC%`, `NC+%`, `nc-%`,
  `RI%`, `Full%` — over **assessed** rows; `tbd` reported as "unassessed", never counted
  as passing.
- **Verdict block:** computed **rank suggestion** (A–D) per category, written back to
  `NexusProductScope.rank` on user confirmation; hard-blocker list (every `NCC`/`NC+` row,
  every `#0706#` gate failure, every unassessed requirement), each linking to its row.
- **Trend:** delta since previous readiness check, supporting the dry-run → fix → re-check
  loop.

Rank/percentage formulas live in a pure util `backend/utils/nexusReadiness.js`
(unit-testable like `nexusGate.js`). **Decision:** the A–D rank thresholds and the
percentage formulas are extracted from the official CQMAP workbook
(`docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx` `SelectionLists`/scoring sheets) —
not invented. Extracting and fixture-testing those formulas is implementation task #1,
before any UI work depends on them.

### 3.5 Export

1. **Official CQMAP xlsx** — fills the V03-00 template: site profile, scope table with
   computed ranks/percentages, one sheet per in-scope category with conformity + vendor
   compliance per requirement. Implemented with `exceljs` (already a dependency, used by
   `excelExportController`).
2. **Internal readiness PDF** — verdict, blockers, per-chapter scores; follows the
   existing `controllers/nexus/reportController.js` pattern.

Export validates completeness first; if rows are unassessed it returns a clear
"n requirements unassessed — export anyway?" choice instead of failing.

## 4. API surface

All under existing `/api/nexus` mount; **writes reuse existing endpoints** (QMS update,
process-step update, scope update, CAPA create) so old pages stay consistent for free.

| Method | Path | Purpose |
|---|---|---|
| GET | `/audits/:id/workbook` | One aggregate call: chapters, rows, progress (replaces 6 page-level fetches) |
| GET | `/audits/:id/readiness` | Computed scores, rank suggestions, blocker list |
| GET | `/audits/:id/export/cqmap` | Official xlsx download |
| GET | `/audits/:id/export/readiness` | Internal readiness PDF |

## 5. Frontend structure (follows existing patterns)

- Types: `src/types/nexus/workbook.ts`
- Service: `src/services/nexus/workbookService.ts`
- Page: `src/pages/nexus/WorkbookPage.tsx` with components under
  `src/components/nexus/workbook/` (chapter rail, requirement row, conformity chips,
  CAPA prompt, plan drawer, readiness panel)
- Route added in `src/App.tsx`; Audit Detail gains the "Open Workbook" CTA.
- Row saves are optimistic and independent: row spinner, revert + toast on failure
  (same pattern as `QmsAssessmentPage`); the workbook never blocks on one failed save.

## 6. Error handling summary

- Per-row optimistic save with revert on failure; no global save button.
- Aggregate workbook fetch failure → full-page retry state.
- Export with incomplete assessment → explicit user choice, not an error.
- Scope untick never deletes assessment data; re-tick restores the chapter as it was.

## 7. Testing

- **Backend (Jest, existing infra):** integration tests for the workbook aggregate and
  readiness endpoint; unit tests for `nexusReadiness.js` percentage/rank math against
  hand-computed fixtures; export test asserting xlsx sheet structure (sheet names, scope
  rows, conformity cells).
- **Frontend:** no test infra exists; verify manually (chapter generation from scope,
  one-tap conformity, CAPA prompt, keyboard flow, export download).

## 8. Out of scope / explicitly deferred

- No changes to the Quality Test Entry (TestSession) acquisition workflow.
- No data-model migrations; no removal or rewrite of existing NEXUS pages.
- AI auto-assessment of conformity (could later suggest values from RAG evidence) is not
  part of this design.
