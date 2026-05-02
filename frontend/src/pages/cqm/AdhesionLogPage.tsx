import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import AdhesionLogForm from '../../components/CQM/Forms/AdhesionLogForm';
import { adhesionLogService } from '../../services/cqm/adhesionLogService';
import { AdhesionLogEntry } from '../../types/cqm/adhesionLog';

const RESULT_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'PASS', label: 'PASS' },
  { value: 'FAIL', label: 'FAIL' },
];

export default function AdhesionLogPage() {
  const [rows, setRows]           = useState<AdhesionLogEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(0);
  const [rowsPerPage]             = useState(50);
  const [jobFilter, setJobFilter] = useState('');
  const [resultFilter, setResult] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry]   = useState<AdhesionLogEntry | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adhesionLogService.list({
        job_number: jobFilter || undefined,
        result:     resultFilter || undefined,
        page:       page + 1,
        limit:      rowsPerPage,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch { /* handled by API layer */ }
  }, [jobFilter, resultFilter, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditEntry(null); setDialogOpen(true); };
  const openEdit = (e: AdhesionLogEntry) => { setEditEntry(e); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditEntry(null); };

  const onSaved = () => { closeDialog(); load(); };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this adhesion log entry?')) return;
    await adhesionLogService.remove(id);
    load();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>Adhesion Log</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          New Entry
        </Button>
      </Box>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search job #…"
          value={jobFilter}
          onChange={e => { setJobFilter(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 220 }}
        />
        <TextField
          select size="small" value={resultFilter}
          onChange={e => { setResult(e.target.value); setPage(0); }}
          sx={{ width: 150 }}
        >
          {RESULT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {/* ── Table ───────────────────────────────────────────────── */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Job #</TableCell>
              <TableCell>Job Name</TableCell>
              <TableCell>Side</TableCell>
              <TableCell>Inks</TableCell>
              <TableCell>Laminator</TableCell>
              <TableCell>Temp °F</TableCell>
              <TableCell align="right">A</TableCell>
              <TableCell align="right">B</TableCell>
              <TableCell align="right">C</TableCell>
              <TableCell align="right">D</TableCell>
              <TableCell align="right">E</TableCell>
              <TableCell align="right">Min (lbf/cm)</TableCell>
              <TableCell align="center">Result</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={15} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No entries yet. Click "New Entry" to add the first one.
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row.id} hover>
                <TableCell>{row.test_date}</TableCell>
                <TableCell>{row.job_number ?? '—'}</TableCell>
                <TableCell>{row.job_name ?? '—'}</TableCell>
                <TableCell>{row.side ?? '—'}</TableCell>
                <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={row.inks ?? ''}><span>{row.inks ?? '—'}</span></Tooltip>
                </TableCell>
                <TableCell>{row.laminator ?? '—'}</TableCell>
                <TableCell>{row.lam_temp_f ?? '—'}</TableCell>
                {(['strip_a','strip_b','strip_c','strip_d','strip_e'] as const).map(s => (
                  <TableCell key={s} align="right">
                    {(row as any)[`${s}_tore`]
                      ? <Typography variant="caption" color="success.main">Tore</Typography>
                      : (row as any)[s] != null ? Number((row as any)[s]).toFixed(3) : '—'}
                  </TableCell>
                ))}
                <TableCell align="right">
                  {row.min_lbf_cm != null ? Number(row.min_lbf_cm).toFixed(3) : '—'}
                </TableCell>
                <TableCell align="center">
                  {row.result
                    ? <Chip label={row.result} color={row.result === 'PASS' ? 'success' : 'error'} size="small" />
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[50]}
      />

      {/* ── Entry Dialog ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editEntry ? 'Edit Adhesion Entry' : 'New Adhesion Entry'}
          <IconButton onClick={closeDialog}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <AdhesionLogForm
            editId={editEntry?.id}
            initialValues={editEntry ? {
              job_number:        editEntry.job_number ?? '',
              job_name:          editEntry.job_name ?? '',
              side:              editEntry.side ?? '',
              test_date:         editEntry.test_date,
              emv:               editEntry.emv,
              csr:               editEntry.csr,
              inks:              editEntry.inks ?? '',
              screen_printed:    editEntry.screen_printed,
              core:              editEntry.core ?? '',
              core_thickness:    editEntry.core_thickness != null ? String(editEntry.core_thickness) : '',
              overlay:           editEntry.overlay ?? '',
              coating:           editEntry.coating ?? '',
              laminator:         editEntry.laminator ?? '',
              lam_temp_f:        editEntry.lam_temp_f != null ? String(editEntry.lam_temp_f) : '',
              dwell_time_sec:    editEntry.dwell_time_sec != null ? String(editEntry.dwell_time_sec) : '',
              post_cured:        editEntry.post_cured ?? '',
              strip_a:           editEntry.strip_a != null ? String(editEntry.strip_a) : '',
              strip_b:           editEntry.strip_b != null ? String(editEntry.strip_b) : '',
              strip_c:           editEntry.strip_c != null ? String(editEntry.strip_c) : '',
              strip_d:           editEntry.strip_d != null ? String(editEntry.strip_d) : '',
              strip_e:           editEntry.strip_e != null ? String(editEntry.strip_e) : '',
              strip_a_tore:      editEntry.strip_a_tore,
              strip_b_tore:      editEntry.strip_b_tore,
              strip_c_tore:      editEntry.strip_c_tore,
              strip_d_tore:      editEntry.strip_d_tore,
              strip_e_tore:      editEntry.strip_e_tore,
              pass_threshold:    String(editEntry.pass_threshold),
              test_method:       editEntry.test_method,
              tape_spec_confirmed: editEntry.tape_spec_confirmed,
              exclusions:        editEntry.exclusions ?? '',
              notes:             editEntry.notes ?? '',
            } : undefined}
            onSaved={onSaved}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
