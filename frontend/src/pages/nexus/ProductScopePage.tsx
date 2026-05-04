import { useCallback, useEffect, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  List, ListItem, ListItemIcon, ListItemText, MenuItem, Paper, Stack,
  Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConformityBadge, { conformityRowTint } from '../../components/nexus/ConformityBadge';
import AlertBanner from '../../components/nexus/AlertBanner';
import {
  createScope, getAudit, listScopes, listSteps, updateScope, updateStep,
  checkScopeGate,
} from '../../services/nexus/nexusService';
import type { ScopeGateResult } from '../../services/nexus/nexusService';
import type {
  AuditGrade, Conformity, NexusAuditRecord, NexusProcessStepAssessment,
  NexusProductScope, ProductCategory,
} from '../../types/nexus';

const RANK_OPTIONS: AuditGrade[] = ['A', 'B', 'C', 'D'];

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'ic',     label: 'IC — Integrated Circuit' },
  { value: 'icm',    label: 'ICM — IC Module' },
  { value: 'il',     label: 'IL — Inlay' },
  { value: 'cb',     label: 'CB — Card Body' },
  { value: 'icc',    label: 'ICC — IC Card' },
  { value: 'p',      label: 'P — Personalisation' },
  { value: 'iacicm', label: 'iacICM — Biometric Module' },
  { value: 'bsm',    label: 'BSM — Biometric Sensor Module' },
  { value: 'iacil',  label: 'iacIL — Biometric Inlay' },
  { value: 'iac',    label: 'IAC — Integrated Antenna Chip' },
];

const CONFORMITY_OPTIONS: Conformity[] = ['Full', 'RI', 'nc-', 'NC+', 'NCC', 'n/a', 'tbd'];

function ProcessStepsTable({
  auditId,
  scope,
}: {
  auditId: number;
  scope: NexusProductScope;
}) {
  const [steps, setSteps] = useState<NexusProcessStepAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const loadSteps = useCallback(async () => {
    setLoading(true);
    try {
      setSteps(await listSteps(auditId, scope.id));
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [auditId, scope.id]);

  useEffect(() => { loadSteps(); }, [loadSteps]);

  const handleConformity = async (step: NexusProcessStepAssessment, conformity: Conformity) => {
    setSaving(s => ({ ...s, [step.id]: true }));
    try {
      const updated = await updateStep(auditId, scope.id, step.id, { conformity });
      setSteps(s => s.map(x => x.id === step.id ? updated : x));
    } finally {
      setSaving(s => ({ ...s, [step.id]: false }));
    }
  };

  const ncCount = steps.filter(s => s.conformity === 'NC+' || s.conformity === 'nc-').length;
  const fullCount = steps.filter(s => s.conformity === 'Full').length;

  if (loading && !loaded) return <CircularProgress size={20} sx={{ m: 2 }} />;

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={1.5} flexWrap="wrap">
        <Chip label={`${steps.length} process steps`} size="small" />
        {fullCount > 0 && <Chip label={`${fullCount} Full`} size="small" color="success" variant="outlined" />}
        {ncCount > 0 && <Chip label={`${ncCount} NC findings`} size="small" color="error" variant="outlined" />}
      </Stack>
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 100, bgcolor: 'background.paper' }}>Tag</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Process Step</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160, bgcolor: 'background.paper' }}>Conformity</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 180, bgcolor: 'background.paper' }}>Vendor Site</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {steps.map(step => (
              <TableRow
                key={step.id}
                sx={{ bgcolor: conformityRowTint(step.conformity) }}
              >
                <TableCell>
                  <Chip
                    label={step.process_tag}
                    size="small"
                    sx={{ fontFamily: 'monospace', fontSize: 10, bgcolor: 'action.hover' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{step.process_name}</Typography>
                </TableCell>
                <TableCell>
                  {saving[step.id]
                    ? <CircularProgress size={16} />
                    : (
                      <TextField
                        select
                        size="small"
                        value={step.conformity}
                        onChange={e => handleConformity(step, e.target.value as Conformity)}
                        sx={{ width: 130 }}
                      >
                        {CONFORMITY_OPTIONS.map(c => (
                          <MenuItem key={c} value={c}><ConformityBadge value={c} /></MenuItem>
                        ))}
                      </TextField>
                    )
                  }
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={step.vendor_site ?? ''}
                    onChange={e => setSteps(s => s.map(x => x.id === step.id ? { ...x, vendor_site: e.target.value } : x))}
                    onBlur={e => updateStep(auditId, scope.id, step.id, { vendor_site: e.target.value })}
                    placeholder="Site/location…"
                    sx={{ '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }}
                    fullWidth
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function ProductScopePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [scopes, setScopes] = useState<NexusProductScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCategory, setAddingCategory] = useState<ProductCategory | ''>('');
  const [adding, setAdding] = useState(false);
  const [gateDialog, setGateDialog] = useState<{ gate: ScopeGateResult; targetRank: string } | null>(null);
  const [rankSaving, setRankSaving] = useState<Record<number, boolean>>({});

  const existingCategories = scopes.map(s => s.product_category);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([getAudit(auditId), listScopes(auditId)]);
      setAudit(a);
      setScopes(s);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleAddScope = async () => {
    if (!addingCategory) return;
    setAdding(true);
    try {
      await createScope(auditId, { product_category: addingCategory });
      setAddingCategory('');
      load();
    } finally {
      setAdding(false);
    }
  };

  const handleToggleInScope = async (scope: NexusProductScope) => {
    await updateScope(auditId, scope.id, { in_scope: !scope.in_scope });
    setScopes(s => s.map(x => x.id === scope.id ? { ...x, in_scope: !scope.in_scope } : x));
  };

  const handleRankChange = async (scope: NexusProductScope, rank: string) => {
    if (!rank) return;
    // D is always allowed; A/B/C requires gate
    if (['A', 'B', 'C'].includes(rank)) {
      const gate = await checkScopeGate(auditId, scope.id);
      if (!gate.passed) {
        setGateDialog({ gate, targetRank: rank });
        return;
      }
    }
    setRankSaving(s => ({ ...s, [scope.id]: true }));
    try {
      const updated = await updateScope(auditId, scope.id, { rank: rank as AuditGrade });
      setScopes(s => s.map(x => x.id === scope.id ? { ...x, rank: updated.rank } : x));
    } finally {
      setRankSaving(s => ({ ...s, [scope.id]: false }));
    }
  };

  const availableToAdd = PRODUCT_CATEGORIES.filter(c => !existingCategories.includes(c.value));

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
          {audit?.site_name ?? 'Audit'}
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Product Scope & Process Steps</Typography>
          <Typography variant="body2" color="text.secondary">
            Select in-scope product types and assess conformity across all process steps.
            NC+/nc- ratings auto-create CAPA items.
          </Typography>
        </Box>
      </Stack>

      {/* ── Add Scope ── */}
      {availableToAdd.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              select
              size="small"
              label="Add product category"
              value={addingCategory}
              onChange={e => setAddingCategory(e.target.value as ProductCategory)}
              sx={{ width: 320 }}
            >
              <MenuItem value="">— select category —</MenuItem>
              {availableToAdd.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddScope}
              disabled={!addingCategory || adding}
            >
              {adding ? 'Adding…' : 'Add & Seed Steps'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Process steps will be auto-seeded from the CQMAP V3.A process step library.
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* ── Scope Accordions ── */}
      {scopes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">
            No product categories added yet. Use the selector above to add your first in-scope product type.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {scopes.map(scope => {
            const catLabel = PRODUCT_CATEGORIES.find(c => c.value === scope.product_category)?.label ?? scope.product_category;
            return (
              <Accordion key={scope.id} variant="outlined" sx={{ borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                    <Tooltip title="Toggle in-scope">
                      <Switch
                        checked={scope.in_scope}
                        onChange={() => handleToggleInScope(scope)}
                        color="success"
                        size="small"
                        onClick={e => e.stopPropagation()}
                      />
                    </Tooltip>
                    <Typography fontWeight={700} sx={{ flex: 1 }}>{catLabel}</Typography>
                    {scope.in_scope
                      ? <Chip label="In Scope" size="small" color="success" />
                      : <Chip label="Out of Scope" size="small" color="default" />}

                    {/* Rank selector with gate enforcement */}
                    {rankSaving[scope.id] ? <CircularProgress size={16} /> : (
                      <Tooltip title="Rank A/B/C requires #0706# gate to pass. D can always be set.">
                        <TextField
                          select size="small"
                          value={scope.rank ?? ''}
                          onChange={e => { e.stopPropagation(); handleRankChange(scope, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          sx={{ width: 110 }}
                          label="Rank"
                          SelectProps={{
                            startAdornment: scope.rank && ['A', 'B', 'C'].includes(scope.rank)
                              ? undefined
                              : <LockIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.disabled' }} />,
                          }}
                        >
                          <MenuItem value="">— unset —</MenuItem>
                          {RANK_OPTIONS.map(r => (
                            <MenuItem key={r} value={r}>
                              <Chip
                                label={`Rank ${r}`}
                                size="small"
                                color={r === 'A' ? 'success' : r === 'B' ? 'info' : r === 'C' ? 'warning' : 'error'}
                                sx={{ fontSize: 11 }}
                              />
                            </MenuItem>
                          ))}
                        </TextField>
                      </Tooltip>
                    )}

                    <Chip
                      label={scope.cert_outcome}
                      size="small"
                      color={scope.cert_outcome === 'Certified' ? 'success' : scope.cert_outcome === 'tbd' ? 'default' : 'warning'}
                      variant="outlined"
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <ProcessStepsTable auditId={auditId} scope={scope} />
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      {/* ── Gate blocked dialog ── */}
      <Dialog open={!!gateDialog} onClose={() => setGateDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LockIcon color="error" />
            <Typography fontWeight={700}>#0706# Gate Not Passed</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Rank {gateDialog?.targetRank} cannot be assigned until the qualification gate passes.
            {!gateDialog?.gate.hasPlan && ' Create a qualification plan for this product first.'}
          </Alert>
          {(gateDialog?.gate.conditions?.length ?? 0) > 0 && (
            <>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Gate conditions:</Typography>
              <List dense>
                {(gateDialog?.gate.conditions ?? []).map((c, i) => (
                  <ListItem key={i} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {c.passed
                        ? <CheckCircleIcon color="success" fontSize="small" />
                        : <CancelIcon color="error" fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={c.label}
                      secondary={!c.passed && c.detail ? c.detail : undefined}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: c.passed ? 400 : 600 }}
                      secondaryTypographyProps={{ variant: 'caption', color: 'error' }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGateDialog(null)}>Close</Button>
          {gateDialog?.gate.hasPlan && (
            <Button variant="outlined" onClick={() => setGateDialog(null)}>
              Go to Qualification Plans →
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
