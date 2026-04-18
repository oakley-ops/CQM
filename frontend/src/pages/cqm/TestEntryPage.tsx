import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
} from '@mui/icons-material';

import { AppDispatch, RootState } from '../../store/store';
import { updateCategoryFormState } from '../../store/slices/cqm/testEntrySlice';
import { getAllDefinitions, upsertEntryMetadata, launchSmartQC } from '../../services/cqm/testEntryService';
import {
  TestDefinition,
  TestEntryFormData,
  CardEntryData,
  AssessmentValue,
  CategoryFormState,
} from '../../types/cqm';

import WarpageForm from '../../components/CQM/Forms/WarpageForm';
import SolidityForm from '../../components/CQM/Forms/SolidityForm';
import CardEdgesForm from '../../components/CQM/Forms/CardEdgesForm';
import ResistanceChemicalsForm from '../../components/CQM/Forms/ResistanceChemicalsForm';
import PeelStrengthForm from '../../components/CQM/Forms/PeelStrengthForm';
import OverlayPeelForm from '../../components/CQM/Forms/OverlayPeelForm';
import CornerImpactForm from '../../components/CQM/Forms/CornerImpactForm';
import WidthHeightForm from '../../components/CQM/Forms/WidthHeightForm';
import QFactorForm from '../../components/CQM/Forms/QFactorForm';
import ReadingDistanceForm from '../../components/CQM/Forms/ReadingDistanceForm';
import DynamicTorsionalStressForm from '../../components/CQM/Forms/DynamicTorsionalStressForm';
import DynamicBendingStressForm from '../../components/CQM/Forms/DynamicBendingStressForm';
import IdentificationNotchForm from '../../components/CQM/Forms/IdentificationNotchForm';

const SPECIALIZED_FORM_CODES = new Set([
  '#3007#', 'IT-PHY-006',
  '#3021#',
  '#3006#',
  '#3046#',
  '#3008#',
  '#3015#',
  '#3018#', 'IT-CBY-002',
  '#3002#', 'IT-PHY-001',
  'IT-ELE-001', 'IT-ELE-002',
  '#3043#',
  '#3042#',
  '#3067#',
]);

const getEffectiveTestType = (def: TestDefinition): 'measurement' | 'passfail' | 'assessment' => {
  if (def.min_acceptable_value !== undefined || def.max_acceptable_value !== undefined || def.target_value !== undefined) {
    return 'measurement';
  }
  const t = (def.test_type || '').toLowerCase();
  if (t === 'measurement' || t === 'dimensional' || t === 'numeric') return 'measurement';
  if (t === 'assessment' || t === 'visual inspection' || t === 'visual') return 'assessment';
  return 'passfail';
};

const blankCardEntry = (cardNumber: number): CardEntryData => ({
  sampleCardId: 0,
  cardNumber,
  passStatus: undefined,
  notes: '',
  retestRequired: false,
  isValid: false,
});

const assessmentOptions: AssessmentValue[] = ['Excellent', 'Good', 'Acceptable', 'Poor'];

const catColors: Record<string, string> = {
  PHY: '#9c27b0', CBY: '#4caf50', 'ICC-REQ': '#ff9800', MCH: '#2196f3',
  ELE: '#f44336', ENV: '#00bcd4', MAG: '#795548', SMT: '#607d8b', EMV: '#f57c00',
};

const TestEntryPage: React.FC = () => {
  const { sessionId, definitionId } = useParams<{ sessionId: string; definitionId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const formState = useSelector((state: RootState) => state.testEntry.formState);
  const currentSession = useSelector((state: RootState) => state.testEntry.currentSession);

  const [def, setDef] = useState<TestDefinition | null>(null);
  const [entry, setEntry] = useState<TestEntryFormData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Load definition and pre-populate from existing formState
  useEffect(() => {
    if (!definitionId) return;
    const defId = parseInt(definitionId, 10);

    getAllDefinitions().then((defs) => {
      const found = defs.find(d => d.id === defId);
      if (!found) { setLoadError(true); return; }
      setDef(found);

      // Check if we already have an entry for this definition in the Redux store
      let existing: TestEntryFormData | undefined;
      for (const cs of formState.categoryStates) {
        existing = cs.entries.find(e => e.testDefinitionId === defId);
        if (existing) break;
      }

      const isPerCard = !!(found.test_frequency && found.test_frequency !== "not req'ed");

      setEntry(existing ?? {
        testDefinitionId: defId,
        testCode: found.test_id,
        testName: found.test_name,
        testType: getEffectiveTestType(found),
        testFrequency: found.test_frequency,
        isPerCard,
        sampleCount: isPerCard ? 1 : undefined,
        measurementValue: undefined,
        assessmentValue: undefined,
        passStatus: undefined,
        notes: '',
        retestRequired: false,
        isValid: false,
        cardEntries: isPerCard ? [blankCardEntry(1)] : undefined,
      });
    }).catch(() => setLoadError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionId]);

  // Accepts optional leading defId to match the specialized form component signature
  const updateEntry = (_defIdOrUpdates: number | Partial<TestEntryFormData>, maybeUpdates?: Partial<TestEntryFormData>) => {
    const updates = maybeUpdates ?? (_defIdOrUpdates as Partial<TestEntryFormData>);
    setEntry(prev => prev ? { ...prev, ...updates } : prev);
  };

  // Accepts optional leading defId to match the specialized form component signature
  const updateCardEntry = (_defIdOrCardNum: number, cardNumberOrUpdates: number | Partial<CardEntryData>, maybeUpdates?: Partial<CardEntryData>) => {
    let cardNumber: number;
    let updates: Partial<CardEntryData>;
    if (maybeUpdates !== undefined) {
      // Called as (defId, cardNumber, updates)
      cardNumber = cardNumberOrUpdates as number;
      updates = maybeUpdates;
    } else {
      // Called as (cardNumber, updates)
      cardNumber = _defIdOrCardNum;
      updates = cardNumberOrUpdates as Partial<CardEntryData>;
    }
    setEntry(prev => {
      if (!prev?.cardEntries) return prev;
      const updatedCards = prev.cardEntries.map(ce =>
        ce.cardNumber === cardNumber
          ? { ...ce, ...updates, isValid: updates.passStatus !== undefined || updates.measurementValue !== undefined || ce.isValid }
          : ce
      );
      return { ...prev, cardEntries: updatedCards };
    });
  };

  const handleSampleCountChange = (rawValue: string) => {
    const n = Math.max(1, parseInt(rawValue) || 1);
    setEntry(prev => {
      if (!prev) return prev;
      const existing = prev.cardEntries ?? [];
      const newCards = n > existing.length
        ? [...existing, ...Array.from({ length: n - existing.length }, (_, i) => blankCardEntry(existing.length + i + 1))]
        : existing.slice(0, n);
      return { ...prev, sampleCount: n, cardEntries: newCards };
    });
  };

  const handleSave = async () => {
    if (!def || !entry) return;
    setSaving(true);
    try {
      // Save specialized metadata if present
      const sid = sessionId ? parseInt(sessionId, 10) : currentSession?.id;
      if (sid && entry.specializedMetadata) {
        const { pdfPages: _p, ...extraDataWithoutImages } =
          (entry.specializedMetadata.extraData ?? {}) as Record<string, unknown>;
        await upsertEntryMetadata({
          sessionId: sid,
          testDefinitionId: def.id,
          metadata: {
            ...entry.specializedMetadata,
            extraData: Object.keys(extraDataWithoutImages).length > 0 ? extraDataWithoutImages : undefined,
          },
        });
      }

      // Merge into the correct CategoryFormState
      const catId = def.category_id;
      const catCode = def.category?.category_code ?? '';
      const catName = (def.category as { name?: string })?.name ?? catCode;

      const existing = formState.categoryStates.find(cs => cs.categoryId === catId);
      const otherEntries = existing?.entries.filter(e => e.testDefinitionId !== def.id) ?? [];
      const updatedEntry = { ...entry, isValid: isEntryValid(entry) };
      const allEntries = [...otherEntries, updatedEntry];

      const categoryState: CategoryFormState = {
        categoryId: catId,
        categoryCode: catCode,
        categoryName: catName,
        entries: allEntries,
        isComplete: allEntries.length > 0 && allEntries.every(e => e.isValid),
      };

      dispatch(updateCategoryFormState(categoryState));
      setSnackbar({ open: true, message: 'Test saved', severity: 'success' });

      // Navigate back after a brief pause so the user sees the success message
      setTimeout(() => {
        navigate(`/quality-test?sessionId=${sid}`);
      }, 600);
    } catch {
      setSnackbar({ open: true, message: 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isEntryValid = (e: TestEntryFormData): boolean => {
    if (e.isPerCard && e.cardEntries) {
      return e.cardEntries.length > 0 && e.cardEntries.every(ce => ce.isValid);
    }
    if (!def) return false;
    switch (getEffectiveTestType(def)) {
      case 'measurement': return e.measurementValue !== undefined && e.measurementValue !== '';
      case 'passfail': return e.passStatus !== undefined;
      case 'assessment': return e.assessmentValue !== undefined;
      default: return false;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Test definition not found.</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
      </Box>
    );
  }

  if (!def || !entry) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  const catCode = def.category?.category_code ?? '';
  const color = catColors[catCode] ?? '#757575';
  const effectiveType = getEffectiveTestType(def);
  const isSpecialized = SPECIALIZED_FORM_CODES.has(def.test_id);

  const renderForm = () => {
    if (isSpecialized) {
      const sharedProps = { def, entry, onUpdateEntry: updateEntry, onUpdateCardEntry: updateCardEntry };
      if (def.test_id === '#3007#' || def.test_id === 'IT-PHY-006') return <WarpageForm {...sharedProps} />;
      if (def.test_id === '#3021#') return <SolidityForm {...sharedProps} />;
      if (def.test_id === '#3006#') return <CardEdgesForm {...sharedProps} />;
      if (def.test_id === '#3046#') return <ResistanceChemicalsForm {...sharedProps} />;
      if (def.test_id === '#3008#') return <PeelStrengthForm {...sharedProps} sessionId={sessionId ? parseInt(sessionId, 10) : currentSession?.id} />;
      if (def.test_id === '#3015#') return <OverlayPeelForm {...sharedProps} sessionId={sessionId ? parseInt(sessionId, 10) : currentSession?.id} />;
      if (def.test_id === '#3018#' || def.test_id === 'IT-CBY-002') return <CornerImpactForm {...sharedProps} />;
      if (def.test_id === '#3002#' || def.test_id === 'IT-PHY-001') return <WidthHeightForm {...sharedProps} />;
      if (def.test_id === 'IT-ELE-001') return <QFactorForm {...sharedProps} sessionId={sessionId ? parseInt(sessionId, 10) : currentSession?.id} />;
      if (def.test_id === 'IT-ELE-002') return <ReadingDistanceForm {...sharedProps} sessionId={sessionId ? parseInt(sessionId, 10) : currentSession?.id} />;
      if (def.test_id === '#3043#') return <DynamicTorsionalStressForm {...sharedProps} />;
      if (def.test_id === '#3042#') return <DynamicBendingStressForm {...sharedProps} />;
      if (def.test_id === '#3067#') return <IdentificationNotchForm {...sharedProps} />;
    }

    if (entry.isPerCard) {
      const cards = entry.cardEntries ?? [];
      const isMeasurement = effectiveType === 'measurement';
      const hasMin = def.min_acceptable_value !== undefined && def.min_acceptable_value !== null;
      const hasMax = def.max_acceptable_value !== undefined && def.max_acceptable_value !== null;

      return (
        <Box>
          {/* Acceptance criteria banner */}
          {isMeasurement && (hasMin || hasMax) && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.light', borderRadius: 1 }}>
              {def.pass_criteria && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Acceptance:</strong> {def.pass_criteria}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Range: {hasMin ? def.min_acceptable_value : '—'} – {hasMax ? def.max_acceptable_value : '—'} {def.unit_of_measurement ?? ''}
                {def.target_value != null ? ` | Target: ${def.target_value} ${def.unit_of_measurement ?? ''}` : ''}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              label="# of Samples Tested"
              type="number"
              size="small"
              value={entry.sampleCount ?? 1}
              onChange={e => handleSampleCountChange(e.target.value)}
              inputProps={{ min: 1, max: 50 }}
              sx={{ width: 180 }}
            />
            {def.test_frequency && (
              <Typography variant="caption" color="text.secondary">Frequency: {def.test_frequency}</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {cards.map(ce => {
              const borderColor = ce.passStatus === true ? 'success.light'
                : ce.passStatus === false ? 'error.light'
                : 'divider';
              return (
                <Card key={ce.cardNumber} variant="outlined" sx={{
                  borderColor,
                  bgcolor: ce.passStatus === false ? 'error.50' : 'transparent',
                }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 64 }}>
                        Card {ce.cardNumber}
                      </Typography>

                      {isMeasurement ? (
                        <>
                          <TextField
                            label={`Value${def.unit_of_measurement ? ` (${def.unit_of_measurement})` : ''}`}
                            type="number"
                            size="small"
                            value={ce.measurementValue ?? ''}
                            onChange={e => {
                              const raw = e.target.value;
                              const val = raw === '' ? undefined : parseFloat(raw);
                              let pass: boolean | undefined;
                              if (val !== undefined) {
                                const ok = (hasMin ? val >= (def.min_acceptable_value as number) : true)
                                        && (hasMax ? val <= (def.max_acceptable_value as number) : true);
                                pass = ok;
                              }
                              updateCardEntry(ce.cardNumber, { measurementValue: val, passStatus: pass });
                            }}
                            inputProps={{ step: 'any' }}
                            sx={{ width: 160 }}
                          />
                          {/* Pass/fail shown alongside — auto-set but manually overridable */}
                          <RadioGroup
                            row
                            value={ce.passStatus === undefined ? '' : ce.passStatus ? 'pass' : 'fail'}
                            onChange={e => updateCardEntry(ce.cardNumber, { passStatus: e.target.value === 'pass' })}
                          >
                            <FormControlLabel value="pass" control={<Radio color="success" size="small" />}
                              label={<Typography variant="body2" color="success.main">Pass</Typography>} />
                            <FormControlLabel value="fail" control={<Radio color="error" size="small" />}
                              label={<Typography variant="body2" color="error.main">Fail</Typography>} />
                          </RadioGroup>
                        </>
                      ) : (
                        <RadioGroup
                          row
                          value={ce.passStatus === undefined ? '' : ce.passStatus ? 'pass' : 'fail'}
                          onChange={e => updateCardEntry(ce.cardNumber, { passStatus: e.target.value === 'pass' })}
                        >
                          <FormControlLabel value="pass" control={<Radio color="success" size="small" />}
                            label={<Typography variant="body2" color="success.main">Pass</Typography>} />
                          <FormControlLabel value="fail" control={<Radio color="error" size="small" />}
                            label={<Typography variant="body2" color="error.main">Fail</Typography>} />
                        </RadioGroup>
                      )}

                      <TextField
                        placeholder="Notes"
                        value={ce.notes || ''}
                        onChange={e => updateCardEntry(ce.cardNumber, { notes: e.target.value })}
                        size="small"
                        sx={{ flex: 1, minWidth: 200 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      );
    }

    // Generic session-level test
    if (effectiveType === 'measurement') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(def.pass_criteria || def.equipment_required || def.test_conditions) && (
            <Box sx={{ p: 2, backgroundColor: 'info.lighter', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
              {def.pass_criteria && <Typography variant="body2"><strong>Acceptance:</strong> {def.pass_criteria}</Typography>}
              {def.equipment_required && <Typography variant="body2"><strong>Equipment:</strong> {def.equipment_required}</Typography>}
              {def.test_conditions && <Typography variant="body2"><strong>Conditions:</strong> {def.test_conditions}</Typography>}
            </Box>
          )}
          <TextField
            label={`Value${def.unit_of_measurement ? ` (${def.unit_of_measurement})` : ''}`}
            type="number"
            value={entry.measurementValue ?? ''}
            onChange={e => {
              const raw = e.target.value;
              const val = raw === '' ? undefined : parseFloat(raw);
              const hasMin = def.min_acceptable_value !== undefined && def.min_acceptable_value !== null;
              const hasMax = def.max_acceptable_value !== undefined && def.max_acceptable_value !== null;
              let pass: boolean | undefined;
              if (val !== undefined && (hasMin || hasMax)) {
                pass = (hasMin ? val >= (def.min_acceptable_value as number) : true)
                     && (hasMax ? val <= (def.max_acceptable_value as number) : true);
              }
              updateEntry({ measurementValue: val, passStatus: pass });
            }}
            size="small"
            sx={{ maxWidth: 300 }}
            helperText={
              def.min_acceptable_value !== undefined && def.max_acceptable_value !== undefined
                ? `Range: ${def.min_acceptable_value} – ${def.max_acceptable_value} ${def.unit_of_measurement ?? ''}${def.target_value != null ? ` | Target: ${def.target_value}` : ''}`
                : def.target_value ? `Target: ${def.target_value}` : undefined
            }
          />
          <RadioGroup
            row
            value={entry.passStatus === undefined ? '' : entry.passStatus ? 'pass' : 'fail'}
            onChange={e => updateEntry({ passStatus: e.target.value === 'pass' })}
          >
            <FormControlLabel value="pass" control={<Radio color="success" />}
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PassIcon color="success" fontSize="small" /><Typography color="success.main">Pass</Typography></Box>} />
            <FormControlLabel value="fail" control={<Radio color="error" />}
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><FailIcon color="error" fontSize="small" /><Typography color="error.main">Fail</Typography></Box>} />
          </RadioGroup>
        </Box>
      );
    }

    if (effectiveType === 'assessment') {
      return (
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Assessment</InputLabel>
          <Select
            value={entry.assessmentValue || ''}
            onChange={e => updateEntry({ assessmentValue: e.target.value as AssessmentValue })}
            label="Assessment"
          >
            {assessmentOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
        </FormControl>
      );
    }

    // Pass/Fail
    return (
      <RadioGroup
        row
        value={entry.passStatus === undefined ? '' : entry.passStatus ? 'pass' : 'fail'}
        onChange={e => updateEntry({ passStatus: e.target.value === 'pass' })}
      >
        <FormControlLabel value="pass" control={<Radio color="success" />}
          label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PassIcon color="success" /><Typography color="success.main">Pass</Typography></Box>} />
        <FormControlLabel value="fail" control={<Radio color="error" />}
          label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><FailIcon color="error" /><Typography color="error.main">Fail</Typography></Box>} />
      </RadioGroup>
    );
  };

  const sid = sessionId ?? String(currentSession?.id ?? '');

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(`/quality-test?sessionId=${sid}`)}
          variant="outlined"
          size="small"
        >
          Back to Test List
        </Button>
        <Chip
          label={catCode}
          size="small"
          sx={{ backgroundColor: `${color}20`, color, fontWeight: 700 }}
        />
        {isEntryValid(entry) && (
          <Chip label="Complete" color="success" size="small" />
        )}
        {catCode === 'ELE' && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => { setLaunching(true); launchSmartQC().finally(() => setLaunching(false)); }}
            disabled={launching}
            startIcon={
              launching
                ? <CircularProgress size={14} />
                : <Box component="img" src="/smartqc-icon.png" alt="SmartQC" sx={{ width: 18, height: 18 }} />
            }
            sx={{ ml: 'auto', borderColor: 'divider', color: 'text.primary', textTransform: 'none' }}
          >
            Open Smart QC
          </Button>
        )}
      </Box>

      {/* Test identity */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {def.test_name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', backgroundColor: 'action.hover', px: 1, py: 0.25, borderRadius: 1 }}>
              {def.test_id}
            </Typography>
            {def.iso_standard && (
              <Typography variant="caption" color="text.secondary">{def.iso_standard}</Typography>
            )}
            {def.standard_section && (
              <Typography variant="caption" color="text.secondary">§{def.standard_section}</Typography>
            )}
            <Chip label={effectiveType} size="small" variant="outlined" />
          </Box>
          {def.description && (
            <Typography variant="body2" color="text.secondary">{def.description}</Typography>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>Test Entry</Typography>
          <Divider />

          {renderForm()}

          <Divider />

          {/* Notes + Retest — always shown */}
          <TextField
            label="Session Notes"
            value={entry.notes || ''}
            onChange={e => updateEntry({ notes: e.target.value })}
            size="small"
            multiline
            rows={3}
            fullWidth
          />
          <FormControlLabel
            control={
              <Radio
                checked={entry.retestRequired === true}
                onChange={e => updateEntry({ retestRequired: e.target.checked })}
                size="small"
                color="warning"
              />
            }
            label={<Typography variant="body2" color="warning.main">Retest Required</Typography>}
          />
        </CardContent>
      </Card>

      {/* Save */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          onClick={() => navigate(`/quality-test?sessionId=${sid}`)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Save & Back to List
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TestEntryPage;
