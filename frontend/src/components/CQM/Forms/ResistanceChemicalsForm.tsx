import React, { useState, useRef, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Paper,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface ResistanceChemicalsFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

const CHEMICAL_ASSIGNMENTS = [
  { cardId: 'CGRC01', label: 'Acid Solution',    chemicals: 'Sodium Phosphate Monobasic / Sodium Phosphate Dibasic / L-Histidine' },
  { cardId: 'CGRC02', label: 'Alkaline Solution', chemicals: 'Sodium Carbonate' },
  { cardId: 'CGRC03', label: 'Acetic Acid',       chemicals: 'Acetic Acid' },
  { cardId: 'CGRC04', label: 'Ethyl Alcohol',     chemicals: 'Ethyl Alcohol' },
  { cardId: 'CGRC05', label: 'Ethylene Glycol',   chemicals: 'Ethylene Glycol' },
  { cardId: 'CGRC06', label: 'Fuel B',            chemicals: 'Toluene / Trimethylpentane' },
  { cardId: 'CGRC07', label: 'Sodium Carbonate',  chemicals: 'Sodium Carbonate' },
  { cardId: 'CGRC08', label: 'NaCl',              chemicals: 'Sodium Chloride' },
  { cardId: 'CGRC09', label: 'Sucrose',           chemicals: 'Sucrose' },
  { cardId: 'CGRC10', label: 'Salt Mist',         chemicals: 'Salt Mist' },
  { cardId: 'CGRC11', label: 'Control Card',      chemicals: 'None (no chemical exposure)' },
];

const REAGENTS = [
  'Sodium Phosphate Monobasic', 'Sodium Phosphate Dibasic', 'L-Histidine',
  'Acetic Acid', 'Ethyl Alcohol', 'Ethylene Glycol',
  'Fuel B - Toluene', 'Fuel B - Trimethylpentane',
  'Sodium Carbonate', 'Sodium Chloride', 'Sucrose',
];

const CONTACTS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] as const;

const BREAKAGE_OPTIONS = ['Adhesive split', 'ICM required', 'Module lifted', 'Substrate split', 'Other'];

const REQUIREMENT_TEXT =
  'The card, including all add-ons like signature panel and hologram, shall comply with all the product requirements defined in this document after being submerged into defined solutions after short term and long term exposure. Holograms and signature panels are not required to pass the salt mist exposure. The individual signal amplitude UI of a present UA, after ≥ 0.90 UA, before; Ui, after ≥ 0.90 UA, after.';

// ── Type definitions ────────────────────────────────────────────────────────

interface PreExposureRow {
  photo?: boolean; height?: string; width?: string; thickness?: string;
  cardWarpage?: string; embossedWarpage?: string; embossedNA?: boolean;
  track2?: boolean; isoRead?: boolean;
}
interface PostExposureRow {
  height?: string; width?: string; thickness?: string;
  cardWarpage?: string; embossedWarpage?: string; embossedNA?: boolean;
  delta?: string; atr?: boolean; ats?: boolean;
}
interface ContactResistanceRow {
  c1Pre?: string; c2Pre?: string; c3Pre?: string; c4Pre?: string; c5Pre?: string; c6Pre?: string;
  c1Post?: string; c2Post?: string; c3Post?: string; c4Post?: string; c5Post?: string; c6Post?: string;
}
interface ModuleAdhesionRow {
  preR1?: string; preR2?: string; preR3?: string; preQFactor?: string;
  postR1?: string; postR2?: string; postR3?: string; postQFactor?: string;
  breakageDescription?: string; cardForce?: string; result?: boolean;
}
interface RtcExtra {
  testDate?: string;
  digitalHeightGaugeId?: string; digitalHeightGaugeCalUntil?: string;
  symmetryScaleId?: string; symmetryScaleCalUntil?: string;
  mag3xMachineId?: string; mag3xSoftwareVersion?: string; mag3xCalUntil?: string;
  envLoggerCalUntil?: string;
  datesVerified?: string;
  phMeterId?: string; phMeterCalUntil?: string; phVerification?: boolean;
  milliohmMeterId?: string; milliohmCalUntil?: string;
  preExposureVisual?: boolean; postExposureVisual?: boolean;
  reagentExpirations?: Record<string, string>;
  preExposure?: Record<string, PreExposureRow>;
  postExposure?: Record<string, PostExposureRow>;
  contactResistance?: Record<string, ContactResistanceRow>;
  moduleAdhesion?: Record<string, ModuleAdhesionRow>;
}

// ── Shared cell renderers (memoized) ────────────────────────────────────────

interface NumCellProps {
  value: string | undefined;
  onChange: (v: string) => void;
  onBlur: () => void;
  width?: number;
}
const NumCell = memo(({ value, onChange, onBlur, width = 70 }: NumCellProps) => (
  <TextField
    type="number" size="small"
    value={value ?? ''}
    onChange={e => onChange(e.target.value)}
    onBlur={onBlur}
    inputProps={{ step: 0.001, style: { textAlign: 'center', padding: '4px', width } }}
    sx={{ width: width + 24 }}
  />
));

interface YnChipProps {
  value: boolean | undefined;
  onTrue: () => void;
  onFalse: () => void;
}
const YnChip = memo(({ value, onTrue, onFalse }: YnChipProps) => (
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    <Chip label="Y" size="small" variant={value === true ? 'filled' : 'outlined'}
      color={value === true ? 'success' : 'default'} onClick={onTrue} sx={{ cursor: 'pointer', minWidth: 32 }} />
    <Chip label="N" size="small" variant={value === false ? 'filled' : 'outlined'}
      color={value === false ? 'error' : 'default'} onClick={onFalse} sx={{ cursor: 'pointer', minWidth: 32 }} />
  </Box>
));

// ── Memoized table row components ────────────────────────────────────────────

interface PreRowProps {
  ca: typeof CHEMICAL_ASSIGNMENTS[number];
  row: PreExposureRow;
  onPatch: (patch: Partial<PreExposureRow>) => void;
  onPatchFlush: (patch: Partial<PreExposureRow>) => void;
  onBlur: () => void;
}
const PreExposureTableRow = memo(({ ca, row, onPatch, onPatchFlush, onBlur }: PreRowProps) => (
  <TableRow sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
    <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>{ca.cardId}</TableCell>
    <TableCell align="center">
      <YnChip value={row.photo}
        onTrue={() => onPatchFlush({ photo: true })}
        onFalse={() => onPatchFlush({ photo: false })} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.height} onChange={v => onPatch({ height: v })} onBlur={onBlur} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.width} onChange={v => onPatch({ width: v })} onBlur={onBlur} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.thickness} onChange={v => onPatch({ thickness: v })} onBlur={onBlur} width={60} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.cardWarpage} onChange={v => onPatch({ cardWarpage: v })} onBlur={onBlur} width={60} />
    </TableCell>
    <TableCell align="center">
      {row.embossedNA
        ? <Typography variant="caption" color="text.secondary">N/A</Typography>
        : <NumCell value={row.embossedWarpage} onChange={v => onPatch({ embossedWarpage: v })} onBlur={onBlur} width={60} />}
    </TableCell>
    <TableCell align="center">
      <Chip label="N/A" size="small" variant={row.embossedNA ? 'filled' : 'outlined'}
        onClick={() => onPatchFlush({ embossedNA: !row.embossedNA })}
        sx={{ cursor: 'pointer' }} />
    </TableCell>
    <TableCell align="center">
      <YnChip value={row.track2}
        onTrue={() => onPatchFlush({ track2: true })}
        onFalse={() => onPatchFlush({ track2: false })} />
    </TableCell>
    <TableCell align="center">
      <YnChip value={row.isoRead}
        onTrue={() => onPatchFlush({ isoRead: true })}
        onFalse={() => onPatchFlush({ isoRead: false })} />
    </TableCell>
  </TableRow>
));

interface PostRowProps {
  ca: typeof CHEMICAL_ASSIGNMENTS[number];
  row: PostExposureRow;
  onPatch: (patch: Partial<PostExposureRow>) => void;
  onPatchFlush: (patch: Partial<PostExposureRow>) => void;
  onBlur: () => void;
}
const PostExposureTableRow = memo(({ ca, row, onPatch, onPatchFlush, onBlur }: PostRowProps) => (
  <TableRow sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
    <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>{ca.cardId}</TableCell>
    <TableCell align="center">
      <NumCell value={row.height} onChange={v => onPatch({ height: v })} onBlur={onBlur} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.width} onChange={v => onPatch({ width: v })} onBlur={onBlur} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.thickness} onChange={v => onPatch({ thickness: v })} onBlur={onBlur} width={60} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.cardWarpage} onChange={v => onPatch({ cardWarpage: v })} onBlur={onBlur} width={60} />
    </TableCell>
    <TableCell align="center">
      {row.embossedNA
        ? <Typography variant="caption" color="text.secondary">N/A</Typography>
        : <NumCell value={row.embossedWarpage} onChange={v => onPatch({ embossedWarpage: v })} onBlur={onBlur} width={60} />}
    </TableCell>
    <TableCell align="center">
      <Chip label="N/A" size="small" variant={row.embossedNA ? 'filled' : 'outlined'}
        onClick={() => onPatchFlush({ embossedNA: !row.embossedNA })}
        sx={{ cursor: 'pointer' }} />
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.delta} onChange={v => onPatch({ delta: v })} onBlur={onBlur} width={60} />
    </TableCell>
    <TableCell align="center">
      <YnChip value={row.atr}
        onTrue={() => onPatchFlush({ atr: true })}
        onFalse={() => onPatchFlush({ atr: false })} />
    </TableCell>
    <TableCell align="center">
      <YnChip value={row.ats}
        onTrue={() => onPatchFlush({ ats: true })}
        onFalse={() => onPatchFlush({ ats: false })} />
    </TableCell>
  </TableRow>
));

interface ContactRowProps {
  ca: typeof CHEMICAL_ASSIGNMENTS[number];
  row: ContactResistanceRow;
  onPatch: (patch: Partial<ContactResistanceRow>) => void;
  onBlur: () => void;
}
const ContactResistanceTableRow = memo(({ ca, row, onPatch, onBlur }: ContactRowProps) => (
  <TableRow sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
    <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>{ca.cardId}</TableCell>
    {(['c1Pre','c2Pre','c3Pre','c4Pre','c5Pre','c6Pre'] as (keyof ContactResistanceRow)[]).map(k => (
      <TableCell key={k} align="center">
        <NumCell value={row[k] as string | undefined} onChange={v => onPatch({ [k]: v })} onBlur={onBlur} width={55} />
      </TableCell>
    ))}
    {(['c1Post','c2Post','c3Post','c4Post','c5Post','c6Post'] as (keyof ContactResistanceRow)[]).map(k => (
      <TableCell key={k} align="center">
        <NumCell value={row[k] as string | undefined} onChange={v => onPatch({ [k]: v })} onBlur={onBlur} width={55} />
      </TableCell>
    ))}
  </TableRow>
));

interface AdhesionRowProps {
  ca: typeof CHEMICAL_ASSIGNMENTS[number];
  row: ModuleAdhesionRow;
  onPatch: (patch: Partial<ModuleAdhesionRow>) => void;
  onPatchFlush: (patch: Partial<ModuleAdhesionRow>) => void;
  onBlur: () => void;
}
const ModuleAdhesionTableRow = memo(({ ca, row, onPatch, onPatchFlush, onBlur }: AdhesionRowProps) => (
  <TableRow sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
    <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>{ca.cardId}</TableCell>
    {(['preR1','preR2','preR3','preQFactor'] as (keyof ModuleAdhesionRow)[]).map(k => (
      <TableCell key={k} align="center">
        <NumCell value={row[k] as string | undefined} onChange={v => onPatch({ [k]: v })} onBlur={onBlur} width={55} />
      </TableCell>
    ))}
    {(['postR1','postR2','postR3','postQFactor'] as (keyof ModuleAdhesionRow)[]).map(k => (
      <TableCell key={k} align="center">
        <NumCell value={row[k] as string | undefined} onChange={v => onPatch({ [k]: v })} onBlur={onBlur} width={55} />
      </TableCell>
    ))}
    <TableCell>
      <TextField select size="small" fullWidth
        value={row.breakageDescription ?? ''}
        onChange={e => onPatchFlush({ breakageDescription: e.target.value })}
        SelectProps={{ native: true }} sx={{ minWidth: 160 }}>
        <option value="" />
        {BREAKAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </TextField>
    </TableCell>
    <TableCell align="center">
      <NumCell value={row.cardForce} onChange={v => onPatch({ cardForce: v })} onBlur={onBlur} width={60} />
    </TableCell>
    <TableCell align="center">
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Chip label="PASS" size="small" variant={row.result === true ? 'filled' : 'outlined'} color={row.result === true ? 'success' : 'default'}
          onClick={() => onPatchFlush({ result: true })} sx={{ cursor: 'pointer', fontWeight: 'bold' }} />
        <Chip label="FAIL" size="small" variant={row.result === false ? 'filled' : 'outlined'} color={row.result === false ? 'error' : 'default'}
          onClick={() => onPatchFlush({ result: false })} sx={{ cursor: 'pointer', fontWeight: 'bold' }} />
      </Box>
    </TableCell>
  </TableRow>
));

// ── Section accordion wrapper ─────────────────────────────────────────────────

interface SectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}
const Section = memo(({ title, defaultExpanded = false, children }: SectionProps) => (
  <Accordion defaultExpanded={defaultExpanded} TransitionProps={{ unmountOnExit: true }} sx={{ mb: 1 }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: 'grey.50', minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
      <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ p: 2 }}>
      {children}
    </AccordionDetails>
  </Accordion>
));

// ── Component ───────────────────────────────────────────────────────────────

const ResistanceChemicalsForm: React.FC<ResistanceChemicalsFormProps> = ({
  def, entry, onUpdateEntry, onUpdateCardEntry,
}) => {
  const cardEntries = entry.cardEntries ?? [];

  const [localMeta, setLocalMeta] = useState<TestEntryMetadata>(
    () => entry.specializedMetadata ?? {}
  );
  const [localExtra, setLocalExtra] = useState<RtcExtra>(
    () => (entry.specializedMetadata?.extraData ?? {}) as RtcExtra
  );

  const latest = useRef({ meta: localMeta, extra: localExtra });
  latest.current = { meta: localMeta, extra: localExtra };

  const flush = useCallback(() => {
    onUpdateEntry(def.id, {
      specializedMetadata: { ...latest.current.meta, extraData: latest.current.extra as Record<string, unknown> },
    });
  }, [def.id, onUpdateEntry]);

  const setMetaAndFlush = useCallback((patch: Partial<TestEntryMetadata>) => {
    setLocalMeta(prev => {
      const next = { ...prev, ...patch };
      latest.current.meta = next;
      onUpdateEntry(def.id, { specializedMetadata: { ...next, extraData: latest.current.extra as Record<string, unknown> } });
      return next;
    });
  }, [def.id, onUpdateEntry]);

  const setExtraAndFlush = useCallback((patch: Partial<RtcExtra>) => {
    setLocalExtra(prev => {
      const next = { ...prev, ...patch };
      latest.current.extra = next;
      onUpdateEntry(def.id, { specializedMetadata: { ...latest.current.meta, extraData: next as Record<string, unknown> } });
      return next;
    });
  }, [def.id, onUpdateEntry]);

  // ── Table row patch helpers — stable per-cardId callbacks ─────────────────

  const patchPreRow = useCallback((cardId: string, patch: Partial<PreExposureRow>) =>
    setLocalExtra(prev => ({
      ...prev,
      preExposure: { ...prev.preExposure, [cardId]: { ...(prev.preExposure?.[cardId] ?? {}), ...patch } },
    })), []);

  const patchPreRowFlush = useCallback((cardId: string, patch: Partial<PreExposureRow>) => {
    setLocalExtra(prev => {
      const next = { ...prev, preExposure: { ...prev.preExposure, [cardId]: { ...(prev.preExposure?.[cardId] ?? {}), ...patch } } };
      latest.current.extra = next;
      onUpdateEntry(def.id, { specializedMetadata: { ...latest.current.meta, extraData: next } });
      return next;
    });
  }, [def.id, onUpdateEntry]);

  const patchPostRow = useCallback((cardId: string, patch: Partial<PostExposureRow>) =>
    setLocalExtra(prev => ({
      ...prev,
      postExposure: { ...prev.postExposure, [cardId]: { ...(prev.postExposure?.[cardId] ?? {}), ...patch } },
    })), []);

  const patchPostRowFlush = useCallback((cardId: string, patch: Partial<PostExposureRow>) => {
    setLocalExtra(prev => {
      const next = { ...prev, postExposure: { ...prev.postExposure, [cardId]: { ...(prev.postExposure?.[cardId] ?? {}), ...patch } } };
      latest.current.extra = next;
      onUpdateEntry(def.id, { specializedMetadata: { ...latest.current.meta, extraData: next } });
      return next;
    });
  }, [def.id, onUpdateEntry]);

  const patchContactRow = useCallback((cardId: string, patch: Partial<ContactResistanceRow>) =>
    setLocalExtra(prev => ({
      ...prev,
      contactResistance: { ...prev.contactResistance, [cardId]: { ...(prev.contactResistance?.[cardId] ?? {}), ...patch } },
    })), []);

  const patchAdhRow = useCallback((cardId: string, patch: Partial<ModuleAdhesionRow>) =>
    setLocalExtra(prev => ({
      ...prev,
      moduleAdhesion: { ...prev.moduleAdhesion, [cardId]: { ...(prev.moduleAdhesion?.[cardId] ?? {}), ...patch } },
    })), []);

  const patchAdhRowFlush = useCallback((cardId: string, patch: Partial<ModuleAdhesionRow>) => {
    setLocalExtra(prev => {
      const next = { ...prev, moduleAdhesion: { ...prev.moduleAdhesion, [cardId]: { ...(prev.moduleAdhesion?.[cardId] ?? {}), ...patch } } };
      latest.current.extra = next;
      onUpdateEntry(def.id, { specializedMetadata: { ...latest.current.meta, extraData: next } });
      return next;
    });
  }, [def.id, onUpdateEntry]);

  React.useEffect(() => {
    if (cardEntries.length === 0) {
      const cards: CardEntryData[] = CHEMICAL_ASSIGNMENTS.map((ca, i) => ({
        sampleCardId: 0, cardNumber: i + 1, passStatus: undefined, notes: ca.label, isValid: false,
      }));
      onUpdateEntry(def.id, { sampleCount: 11, cardEntries: cards });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardResult = (cardNumber: number, pass: boolean) =>
    onUpdateCardEntry(def.id, cardNumber, { passStatus: pass, isValid: true });

  const reagentExp = localExtra.reagentExpirations ?? {};

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Resistance to Chemicals Test Log — CQM 2.19, Section 10.1.6 &nbsp;(DICC Cards — Returned Cards)
      </Typography>

      {/* ── Section A: Header (always visible) ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Test Method" size="small" fullWidth value="#8190#"
                InputProps={{ readOnly: true }} helperText="Fixed: #8190#" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="# of Samples Tested" size="small" fullWidth type="number"
                value={entry.sampleCount ?? 11}
                onChange={e => onUpdateEntry(def.id, { sampleCount: parseInt(e.target.value) || 11 })}
                inputProps={{ min: 1, max: 20 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Technician" size="small" fullWidth
                value={localMeta.technician ?? ''}
                onChange={e => setLocalMeta(p => ({ ...p, technician: e.target.value }))}
                onBlur={flush} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Time" size="small" fullWidth type="time"
                value={localMeta.testTime ?? ''}
                onChange={e => setLocalMeta(p => ({ ...p, testTime: e.target.value }))}
                onBlur={flush} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date" size="small" fullWidth type="date"
                value={localExtra.testDate ?? ''}
                onChange={e => setLocalExtra(p => ({ ...p, testDate: e.target.value }))}
                onBlur={flush} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Temperature (°C)" size="small" fullWidth type="number"
                value={localMeta.temperatureC ?? ''}
                onChange={e => setLocalMeta(p => ({ ...p, temperatureC: e.target.value }))}
                onBlur={flush} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Relative Humidity (%)" size="small" fullWidth type="number"
                value={localMeta.humidityPct ?? ''}
                onChange={e => setLocalMeta(p => ({ ...p, humidityPct: e.target.value }))}
                onBlur={flush} />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
            <Typography variant="caption" fontWeight="bold">Requirement:</Typography>
            <Typography variant="caption" display="block">{REQUIREMENT_TEXT}</Typography>
          </Alert>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Pre-Exposure Visual Inspection</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={localExtra.preExposureVisual === true ? 'contained' : 'outlined'} color="success" size="small"
                onClick={() => setExtraAndFlush({ preExposureVisual: true })} sx={{ minWidth: 80, fontWeight: 'bold' }}>PASS</Button>
              <Button variant={localExtra.preExposureVisual === false ? 'contained' : 'outlined'} color="error" size="small"
                onClick={() => setExtraAndFlush({ preExposureVisual: false })} sx={{ minWidth: 80, fontWeight: 'bold' }}>FAIL</Button>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Post-Exposure Visual Inspection</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={localExtra.postExposureVisual === true ? 'contained' : 'outlined'} color="success" size="small"
                onClick={() => setExtraAndFlush({ postExposureVisual: true })} sx={{ minWidth: 80, fontWeight: 'bold' }}>PASS</Button>
              <Button variant={localExtra.postExposureVisual === false ? 'contained' : 'outlined'} color="error" size="small"
                onClick={() => setExtraAndFlush({ postExposureVisual: false })} sx={{ minWidth: 80, fontWeight: 'bold' }}>FAIL</Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* ── Section A2: Equipment IDs (collapsible) ── */}
      <Section title="Equipment IDs & Calibration">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Digital Height Gauge ID#" size="small" fullWidth
              value={localExtra.digitalHeightGaugeId ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, digitalHeightGaugeId: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cal. Valid Until" size="small" fullWidth type="date"
              value={localExtra.digitalHeightGaugeCalUntil ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, digitalHeightGaugeCalUntil: e.target.value }))}
              onBlur={flush} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Symmetry Electronic Scale ID#" size="small" fullWidth
              value={localExtra.symmetryScaleId ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, symmetryScaleId: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cal. Valid Until" size="small" fullWidth type="date"
              value={localExtra.symmetryScaleCalUntil ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, symmetryScaleCalUntil: e.target.value }))}
              onBlur={flush} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Mag3x R/W Gold Machine ID#" size="small" fullWidth
              value={localExtra.mag3xMachineId ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, mag3xMachineId: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Software Version" size="small" fullWidth
              value={localExtra.mag3xSoftwareVersion ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, mag3xSoftwareVersion: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Cal. Valid Until" size="small" fullWidth type="date"
              value={localExtra.mag3xCalUntil ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, mag3xCalUntil: e.target.value }))}
              onBlur={flush} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Environmental Logger ID#" size="small" fullWidth
              value={localMeta.envLoggerId ?? ''}
              onChange={e => setLocalMeta(p => ({ ...p, envLoggerId: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cal. Valid Until (Logger)" size="small" fullWidth type="date"
              value={localExtra.envLoggerCalUntil ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, envLoggerCalUntil: e.target.value }))}
              onBlur={flush} InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12}><Divider><Typography variant="caption">pH &amp; Milliohm</Typography></Divider></Grid>

          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="caption" color="text.secondary">Sample Preconditioned</Typography>
              <RadioGroup row
                value={localMeta.samplePreconditioned === undefined ? '' : localMeta.samplePreconditioned ? 'Y' : 'N'}
                onChange={e => setMetaAndFlush({ samplePreconditioned: e.target.value === 'Y' })}>
                <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
                <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
              </RadioGroup>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Dates Verified" size="small" fullWidth
              value={localExtra.datesVerified ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, datesVerified: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="pH Meter ID#" size="small" fullWidth
              value={localExtra.phMeterId ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, phMeterId: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cal. Valid Until (pH)" size="small" fullWidth type="date"
              value={localExtra.phMeterCalUntil ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, phMeterCalUntil: e.target.value }))}
              onBlur={flush} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="caption" color="text.secondary">pH Verification</Typography>
              <RadioGroup row
                value={localExtra.phVerification === undefined ? '' : localExtra.phVerification ? 'Y' : 'N'}
                onChange={e => setExtraAndFlush({ phVerification: e.target.value === 'Y' })}>
                <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
                <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
              </RadioGroup>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} />
          <Grid item xs={12} sm={6}>
            <TextField label="Milliohm Meter ID#" size="small" fullWidth
              value={localExtra.milliohmMeterId ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, milliohmMeterId: e.target.value }))}
              onBlur={flush} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cal. Valid Until (Milliohm)" size="small" fullWidth type="date"
              value={localExtra.milliohmCalUntil ?? ''}
              onChange={e => setLocalExtra(p => ({ ...p, milliohmCalUntil: e.target.value }))}
              onBlur={flush} InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
      </Section>

      {/* ── Section B: Reagent expiration dates (collapsible) ── */}
      <Section title="Chemical ID# & Expiration Dates">
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Chemical ID#</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Expiration Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {REAGENTS.map(reagent => (
                <TableRow key={reagent} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>{reagent}</TableCell>
                  <TableCell align="center">
                    <TextField type="date" size="small"
                      value={reagentExp[reagent] ?? ''}
                      onChange={e => setLocalExtra(p => ({
                        ...p, reagentExpirations: { ...p.reagentExpirations, [reagent]: e.target.value },
                      }))}
                      onBlur={flush}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ style: { width: 130 } }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {/* ── Section C: Card results (expanded by default — primary action) ── */}
      <Section title="Card Results — Chemical Exposure">
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Card ID#</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Chemical / Solution</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reagents</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CHEMICAL_ASSIGNMENTS.map((ca, i) => {
                const ce = cardEntries.find(c => c.cardNumber === i + 1);
                const pass = ce?.passStatus;
                const isControl = ca.cardId === 'CGRC11';
                return (
                  <TableRow key={ca.cardId} sx={{ '&:hover': { backgroundColor: 'action.hover' }, backgroundColor: isControl ? 'action.selected' : 'inherit' }}>
                    <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>{ca.cardId}</TableCell>
                    <TableCell sx={{ fontWeight: isControl ? 'bold' : 'normal' }}>{ca.label}</TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{ca.chemicals}</Typography></TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Chip label="PASS" size="small" variant={pass === true ? 'filled' : 'outlined'} color={pass === true ? 'success' : 'default'}
                          onClick={() => handleCardResult(i + 1, true)} sx={{ cursor: 'pointer', fontWeight: 'bold', minWidth: 55 }} />
                        <Chip label="FAIL" size="small" variant={pass === false ? 'filled' : 'outlined'} color={pass === false ? 'error' : 'default'}
                          onClick={() => handleCardResult(i + 1, false)} sx={{ cursor: 'pointer', fontWeight: 'bold', minWidth: 55 }} />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {/* ── Section D: Pre-Exposure Dimensional (collapsible, unmounts on close) ── */}
      <Section title="Pre-Exposure Returned Cards — Dimensional Measurements">
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Photo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Height (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Width (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thickness (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Card Warpage<br /><Typography variant="caption">&lt;2.0 mm</Typography></TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Embossed Warpage<br /><Typography variant="caption">&lt;2.5 mm</Typography></TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>N/A<br /><Typography variant="caption">(Emb)</Typography></TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Track 2</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ISO Read</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CHEMICAL_ASSIGNMENTS.map(ca => (
                <PreExposureTableRow
                  key={ca.cardId}
                  ca={ca}
                  row={localExtra.preExposure?.[ca.cardId] ?? {}}
                  onPatch={patch => patchPreRow(ca.cardId, patch)}
                  onPatchFlush={patch => patchPreRowFlush(ca.cardId, patch)}
                  onBlur={flush}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {/* ── Section E: Post-Exposure Dimensional (collapsible, unmounts on close) ── */}
      <Section title="Post-Exposure Returned Cards — Dimensional Measurements">
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Height (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Width (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thickness (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Card Warpage<br /><Typography variant="caption">&lt;1.5 mm</Typography></TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Embossed Warpage</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>N/A<br /><Typography variant="caption">(Emb)</Typography></TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Δ Delta</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ATR</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ATS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CHEMICAL_ASSIGNMENTS.map(ca => (
                <PostExposureTableRow
                  key={ca.cardId}
                  ca={ca}
                  row={localExtra.postExposure?.[ca.cardId] ?? {}}
                  onPatch={patch => patchPostRow(ca.cardId, patch)}
                  onPatchFlush={patch => patchPostRowFlush(ca.cardId, patch)}
                  onBlur={flush}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {/* ── Section F: Contact Resistance (collapsible, unmounts on close) ── */}
      <Section title="Contact Resistance Log — Porthmet (Unit: Ω)">
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Card ID#</TableCell>
                {CONTACTS.map(c => (
                  <TableCell key={`pre-${c}`} align="center" sx={{ fontWeight: 'bold' }}>
                    {c}<br /><Typography variant="caption" color="text.secondary">Pre</Typography>
                  </TableCell>
                ))}
                {CONTACTS.map(c => (
                  <TableCell key={`post-${c}`} align="center" sx={{ fontWeight: 'bold' }}>
                    {c}<br /><Typography variant="caption" color="text.secondary">Post</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {CHEMICAL_ASSIGNMENTS.filter(ca => ca.cardId !== 'CGRC11').map(ca => (
                <ContactResistanceTableRow
                  key={ca.cardId}
                  ca={ca}
                  row={localExtra.contactResistance?.[ca.cardId] ?? {}}
                  onPatch={patch => patchContactRow(ca.cardId, patch)}
                  onBlur={flush}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {/* ── Section G: Module Adhesion (collapsible, unmounts on close) ── */}
      <Section title="Module Adhesion Log">
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Card ID#</TableCell>
                <TableCell align="center" colSpan={4} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224,224,224,1)' }}>Pre Test (Mils / Q Factor)</TableCell>
                <TableCell align="center" colSpan={4} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224,224,224,1)' }}>Post Test (Mils / Q Factor)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description of Breakage</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Card Force (N)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell />
                {['R1','R2','R3','Q Factor'].map(h => (
                  <TableCell key={`pre-${h}`} align="center" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
                {['R1','R2','R3','Q Factor'].map(h => (
                  <TableCell key={`post-${h}`} align="center" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
                <TableCell /><TableCell /><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {CHEMICAL_ASSIGNMENTS.filter(ca => ca.cardId !== 'CGRC11').map(ca => (
                <ModuleAdhesionTableRow
                  key={ca.cardId}
                  ca={ca}
                  row={localExtra.moduleAdhesion?.[ca.cardId] ?? {}}
                  onPatch={patch => patchAdhRow(ca.cardId, patch)}
                  onPatchFlush={patch => patchAdhRowFlush(ca.cardId, patch)}
                  onBlur={flush}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {/* ── Section H: Job Notes ── */}
      <Box sx={{ mt: 2 }}>
        <TextField label="Job Notes" size="small" fullWidth multiline rows={3}
          value={localMeta.jobNotes ?? ''}
          onChange={e => setLocalMeta(p => ({ ...p, jobNotes: e.target.value }))}
          onBlur={flush} />
      </Box>
    </Box>
  );
};

export default ResistanceChemicalsForm;
