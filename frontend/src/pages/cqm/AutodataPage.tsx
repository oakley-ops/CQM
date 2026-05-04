import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress,
  Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoIcon from '@mui/icons-material/Info';
import {
  listRuns, createRun, deleteRun, getRun, getDownloadUrl,
} from '../../services/autodataService';
import type { AutodataRun, DatasetFormat } from '../../types/cqm/autodata';

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  queued: 'default',
  running: 'primary',
  completed: 'success',
  failed: 'error',
};

function StatusChip({ status }: { status: string }) {
  return (
    <Chip
      label={status}
      size="small"
      color={STATUS_COLOR[status] ?? 'default'}
      icon={status === 'running' ? <CircularProgress size={10} color="inherit" /> : undefined}
      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
    />
  );
}

function RunDetail({ run }: { run: AutodataRun }) {
  if (!run.stats) return null;
  const s = run.stats;
  return (
    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Stack direction="row" spacing={3} flexWrap="wrap" gap={1}>
        {[
          { label: 'Collected', value: s.collected },
          { label: 'Annotated', value: s.annotated },
          { label: 'Valid samples', value: s.valid },
          { label: 'Rejected', value: s.rejected },
          { label: 'Quality rate', value: s.quality_rate != null ? `${s.quality_rate}%` : '—' },
        ].map(({ label, value }) => (
          <Box key={label} textAlign="center" minWidth={90}>
            <Typography variant="h6" fontWeight={700}>{value ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function AutodataPage() {
  const [runs, setRuns] = useState<AutodataRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [runName, setRunName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cardTypes, setCardTypes] = useState('');
  const [format, setFormat] = useState<DatasetFormat>('jsonl');

  // Polling for running jobs
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRuns(await listRuns());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 5s while any run is in progress
  useEffect(() => {
    const hasRunning = runs.some(r => r.status === 'running' || r.status === 'queued');
    if (hasRunning && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const updated = await listRuns();
        setRuns(updated);
        if (!updated.some(r => r.status === 'running' || r.status === 'queued')) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      }, 5000);
    }
    return () => {
      if (!hasRunning && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [runs]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const run = await createRun({
        run_name: runName || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        cardTypes: cardTypes ? cardTypes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        format,
      });
      setRuns(r => [run, ...r]);
      setCreateOpen(false);
      setRunName('');
      setDateFrom('');
      setDateTo('');
      setCardTypes('');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteRun(deleteId);
      setRuns(r => r.filter(x => x.id !== deleteId));
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshRun = async (id: number) => {
    const updated = await getRun(id);
    setRuns(r => r.map(x => x.id === id ? updated : x));
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={3}>
        <AutoAwesomeIcon color="primary" sx={{ mt: 0.5 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Autodata Pipeline</Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-agent Claude pipeline that collects, profiles, annotates, and validates manufacturing quality data into training-ready datasets.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Run
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        Each run uses Claude's tool-use loop to orchestrate 5 agents: collect → profile (SPC) → annotate → quality-assess → format.
        Runs execute asynchronously — this page polls every 5 seconds while a run is in progress.
      </Alert>

      {runs.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
          <Typography fontWeight={600} color="text.secondary">No runs yet.</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Start a new run to generate an annotated training dataset from your quality data.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {runs.map(run => (
            <Paper key={run.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={0.25}>
                    <Typography fontWeight={700}>{run.run_name}</Typography>
                    <StatusChip status={run.status} />
                    <Chip label={run.dataset_format ?? 'jsonl'} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                    {run.sample_count != null && (
                      <Chip label={`${run.sample_count} samples`} size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Started: {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                    {run.completed_at && ` · Completed: ${new Date(run.completed_at).toLocaleString()}`}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.5}>
                  {(run.status === 'running' || run.status === 'queued') && (
                    <Tooltip title="Refresh status">
                      <IconButton size="small" onClick={() => handleRefreshRun(run.id)}>
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {run.status === 'completed' && (
                    <Tooltip title="Download dataset">
                      <IconButton size="small" color="primary" component="a" href={getDownloadUrl(run.id)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete run">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(run.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {run.status === 'running' && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}

              {run.status === 'failed' && run.error_message && (
                <Alert severity="error" sx={{ mt: 1.5 }} variant="outlined">
                  {run.error_message}
                </Alert>
              )}

              {run.status === 'completed' && <RunDetail run={run} />}
            </Paper>
          ))}
        </Stack>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoAwesomeIcon color="primary" />
            <Typography fontWeight={700}>New Autodata Run</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Run name" size="small" fullWidth
              value={runName} onChange={e => setRunName(e.target.value)}
              placeholder={`Run ${new Date().toISOString().split('T')[0]}`}
            />
            <Divider>Filters (all optional)</Divider>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Date from" type="date" size="small" sx={{ flex: 1 }}
                value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Date to" type="date" size="small" sx={{ flex: 1 }}
                value={dateTo} onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label="Card types (comma-separated)" size="small" fullWidth
              value={cardTypes} onChange={e => setCardTypes(e.target.value)}
              placeholder="ic, icm, cb"
              helperText="Leave blank to include all card types"
            />
            <TextField
              select label="Output format" size="small" fullWidth
              value={format} onChange={e => setFormat(e.target.value as DatasetFormat)}
            >
              <option value="jsonl">JSONL (recommended for fine-tuning)</option>
              <option value="csv">CSV</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating} startIcon={creating ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}>
            {creating ? 'Starting…' : 'Start Run'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Run?</DialogTitle>
        <DialogContent>
          <Typography>
            This will delete the run record and any dataset files on disk. This cannot be undone.
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
