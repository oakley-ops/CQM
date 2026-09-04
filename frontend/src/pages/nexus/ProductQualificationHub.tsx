import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, ListItemText, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useNavigate, useParams } from 'react-router-dom';
import AlertBanner from '../../components/nexus/AlertBanner';
import GateControl from '../../components/nexus/GateControl';
import DesignReviewSignOff from '../../components/nexus/DesignReviewSignOff';
import {
  getAudit, listPlans, createPlan, getPlan, updatePlan, updateItem, createItem, deleteItem, listScopes,
  uploadItemEvidence, viewItemEvidence, deleteItemEvidence, checkGate,
} from '../../services/nexus/nexusService';
import type {
  NexusAuditRecord, NexusQualificationPlan, NexusPlanDetail, NexusProductScope,
  NexusQualificationItem, NexusDesignReview, ItemStatus, PlanStatus,
} from '../../types/nexus';

function scopeLabel(scope?: NexusProductScope): string {
  if (!scope) return '';
  return `${scope.product_category.toUpperCase()} — ${scope.product_variant ?? 'unspecified'}`;
}

const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string; color: 'default' | 'info' | 'success' | 'warning' }[] = [
  { value: 'pending',        label: 'Pending',        color: 'default' },
  { value: 'in-progress',    label: 'In Progress',    color: 'info' },
  { value: 'complete',       label: 'Complete',       color: 'success' },
  { value: 'not-applicable', label: 'N/A',            color: 'warning' },
];

const PLAN_STATUS_OPTIONS: PlanStatus[] = ['draft', 'in-progress', 'submitted', 'approved', 'rejected'];

const EVIDENCE_TYPE_OPTIONS = ['document', 'test-session', 'design-review', 'capa'];

// Common equipment-qualification checklist items (WI-NEXUS-EQUIP-001 §7 Step 5) —
// selecting one pre-fills the Add Item dialog; fields stay editable afterward.
const ITEM_TEMPLATES: { label: string; requirement_id: string; section: string; evidence_type: string }[] = [
  { label: 'Factory Acceptance Test (FAT) report obtained and reviewed', requirement_id: '', section: '', evidence_type: 'document' },
  { label: 'Installation and utilities verification (IQ) signed off', requirement_id: '', section: '', evidence_type: 'document' },
  { label: 'Punch/production tool registered in the CQM tool registry', requirement_id: '', section: '', evidence_type: 'document' },
  { label: 'Operator training on the new equipment completed and recorded', requirement_id: '#0461#', section: '6.2', evidence_type: 'document' },
  { label: 'Work instruction updated for the new equipment', requirement_id: '#0482#', section: '6.3', evidence_type: 'document' },
  { label: 'First-article run completed (note the lot code)', requirement_id: '#0701#', section: '5.2', evidence_type: 'test-session' },
  { label: 'Width and Height verification [ISO 7810]', requirement_id: '#3002#', section: '', evidence_type: 'test-session' },
  { label: 'Corners verification [ISO 7810]', requirement_id: '#3005#', section: '', evidence_type: 'test-session' },
  { label: 'Card Edges verification [ISO 7810]', requirement_id: '#3006#', section: '', evidence_type: 'test-session' },
  { label: 'Overall Card Warpage verification [ISO 7810]', requirement_id: '#3007#', section: '', evidence_type: 'test-session' },
  { label: 'Cpk capability study ≥ 1.33 on critical dimensions (30 cards)', requirement_id: '#0811#', section: '5.4', evidence_type: 'test-session' },
  { label: 'Final review and production release sign-off', requirement_id: '#0571#', section: '4.9', evidence_type: 'design-review' },
];

function planStatusColor(s: PlanStatus): 'default' | 'info' | 'success' | 'error' | 'warning' {
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'error';
  if (s === 'submitted') return 'info';
  if (s === 'in-progress') return 'warning';
  return 'default';
}

function PlanDetail({
  auditId,
  plan,
  onBack,
}: {
  auditId: number;
  plan: NexusQualificationPlan;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<NexusPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState<Record<number, boolean>>({});
  const [uploadingItem, setUploadingItem] = useState<Record<number, boolean>>({});
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '', requirement_id: '', section: '', evidence_type: '', responsible: '', target_date: '', notes: '',
  });
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const bulkMode = selectedTemplates.length >= 2;
  const resetAddItemForm = () => {
    setNewItem({ title: '', requirement_id: '', section: '', evidence_type: '', responsible: '', target_date: '', notes: '' });
    setSelectedTemplates([]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getPlan(auditId, plan.id));
    } finally {
      setLoading(false);
    }
  }, [auditId, plan.id]);

  useEffect(() => { load(); }, [load]);

  const handleItemStatus = async (item: NexusQualificationItem, status: ItemStatus) => {
    if (!detail) return;
    setSavingItem(s => ({ ...s, [item.id]: true }));
    try {
      await updateItem(auditId, plan.id, item.id, { status });
      // One refetch covers both the updated item and the recomputed gate
      setDetail(await getPlan(auditId, plan.id));
    } finally {
      setSavingItem(s => ({ ...s, [item.id]: false }));
    }
  };

  const handleItemBlur = async (item: NexusQualificationItem, field: keyof NexusQualificationItem, value: string) => {
    if (!detail) return;
    const updated = await updateItem(auditId, plan.id, item.id, { [field]: value });
    setDetail(d => d ? { ...d, items: d.items.map(i => i.id === item.id ? updated : i) } : d);
  };

  const handleStatusChange = async (status: PlanStatus) => {
    await updatePlan(auditId, plan.id, { status });
    const refreshed = await getPlan(auditId, plan.id);
    setDetail(refreshed);
  };

  const handleReviewsUpdate = async (updated: NexusDesignReview[]) => {
    // Apply the passed-in array (draft edits on every keystroke, or the
    // server-confirmed row after a save) straight to local state — a full
    // plan refetch here would race the still-typing field and blow away
    // whatever the user just typed with the stale server value.
    setDetail(d => d ? { ...d, reviews: updated } : d);
    // The gate depends on review outcomes, so refresh it separately —
    // lightweight, and never touches items/reviews.
    const gate = await checkGate(auditId, plan.id);
    setDetail(d => d ? { ...d, gate } : d);
  };

  const handleAddItem = async () => {
    setAddingItem(true);
    try {
      if (bulkMode) {
        const templates = ITEM_TEMPLATES.filter(t => selectedTemplates.includes(t.label));
        await Promise.all(templates.map(t => createItem(auditId, plan.id, {
          title: t.label,
          requirement_id: t.requirement_id || undefined,
          section: t.section || undefined,
          evidence_type: t.evidence_type || undefined,
          responsible: newItem.responsible || undefined,
          target_date: newItem.target_date || undefined,
          notes: newItem.notes || undefined,
        })));
      } else {
        await createItem(auditId, plan.id, {
          title: newItem.title,
          requirement_id: newItem.requirement_id || undefined,
          section: newItem.section || undefined,
          evidence_type: newItem.evidence_type || undefined,
          responsible: newItem.responsible || undefined,
          target_date: newItem.target_date || undefined,
          notes: newItem.notes || undefined,
        });
      }
      setAddItemOpen(false);
      resetAddItemForm();
      setDetail(await getPlan(auditId, plan.id));
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (item: NexusQualificationItem) => {
    if (!window.confirm(`Remove checklist item "${item.title}"? This cannot be undone.`)) return;
    await deleteItem(auditId, plan.id, item.id);
    setDetail(await getPlan(auditId, plan.id));
  };

  const handleUploadEvidence = async (item: NexusQualificationItem, file: File) => {
    setUploadingItem(s => ({ ...s, [item.id]: true }));
    try {
      const updated = await uploadItemEvidence(auditId, plan.id, item.id, file);
      setDetail(d => d ? { ...d, items: d.items.map(i => i.id === item.id ? updated : i) } : d);
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Failed to upload the file.';
      window.alert(message);
    } finally {
      setUploadingItem(s => ({ ...s, [item.id]: false }));
    }
  };

  const handleRemoveEvidence = async (item: NexusQualificationItem) => {
    if (!window.confirm(`Remove the attached file "${item.evidence_file_name}"? This cannot be undone.`)) return;
    const updated = await deleteItemEvidence(auditId, plan.id, item.id);
    setDetail(d => d ? { ...d, items: d.items.map(i => i.id === item.id ? updated : i) } : d);
  };

  if (loading && !detail) return <CircularProgress size={24} sx={{ m: 3 }} />;
  if (!detail) return null;

  const completedCount = detail.items.filter(i => i.status === 'complete' || i.status === 'not-applicable').length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>All Plans</Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {detail.plan_type === 'product' ? 'Product' : 'Process'} Qualification Plan
            {' '}v{detail.version}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {completedCount} / {detail.items.length} checklist items complete
          </Typography>
        </Box>
        <TextField
          select size="small" label="Status"
          value={detail.status}
          onChange={e => handleStatusChange(e.target.value as PlanStatus)}
          sx={{ width: 150 }}
        >
          {PLAN_STATUS_OPTIONS.map(s => (
            <MenuItem key={s} value={s}>
              <Chip label={s} size="small" color={planStatusColor(s)} />
            </MenuItem>
          ))}
        </TextField>
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} variant="outlined">Refresh</Button>
      </Stack>

      {/* Gate control */}
      <Box mb={2}>
        <GateControl gate={detail.gate} />
      </Box>

      {/* Checklist */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, width: 90 }}>Req. ID</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 60 }}>Section</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Checklist Item</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 200 }}>Evidence Ref</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>File</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Responsible</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 50 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {detail.items.map(item => (
                <TableRow
                  key={item.id}
                  sx={{
                    bgcolor: item.status === 'complete'
                      ? 'rgba(46,125,50,0.04)'
                      : item.status === 'not-applicable'
                        ? 'rgba(158,158,158,0.04)'
                        : 'inherit',
                  }}
                >
                  <TableCell>
                    {item.requirement_id && (
                      <Chip label={item.requirement_id} size="small" sx={{ fontFamily: 'monospace', fontSize: 10 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{item.section ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.title}</Typography>
                    {item.notes && (
                      <Typography variant="caption" color="text.secondary">{item.notes}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{item.evidence_type ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" placeholder="Evidence reference…"
                      value={item.evidence_ref ?? ''}
                      onChange={e => setDetail(d => d ? { ...d, items: d.items.map(i => i.id === item.id ? { ...i, evidence_ref: e.target.value } : i) } : d)}
                      onBlur={e => handleItemBlur(item, 'evidence_ref', e.target.value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    {uploadingItem[item.id] ? (
                      <CircularProgress size={16} />
                    ) : item.evidence_file_name ? (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title={`View ${item.evidence_file_name}`}>
                          <Chip
                            icon={<PictureAsPdfIcon fontSize="small" />}
                            label={item.evidence_file_name}
                            size="small"
                            onClick={() => viewItemEvidence(auditId, plan.id, item.id)}
                            sx={{ maxWidth: 110, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                          />
                        </Tooltip>
                        <Tooltip title="Remove attached file">
                          <IconButton size="small" onClick={() => handleRemoveEvidence(item)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Tooltip title="Attach a PDF as evidence">
                        <IconButton size="small" component="label">
                          <UploadFileIcon fontSize="small" />
                          <input
                            type="file"
                            accept="application/pdf"
                            hidden
                            onChange={e => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) handleUploadEvidence(item, file);
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" placeholder="Person…"
                      value={item.responsible ?? ''}
                      onChange={e => setDetail(d => d ? { ...d, items: d.items.map(i => i.id === item.id ? { ...i, responsible: e.target.value } : i) } : d)}
                      onBlur={e => handleItemBlur(item, 'responsible', e.target.value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    {savingItem[item.id] ? <CircularProgress size={16} /> : (
                      <TextField
                        select size="small"
                        value={item.status}
                        onChange={e => handleItemStatus(item, e.target.value as ItemStatus)}
                        sx={{ width: 130 }}
                      >
                        {ITEM_STATUS_OPTIONS.map(o => (
                          <MenuItem key={o.value} value={o.value}>
                            <Chip label={o.label} size="small" color={o.color} />
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Remove this checklist item">
                      <IconButton size="small" color="error" onClick={() => handleDeleteItem(item)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button size="small" startIcon={<AddIcon />} onClick={() => setAddItemOpen(true)} sx={{ mb: 2 }}>
        Add Item
      </Button>

      {/* Add checklist item dialog */}
      <Dialog open={addItemOpen} onClose={() => { setAddItemOpen(false); resetAddItemForm(); }} maxWidth="xs" fullWidth>
        <DialogTitle>Add Checklist Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Template(s)" size="small" fullWidth
              SelectProps={{
                multiple: true,
                value: selectedTemplates,
                renderValue: (selected) => {
                  const v = selected as string[];
                  return v.length === 0 ? '— Custom (type your own) —' : `${v.length} template${v.length > 1 ? 's' : ''} selected`;
                },
                onChange: (e) => {
                  const labels = e.target.value as string[];
                  setSelectedTemplates(labels);
                  if (labels.length === 1) {
                    const t = ITEM_TEMPLATES.find(x => x.label === labels[0]);
                    if (t) {
                      setNewItem(n => ({
                        ...n,
                        title: t.label,
                        requirement_id: t.requirement_id,
                        section: t.section,
                        evidence_type: t.evidence_type,
                      }));
                    }
                  }
                },
              }}
              helperText={
                bulkMode
                  ? 'Bulk mode: each template becomes its own item. Responsible/Target date/Notes below apply to all of them.'
                  : 'Check one to pre-fill the fields below (still editable), or check several to bulk-add them.'
              }
            >
              {ITEM_TEMPLATES.map(t => (
                <MenuItem key={t.label} value={t.label}>
                  <Checkbox checked={selectedTemplates.includes(t.label)} size="small" />
                  <ListItemText primary={t.label} />
                </MenuItem>
              ))}
            </TextField>
            {bulkMode ? (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                  Will add {selectedTemplates.length} items:
                </Typography>
                {selectedTemplates.map(label => (
                  <Typography key={label} variant="caption" display="block" color="text.secondary">• {label}</Typography>
                ))}
              </Paper>
            ) : (
              <>
                <TextField
                  label="Title" size="small" fullWidth required
                  value={newItem.title}
                  onChange={e => setNewItem(n => ({ ...n, title: e.target.value }))}
                  placeholder="e.g. Factory Acceptance Test (FAT) report obtained and reviewed"
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Requirement ID" size="small" fullWidth
                    value={newItem.requirement_id}
                    onChange={e => setNewItem(n => ({ ...n, requirement_id: e.target.value }))}
                    placeholder="#0442# (optional)"
                  />
                  <TextField
                    label="Section" size="small" fullWidth
                    value={newItem.section}
                    onChange={e => setNewItem(n => ({ ...n, section: e.target.value }))}
                    placeholder="6.1 (optional)"
                  />
                </Stack>
                <TextField
                  select label="Evidence type" size="small" fullWidth
                  value={newItem.evidence_type}
                  onChange={e => setNewItem(n => ({ ...n, evidence_type: e.target.value }))}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {EVIDENCE_TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </>
            )}
            <TextField
              label="Responsible" size="small" fullWidth
              value={newItem.responsible}
              onChange={e => setNewItem(n => ({ ...n, responsible: e.target.value }))}
              placeholder="Person or team"
            />
            <TextField
              label="Target date" size="small" fullWidth type="date"
              InputLabelProps={{ shrink: true }}
              value={newItem.target_date}
              onChange={e => setNewItem(n => ({ ...n, target_date: e.target.value }))}
            />
            <TextField
              label="Notes" size="small" fullWidth multiline minRows={2}
              value={newItem.notes}
              onChange={e => setNewItem(n => ({ ...n, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddItemOpen(false); resetAddItemForm(); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={addingItem || (!bulkMode && !newItem.title.trim())}
          >
            {addingItem ? 'Adding…' : bulkMode ? `Add ${selectedTemplates.length} Items` : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ my: 2 }} />

      {/* Design reviews */}
      <DesignReviewSignOff
        auditId={auditId}
        planId={plan.id}
        reviews={detail.reviews}
        onUpdate={handleReviewsUpdate}
      />
    </Box>
  );
}

export default function ProductQualificationHub() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [plans, setPlans] = useState<NexusQualificationPlan[]>([]);
  const [scopes, setScopes] = useState<NexusProductScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<NexusQualificationPlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlanType, setNewPlanType] = useState<'product' | 'process'>('product');
  const [newOwner, setNewOwner] = useState('');
  const [newScopeId, setNewScopeId] = useState<number | ''>('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p, s] = await Promise.all([getAudit(auditId), listPlans(auditId), listScopes(auditId)]);
      setAudit(a);
      setPlans(p);
      setScopes(s);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createPlan(auditId, {
        plan_type: newPlanType,
        owner: newOwner || undefined,
        product_scope_id: newScopeId === '' ? undefined : newScopeId,
      });
      setCreateOpen(false);
      setNewOwner('');
      setNewScopeId('');
      load();
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
          {audit?.site_name ?? 'Audit'}
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Product Qualification Hub</Typography>
          <Typography variant="body2" color="text.secondary">
            Qualification plans, #0706# gate checks, and #0571# design reviews per product.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Plan
        </Button>
      </Stack>

      {selectedPlan ? (
        <PlanDetail auditId={auditId} plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
      ) : plans.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">
            No qualification plans yet. Create a plan to track qualification checklist items and gate checks.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {plans.map(plan => (
            <Paper
              key={plan.id}
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => setSelectedPlan(plan)}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={700}>
                      {plan.plan_type === 'product' ? 'Product' : 'Process'} Qualification Plan v{plan.version}
                    </Typography>
                    {plan.product_scope_id && (
                      <Chip
                        label={scopeLabel(scopes.find(s => s.id === plan.product_scope_id))}
                        size="small" variant="outlined"
                      />
                    )}
                  </Stack>
                  {plan.owner && (
                    <Typography variant="body2" color="text.secondary">Owner: {plan.owner}</Typography>
                  )}
                </Box>
                <Chip label={plan.status} size="small" color={planStatusColor(plan.status)} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Qualification Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Plan type" size="small" fullWidth
              value={newPlanType}
              onChange={e => setNewPlanType(e.target.value as 'product' | 'process')}
            >
              <MenuItem value="product">Product Qualification</MenuItem>
              <MenuItem value="process">Process Qualification</MenuItem>
            </TextField>
            <TextField
              select label="Product scope" size="small" fullWidth
              value={newScopeId}
              onChange={e => setNewScopeId(e.target.value === '' ? '' : Number(e.target.value))}
              helperText="Which in-scope product this plan qualifies. The #0706# gate is evaluated per product — a plan with no scope can never pass it."
            >
              <MenuItem value="">— None (audit-level) —</MenuItem>
              {scopes.filter(s => s.in_scope).map(s => (
                <MenuItem key={s.id} value={s.id}>{scopeLabel(s)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Owner" size="small" fullWidth
              value={newOwner}
              onChange={e => setNewOwner(e.target.value)}
              placeholder="Quality manager name"
            />
            <Typography variant="caption" color="text.secondary">
              {newPlanType === 'process'
                ? 'Process plans start with an empty checklist — build it yourself with Add Item once the plan is created.'
                : 'A qualification checklist will be auto-seeded from the CQMAP V3.A library.'}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : newPlanType === 'process' ? 'Create' : 'Create & Seed'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
