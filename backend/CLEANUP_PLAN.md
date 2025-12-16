# 🧹 Week 4 Cleanup Plan: PMBOK to CQM Migration

## Overview
This document outlines the cleanup of old PMBOK (Project Management) routes and controllers that have been replaced by new CQM (Card Quality Management) equivalents.

## Files to Remove (8 pairs = 16 files)

### 1. Projects → Manufacturing Facilities
- ❌ **Remove:** `routes/projects.js`
- ❌ **Remove:** `controllers/projectController.js`
- ✅ **Replaced by:** `routes/facilities.js` + `controllers/facilityController.js`
- **Reason:** Projects concept replaced by Manufacturing Facilities

### 2. Tasks → Test Results
- ❌ **Remove:** `routes/tasks.js`
- ❌ **Remove:** `controllers/taskController.js`
- ✅ **Replaced by:** `routes/testResults.js` + `controllers/testResultController.js`
- **Reason:** Task tracking replaced by Test Result recording

### 3. Milestones → Audits
- ❌ **Remove:** `routes/milestones.js`
- ❌ **Remove:** `controllers/milestoneController.js`
- ✅ **Replaced by:** `routes/audits.js` + `controllers/auditController.js`
- **Reason:** Project milestones replaced by Audit scheduling

### 4. Risks → Non-Conformities
- ❌ **Remove:** `routes/risks.js`
- ❌ **Remove:** `controllers/riskController.js`
- ✅ **Replaced by:** `routes/nonConformities.js` + `controllers/nonConformityController.js`
- **Reason:** Risk management replaced by Non-Conformity tracking

### 5. Change Requests → CAPA Actions
- ❌ **Remove:** `routes/changeRequests.js`
- ❌ **Remove:** `controllers/changeRequestController.js`
- ✅ **Replaced by:** `routes/capaActions.js` + `controllers/capaActionController.js`
- **Reason:** Change requests replaced by Corrective & Preventive Actions

### 6. Quality Metrics → ISO Compliance (Future)
- ❌ **Remove:** `routes/qualityMetrics.js`
- ❌ **Remove:** `controllers/qualityMetricController.js`
- ✅ **Replaced by:** ISO Compliance Records (to be implemented)
- **Reason:** Generic quality metrics replaced by ISO compliance tracking

### 7. Charter → QMS Documents (Future)
- ❌ **Remove:** `routes/charter.js`
- ❌ **Remove:** `controllers/charterController.js`
- ✅ **Replaced by:** QMS Document management (to be implemented)
- **Reason:** Project charter replaced by QMS documentation

### 8. Documents → QMS Documents (Future)
- ❌ **Remove:** `routes/documents.js`
- ❌ **Remove:** `controllers/documentController.js`
- ✅ **Replaced by:** QMS Document management (to be implemented)
- **Reason:** Generic documents replaced by QMS-specific document control

## Files to Keep (May be Adapted)

### Quote Management (Separate Feature)
- ✅ **Keep:** `routes/quotes.js` + `controllers/quoteController.js`
- ✅ **Keep:** `routes/clients.js` + `controllers/clientController.js`
- ✅ **Keep:** `routes/quoteMilestones.js` + `controllers/quoteMilestoneController.js`
- ✅ **Keep:** `controllers/quoteActionController.js`
- **Reason:** Separate business feature, not replaced by CQM

### Personal Task Management (Separate Feature)
- ✅ **Keep:** `routes/personalTasks.js` + `controllers/personalTaskController.js`
- ✅ **Keep:** `controllers/personalTaskExportController.js`
- **Reason:** Separate utility feature for personal productivity

### Financial Management (May Adapt for CQM)
- ⚠️ **Review:** `routes/budgets.js` + `controllers/budgetController.js`
- ⚠️ **Review:** `routes/expenses.js` + `controllers/expenseController.js`
- ⚠️ **Review:** `routes/evm.js` + `controllers/evmController.js`
- **Reason:** May be useful for CQM cost tracking, compliance costs, audit expenses

### Quality-Related (Can Integrate with CQM)
- ⚠️ **Review:** `routes/defects.js` + `controllers/defectController.js`
- ⚠️ **Review:** `routes/inspections.js` + `controllers/inspectionController.js`
- **Reason:** Can be integrated with CQM test results and non-conformities

### Organizational Management (Can Adapt)
- ⚠️ **Review:** `routes/lessonsLearned.js` + `controllers/lessonLearnedController.js`
- ⚠️ **Review:** `routes/stakeholders.js` + `controllers/stakeholderController.js`
- ⚠️ **Review:** `routes/resources.js` + `controllers/resourceController.js`
- ⚠️ **Review:** `routes/communications.js` + `controllers/communicationController.js`
- ⚠️ **Review:** `routes/scope.js` + `controllers/scopeController.js`
- **Reason:** Can be adapted for CQM personnel, auditors, suppliers, communications

### Core Utilities (Keep)
- ✅ **Keep:** `routes/auth.js` + `controllers/authController.js`
- ✅ **Keep:** `routes/dashboard.js` + `controllers/dashboardController.js`
- ✅ **Keep:** `routes/reports.js` + `controllers/reportingController.js`
- ✅ **Keep:** `routes/export.js` + `controllers/exportController.js`
- ✅ **Keep:** `routes/excelExport.js` + `controllers/excelExportController.js`
- ✅ **Keep:** `routes/email.js` + `controllers/emailController.js`
- **Reason:** Core infrastructure and utilities

## Server.js Route Cleanup

### Routes to Remove from server.js:
```javascript
// Remove these PMBOK route registrations:
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:id/charter', charterRoutes);
app.use('/api/projects/:id/tasks', taskRoutes);
app.use('/api/projects/:id/milestones', milestoneRoutes);
app.use('/api/projects/:id/risks', riskRoutes);
app.use('/api/projects/:id/change-requests', changeRequestRoutes);
app.use('/api/projects/:id/quality-metrics', qualityMetricRoutes);
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/risks', require('./routes/risks'));
app.use('/api/change-requests', require('./routes/changeRequests'));
app.use('/api/quality-metrics', require('./routes/qualityMetrics'));
app.use('/api', documentRoutes);
```

### Route Imports to Remove from server.js:
```javascript
const projectRoutes = require('./routes/projects');
const charterRoutes = require('./routes/charter');
const changeRequestRoutes = require('./routes/changeRequests');
const taskRoutes = require('./routes/tasks');
const milestoneRoutes = require('./routes/milestones');
const qualityMetricRoutes = require('./routes/qualityMetrics');
const riskRoutes = require('./routes/risks');
const documentRoutes = require('./routes/documents');
```

## Model References to Update

### Models that may have dependencies:
- Check `Stakeholder` model (may still be useful for CQM contacts)
- Check `LessonLearned` model (may be useful for audit learnings)
- Check `Budget`, `Expense` models (may be useful for compliance costs)
- Check `Defect`, `Inspection` models (may integrate with test results)

## Cleanup Steps

1. ✅ Create backup of current state
2. ✅ Document all files to remove
3. ✅ Remove route files (8 files)
4. ✅ Remove controller files (8 files)
5. ✅ Update server.js imports
6. ✅ Update server.js route registrations
7. ✅ Test server starts successfully
8. ✅ Verify no broken imports
9. ✅ Git commit cleanup

## Expected Results

### Files Removed: 16 total
- 8 route files
- 8 controller files

### Lines of Code Removed: ~8,000 lines
- Estimated cleanup of obsolete PMBOK code

### Server.js Simplified:
- 8 fewer route imports
- 15 fewer route registrations
- Cleaner, CQM-focused structure

## Post-Cleanup Validation

- [ ] Server starts without errors
- [ ] No import errors in console
- [ ] CQM routes still functional
- [ ] Swagger documentation loads
- [ ] Database connections work
- [ ] Authentication still works

## Future Considerations

### Files Marked for Review (12 pairs):
These files are kept for now but should be reviewed for CQM integration or removal in future weeks:
- Budget/Expense management
- Defect/Inspection tracking
- Stakeholder/Resource management
- Communications/Scope management
- Lessons Learned

### New Files to Create (Future):
- ISO Compliance routes/controller
- QMS Document routes/controller
- Supplier Management routes/controller
- Component Tracking routes/controller

---

**Cleanup Status:** 📋 Planned  
**Estimated Time:** 30 minutes  
**Risk Level:** Low (files have CQM replacements)  
**Rollback Plan:** Git revert if needed

