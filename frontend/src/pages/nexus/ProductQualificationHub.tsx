import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate, useParams } from 'react-router-dom';
import AlertBanner from '../../components/nexus/AlertBanner';
import GateControl from '../../components/nexus/GateControl';
import DesignReviewSignOff from '../../components/nexus/DesignReviewSignOff';
import {
  getAudit, listPlans, createPlan, getPlan, updatePlan, updateItem,
} from '../../services/nexus/nexusService';
import type {
  NexusAuditRecord, NexusQualificationPlan, NexusPlanDetail,
  NexusQualificationItem, NexusDesignReview, ItemStatus, PlanStatus,
} from '../../types/nexus';

const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string; color: 'default' | 'info' | 'success' | 'warning' }[] = [
  { value: 'pending',        label: 'Pending',        color: 'default' },
  { value: 'in-progress',    label: 'In Progress',    color: 'info' },
  { value: 'complete',       label: 'Complete',       color: 'success' },
  { value: 'not-applicable', label: 'N/A',            color: 'warning' },
];

const PLAN_STATUS_OPTIONS: PlanStatus[] = ['draft', 'in-progress', 'submitted', 'approved', 'rejected'];

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
      const updated = await updateItem(auditId, plan.id, item.id, { status });
      setDetail(d => d ? { ...d, items: d.items.map(i => i.id === item.id ? updated : i) } : d);
      // Refresh gate after item change
      const refreshed = await getPlan(auditId, plan.id);
      setDetail(refreshed);
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

  const handleReviewsUpdate = async (reviews: NexusDesignReview[]) => {
    if (!detail) return;
    const refreshed = await getPlan(auditId, plan.id);
    setDetail({ ...refreshed, reviews });
    // Full refresh for gate
    setDetail(await getPlan(auditId, plan.id));
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
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Responsible</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150 }}>Status</TableCell>
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
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<NexusQualificationPlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlanType, setNewPlanType] = useState<'product' | 'process'>('product');
  const [newOwner, setNewOwner] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([getAudit(auditId), listPlans(auditId)]);
      setAudit(a);
      setPlans(p);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createPlan(auditId, { plan_type: newPlanType, owner: newOwner || undefined });
      setCreateOpen(false);
      setNewOwner('');
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
                  <Typography fontWeight={700}>
                    {plan.plan_type === 'product' ? 'Product' : 'Process'} Qualification Plan v{plan.version}
                  </Typography>
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
              label="Owner" size="small" fullWidth
              value={newOwner}
              onChange={e => setNewOwner(e.target.value)}
              placeholder="Quality manager name"
            />
            <Typography variant="caption" color="text.secondary">
              A 12-item qualification checklist will be auto-seeded from the CQMAP V3.A library.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create & Seed'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
