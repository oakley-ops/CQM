import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stepper,
  Step,
  StepButton,
  Divider,
  Snackbar,
  CircularProgress,
  Switch,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Chip,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, CheckCircle as CheckIcon, Settings as SettingsIcon, AddCircleOutline as NewSessionIcon } from '@mui/icons-material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';

import { AppDispatch, RootState } from '../../store/store';
import {
  fetchCategories,
  createSession,
  fetchSession,
  bulkSaveEntries,
  submitSession,
  updateSession,
  clearFormState,
  clearCurrentSession,
  initFormState,
  updateCategoryFormState,
  createSampleCards,
} from '../../store/slices/cqm/testEntrySlice';
import { TestCategory, TestDefinition, TestEntryFormData, CategoryFormState, CreateEntryRequest, SessionType, TestEntryMetadata } from '../../types/cqm';
import { packCardEntry, packSessionEntry } from '../../utils/entryPayload';
import { upsertEntryMetadata, getEntryMetadata, getAllDefinitions, getAllDefinitionsIncludingHidden, toggleDefinitionVisibility, updateDefinitionMachineTags, launchSmartQC } from '../../services/cqm/testEntryService';

const steps = ['Session Info', 'Select Categories', 'Enter Tests', 'Review & Submit'];

const MACHINES = ['Hot Stamp', 'Die Press', 'Lamination', 'EMV'] as const;
type Machine = typeof MACHINES[number];

/** Derive card type from the categories the user actually selected.
 *  Returns the first non-ALL card_type found, or 'ALL' if everything is universal. */
function deriveCardType(categoryStates: CategoryFormState[], allCategories: TestCategory[]): string {
  for (const cs of categoryStates) {
    const cat = allCategories.find(c => c.id === cs.categoryId);
    if (cat && cat.card_type && cat.card_type !== 'ALL') {
      return cat.card_type;
    }
  }
  return 'ALL';
}

const QualityTestDataEntry: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get('sessionId');

  const {
    categories,
    currentSession,
    loading,
    error,
    formState,
  } = useSelector((state: RootState) => state.testEntry);

  // Skip straight to the test list when resuming an existing session
  const [activeStep, setActiveStep] = useState(() => (currentSession || resumeSessionId) ? 1 : 0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [sessionType, setSessionType] = useState<SessionType>('Monitoring');
  const [allDefinitions, setAllDefinitions] = useState<TestDefinition[]>([]);

  const [machineFilters, setMachineFilters] = useState<Set<Machine>>(new Set());

  const [manageOpen, setManageOpen] = useState(false);
  const [manageDefs, setManageDefs] = useState<TestDefinition[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [updatingTagsId, setUpdatingTagsId] = useState<number | null>(null);
  const [manageSearch, setManageSearch] = useState('');

  const openManage = () => {
    getAllDefinitionsIncludingHidden().then(setManageDefs);
    setManageOpen(true);
  };

  const handleToggleVisibility = async (id: number) => {
    setTogglingId(id);
    try {
      const result = await toggleDefinitionVisibility(id);
      setManageDefs(prev => prev.map(d => d.id === id ? { ...d, status: result.status } : d));
      getAllDefinitions().then(setAllDefinitions);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdateMachineTag = async (id: number, machine: Machine, add: boolean) => {
    setUpdatingTagsId(id);
    try {
      const current = manageDefs.find(d => d.id === id)?.machine_tags ?? [];
      const updated = add
        ? [...new Set([...current, machine])]
        : current.filter(t => t !== machine);
      const result = await updateDefinitionMachineTags(id, updated);
      setManageDefs(prev => prev.map(d => d.id === id ? { ...d, machine_tags: result.machine_tags } : d));
      getAllDefinitions().then(setAllDefinitions);
    } finally {
      setUpdatingTagsId(null);
    }
  };
  // Persist search/page in sessionStorage so navigating back from a test page restores them
  const [defSearch, setDefSearchState] = useState(() => sessionStorage.getItem('cqm_defSearch') ?? '');
  const [defPage, setDefPageState] = useState(() => parseInt(sessionStorage.getItem('cqm_defPage') ?? '1', 10));
  const setDefSearch = (q: string) => { sessionStorage.setItem('cqm_defSearch', q); sessionStorage.setItem('cqm_defPage', '1'); setDefSearchState(q); setDefPageState(1); };
  const setDefPage = (p: number) => { sessionStorage.setItem('cqm_defPage', String(p)); setDefPageState(p); };
  const DEFS_PER_PAGE = 15;
  const [smartQcLaunching, setSmartQcLaunching] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    jobNumber: formState.sessionData?.jobNumber ?? currentSession?.job?.job_number ?? '',
    jobName: formState.sessionData?.jobName ?? currentSession?.job_name ?? '',
    batchNumber: formState.sessionData?.batchLotNumber ?? currentSession?.batch_lot_number ?? '',
    catNumber: formState.sessionData?.catNumber ?? currentSession?.cat_number ?? '',
    testDate: formState.sessionData?.testDate ?? currentSession?.test_date ?? new Date().toISOString().split('T')[0],
    manufacturingStage: formState.sessionData?.manufacturingStage ?? currentSession?.manufacturing_stage ?? '',
  });

  // Fetch all active categories and all definitions on mount
  useEffect(() => {
    dispatch(fetchCategories({ activeOnly: true }));
    getAllDefinitions().then(setAllDefinitions).catch(() => {});
  }, [dispatch]);

  // If the user arrives without a ?sessionId= resume intent and the Redux store
  // still holds a submitted/approved session from a previous workflow, clear it
  // so the form starts blank. A draft is left alone — the resume useEffect below
  // will pick it up if ?sessionId= is present.
  useEffect(() => {
    if (!resumeSessionId && currentSession && currentSession.status !== 'draft') {
      dispatch(clearCurrentSession());
      dispatch(clearFormState());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume an existing draft session when ?sessionId= is in the URL.
  // If that session is already loaded in Redux (e.g. returning from test entry page),
  // skip the network fetch and go straight to the test list.
  useEffect(() => {
    if (!resumeSessionId) return;
    const sessionId = parseInt(resumeSessionId, 10);
    if (isNaN(sessionId)) return;

    // Only short-circuit if Redux already has this session AND the form data is
    // populated — if formState was cleared (e.g. after submit) we must re-fetch
    // to rebuild the category/entry list.
    if (currentSession?.id === sessionId && formState.categoryStates.length > 0) {
      setActiveStep(1);
      return;
    }

    dispatch(fetchSession(sessionId)).unwrap().then(async (session) => {
      // Pre-populate the session info form
      setSessionType((session.session_type as SessionType) || 'Monitoring');
      setSessionForm({
        jobNumber: session.job?.job_number ?? '',
        jobName: session.job_name || '',
        batchNumber: session.batch_lot_number,
        catNumber: session.cat_number || '',
        testDate: session.test_date,
        manufacturingStage: session.manufacturing_stage || '',
      });

      // Mark formState as initialised so step buttons unlock
      dispatch(initFormState({
        jobName: session.job_name || undefined,
        cardType: session.card_type,
        batchLotNumber: session.batch_lot_number,
        catNumber: session.cat_number || undefined,
        testDate: session.test_date,
      }));

      // Rebuild categoryStates from saved entries
      if (session.entries && session.entries.length > 0) {
        const categoryMap = new Map<number, CategoryFormState>();
        // Track one TestEntryFormData per (catId:defId) key
        const defMap = new Map<string, TestEntryFormData>();

        for (const entry of session.entries) {
          if (!entry.definition?.category) continue;
          const cat = entry.definition.category;
          const key = `${cat.id}:${entry.test_definition_id}`;

          if (!categoryMap.has(cat.id)) {
            categoryMap.set(cat.id, {
              categoryId: cat.id,
              categoryCode: cat.category_code,
              categoryName: cat.category_name,
              entries: [],
              isComplete: false,
            });
          }

          const catState = categoryMap.get(cat.id)!;

          if (entry.sample_card_id) {
            // Per-card entry: merge into a single TestEntryFormData with cardEntries[]
            if (!defMap.has(key)) {
              const formEntry: TestEntryFormData = {
                testDefinitionId: entry.test_definition_id,
                testCode: entry.definition.test_id,
                testName: entry.definition.test_name,
                testType: entry.definition.test_type,
                testFrequency: entry.definition.test_frequency,
                isPerCard: true,
                cardEntries: [],
                isValid: false,
              };
              defMap.set(key, formEntry);
              catState.entries.push(formEntry);
            }
            const formEntry = defMap.get(key)!;
            formEntry.cardEntries = formEntry.cardEntries ?? [];
            const mv = (entry as any).multi_value_notes as Record<string, unknown> | null | undefined;
            formEntry.cardEntries.push({
              sampleCardId: entry.sample_card_id,
              cardNumber: 0,
              measurementValue: entry.measurement_value != null ? parseFloat(String(entry.measurement_value)) : undefined,
              secondaryMeasurementValue: entry.secondary_measurement_value != null ? parseFloat(String(entry.secondary_measurement_value)) : null,
              notes: entry.notes ?? undefined,
              passStatus: entry.pass_status,
              isValid: entry.pass_status !== undefined,
              ...(mv ? {
                widthMm: mv.widthMm as number | string | undefined,
                heightMm: mv.heightMm as number | string | undefined,
                punchPosition: mv.punchPosition as string | undefined,
                cornerA: mv.cornerA as any,
                cornerB: mv.cornerB as any,
                cornerC: mv.cornerC as any,
                cornerD: mv.cornerD as any,
                cornerAExtent: mv.cornerAExtent as string | undefined,
                cornerBExtent: mv.cornerBExtent as string | undefined,
                cornerCExtent: mv.cornerCExtent as string | undefined,
                cornerDExtent: mv.cornerDExtent as string | undefined,
                coreDelamination: mv.coreDelamination as boolean | undefined,
                visualNote: mv.visualNote as string | undefined,
              } : {}),
            });
          } else {
            // Session-level (non-per-card) entry
            const formEntry: TestEntryFormData = {
              testDefinitionId: entry.test_definition_id,
              testCode: entry.definition.test_id,
              testName: entry.definition.test_name,
              testType: entry.definition.test_type,
              testFrequency: entry.definition.test_frequency,
              measurementValue: entry.measurement_value != null ? parseFloat(String(entry.measurement_value)) : undefined,
              assessmentValue: entry.assessment_value,
              passStatus: entry.pass_status,
              notes: entry.notes ?? undefined,
              retestRequired: entry.retest_required,
              isValid:
                entry.pass_status !== undefined ||
                entry.measurement_value != null ||
                entry.assessment_value !== undefined,
            };
            defMap.set(key, formEntry);
            catState.entries.push(formEntry);
          }
        }

        // Sort per-card entries by sampleCardId and assign sequential cardNumbers
        for (const formEntry of defMap.values()) {
          if (formEntry.isPerCard && formEntry.cardEntries && formEntry.cardEntries.length > 0) {
            formEntry.cardEntries.sort((a, b) => a.sampleCardId - b.sampleCardId);
            formEntry.cardEntries.forEach((ce, i) => { ce.cardNumber = i + 1; });
            formEntry.sampleCount = formEntry.cardEntries.length;
            formEntry.isValid = formEntry.cardEntries.some((ce) => ce.isValid);
          }
        }

        // Load specialized metadata (header fields like temp, humidity, sampledBy, etc.)
        const uniqueDefIds = Array.from(
          new Set(session.entries.filter((e) => e.definition?.category).map((e) => e.test_definition_id))
        );

        await Promise.all(
          uniqueDefIds.map(async (defId) => {
            try {
              // Cast to unknown first since the API returns snake_case but the service
              // type says TestEntryMetadata (camelCase) — we map manually below.
              const raw = await getEntryMetadata(session.id, defId) as unknown as Record<string, unknown> | null;
              if (!raw) return;
              // Merge pdf_pages (separate DB column) back into extraData.pdfPages
              // so the PDF graph accordion renders when resuming a session.
              const extraData = raw.extra_data as Record<string, unknown> | null | undefined;
              const pdfPages = raw.pdf_pages as string[] | null | undefined;
              const mergedExtraData: Record<string, unknown> | undefined =
                pdfPages && pdfPages.length > 0
                  ? { ...(extraData ?? {}), pdfPages }
                  : extraData ?? undefined;

              const meta: TestEntryMetadata = {
                sampledBy: raw.sampled_by as string ?? undefined,
                technician: raw.technician as string ?? undefined,
                testTime: raw.test_time as string ?? undefined,
                temperatureC: raw.temperature_c as number ?? undefined,
                humidityPct: raw.humidity_pct as number ?? undefined,
                calibrationVerified: raw.calibration_verified as boolean ?? undefined,
                calibrationValidUntil: raw.calibration_valid_until as string ?? undefined,
                envLoggerId: raw.env_logger_id as string ?? undefined,
                calValidUntil: raw.cal_valid_until as string ?? undefined,
                samplePreconditioned: raw.sample_preconditioned as boolean ?? undefined,
                jobNotes: raw.job_notes as string ?? undefined,
                extraData: mergedExtraData,
              };
              for (const formEntry of defMap.values()) {
                if (formEntry.testDefinitionId === defId) {
                  formEntry.specializedMetadata = meta;
                }
              }
            } catch { /* no metadata stored for this entry */ }
          })
        );

        for (const catState of categoryMap.values()) {
          catState.isComplete = catState.entries.length > 0 && catState.entries.every((e) => e.isValid);
          dispatch(updateCategoryFormState(catState));
        }
      }

      // Categories already loaded on mount; jump straight to Step 1
      setActiveStep(1);
    }).catch(() => {
      // Session not found or error — stay at step 0
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  const handleSessionFormChange = (field: string, value: string) => {
    setSessionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchSelect = (def: TestDefinition) => {
    if (!currentSession) return;
    navigate(`/quality-test/session/${currentSession.id}/test/${def.id}`);
  };

  const handleCreateSession = async () => {
    // If resuming an in-progress draft, just advance — don't create a duplicate
    if (currentSession && currentSession.status === 'draft') {
      setActiveStep(1);
      return;
    }

    if (!sessionForm.batchNumber) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    try {
      await dispatch(createSession({
        jobNumber: sessionForm.jobNumber || undefined,
        jobName: sessionForm.jobName || undefined,
        sessionType,
        batchLotNumber: sessionForm.batchNumber,
        catNumber: sessionForm.catNumber || undefined,
        testDate: sessionForm.testDate,
        manufacturingStage: sessionForm.manufacturingStage || undefined,
      })).unwrap();

      dispatch(initFormState({
        jobNumber: sessionForm.jobNumber || undefined,
        jobName: sessionForm.jobName || undefined,
        sessionType,
        batchLotNumber: sessionForm.batchNumber,
        catNumber: sessionForm.catNumber || undefined,
        testDate: sessionForm.testDate,
        manufacturingStage: sessionForm.manufacturingStage || undefined,
      }));
      setActiveStep(1);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to create session. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleSaveDraft = async () => {
    try {
      const session = currentSession;
      if (!session) {
        setSnackbar({ open: true, message: 'No active session. Please go back to Step 1.', severity: 'error' });
        return;
      }

      // For each category that has per-card tests, create sample cards per test definition
      // and resolve the placeholder sampleCardId (0) to real DB ids.
      type EntryPayload = Omit<CreateEntryRequest, 'sessionId'> & { sampleCardId?: number };
      const allEntries: EntryPayload[] = [];

      for (const cs of formState.categoryStates) {
        // Save specialized metadata for all entries first
        for (const e of cs.entries) {
          if (e.specializedMetadata) {
            // Strip pdfPages (large base64 images) from extraData before persisting —
            // they are frontend-only state and must not be sent to the backend.
            const { pdfPages: _pdfPages, ...extraDataWithoutImages } =
              (e.specializedMetadata.extraData ?? {}) as Record<string, unknown>;
            const metadataToSave = {
              ...e.specializedMetadata,
              extraData: Object.keys(extraDataWithoutImages).length > 0
                ? extraDataWithoutImages
                : undefined,
            };
            await upsertEntryMetadata({
              sessionId: session.id,
              testDefinitionId: e.testDefinitionId,
              metadata: metadataToSave,
            });
          }
        }

        // Collect all per-card entries for this category
        const perCardEntries = cs.entries.filter(
          (e) => e.isPerCard && e.cardEntries && e.cardEntries.length > 0
        );

        if (perCardEntries.length > 0) {
          // Create sample cards ONCE per category using the max count needed across all
          // per-card entries — calling it multiple times with the same categoryId would
          // delete the previous batch and cause FK violations.
          const maxCount = Math.max(
            ...perCardEntries.map((e) => e.sampleCount ?? e.cardEntries!.length)
          );
          const cards = await dispatch(createSampleCards({
            sessionId: session.id,
            count: maxCount,
            categoryId: cs.categoryId,
          })).unwrap();

          const cardMap = new Map(cards.map((c) => [c.card_number, c.id]));

          for (const e of perCardEntries) {
            e.cardEntries!.forEach((ce) => {
              allEntries.push(packCardEntry(e, ce, cardMap.get(ce.cardNumber)));
            });
          }
        }

        // Session-level (non-per-card) entries
        for (const e of cs.entries) {
          if (!e.isPerCard || !e.cardEntries || e.cardEntries.length === 0) {
            allEntries.push(packSessionEntry(e));
          }
        }
      }

      if (allEntries.length > 0) {
        await dispatch(bulkSaveEntries({
          sessionId: session.id,
          entries: allEntries,
        })).unwrap();
      }

      // Derive and patch card type from whichever categories were selected
      const derivedCardType = deriveCardType(formState.categoryStates, categories);
      if (derivedCardType !== session.card_type) {
        await dispatch(updateSession({ id: session.id, data: { cardType: derivedCardType } })).unwrap();
      }

      setSnackbar({ open: true, message: 'Draft saved successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to save draft', severity: 'error' });
    }
  };

  const handleSubmit = async () => {
    try {
      await handleSaveDraft();

      if (currentSession) {
        await dispatch(submitSession(currentSession.id)).unwrap();
        setSnackbar({ open: true, message: 'Test session submitted successfully', severity: 'success' });
        dispatch(clearFormState());
        dispatch(clearCurrentSession());
        setSessionForm({
          jobNumber: '',
          jobName: '',
          batchNumber: '',
          catNumber: '',
          testDate: new Date().toISOString().split('T')[0],
          manufacturingStage: '',
        });
        setActiveStep(0);
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to submit session', severity: 'error' });
    }
  };

  const handleStartNew = () => {
    dispatch(clearCurrentSession());
    dispatch(clearFormState());
    setSessionForm({
      jobNumber: '',
      jobName: '',
      batchNumber: '',
      catNumber: '',
      testDate: new Date().toISOString().split('T')[0],
      manufacturingStage: '',
    });
    setActiveStep(0);
    navigate('/quality-test');
  };

  const totalTests = formState.categoryStates.reduce((acc, cs) => acc + cs.entries.length, 0);
  const passedTests = formState.categoryStates.reduce(
    (acc, cs) => acc + cs.entries.filter((e) => {
      if (e.isPerCard && e.cardEntries && e.cardEntries.length > 0) {
        return e.cardEntries.every((ce) => ce.passStatus === true);
      }
      return e.passStatus === true;
    }).length, 0
  );
  const failedTests = formState.categoryStates.reduce(
    (acc, cs) => acc + cs.entries.filter((e) => {
      if (e.isPerCard && e.cardEntries && e.cardEntries.length > 0) {
        return e.cardEntries.some((ce) => ce.passStatus === false);
      }
      return e.passStatus === false;
    }).length, 0
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

              {currentSession && (
                <Alert
                  severity="info"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<NewSessionIcon />}
                      onClick={handleStartNew}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Start New Session
                    </Button>
                  }
                >
                  Resuming draft session{currentSession.session_number ? ` ${currentSession.session_number}` : ''}
                  {currentSession.job_name ? ` — ${currentSession.job_name}` : ''}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Session Type <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <ToggleButtonGroup
                    value={sessionType}
                    exclusive
                    onChange={(_e, val) => { if (val) setSessionType(val as SessionType); }}
                    size="small"
                  >
                    <ToggleButton value="Monitoring" sx={{ px: 3 }}>
                      Monitoring
                    </ToggleButton>
                    <ToggleButton value="Qualification" sx={{ px: 3 }}>
                      Qualification
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {sessionType === 'Qualification'
                      ? 'Full product verification against specification requirements'
                      : 'Ongoing check to confirm product continues to meet requirements'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth size="small" label="Job Number"
                    value={sessionForm.jobNumber}
                    onChange={(e) => handleSessionFormChange('jobNumber', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth size="small" label="Job Name"
                    value={sessionForm.jobName}
                    onChange={(e) => handleSessionFormChange('jobName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth size="small" label="Batch Number" required
                    value={sessionForm.batchNumber}
                    onChange={(e) => handleSessionFormChange('batchNumber', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth size="small" label="Cat #"
                    value={sessionForm.catNumber}
                    onChange={(e) => handleSessionFormChange('catNumber', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Manufacturing Stage</InputLabel>
                    <Select
                      label="Manufacturing Stage"
                      value={sessionForm.manufacturingStage}
                      onChange={(e) => handleSessionFormChange('manufacturingStage', e.target.value)}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {MACHINES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth size="small" type="date" label="Date" required
                    value={sessionForm.testDate}
                    onChange={(e) => handleSessionFormChange('testDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  endIcon={<NextIcon />}
                  onClick={handleCreateSession}
                  disabled={!sessionForm.batchNumber}
                >
                  Continue
                </Button>
              </Box>
            </CardContent>
          </Card>
        );

      case 1: {
        const catColors: Record<string, string> = {
          PHY: '#9c27b0', CBY: '#4caf50', 'ICC-REQ': '#ff9800', MCH: '#2196f3',
          ELE: '#f44336', ENV: '#00bcd4', MAG: '#795548', SMT: '#607d8b',
          EMV: '#f57c00',
        };
        const completedDefIds = new Set(
          formState.categoryStates.flatMap(cs => cs.entries.filter(e => e.isValid).map(e => e.testDefinitionId))
        );
        const filtered = allDefinitions.filter(d => {
          if (defSearch.trim()) {
            const q = defSearch.toLowerCase();
            if (!(
              d.test_name.toLowerCase().includes(q) ||
              d.test_id.toLowerCase().includes(q) ||
              (d.category?.category_code ?? '').toLowerCase().includes(q) ||
              (d.short_name ?? '').toLowerCase().includes(q)
            )) return false;
          }
          if (machineFilters.size > 0) {
            const tags = d.machine_tags ?? [];
            if (!tags.some(t => machineFilters.has(t as Machine))) return false;
          }
          return true;
        });
        const totalPages = Math.ceil(filtered.length / DEFS_PER_PAGE);
        const pageDefs = filtered.slice((defPage - 1) * DEFS_PER_PAGE, defPage * DEFS_PER_PAGE);

        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{sessionType} session</strong> — click any test to open its entry form.
            </Alert>

            <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600 }}>
                Filter by machine:
              </Typography>
              {MACHINES.map(machine => (
                <FormControlLabel
                  key={machine}
                  control={
                    <Checkbox
                      size="small"
                      checked={machineFilters.has(machine)}
                      onChange={e => {
                        setMachineFilters(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(machine);
                          else next.delete(machine);
                          return next;
                        });
                        setDefPage(1);
                      }}
                      sx={{ p: 0.5 }}
                    />
                  }
                  label={<Typography variant="body2">{machine}</Typography>}
                  sx={{ mr: 1, ml: 0 }}
                />
              ))}
              {machineFilters.size > 0 && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => { setMachineFilters(new Set()); setDefPage(1); }}
                  sx={{ fontSize: '0.7rem', py: 0, minWidth: 0 }}
                >
                  Clear
                </Button>
              )}
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Filter tests by name, ID, or category…"
              value={defSearch}
              onChange={(e) => { setDefSearch(e.target.value); setDefPage(1); }}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TableContainer component={Card} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ width: 40, fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Test Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 140 }}>Test ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 110 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }}>Status</TableCell>
                    <TableCell sx={{ width: 40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageDefs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No tests match your filter.
                      </TableCell>
                    </TableRow>
                  ) : pageDefs.map((def, idx) => {
                    const catCode = def.category?.category_code ?? '';
                    const color = catColors[catCode] ?? '#757575';
                    const isDone = completedDefIds.has(def.id);
                    const rowNum = (defPage - 1) * DEFS_PER_PAGE + idx + 1;
                    return (
                      <TableRow
                        key={def.id}
                        hover
                        onClick={() => handleSearchSelect(def)}
                        sx={{ cursor: 'pointer', backgroundColor: isDone ? 'success.lighter' : undefined }}
                      >
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{rowNum}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={isDone ? 600 : 400}>{def.test_name}</Typography>
                          {def.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {def.description.length > 80 ? `${def.description.slice(0, 80)}…` : def.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={catCode}
                            size="small"
                            sx={{ backgroundColor: `${color}20`, color, fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{def.test_id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                            {def.test_type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isDone
                            ? <CheckIcon color="success" fontSize="small" />
                            : <Typography variant="caption" color="text.disabled">—</Typography>
                          }
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()} sx={{ pr: 1 }}>
                          {catCode === 'ELE' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSmartQcLaunching(true);
                                launchSmartQC().finally(() => setSmartQcLaunching(false));
                              }}
                              disabled={smartQcLaunching}
                              startIcon={
                                smartQcLaunching
                                  ? <CircularProgress size={12} />
                                  : <Box component="img" src="/smartqc-icon.png" alt="" sx={{ width: 16, height: 16 }} />
                              }
                              sx={{ whiteSpace: 'nowrap', borderColor: 'divider', color: 'text.primary', textTransform: 'none', fontSize: '0.72rem' }}
                            >
                              Smart QC
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={defPage}
                onChange={(_e, p) => setDefPage(p)}
                size="small"
                color="primary"
              />
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button startIcon={<BackIcon />} onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Button
                  startIcon={<NewSessionIcon />}
                  onClick={handleStartNew}
                  color="inherit"
                >
                  Start New Session
                </Button>
              </Box>
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
      }

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
                      <Typography variant="h3" fontWeight={700}>{totalTests}</Typography>
                      <Typography variant="body2" color="text.secondary">Total Tests</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={700} color="success.main">{passedTests}</Typography>
                      <Typography variant="body2" color="text.secondary">Passed</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={700} color="error.main">{failedTests}</Typography>
                      <Typography variant="body2" color="text.secondary">Failed</Typography>
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
                    <Typography variant="body2" fontWeight="medium">{cs.categoryName}</Typography>
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
                <Button startIcon={<BackIcon />} onClick={() => setActiveStep(1)}>
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

  if (resumeSessionId && loading.session) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Card Quality Test Data Entry
        </Typography>
        <Tooltip title="Show / hide tests from this list">
          <Button variant="outlined" size="small" startIcon={<SettingsIcon />} onClick={openManage}>
            Manage Tests
          </Button>
        </Tooltip>
      </Box>

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

      {/* ── Manage Tests dialog ── */}
      <Dialog open={manageOpen} onClose={() => { setManageOpen(false); setManageSearch(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Manage Tests
          <IconButton size="small" onClick={() => { setManageOpen(false); setManageSearch(''); }}>✕</IconButton>
        </DialogTitle>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search tests…"
            value={manageSearch}
            onChange={e => setManageSearch(e.target.value)}
          />
        </Box>
        <DialogContent sx={{ p: 0 }}>
          <List dense>
            {manageDefs.filter(d => {
              const q = manageSearch.toLowerCase();
              return !q || d.test_name.toLowerCase().includes(q) || d.test_id.toLowerCase().includes(q) || ((d.category as any)?.name ?? '').toLowerCase().includes(q);
            }).map(d => (
              <ListItem
                key={d.id}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', opacity: d.status === 'hidden' ? 0.5 : 1 }}
                secondaryAction={
                  <Tooltip title={d.status === 'hidden' ? 'Show in list' : 'Hide from list'}>
                    <Switch
                      size="small"
                      checked={d.status !== 'hidden'}
                      disabled={togglingId === d.id}
                      onChange={() => handleToggleVisibility(d.id)}
                    />
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={d.test_name}
                  secondaryTypographyProps={{ component: 'div' } as any}
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {d.test_id} · {(d.category as any)?.name ?? ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0, flexWrap: 'wrap', mt: 0.25 }}>
                        {MACHINES.map(machine => {
                          const isTagged = (d.machine_tags ?? []).includes(machine);
                          return (
                            <FormControlLabel
                              key={machine}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={isTagged}
                                  disabled={updatingTagsId === d.id}
                                  onChange={() => handleUpdateMachineTag(d.id, machine, !isTagged)}
                                  sx={{ p: 0.25 }}
                                />
                              }
                              label={<Typography variant="caption">{machine}</Typography>}
                              sx={{ mr: 1, ml: 0 }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default QualityTestDataEntry;
