# 🎨 Frontend CQM Transformation Plan - Week 5

## Overview
This document outlines the comprehensive plan to transform the frontend from PMBOK Project Management to CQM (Card Quality Management) Tracking System.

---

## 📊 Current Frontend Structure Analysis

### Existing Components by Category

#### ✅ KEEP (Core Infrastructure)
- `components/Auth/` - Login, Register (keep, minimal changes)
- `components/Layout/` - Layout component (keep, update branding)
- `hooks/useAuth.ts` - Authentication hook (keep)
- `services/api.ts` - Base API service (keep, update base URL)
- `services/authService.ts` - Auth service (keep)
- `store/store.ts` - Redux store (keep, update slices)
- `theme.ts` - Theme configuration (keep, update colors/branding)

#### ❌ REMOVE (PMBOK-Specific)
**Components to Remove (10 folders):**
1. `components/Communications/` - Not needed for CQM
2. `components/Cost/` - Budget, EVM, Expenses (not core CQM)
3. `components/Integration/` - Charter, Change Requests, Stakeholders
4. `components/Quality/` - Old quality metrics (replaced by CQM)
5. `components/Risk/` - Risk management (replaced by Non-Conformities)
6. `components/Schedule/` - Gantt, Tasks, Milestones (replaced by Audits)
7. `components/Scope/` - WBS, Requirements (not needed)
8. `components/Resource/` - Resource allocation (may adapt later)
9. `components/Tasks/` - Personal tasks (separate feature, keep or remove)
10. `components/Dashboard/QuotesDashboardWidget.tsx` - Quote-specific

**Pages to Remove/Replace (5 pages):**
1. `pages/Projects.tsx` → Replace with `Facilities.tsx`
2. `pages/ProjectDetail.tsx` → Replace with `FacilityDetail.tsx`
3. `pages/MilestoneManagement.tsx` → Replace with `AuditManagement.tsx`
4. `pages/MyTasks.tsx` → Remove or keep as separate feature
5. Keep: `pages/Dashboard.tsx` (redesign), `pages/Quotes.tsx`, `pages/Clients.tsx`

**Services to Remove (9 services):**
1. `services/communication/` - Communication service
2. `services/cost/` - Budget, EVM, Expense services
3. `services/integration/` - Charter, Change Request, Stakeholder services
4. `services/quality/` - Old quality metric services
5. `services/risk/` - Risk service
6. `services/schedule/` - Task, Milestone services
7. `services/resource/` - Resource service
8. `services/reporting/` - Old reporting (will be replaced)
9. `services/projectService.ts` - Project service

**Redux Slices to Remove (7 slices):**
1. `store/slices/costSlice.ts`
2. `store/slices/integrationSlice.ts`
3. `store/slices/projectSlice.ts`
4. `store/slices/qualitySlice.ts`
5. `store/slices/resourceSlice.ts`
6. `store/slices/riskSlice.ts`
7. `store/slices/scheduleSlice.ts`

**Types to Remove (3 type files):**
1. `types/cost.types.ts`
2. `types/integration.types.ts`
3. `types/schedule.types.ts`

---

## 🎯 New CQM Frontend Structure

### New Components to Create

#### 1. CQM Core Components
```
src/components/CQM/
├── Facilities/
│   ├── FacilityList.tsx
│   ├── FacilityCard.tsx
│   ├── FacilityForm.tsx
│   ├── CQMLabelDisplay.tsx
│   └── CertificationStatus.tsx
├── TestDefinitions/
│   ├── TestDefinitionList.tsx
│   ├── TestDefinitionForm.tsx
│   ├── TestCategoryFilter.tsx
│   └── ISOStandardBadge.tsx
├── TestResults/
│   ├── TestResultList.tsx
│   ├── TestResultForm.tsx
│   ├── TestResultChart.tsx
│   ├── TestTrends.tsx
│   └── BatchTestSummary.tsx
├── Audits/
│   ├── AuditList.tsx
│   ├── AuditScheduler.tsx
│   ├── AuditCalendar.tsx
│   ├── AuditReport.tsx
│   └── UpcomingAudits.tsx
├── NonConformities/
│   ├── NCList.tsx
│   ├── NCForm.tsx
│   ├── NCDashboard.tsx
│   ├── NCSeverityBadge.tsx
│   └── NCStatistics.tsx
├── CAPA/
│   ├── CAPAList.tsx
│   ├── CAPAForm.tsx
│   ├── CAPATracker.tsx
│   ├── CAPAProgressBar.tsx
│   └── CAPAEffectivenessVerification.tsx
├── CardBatches/
│   ├── BatchList.tsx
│   ├── BatchForm.tsx
│   ├── BatchQCStatus.tsx
│   ├── BatchYieldChart.tsx
│   └── BatchTraceability.tsx
└── Dashboard/
    ├── CQMDashboard.tsx
    ├── ComplianceWidget.tsx
    ├── AuditWidget.tsx
    ├── NCWidget.tsx
    ├── TestResultsWidget.tsx
    └── CertificationWidget.tsx
```

#### 2. Shared/Common Components
```
src/components/Common/
├── DataTable.tsx (reusable table)
├── FilterPanel.tsx (advanced filtering)
├── SearchBar.tsx (search functionality)
├── StatusBadge.tsx (status indicators)
├── DateRangePicker.tsx (date filtering)
├── ExportButton.tsx (data export)
├── LoadingSpinner.tsx (loading states)
└── ErrorBoundary.tsx (error handling)
```

### New Services to Create

```
src/services/cqm/
├── facilityService.ts (Manufacturing Facilities)
├── testDefinitionService.ts (Test Definitions)
├── testResultService.ts (Test Results)
├── auditService.ts (Audits)
├── nonConformityService.ts (Non-Conformities)
├── capaService.ts (CAPA Actions)
├── cardBatchService.ts (Card Batches)
└── dashboardService.ts (CQM Dashboard data)
```

### New Redux Slices to Create

```
src/store/slices/cqm/
├── facilitySlice.ts
├── testDefinitionSlice.ts
├── testResultSlice.ts
├── auditSlice.ts
├── nonConformitySlice.ts
├── capaSlice.ts
├── cardBatchSlice.ts
└── cqmDashboardSlice.ts
```

### New Types to Create

```
src/types/cqm/
├── facility.types.ts
├── testDefinition.types.ts
├── testResult.types.ts
├── audit.types.ts
├── nonConformity.types.ts
├── capa.types.ts
├── cardBatch.types.ts
└── common.types.ts
```

### New Pages to Create

```
src/pages/cqm/
├── Facilities.tsx (Manufacturing Facilities list)
├── FacilityDetail.tsx (Facility details)
├── TestDefinitions.tsx (Test management)
├── TestResults.tsx (Test results)
├── Audits.tsx (Audit management)
├── NonConformities.tsx (NC tracking)
├── CAPAActions.tsx (CAPA management)
├── CardBatches.tsx (Batch tracking)
├── CQMDashboard.tsx (Main CQM dashboard)
└── Compliance.tsx (Compliance overview)
```

---

## 🚀 Week 5 Implementation Plan

### Phase 1: Cleanup & Preparation (Day 1)
- [ ] Create frontend audit document
- [ ] Remove obsolete PMBOK components
- [ ] Remove obsolete services
- [ ] Remove obsolete Redux slices
- [ ] Remove obsolete types
- [ ] Clean up unused imports

### Phase 2: Branding & Navigation (Day 1-2)
- [ ] Update app title and meta tags
- [ ] Update theme colors for CQM branding
- [ ] Create new navigation structure
- [ ] Update Layout component with CQM menu
- [ ] Update logo and branding assets

### Phase 3: Type Definitions (Day 2)
- [ ] Create CQM type definitions
- [ ] Create common types
- [ ] Create API response types
- [ ] Export all types from index

### Phase 4: Services & API Integration (Day 2-3)
- [ ] Create facility service
- [ ] Create test definition service
- [ ] Create test result service
- [ ] Create audit service
- [ ] Create non-conformity service
- [ ] Create CAPA service
- [ ] Create card batch service
- [ ] Update base API configuration

### Phase 5: Redux State Management (Day 3-4)
- [ ] Create facility slice
- [ ] Create test definition slice
- [ ] Create test result slice
- [ ] Create audit slice
- [ ] Create non-conformity slice
- [ ] Create CAPA slice
- [ ] Create card batch slice
- [ ] Update store configuration

### Phase 6: Core Components (Day 4-5)
- [ ] Create facility components
- [ ] Create test definition components
- [ ] Create test result components
- [ ] Create audit components
- [ ] Create common/shared components

### Phase 7: Dashboard (Day 5-6)
- [ ] Create CQM dashboard layout
- [ ] Create dashboard widgets
- [ ] Integrate with backend APIs
- [ ] Add charts and visualizations

### Phase 8: Routing & Integration (Day 6-7)
- [ ] Update routing configuration
- [ ] Create new pages
- [ ] Connect components to Redux
- [ ] Test navigation flow

---

## 📋 Detailed Cleanup Checklist

### Components to Remove: 40+ files
- [ ] Communications/ (3 files)
- [ ] Cost/ (6 files)
- [ ] Integration/ (5 files)
- [ ] Quality/ (4 files)
- [ ] Risk/ (4 files)
- [ ] Schedule/ (4 files)
- [ ] Scope/ (6 files)
- [ ] Resource/ (3 files)
- [ ] Tasks/ (5 files)
- [ ] Documents/ (some files)
- [ ] Dashboard/QuotesDashboardWidget.tsx

### Services to Remove: 15+ files
- [ ] communication/
- [ ] cost/ (3 files)
- [ ] integration/ (4 files)
- [ ] quality/ (3 files)
- [ ] risk/
- [ ] schedule/ (2 files)
- [ ] resource/
- [ ] reporting/
- [ ] projectService.ts

### Redux Slices to Remove: 7 files
- [ ] costSlice.ts
- [ ] integrationSlice.ts
- [ ] projectSlice.ts
- [ ] qualitySlice.ts
- [ ] resourceSlice.ts
- [ ] riskSlice.ts
- [ ] scheduleSlice.ts

### Types to Remove: 3 files
- [ ] cost.types.ts
- [ ] integration.types.ts
- [ ] schedule.types.ts

### Pages to Remove/Replace: 3 files
- [ ] Projects.tsx
- [ ] ProjectDetail.tsx
- [ ] MilestoneManagement.tsx

---

## 🎨 Branding Updates

### Text Changes
- "Project Management" → "Card Quality Management"
- "Projects" → "Manufacturing Facilities"
- "Tasks" → "Test Results"
- "Milestones" → "Audits"
- "Risks" → "Non-Conformities"
- "Change Requests" → "CAPA Actions"
- "Quality Metrics" → "Test Definitions"

### Color Scheme (CQM Brand)
```css
Primary: #1976d2 → #0d47a1 (Darker blue for trust/quality)
Secondary: #dc004e → #f57c00 (Orange for attention/alerts)
Success: #4caf50 (Keep - quality passed)
Warning: #ff9800 (Keep - attention needed)
Error: #f44336 (Keep - non-conformities)
Info: #2196f3 (Keep - informational)
```

### Navigation Structure
```
CQM Tracking System
├── Dashboard (CQM Overview)
├── Facilities (Manufacturing Facilities)
├── Test Management
│   ├── Test Definitions
│   └── Test Results
├── Quality Management
│   ├── Audits
│   ├── Non-Conformities
│   └── CAPA Actions
├── Production
│   └── Card Batches
├── Compliance
│   ├── ISO Standards
│   └── Certifications
└── Reports
    ├── Audit Reports
    ├── Test Reports
    └── Compliance Reports
```

---

## 📊 Expected Results

### Files Removed
- **Components:** ~40 files
- **Services:** ~15 files
- **Redux Slices:** 7 files
- **Types:** 3 files
- **Pages:** 3 files
- **Total:** ~70 files removed

### Files Created
- **Components:** ~45 new CQM components
- **Services:** 8 new CQM services
- **Redux Slices:** 8 new slices
- **Types:** 8 new type files
- **Pages:** 10 new pages
- **Total:** ~80 new files

### Lines of Code
- **Removed:** ~10,000 lines
- **Added:** ~8,000 lines
- **Net:** Cleaner, more focused codebase

---

## ✅ Success Criteria

- [ ] All PMBOK components removed
- [ ] All CQM components created and functional
- [ ] Navigation updated to CQM structure
- [ ] All services connected to backend APIs
- [ ] Redux state management working
- [ ] Dashboard displaying CQM data
- [ ] No console errors
- [ ] TypeScript compilation successful
- [ ] All pages accessible and functional

---

## 🔄 Migration Strategy

### Incremental Approach
1. **Week 5:** Core infrastructure, cleanup, basic components
2. **Week 6:** Advanced components, charts, forms
3. **Week 7:** Polish, testing, bug fixes

### Testing Strategy
- Test each component individually
- Test API integration for each service
- Test complete workflows (Facility → Batch → Test → NC → CAPA)
- Cross-browser testing
- Responsive design testing

---

**Status:** 📋 Planned  
**Estimated Completion:** End of Week 5  
**Risk Level:** Medium (significant refactoring)

