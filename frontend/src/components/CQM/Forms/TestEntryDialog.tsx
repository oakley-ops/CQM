
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
} from '@mui/icons-material';
import { TestCategory, TestDefinition, TestEntryFormData, AssessmentValue, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { launchSmartQC } from '../../../services/cqm/testEntryService';
import WarpageForm from './WarpageForm';
import SolidityForm from './SolidityForm';
import CardEdgesForm from './CardEdgesForm';
import ResistanceChemicalsForm from './ResistanceChemicalsForm';
import PeelStrengthForm from './PeelStrengthForm';
import OverlayPeelForm from './OverlayPeelForm';
import CornerImpactForm from './CornerImpactForm';
import WidthHeightForm from './WidthHeightForm';

/** Test codes that render a specialized form instead of the generic per-card input */
const SPECIALIZED_FORM_CODES = new Set(['#3007#', 'IT-PHY-006', '#3021#', '#3006#', '#3046#', '#3008#', '#3015#', '#3018#', 'IT-CBY-002', '#3002#', 'IT-PHY-001']);

/** Ambient condition fields that are the same across all tests in a session/day.
 *  These are pre-filled from the most recently completed form so the user only
 *  needs to update what actually changed (e.g. humidity on a new day). */
const AMBIENT_FIELDS = [
  'sampledBy', 'technician', 'testDate', 'testTime',
  'temperatureC', 'humidityPct', 'envLoggerId', 'samplePreconditioned',
] as const;

interface TestEntryDialogProps {
  open: boolean;
  onClose: () => void;
  category: TestCategory;
  definitions: TestDefinition[];
  initialEntries?: TestEntryFormData[];
  /** Ambient conditions from the most recently completed specialized form anywhere
   *  in the session — used to pre-fill new forms so users only change what differs. */
  lastConditions?: Pick<TestEntryMetadata, typeof AMBIENT_FIELDS[number]>;
  onSave: (entries: TestEntryFormData[]) => void;
  loading?: boolean;
  sessionId?: number;
}

const assessmentOptions: AssessmentValue[] = ['Excellent', 'Good', 'Acceptable', 'Poor'];

const getEffectiveTestType = (def: TestDefinition): 'measurement' | 'passfail' | 'assessment' => {
  if (def.min_value !== undefined || def.max_value !== undefined || def.target_value !== undefined) {
    return 'measurement';
  }
  const testType = (def.test_type || '').toLowerCase();
  if (testType === 'measurement' || testType === 'dimensional' || testType === 'numeric') {
    return 'measurement';
  }
  if (testType === 'assessment' || testType === 'visual inspection' || testType === 'visual') {
    return 'assessment';
  }
  return 'passfail';
};

/** Build a blank card entry row for a given 1-based card number */
const blankCardEntry = (cardNumber: number): CardEntryData => ({
  sampleCardId: 0, // placeholder — resolved to a real DB id at save time
  cardNumber,
  passStatus: undefined,
  notes: '',
  retestRequired: false,
  isValid: false,
});

const TestEntryDialog: React.FC<TestEntryDialogProps> = ({
  open,
  onClose,
  category,
  definitions,
  initialEntries = [],
  lastConditions,
  onSave,
  loading = false,
  sessionId,
}) => {
  const [entries, setEntries] = useState<Map<number, TestEntryFormData>>(new Map());
  const [expandedPanel, setExpandedPanel] = useState<number | false>(false);
  const initializedForCategory = useRef<number | null>(null);

  // Initialize entries only when dialog opens for a new category
  useEffect(() => {
    if (!open) {
      initializedForCategory.current = null;
      return;
    }
    if (open && definitions.length > 0 && initializedForCategory.current !== category.id) {
      const newEntries = new Map<number, TestEntryFormData>();

      definitions.forEach((def) => {
        const existing = initialEntries.find((e) => e.testDefinitionId === def.id);
        if (existing) {
          newEntries.set(def.id, existing);
        } else {
          const isPerCard = !!(def.test_frequency && def.test_frequency !== "not req'ed");
          newEntries.set(def.id, {
            testDefinitionId: def.id,
            testCode: def.test_id,
            testName: def.test_name,
            testType: getEffectiveTestType(def),
            testFrequency: def.test_frequency,
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
        }
      });

      // Smart pre-fill: for any specialized form that has no metadata yet,
      // seed the ambient condition fields from the most recently completed form.
      // Equipment-specific fields (fixture ID, gauge ID, cal dates) are never
      // pre-filled — they are unique per test.
      if (lastConditions) {
        newEntries.forEach((entry, defId) => {
          if (SPECIALIZED_FORM_CODES.has(entry.testCode) && !entry.specializedMetadata) {
            newEntries.set(defId, {
              ...entry,
              specializedMetadata: { ...lastConditions },
            });
          }
        });
      }

      setEntries(newEntries);
      setExpandedPanel(false);
      initializedForCategory.current = category.id;
    }
  }, [open, definitions, category.id, lastConditions]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateEntry = (defId: number, updates: Partial<TestEntryFormData>) => {
    setEntries((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(defId);
      if (current) {
        const updated = { ...current, ...updates };
        updated.isValid = validateEntry(updated, definitions.find((d) => d.id === defId)!);
        newMap.set(defId, updated);
      }
      return newMap;
    });
  };

  /** Resize cardEntries when the user changes the sample count for a test */
  const handleSampleCountChange = (defId: number, rawValue: string) => {
    const n = Math.max(1, parseInt(rawValue) || 1);
    setEntries((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(defId);
      if (!current) return prev;

      const existing = current.cardEntries ?? [];
      let newCardEntries: CardEntryData[];

      if (n > existing.length) {
        // Add new blank rows
        newCardEntries = [
          ...existing,
          ...Array.from({ length: n - existing.length }, (_, i) =>
            blankCardEntry(existing.length + i + 1)
          ),
        ];
      } else {
        // Trim to n rows
        newCardEntries = existing.slice(0, n);
      }

      const updated: TestEntryFormData = { ...current, sampleCount: n, cardEntries: newCardEntries };
      updated.isValid = validateEntry(updated, definitions.find((d) => d.id === defId)!);
      newMap.set(defId, updated);
      return newMap;
    });
  };

  const updateCardEntry = (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => {
    setEntries((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(defId);
      if (current?.cardEntries) {
        const updatedCardEntries = current.cardEntries.map((ce) =>
          ce.cardNumber === cardNumber
            ? {
                ...ce,
                ...updates,
                isValid:
                  updates.passStatus !== undefined ||
                  updates.measurementValue !== undefined ||
                  updates.assessmentValue !== undefined
                    ? true
                    : ce.isValid,
              }
            : ce
        );
        const allValid = updatedCardEntries.every((ce) => ce.isValid);
        newMap.set(defId, { ...current, cardEntries: updatedCardEntries, isValid: allValid });
      }
      return newMap;
    });
  };

  const validateEntry = (entry: TestEntryFormData, def: TestDefinition): boolean => {
    if (!entry.testCategory) return false;
    if (entry.isPerCard && entry.cardEntries) {
      return entry.cardEntries.length > 0 && entry.cardEntries.every((ce) => ce.isValid);
    }
    const effectiveType = getEffectiveTestType(def);
    switch (effectiveType) {
      case 'measurement':
        return entry.measurementValue !== undefined && entry.measurementValue !== '';
      case 'passfail':
        return entry.passStatus !== undefined;
      case 'assessment':
        return entry.assessmentValue !== undefined;
      default:
        return false;
    }
  };

  const [launching, setLaunching] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const handleLaunchSmartQC = async () => {
    setLaunching(true);
    try {
      await launchSmartQC();
    } finally {
      setLaunching(false);
    }
  };

  const handleSave = () => {
    const missing = Array.from(entries.values()).filter((e) => !e.testCategory);
    if (missing.length > 0) {
      const names = missing.map((e) => e.testName).join(', ');
      setSaveWarning(`Test Category is required before saving. Please select a category for: ${names}`);
      return;
    }
    setSaveWarning(null);
    onSave(Array.from(entries.values()));
  };

  const completedCount = useMemo(
    () => Array.from(entries.values()).filter((e) => e.isValid).length,
    [entries]
  );

  const renderTestInput = (def: TestDefinition, entry: TestEntryFormData) => {
    const effectiveType = getEffectiveTestType(def);
    switch (effectiveType) {
      case 'measurement':
        return (
          <Box>
            <TextField
              label={`Value ${def.unit_of_measure ? `(${def.unit_of_measure})` : ''}`}
              type="number"
              value={entry.measurementValue ?? ''}
              onChange={(e) =>
                updateEntry(def.id, {
                  measurementValue: e.target.value === '' ? undefined : parseFloat(e.target.value),
                })
              }
              size="small"
              fullWidth
              inputProps={{ min: def.min_value, max: def.max_value, step: 'any' }}
              helperText={
                def.min_value !== undefined && def.max_value !== undefined
                  ? `Range: ${def.min_value} - ${def.max_value}${def.target_value ? `, Target: ${def.target_value}` : ''}`
                  : def.target_value
                    ? `Target: ${def.target_value}`
                    : undefined
              }
            />
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <FormControlLabel
                control={
                  <Radio
                    checked={entry.passStatus === true}
                    onChange={() => updateEntry(def.id, { passStatus: true })}
                    size="small"
                    color="success"
                  />
                }
                label={<Typography variant="body2" color="success.main">Pass</Typography>}
              />
              <FormControlLabel
                control={
                  <Radio
                    checked={entry.passStatus === false}
                    onChange={() => updateEntry(def.id, { passStatus: false })}
                    size="small"
                    color="error"
                  />
                }
                label={<Typography variant="body2" color="error.main">Fail</Typography>}
              />
            </Box>
          </Box>
        );

      case 'passfail':
        return (
          <RadioGroup
            row
            value={entry.passStatus === undefined ? '' : entry.passStatus ? 'pass' : 'fail'}
            onChange={(e) => updateEntry(def.id, { passStatus: e.target.value === 'pass' })}
          >
            <FormControlLabel
              value="pass"
              control={<Radio color="success" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PassIcon color="success" fontSize="small" />
                  <Typography color="success.main">Pass</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="fail"
              control={<Radio color="error" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FailIcon color="error" fontSize="small" />
                  <Typography color="error.main">Fail</Typography>
                </Box>
              }
            />
          </RadioGroup>
        );

      case 'assessment':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>Assessment</InputLabel>
            <Select
              value={entry.assessmentValue || ''}
              onChange={(e) =>
                updateEntry(def.id, { assessmentValue: e.target.value as AssessmentValue })
              }
              label="Assessment"
            >
              {assessmentOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  const renderPerCardInput = (def: TestDefinition, entry: TestEntryFormData) => {
    const cardEntries = entry.cardEntries ?? [];
    return (
      <Box>
        {/* ── Sample count input ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TextField
            label="# of Samples Tested"
            type="number"
            size="small"
            value={entry.sampleCount ?? 1}
            onChange={(e) => handleSampleCountChange(def.id, e.target.value)}
            inputProps={{ min: 1, max: 50 }}
            sx={{ width: 180 }}
          />
          <Typography variant="caption" color="text.secondary">
            Monitoring: {entry.testFrequency}
          </Typography>
        </Box>

        {/* ── Card rows ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {cardEntries.map((cardEntry) => (
            <Box
              key={cardEntry.cardNumber}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1,
                border: '1px solid',
                borderColor: cardEntry.isValid ? 'success.light' : 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 60, fontWeight: 'medium' }}>
                Card {cardEntry.cardNumber}
              </Typography>
              <RadioGroup
                row
                value={cardEntry.passStatus === undefined ? '' : cardEntry.passStatus ? 'pass' : 'fail'}
                onChange={(e) =>
                  updateCardEntry(def.id, cardEntry.cardNumber, { passStatus: e.target.value === 'pass' })
                }
              >
                <FormControlLabel
                  value="pass"
                  control={<Radio color="success" size="small" />}
                  label={<Typography variant="body2" color="success.main">Pass</Typography>}
                />
                <FormControlLabel
                  value="fail"
                  control={<Radio color="error" size="small" />}
                  label={<Typography variant="body2" color="error.main">Fail</Typography>}
                />
              </RadioGroup>
              <TextField
                placeholder="Notes"
                value={cardEntry.notes || ''}
                onChange={(e) =>
                  updateCardEntry(def.id, cardEntry.cardNumber, { notes: e.target.value })
                }
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { minHeight: '80vh' } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">{category.category_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Section {category.section_number} - {category.category_code}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={`${completedCount}/${definitions.length} Complete`}
              color={completedCount === definitions.length ? 'success' : 'default'}
              size="small"
            />
            {category.category_code === 'ELE' && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleLaunchSmartQC}
                disabled={launching}
                startIcon={
                  launching
                    ? <CircularProgress size={16} />
                    : <Box component="img" src="/smartqc-icon.png" alt="SmartQC" sx={{ width: 18, height: 18 }} />
                }
                sx={{ borderColor: 'divider', color: 'text.primary', textTransform: 'none' }}
              >
                Open Smart QC
              </Button>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {definitions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No test definitions found for this category.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: '65vh', overflow: 'auto' }}>
            {definitions.map((def, index) => {
              const entry = entries.get(def.id);
              if (!entry) return null;

              return (
                <Accordion
                  key={def.id}
                  expanded={expandedPanel === def.id}
                  onChange={(_, isExpanded) => setExpandedPanel(isExpanded ? def.id : false)}
                  disableGutters
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      backgroundColor: entry.isValid ? 'success.lighter' : 'background.default',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          minWidth: 40,
                          textAlign: 'center',
                        }}
                      >
                        {index + 1}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {def.test_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {def.test_id} | {getEffectiveTestType(def).toUpperCase()}
                          {def.iso_reference && ` | ${def.iso_reference}`}
                        </Typography>
                      </Box>
                      {entry.isPerCard && entry.sampleCount !== undefined && (
                        <Chip
                          label={`${entry.sampleCount} sample${entry.sampleCount !== 1 ? 's' : ''}`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {def.test_frequency && (
                        <Chip
                          label={def.test_frequency}
                          size="small"
                          color={def.test_frequency === "not req'ed" ? 'default' : 'primary'}
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {entry.isValid && <PassIcon color="success" fontSize="small" />}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* ── Test Category — required on every test ── */}
                      <FormControl size="small" sx={{ minWidth: 220 }} required error={!entry.testCategory}>
                        <InputLabel>Test Category *</InputLabel>
                        <Select
                          label="Test Category *"
                          value={entry.testCategory ?? ''}
                          onChange={(e) => {
                            updateEntry(def.id, { testCategory: e.target.value as TestEntryFormData['testCategory'] });
                            setSaveWarning(null);
                          }}
                          renderValue={(val) => val || <em style={{ color: '#9e9e9e' }}>Select a category</em>}
                        >
                          <MenuItem value="Qualification">Qualification</MenuItem>
                          <MenuItem value="Monitoring">Monitoring</MenuItem>
                          <MenuItem value="Sampling">Sampling</MenuItem>
                          <MenuItem value="Training">Training</MenuItem>
                        </Select>
                        {!entry.testCategory && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                            Required — select before recording results
                          </Typography>
                        )}
                      </FormControl>

                      {SPECIALIZED_FORM_CODES.has(def.test_id) ? (
                        def.test_id === '#3021#' ? (
                          <SolidityForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : def.test_id === '#3006#' ? (
                          <CardEdgesForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : def.test_id === '#3046#' ? (
                          <ResistanceChemicalsForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : def.test_id === '#3008#' ? (
                          <PeelStrengthForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : def.test_id === '#3015#' ? (
                          <OverlayPeelForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                            sessionId={sessionId}
                          />
                        ) : (def.test_id === '#3007#' || def.test_id === 'IT-PHY-006') ? (
                          <WarpageForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : (def.test_id === '#3018#' || def.test_id === 'IT-CBY-002') ? (
                          <CornerImpactForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : (def.test_id === '#3002#' || def.test_id === 'IT-PHY-001') ? (
                          <WidthHeightForm
                            def={def}
                            entry={entry}
                            onUpdateEntry={updateEntry}
                            onUpdateCardEntry={updateCardEntry}
                          />
                        ) : null
                      ) : entry.isPerCard
                        ? renderPerCardInput(def, entry)
                        : renderTestInput(def, entry)
                      }

                      <TextField
                        label="Session Notes"
                        value={entry.notes || ''}
                        onChange={(e) => updateEntry(def.id, { notes: e.target.value })}
                        size="small"
                        multiline
                        rows={2}
                        fullWidth
                      />

                      <FormControlLabel
                        control={
                          <Radio
                            checked={entry.retestRequired === true}
                            onChange={(e) => updateEntry(def.id, { retestRequired: e.target.checked })}
                            size="small"
                            color="warning"
                          />
                        }
                        label={
                          <Typography variant="body2" color="warning.main">
                            Retest Required
                          </Typography>
                        }
                      />
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}

        {completedCount < definitions.length && definitions.length > 0 && (
          <Alert severity="info" sx={{ m: 2 }}>
            Complete all {definitions.length} tests to mark this category as finished.
          </Alert>
        )}
      </DialogContent>

      <Divider />

      {saveWarning && (
        <Alert severity="warning" onClose={() => setSaveWarning(null)} sx={{ mx: 2, mt: 1 }}>
          {saveWarning}
        </Alert>
      )}

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Saving...' : 'Save Tests'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestEntryDialog;
