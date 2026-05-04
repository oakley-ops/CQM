import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useParams } from 'react-router-dom';
import AlertBanner from '../../components/nexus/AlertBanner';
import { getAudit, listComponents, createComponent, updateComponent, deleteComponent } from '../../services/nexus/nexusService';
import type { NexusAuditRecord, NexusAuditComponent, CertStatus } from '../../types/nexus';

const COMPONENT_TYPES = [
  'IC (Wafer production of IC containing the EMV payment application)',
  'IC (Wafer Test of IC containing the EMV payment application)',
  'IC (Backside processing and/or dicing of any IC)',
  'ICM',
  'aIL (no IC)',
  'icIL (IC and antenna)',
  'mIL (ICM and antenna)',
  'CB',
  'mICC (ICC made from ICM and CB)',
  'ilICC (ICC made from icIL, without ICM)',
  'Personalization',
  'iacICM',
  'fpBSM (with Fingerprint Sensor)',
  'imBSM (with Image Sensor)',
  'vcBSM (with Voice Sensor)',
  'iacIL (No IC)',
  'iacIL (with IC)',
  'fpIAC (with Fingerprint Sensor)',
  'imIAC (with Image Sensor)',
  'vcIAC (with Voice Sensor)',
  'sIAC (with Display)',
  's+fpIAC (with Display and Fingerprint Sensor)',
  's+imIAC (with Display and Image Sensor)',
  's+vcIAC (with Display and Voice Sensor)',
  'fpApplet (Software in card to enable Fingerprint functionality)',
  'imApplet (Software in card to enable Image Recognition functionality)',
  'vcApplet (Software in card to enable Voice Recognition functionality)',
  'sApplet (Software in card to enable Display functionality)',
];

const CERT_STATUSES: CertStatus[] = ['CQM Certified', 'CQM Recognised', 'Pending', 'Not Certified', 'N/A'];

const CERT_CHIP_COLOR: Record<CertStatus, 'success' | 'primary' | 'warning' | 'error' | 'default'> = {
  'CQM Certified': 'success',
  'CQM Recognised': 'primary',
  'Pending': 'warning',
  'Not Certified': 'error',
  'N/A': 'default',
};

export default function ComponentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [components, setComponents] = useState<NexusAuditComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([getAudit(auditId), listComponents(auditId)]);
      setAudit(a);
      setComponents(c);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newType) return;
    setCreating(true);
    try {
      const comp = await createComponent(auditId, {
        component_type: newType,
        supplier_name: newSupplier || undefined,
      });
      setComponents(c => [...c, comp]);
      setCreateOpen(false);
      setNewType('');
      setNewSupplier('');
    } finally {
      setCreating(false);
    }
  };

  const handleFieldBlur = async (comp: NexusAuditComponent, field: keyof NexusAuditComponent, value: string) => {
    setSaving(s => ({ ...s, [comp.id]: true }));
    try {
      const updated = await updateComponent(auditId, comp.id, { [field]: value || undefined });
      setComponents(c => c.map(x => x.id === comp.id ? updated : x));
    } finally {
      setSaving(s => ({ ...s, [comp.id]: false }));
    }
  };

  const handleCertStatusChange = async (comp: NexusAuditComponent, value: string) => {
    setSaving(s => ({ ...s, [comp.id]: true }));
    try {
      const updated = await updateComponent(auditId, comp.id, { cert_status: value as CertStatus || undefined });
      setComponents(c => c.map(x => x.id === comp.id ? updated : x));
    } finally {
      setSaving(s => ({ ...s, [comp.id]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteComponent(auditId, deleteId);
      setComponents(c => c.filter(x => x.id !== deleteId));
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const visible = useMemo(() => {
    let r = components;
    if (filterStatus) r = r.filter(c => c.cert_status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        (c.supplier_name ?? '').toLowerCase().includes(q) ||
        c.component_type.toLowerCase().includes(q) ||
        (c.article_number ?? '').toLowerCase().includes(q) ||
        (c.used_for_product ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [components, filterStatus, search]);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
          {audit?.site_name ?? 'Audit'}
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Components Registry</Typography>
          <Typography variant="body2" color="text.secondary">
            Suppliers and subcontractors with CQM certification status — mirrors the V3.A Components sheet.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Add Component
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search supplier, type, article…"
          value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 280 }}
        />
        <TextField
          select size="small" label="Filter by status"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)} sx={{ width: 190 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {CERT_STATUSES.map(s => (
            <MenuItem key={s} value={s}>
              <Chip label={s} size="small" color={CERT_CHIP_COLOR[s]} sx={{ fontSize: 11 }} />
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {visible.length} / {components.length} components
        </Typography>
      </Stack>

      {components.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">
            No components yet. Add suppliers and subcontractors to track CQM certification status.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Component Type</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Article #</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Used For</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>Supplier Name</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>City</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>CC</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 165 }}>Cert Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Cert Label</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>Comment</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map(comp => (
                <TableRow key={comp.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ fontSize: 11 }}>{comp.component_type}</TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={comp.article_number ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, article_number: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(comp, 'article_number', e.target.value)}
                      placeholder="ART-001"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4, fontFamily: 'monospace' } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={comp.used_for_product ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, used_for_product: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(comp, 'used_for_product', e.target.value)}
                      placeholder="IC card"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={comp.supplier_name ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, supplier_name: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(comp, 'supplier_name', e.target.value)}
                      placeholder="Supplier Ltd"
                      sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={comp.supplier_city ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, supplier_city: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(comp, 'supplier_city', e.target.value)}
                      placeholder="Singapore"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={comp.supplier_country_code ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, supplier_country_code: e.target.value.toUpperCase().slice(0, 2) } : x))}
                      onBlur={e => handleFieldBlur(comp, 'supplier_country_code', e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SG"
                      inputProps={{ maxLength: 2, style: { textTransform: 'uppercase', fontFamily: 'monospace', fontSize: 12, paddingTop: 4, paddingBottom: 4 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    {saving[comp.id] ? <CircularProgress size={14} /> : (
                      <TextField
                        select size="small" value={comp.cert_status ?? ''}
                        onChange={e => handleCertStatusChange(comp, e.target.value)}
                        sx={{ width: 155 }}
                        SelectProps={{ renderValue: (v) => v ? (
                          <Chip label={v as string} size="small" color={CERT_CHIP_COLOR[v as CertStatus] ?? 'default'} sx={{ fontSize: 10, height: 20 }} />
                        ) : '—' }}
                      >
                        <MenuItem value="">— select —</MenuItem>
                        {CERT_STATUSES.map(s => (
                          <MenuItem key={s} value={s}>
                            <Chip label={s} size="small" color={CERT_CHIP_COLOR[s]} sx={{ fontSize: 11 }} />
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={comp.cert_label ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, cert_label: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(comp, 'cert_label', e.target.value)}
                      placeholder="CQM-2025-001"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4, fontFamily: 'monospace' } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" multiline maxRows={2} value={comp.comment ?? ''}
                      onChange={e => setComponents(c => c.map(x => x.id === comp.id ? { ...x, comment: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(comp, 'comment', e.target.value)}
                      placeholder="Notes…"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleteId(comp.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Component / Supplier</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Component Type" size="small" fullWidth required
              value={newType} onChange={e => setNewType(e.target.value)}
            >
              <MenuItem value="">— select type —</MenuItem>
              {COMPONENT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>)}
            </TextField>
            <TextField
              label="Supplier Name" size="small" fullWidth
              value={newSupplier} onChange={e => setNewSupplier(e.target.value)}
              placeholder="Acme Semiconductor Ltd"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newType || creating}>
            {creating ? 'Adding…' : 'Add Component'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Component?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove "{components.find(c => c.id === deleteId)?.supplier_name ?? components.find(c => c.id === deleteId)?.component_type}" from the registry?
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
