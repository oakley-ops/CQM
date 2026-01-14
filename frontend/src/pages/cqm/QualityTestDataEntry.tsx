import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Alert,
  Stepper,
  Step,
  StepButton,
  Divider,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';

import { AppDispatch, RootState } from '../../store/store';
import {
  fetchCategories,
  fetchDefinitionsByCategory,
  createSession,
  bulkSaveEntries,
  submitSession,
  setSelectedCategory,
  clearFormState,
  initFormState,
  updateCategoryFormState,
} from '../../store/slices/cqm/testEntrySlice';
import { CategorySelector, TestEntryDialog } from '../../components/CQM/Forms';
import { TestCategory, TestEntryFormData, CategoryFormState } from '../../types/cqm';

const CARD_TYPES = ['ICM', 'CB', 'ICC', 'PICC'];
const MANUFACTURING_STAGES = [
  'Module Manufacturer',
  'Card Body Fabrication',
  'Card Embedder',
  'Card Laminator',
  'Personalized',
];

const steps = ['Session Info', 'Select Categories', 'Enter Tests', 'Review & Submit'];

const QualityTestDataEntry: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    categories,
    selectedCategory,
    definitions,
    currentSession,
    loading,
    error,
    formState,
  } = useSelector((state: RootState) => state.testEntry);

  const [activeStep, setActiveStep] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [sessionForm, setSessionForm] = useState({
    cardType: '',
    manufacturingStage: '',
    batchLotNumber: '',
    testDate: new Date().toISOString().split('T')[0],
    cardSerialNumber: '',
    equipmentId: '',
    generalNotes: '',
  });

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchCategories({ activeOnly: true }));
  }, [dispatch]);

  // Fetch categories for selected card type
  useEffect(() => {
    if (sessionForm.cardType) {
      dispatch(fetchCategories({ cardType: sessionForm.cardType, activeOnly: true }));
    }
  }, [sessionForm.cardType, dispatch]);

  const handleSessionFormChange = (field: string, value: string) => {
    setSessionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (category: TestCategory) => {
    dispatch(setSelectedCategory(category));
    dispatch(fetchDefinitionsByCategory(category.id));
    setDialogOpen(true);
  };

  const handleSaveTests = async (entries: TestEntryFormData[]) => {
    if (!selectedCategory) return;

    // Update local form state
    const categoryState: CategoryFormState = {
      categoryId: selectedCategory.id,
      categoryCode: selectedCategory.category_code,
      categoryName: selectedCategory.category_name,
      entries,
      isComplete: entries.every((e) => e.isValid),
    };
    dispatch(updateCategoryFormState(categoryState));
    setDialogOpen(false);
    setSnackbar({
      open: true,
      message: `Tests for ${selectedCategory.category_name} saved locally`,
      severity: 'success',
    });
  };

  const handleCreateSession = async () => {
    if (!sessionForm.cardType || !sessionForm.manufacturingStage || !sessionForm.batchLotNumber) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    dispatch(initFormState({
      cardType: sessionForm.cardType,
      manufacturingStage: sessionForm.manufacturingStage,
      batchLotNumber: sessionForm.batchLotNumber,
      cardSerialNumber: sessionForm.cardSerialNumber || undefined,
      testDate: sessionForm.testDate,
      equipmentId: sessionForm.equipmentId || undefined,
      generalNotes: sessionForm.generalNotes || undefined,
    }));
    setActiveStep(1);
  };

  const handleSaveDraft = async () => {
    try {
      // Create session if not exists
      let session = currentSession;
      if (!session) {
        const result = await dispatch(createSession({
          cardType: sessionForm.cardType,
          manufacturingStage: sessionForm.manufacturingStage,
          batchLotNumber: sessionForm.batchLotNumber,
          cardSerialNumber: sessionForm.cardSerialNumber || undefined,
          testDate: sessionForm.testDate,
          equipmentId: sessionForm.equipmentId || undefined,
          generalNotes: sessionForm.generalNotes || undefined,
        })).unwrap();
        session = result;
      }

      // Save all entries
      const allEntries = formState.categoryStates.flatMap((cs) =>
        cs.entries.map((e) => ({
          testDefinitionId: e.testDefinitionId,
          measurementValue: typeof e.measurementValue === 'number' ? e.measurementValue : undefined,
          assessmentValue: e.assessmentValue,
          passStatus: e.passStatus,
          notes: e.notes,
          retestRequired: e.retestRequired,
        }))
      );

      if (allEntries.length > 0 && session) {
        await dispatch(bulkSaveEntries({
          sessionId: session.id,
          entries: allEntries,
        })).unwrap();
      }

      setSnackbar({
        open: true,
        message: 'Draft saved successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save draft',
        severity: 'error',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      await handleSaveDraft();

      if (currentSession) {
        await dispatch(submitSession(currentSession.id)).unwrap();
        setSnackbar({
          open: true,
          message: 'Test session submitted successfully',
          severity: 'success',
        });
        // Reset form
        dispatch(clearFormState());
        setSessionForm({
          cardType: '',
          manufacturingStage: '',
          batchLotNumber: '',
          testDate: new Date().toISOString().split('T')[0],
          cardSerialNumber: '',
          equipmentId: '',
          generalNotes: '',
        });
        setActiveStep(0);
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to submit session',
        severity: 'error',
      });
    }
  };

  const completedCategories = formState.categoryStates
    .filter((cs) => cs.isComplete)
    .map((cs) => cs.categoryId);

  const totalTests = formState.categoryStates.reduce(
    (acc, cs) => acc + cs.entries.length,
    0
  );

  const passedTests = formState.categoryStates.reduce(
    (acc, cs) => acc + cs.entries.filter((e) => e.passStatus === true).length,
    0
  );

  const failedTests = formState.categoryStates.reduce(
    (acc, cs) => acc + cs.entries.filter((e) => e.passStatus === false).length,
    0
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Session Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Card Type</InputLabel>
                    <Select
                      value={sessionForm.cardType}
                      onChange={(e) => handleSessionFormChange('cardType', e.target.value)}
                      label="Card Type"
                    >
                      {CARD_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Manufacturing Stage</InputLabel>
                    <Select
                      value={sessionForm.manufacturingStage}
                      onChange={(e) => handleSessionFormChange('manufacturingStage', e.target.value)}
                      label="Manufacturing Stage"
                    >
                      {MANUFACTURING_STAGES.map((stage) => (
                        <MenuItem key={stage} value={stage}>
                          {stage}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Batch/Lot Number"
                    required
                    value={sessionForm.batchLotNumber}
                    onChange={(e) => handleSessionFormChange('batchLotNumber', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Test Date"
                    required
                    value={sessionForm.testDate}
                    onChange={(e) => handleSessionFormChange('testDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Card Serial Number"
                    value={sessionForm.cardSerialNumber}
                    onChange={(e) => handleSessionFormChange('cardSerialNumber', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Equipment ID"
                    value={sessionForm.equipmentId}
                    onChange={(e) => handleSessionFormChange('equipmentId', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="General Notes"
                    multiline
                    rows={2}
                    value={sessionForm.generalNotes}
                    onChange={(e) => handleSessionFormChange('generalNotes', e.target.value)}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  endIcon={<NextIcon />}
                  onClick={handleCreateSession}
                  disabled={!sessionForm.cardType || !sessionForm.manufacturingStage || !sessionForm.batchLotNumber}
                >
                  Continue
                </Button>
              </Box>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Test Categories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Click on a category to enter tests. Categories shown are based on your selected card type.
            </Typography>
            <CategorySelector
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
              loading={loading.categories}
              completedCategories={completedCategories}
            />
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => setActiveStep(0)}
              >
                Back
              </Button>
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={() => setActiveStep(2)}
                disabled={formState.categoryStates.length === 0}
              >
                Continue to Review
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Review Test Results
              </Typography>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={700}>
                        {totalTests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Tests
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={700} color="success.main">
                        {passedTests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Passed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={700} color="error.main">
                        {failedTests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Failed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Categories Completed
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {formState.categoryStates.map((cs) => (
                  <Box
                    key={cs.categoryId}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: cs.isComplete ? 'success.main' : 'warning.main',
                      borderRadius: 1,
                      backgroundColor: cs.isComplete ? 'success.lighter' : 'warning.lighter',
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {cs.categoryName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cs.entries.filter((e) => e.isValid).length}/{cs.entries.length} tests
                    </Typography>
                  </Box>
                ))}
              </Box>

              {formState.categoryStates.length === 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No tests have been entered. Please go back and enter tests for at least one category.
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  startIcon={<BackIcon />}
                  onClick={() => setActiveStep(1)}
                >
                  Back to Categories
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={loading.saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={loading.saving || formState.categoryStates.length === 0}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={loading.saving ? <CircularProgress size={20} /> : <SendIcon />}
                    onClick={handleSubmit}
                    disabled={loading.saving || formState.categoryStates.length === 0}
                  >
                    Submit Final
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Card Quality Test Data Entry
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepButton onClick={() => setActiveStep(index)} disabled={index > 0 && !formState.sessionData}>
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}

      {selectedCategory && (
        <TestEntryDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          category={selectedCategory}
          definitions={definitions}
          initialEntries={
            formState.categoryStates.find((cs) => cs.categoryId === selectedCategory.id)?.entries
          }
          onSave={handleSaveTests}
          loading={loading.saving}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QualityTestDataEntry;
