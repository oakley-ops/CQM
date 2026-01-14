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
import { TestCategory, TestDefinition, TestEntryFormData, AssessmentValue } from '../../../types/cqm';

interface TestEntryDialogProps {
  open: boolean;
  onClose: () => void;
  category: TestCategory;
  definitions: TestDefinition[];
  initialEntries?: TestEntryFormData[];
  onSave: (entries: TestEntryFormData[]) => void;
  loading?: boolean;
}

const assessmentOptions: AssessmentValue[] = ['Excellent', 'Good', 'Acceptable', 'Poor'];

// Helper to determine the effective test type based on definition properties
const getEffectiveTestType = (def: TestDefinition): 'measurement' | 'passfail' | 'assessment' => {
  // If has numeric range/target values, it's a measurement
  if (def.min_value !== undefined || def.max_value !== undefined || def.target_value !== undefined) {
    return 'measurement';
  }

  // Check the test_type field for hints
  const testType = (def.test_type || '').toLowerCase();
  if (testType === 'measurement' || testType === 'dimensional' || testType === 'numeric') {
    return 'measurement';
  }
  if (testType === 'assessment' || testType === 'visual inspection' || testType === 'visual') {
    return 'assessment';
  }

  // Default to passfail for most quality tests
  return 'passfail';
};

const TestEntryDialog: React.FC<TestEntryDialogProps> = ({
  open,
  onClose,
  category,
  definitions,
  initialEntries = [],
  onSave,
  loading = false,
}) => {
  const [entries, setEntries] = useState<Map<number, TestEntryFormData>>(new Map());
  const [expandedPanel, setExpandedPanel] = useState<number | false>(false);
  const initializedForCategory = useRef<number | null>(null);

  // Initialize entries only when dialog opens for a new category
  useEffect(() => {
    if (!open) {
      // Reset tracking when dialog closes
      initializedForCategory.current = null;
      return;
    }

    // Only initialize if we haven't initialized for this category yet
    if (open && definitions.length > 0 && initializedForCategory.current !== category.id) {
      const newEntries = new Map<number, TestEntryFormData>();

      definitions.forEach((def) => {
        const existing = initialEntries.find((e) => e.testDefinitionId === def.id);
        if (existing) {
          newEntries.set(def.id, existing);
        } else {
          newEntries.set(def.id, {
            testDefinitionId: def.id,
            testCode: def.test_code,
            testName: def.test_name,
            testType: getEffectiveTestType(def),
            measurementValue: undefined,
            assessmentValue: undefined,
            passStatus: undefined,
            notes: '',
            retestRequired: false,
            isValid: false,
          });
        }
      });

      setEntries(newEntries);
      setExpandedPanel(definitions[0].id);
      initializedForCategory.current = category.id;
    }
  }, [open, definitions, category.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateEntry = (defId: number, updates: Partial<TestEntryFormData>) => {
    setEntries((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(defId);
      if (current) {
        const updated = { ...current, ...updates };
        // Validate entry
        updated.isValid = validateEntry(updated, definitions.find((d) => d.id === defId)!);
        newMap.set(defId, updated);
      }
      return newMap;
    });
  };

  const validateEntry = (entry: TestEntryFormData, def: TestDefinition): boolean => {
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

  const handleSave = () => {
    const entryArray = Array.from(entries.values());
    onSave(entryArray);
  };

  const completedCount = useMemo(() => {
    return Array.from(entries.values()).filter((e) => e.isValid).length;
  }, [entries]);

  const totalCount = definitions.length;

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
              inputProps={{
                min: def.min_value,
                max: def.max_value,
                step: 'any',
              }}
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
              label={`${completedCount}/${totalCount} Complete`}
              color={completedCount === totalCount ? 'success' : 'default'}
              size="small"
            />
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
          <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
            {definitions.map((def, index) => {
              const entry = entries.get(def.id);
              if (!entry) return null;

              return (
                <Accordion
                  key={def.id}
                  expanded={expandedPanel === def.id}
                  onChange={(_, isExpanded) =>
                    setExpandedPanel(isExpanded ? def.id : false)
                  }
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
                          {def.test_code} | {getEffectiveTestType(def).toUpperCase()}
                          {def.iso_reference && ` | ${def.iso_reference}`}
                        </Typography>
                      </Box>
                      {entry.isValid && (
                        <PassIcon color="success" fontSize="small" />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {renderTestInput(def, entry)}

                      <TextField
                        label="Notes"
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
                            onChange={(e) =>
                              updateEntry(def.id, { retestRequired: e.target.checked })
                            }
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

        {completedCount < totalCount && (
          <Alert severity="info" sx={{ m: 2 }}>
            Complete all {totalCount} tests to mark this category as finished.
          </Alert>
        )}
      </DialogContent>

      <Divider />

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
