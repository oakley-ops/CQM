import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useParams } from 'react-router-dom';
import AlertBanner from '../../components/nexus/AlertBanner';
import { getAudit, listDocs, createDoc, updateDoc, deleteDoc } from '../../services/nexus/nexusService';
import type { NexusAuditRecord, NexusDocumentRef } from '../../types/nexus';

const DOC_TYPES = ['Policy', 'Procedure', 'Work Instruction', 'Record', 'Specification', 'Certificate', 'Other'];

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [docs, setDocs] = useState<NexusDocumentRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDocId, setNewDocId] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [newReqId, setNewReqId] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([getAudit(auditId), listDocs(auditId)]);
      setAudit(a);
      setDocs(d);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const doc = await createDoc(auditId, {
        title: newTitle,
        doc_id: newDocId || undefined,
        doc_type: newDocType || undefined,
        requirement_id: newReqId || undefined,
      });
      setDocs(d => [...d, doc]);
      setCreateOpen(false);
      setNewTitle('');
      setNewDocId('');
      setNewDocType('');
      setNewReqId('');
    } finally {
      setCreating(false);
    }
  };

  const handleFieldBlur = async (doc: NexusDocumentRef, field: keyof NexusDocumentRef, value: string) => {
    setSaving(s => ({ ...s, [doc.id]: true }));
    try {
      const updated = await updateDoc(auditId, doc.id, { [field]: value || undefined });
      setDocs(d => d.map(x => x.id === doc.id ? updated : x));
    } finally {
      setSaving(s => ({ ...s, [doc.id]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDoc(auditId, deleteId);
      setDocs(d => d.filter(x => x.id !== deleteId));
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const visible = useMemo(() => {
    let r = docs;
    if (filterType) r = r.filter(d => d.doc_type === filterType);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.doc_id ?? '').toLowerCase().includes(q) ||
        (d.requirement_id ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [docs, filterType, search]);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
          {audit?.site_name ?? 'Audit'}
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Document Register</Typography>
          <Typography variant="body2" color="text.secondary">
            Evidence documents linked to CQMAP requirements — mirrors the Docs sheet.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Add Document
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search title, doc ID, or requirement…"
          value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 300 }}
        />
        <TextField
          select size="small" label="Filter by type"
          value={filterType} onChange={e => setFilterType(e.target.value)} sx={{ width: 200 }}
        >
          <MenuItem value="">All types</MenuItem>
          {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {visible.length} / {docs.length} documents
        </Typography>
      </Stack>

      {docs.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">
            No documents yet. Add evidence documents to link to CQMAP requirements.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>Doc ID</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 90 }}>Req. ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 200 }}>Notes</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map(doc => (
                <TableRow key={doc.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell>
                    <TextField
                      size="small" value={doc.doc_id ?? ''}
                      onChange={e => setDocs(d => d.map(x => x.id === doc.id ? { ...x, doc_id: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(doc, 'doc_id', e.target.value)}
                      placeholder="DOC-001"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4, fontFamily: 'monospace' } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={doc.requirement_id ?? ''}
                      onChange={e => setDocs(d => d.map(x => x.id === doc.id ? { ...x, requirement_id: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(doc, 'requirement_id', e.target.value)}
                      placeholder="#0706#"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4, fontFamily: 'monospace' } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={doc.title}
                      onChange={e => setDocs(d => d.map(x => x.id === doc.id ? { ...x, title: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(doc, 'title', e.target.value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    {saving[doc.id] ? <CircularProgress size={14} /> : (
                      <TextField
                        select size="small" value={doc.doc_type ?? ''}
                        onChange={e => handleFieldBlur(doc, 'doc_type', e.target.value)}
                        sx={{ width: 150 }}
                      >
                        <MenuItem value="">—</MenuItem>
                        {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={doc.version ?? ''}
                      onChange={e => setDocs(d => d.map(x => x.id === doc.id ? { ...x, version: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(doc, 'version', e.target.value)}
                      placeholder="1.0"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.4 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" multiline maxRows={2} value={doc.notes ?? ''}
                      onChange={e => setDocs(d => d.map(x => x.id === doc.id ? { ...x, notes: e.target.value } : x))}
                      onBlur={e => handleFieldBlur(doc, 'notes', e.target.value)}
                      placeholder="Notes…"
                      sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleteId(doc.id)} color="error">
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
        <DialogTitle>Add Document Reference</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title" size="small" fullWidth required
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Quality Manual Rev 3"
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Doc ID" size="small" sx={{ flex: 1 }}
                value={newDocId} onChange={e => setNewDocId(e.target.value)}
                placeholder="QM-001"
              />
              <TextField
                label="Requirement ID" size="small" sx={{ flex: 1 }}
                value={newReqId} onChange={e => setNewReqId(e.target.value)}
                placeholder="#0706#"
                inputProps={{ style: { fontFamily: 'monospace' } }}
              />
            </Stack>
            <TextField
              select label="Document type" size="small" fullWidth
              value={newDocType} onChange={e => setNewDocType(e.target.value)}
            >
              <MenuItem value="">— select —</MenuItem>
              {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
            {creating ? 'Adding…' : 'Add Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Document?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove "{docs.find(d => d.id === deleteId)?.title}" from the document register?
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
