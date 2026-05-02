import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  BarChart as StatsIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../../../store/store';
import { fetchJobs, createJob, deleteJob } from '../../../store/slices/cqm/jobSlice';
import type { JobStatus, CreateJobRequest } from '../../../types/cqm';

const STATUS_COLORS: Record<JobStatus, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'success',
  completed: 'default',
  on_hold: 'warning',
  cancelled: 'error',
};

const CARD_TYPES = ['Standard', 'EMV', 'Dual Interface', 'Contactless', 'ALL'];

export default function JobList() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { jobs, pagination, loading, error } = useSelector((s: RootState) => s.jobs);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cardTypeFilter, setCardTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [createOpen, setCreateOpen] = useState(false);
  const [newJob, setNewJob] = useState<Partial<CreateJobRequest>>({ status: 'active' });
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchJobs({
      search: search || undefined,
      status: (statusFilter as JobStatus) || undefined,
      card_type: cardTypeFilter || undefined,
      page: page + 1,
      limit: rowsPerPage,
      sort: 'start_date',
      order: 'DESC',
    }));
  }, [dispatch, search, statusFilter, cardTypeFilter, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  const handleCreate = async () => {
    if (!newJob.job_number) return;
    setCreating(true);
    const result = await dispatch(createJob(newJob as CreateJobRequest));
    setCreating(false);
    if (createJob.fulfilled.match(result)) {
      setCreateOpen(false);
      setNewJob({ status: 'active' });
      navigate(`/jobs/${result.payload.job_number}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await dispatch(deleteJob(deleteTarget));
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Job Tracker</Typography>
          <Typography variant="body2" color="text.secondary">
            Track production jobs and view statistical reports
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Job
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search job number, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Card Type</InputLabel>
            <Select value={cardTypeFilter} label="Card Type" onChange={e => { setCardTypeFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {CARD_TYPES.map(ct => <MenuItem key={ct} value={ct}>{ct}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Job Number</TableCell>
                <TableCell>Card Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell align="center">Sessions</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No jobs found</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && jobs.map(job => (
                <TableRow
                  key={job.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/jobs/${job.job_number}`)}
                >
                  <TableCell>
                    <Typography fontWeight={600} fontSize="0.875rem">
                      {job.job_number}
                    </Typography>
                    {job.description && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                        {job.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{job.card_type || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={job.status.replace('_', ' ')}
                      size="small"
                      color={STATUS_COLORS[job.status]}
                    />
                  </TableCell>
                  <TableCell>{job.start_date || '—'}</TableCell>
                  <TableCell>{job.end_date || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip label={job.session_count ?? 0} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    <Tooltip title="Statistics">
                      <IconButton size="small" onClick={() => navigate(`/jobs/${job.job_number}?tab=stats`)}>
                        <StatsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open">
                      <IconButton size="small" onClick={() => navigate(`/jobs/${job.job_number}`)}>
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(job.job_number)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {pagination && (
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </Paper>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Job</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete job <strong>{deleteTarget}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Job</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Job Number *"
              value={newJob.job_number || ''}
              onChange={e => setNewJob(p => ({ ...p, job_number: e.target.value }))}
              fullWidth
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Card Type</InputLabel>
              <Select
                value={newJob.card_type || ''}
                label="Card Type"
                onChange={e => setNewJob(p => ({ ...p, card_type: e.target.value }))}
              >
                {CARD_TYPES.map(ct => <MenuItem key={ct} value={ct}>{ct}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Customer / Reference"
              value={newJob.customer_reference || ''}
              onChange={e => setNewJob(p => ({ ...p, customer_reference: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={newJob.description || ''}
              onChange={e => setNewJob(p => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newJob.job_number || creating}
          >
            {creating ? <CircularProgress size={18} /> : 'Create Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
