import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  PictureAsPdf as PdfIcon,
  Replay as ReopenIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

import { AppDispatch, RootState } from '../../store/store';
import {
  fetchSessions,
  deleteSession,
  approveSession,
  rejectSession,
  reopenSession,
} from '../../store/slices/cqm/testEntrySlice';
import { exportSessionPDF, exportProfessionalReport, exportManagementReport } from '../../services/cqm/testEntryService';
import { TestSession, SessionStatus, SessionType, SessionsListParams } from '../../types/cqm';

const CARD_TYPES = ['ICM', 'CB', 'ICC', 'PICC'];
const STATUS_OPTIONS: SessionStatus[] = ['draft', 'submitted', 'approved', 'rejected'];
const SESSION_TYPE_OPTIONS: SessionType[] = ['Qualification', 'Monitoring'];

const getStatusColor = (status: SessionStatus): 'default' | 'warning' | 'info' | 'success' | 'error' => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'submitted':
      return 'info';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
};

const SessionHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { sessions, sessionsPagination, loading, error } = useSelector(
    (state: RootState) => state.testEntry
  );
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === 'admin';

  // Filter state
  const [filters, setFilters] = useState<SessionsListParams>({
    page: 1,
    limit: 10,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // PDF export state
  const [exportingPdfId, setExportingPdfId] = useState<number | null>(null);
  const [exportingReportId, setExportingReportId] = useState<number | null>(null);
  const [exportingMgmt, setExportingMgmt] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch sessions on mount and when filters change
  const loadSessions = useCallback(() => {
    dispatch(fetchSessions(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handlers
  const handleFilterChange = (field: keyof SessionsListParams, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
      ...(field !== 'page' && field !== 'limit' ? { page: 1 } : {}),
    }));
  };

  const handleClearFilters = () => {
    setFilters({ page: 1, limit: 10 });
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    handleFilterChange('page', newPage + 1);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('limit', parseInt(event.target.value, 10));
    handleFilterChange('page', 1);
  };

  const handleViewSession = (session: TestSession) => {
    navigate(`/session/${session.id}`);
  };

  const handleResumeSession = (session: TestSession) => {
    navigate(`/quality-test?sessionId=${session.id}`);
  };

  const handleDeleteClick = (session: TestSession) => {
    setSelectedSession(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedSession) {
      await dispatch(deleteSession(selectedSession.id));
      setDeleteDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleApproveSession = async (session: TestSession) => {
    await dispatch(approveSession(session.id));
  };

  const handleRejectClick = (session: TestSession) => {
    setSelectedSession(session);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (selectedSession && rejectReason.trim()) {
      await dispatch(rejectSession({ id: selectedSession.id, reason: rejectReason }));
      setRejectDialogOpen(false);
      setSelectedSession(null);
      setRejectReason('');
    }
  };

  const handleReopenSession = async (session: TestSession) => {
    await dispatch(reopenSession(session.id));
    setSnackbar({ open: true, message: `Job ${session.job_name || session.session_number} re-opened for editing.`, severity: 'success' });
  };

  const handleExportPDF = async (session: TestSession) => {
    setExportingPdfId(session.id);
    try {
      const blob = await exportSessionPDF(session.id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TestSession_${session.job_name || session.session_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: 'PDF exported successfully!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setSnackbar({
        open: true,
        message: 'Failed to export PDF. Please try again.',
        severity: 'error'
      });
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleExportProfessionalReport = async (session: TestSession) => {
    setExportingReportId(session.id);
    try {
      const blob = await exportProfessionalReport(session.id);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `ProfessionalReport_${session.job_name || session.session_number}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Professional report exported successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error exporting professional report:', err);
      setSnackbar({ open: true, message: 'Failed to export professional report. Please try again.', severity: 'error' });
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportManagementReport = async () => {
    setExportingMgmt(true);
    try {
      const blob = await exportManagementReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        cardType: filters.cardType,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `ManagementReport_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Management report exported successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error exporting management report:', err);
      setSnackbar({ open: true, message: 'Failed to export management report. Please try again.', severity: 'error' });
    } finally {
      setExportingMgmt(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasActiveFilters = filters.status || filters.cardType || filters.batchLotNumber || filters.startDate || filters.endDate;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Test Session History
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadSessions} disabled={loading.sessions}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={exportingMgmt ? <CircularProgress size={18} /> : <PdfIcon />}
            onClick={handleExportManagementReport}
            disabled={exportingMgmt}
          >
            {exportingMgmt ? 'Generating...' : 'Management Report'}
          </Button>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters {hasActiveFilters && `(Active)`}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quality-test')}
          >
            New Test Session
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value as SessionStatus)}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Session Type</InputLabel>
                  <Select
                    value={filters.sessionType || ''}
                    onChange={(e) => handleFilterChange('sessionType', e.target.value as SessionType)}
                    label="Session Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    {SESSION_TYPE_OPTIONS.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Card Type</InputLabel>
                  <Select
                    value={filters.cardType || ''}
                    onChange={(e) => handleFilterChange('cardType', e.target.value)}
                    label="Card Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    {CARD_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Batch/Lot Number"
                  value={filters.batchLotNumber || ''}
                  onChange={(e) => handleFilterChange('batchLotNumber', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Sessions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Test Date</TableCell>
                <TableCell>Card Type</TableCell>
                <TableCell>Batch/Lot</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align="center">Tests</TableCell>
                <TableCell align="center">Pass Rate</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Inspector</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading.sessions ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No test sessions found
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/quality-test')}
                      sx={{ mt: 2 }}
                    >
                      Create First Session
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {session.job_name || session.session_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.session_type || 'Monitoring'}
                        size="small"
                        color={session.session_type === 'Qualification' ? 'primary' : 'default'}
                        variant={session.session_type === 'Qualification' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(session.test_date)}</TableCell>
                    <TableCell>
                      <Chip label={session.card_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{session.batch_lot_number}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 120 }} noWrap title={session.manufacturing_stage}>
                        {session.manufacturing_stage}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {session.totalTests || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={
                          (session.passRate || 0) >= 90
                            ? 'success.main'
                            : (session.passRate || 0) >= 70
                            ? 'warning.main'
                            : 'error.main'
                        }
                      >
                        {session.totalTests ? `${session.passRate}%` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        size="small"
                        color={getStatusColor(session.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {session.inspector
                          ? `${session.inspector.first_name} ${session.inspector.last_name}`
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewSession(session)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Export PDF">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleExportPDF(session)}
                              disabled={exportingPdfId === session.id}
                            >
                              {exportingPdfId === session.id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <PdfIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Professional Report">
                          <span>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleExportProfessionalReport(session)}
                              disabled={exportingReportId === session.id}
                            >
                              {exportingReportId === session.id ? <CircularProgress size={18} /> : <AssignmentIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>

                        {session.status === 'draft' && (
                          <Tooltip title="Resume Editing">
                            <IconButton size="small" onClick={() => handleResumeSession(session)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {(session.status === 'draft' || isAdmin) && (
                          <Tooltip title={isAdmin && session.status !== 'draft' ? 'Delete (Admin)' : 'Delete'}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(session)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {session.status === 'submitted' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApproveSession(session)}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRejectClick(session)}
                              >
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {session.status === 'rejected' && (
                          <Tooltip title="Re-open for Editing">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleReopenSession(session)}
                            >
                              <ReopenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={sessionsPagination.total}
          page={sessionsPagination.page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={sessionsPagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Test Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete job{' '}
            <strong>{selectedSession?.job_name || selectedSession?.session_number}</strong>? This action cannot be undone.
          </DialogContentText>
          {selectedSession && selectedSession.status !== 'draft' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This session is <strong>{selectedSession.status}</strong>. Deleting it will permanently
              remove all test entries and records.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Test Session</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejecting job{' '}
            <strong>{selectedSession?.job_name || selectedSession?.session_number}</strong>.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={!rejectReason.trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionHistory;
