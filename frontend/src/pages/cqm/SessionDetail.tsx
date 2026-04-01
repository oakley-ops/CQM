import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';

import { AppDispatch, RootState } from '../../store/store';
import { fetchSession } from '../../store/slices/cqm/testEntrySlice';
import { exportSessionPDF } from '../../services/cqm/testEntryService';
import { SessionStatus } from '../../types/cqm';

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

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentSession, entries, loading, error } = useSelector(
    (state: RootState) => state.testEntry
  );

  const [exportingPdf, setExportingPdf] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchSession(parseInt(id, 10)));
    }
  }, [dispatch, id]);

  const handleExportPDF = async () => {
    if (!id) return;

    setExportingPdf(true);
    try {
      const blob = await exportSessionPDF(parseInt(id, 10));

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TestSession_${currentSession?.session_number}_${new Date().toISOString().split('T')[0]}.pdf`;
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
      setExportingPdf(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading.session) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/sessions')} sx={{ mb: 2 }}>
          Back to Sessions
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentSession) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/sessions')} sx={{ mb: 2 }}>
          Back to Sessions
        </Button>
        <Alert severity="warning">Session not found</Alert>
      </Box>
    );
  }

  // Calculate stats
  const totalTests = entries.length;
  const passedTests = entries.filter((e) => e.pass_status === true).length;
  const failedTests = entries.filter((e) => e.pass_status === false).length;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  // Group entries by category
  const entriesByCategory = entries.reduce((acc, entry) => {
    const categoryName = entry.definition?.category?.category_name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  return (
    <Box className="print-content">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
        <Button startIcon={<BackIcon />} onClick={() => navigate('/sessions')}>
          Back to Sessions
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={exportingPdf ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
            onClick={handleExportPDF}
            disabled={exportingPdf}
          >
            {exportingPdf ? 'Generating...' : 'Export PDF'}
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print
          </Button>
        </Box>
      </Box>

      {/* Session Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {currentSession.session_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Test Date: {formatDate(currentSession.test_date)}
              </Typography>
            </Box>
            <Chip
              label={currentSession.status.charAt(0).toUpperCase() + currentSession.status.slice(1)}
              color={getStatusColor(currentSession.status)}
              size="medium"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Card Type
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {currentSession.card_type}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Manufacturing Stage
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {currentSession.manufacturing_stage}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Batch/Lot Number
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {currentSession.batch_lot_number}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Card Serial Number
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {currentSession.card_serial_number || '-'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Equipment ID
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {currentSession.equipment_id || '-'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Inspector
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {currentSession.inspector
                  ? `${currentSession.inspector.first_name} ${currentSession.inspector.last_name}`
                  : '-'}
              </Typography>
            </Grid>
            {currentSession.submitted_at && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Submitted At
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDateTime(currentSession.submitted_at)}
                </Typography>
              </Grid>
            )}
            {currentSession.approved_at && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Approved At
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDateTime(currentSession.approved_at)}
                </Typography>
              </Grid>
            )}
          </Grid>

          {currentSession.general_notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {currentSession.general_notes}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={700}>
              {totalTests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Tests
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={700} color="success.main">
              {passedTests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Passed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={700} color="error.main">
              {failedTests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Failed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography
              variant="h3"
              fontWeight={700}
              color={passRate >= 90 ? 'success.main' : passRate >= 70 ? 'warning.main' : 'error.main'}
            >
              {passRate}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pass Rate
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Test Results by Category */}
      {Object.entries(entriesByCategory).map(([categoryName, categoryEntries]) => (
        <Card key={categoryName} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {categoryName}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Test Code</TableCell>
                    <TableCell>Test Name</TableCell>
                    <TableCell align="center">Value</TableCell>
                    <TableCell align="center">Result</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {entry.definition?.test_id || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.definition?.test_name || '-'}</TableCell>
                      <TableCell align="center">
                        {entry.measurement_value !== null && entry.measurement_value !== undefined ? (
                          <Typography variant="body2">
                            {entry.measurement_value}
                            {entry.definition?.unit_of_measure && ` ${entry.definition.unit_of_measure}`}
                          </Typography>
                        ) : entry.assessment_value ? (
                          <Chip label={entry.assessment_value} size="small" variant="outlined" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {entry.pass_status === true ? (
                          <Chip
                            icon={<PassIcon />}
                            label="Pass"
                            color="success"
                            size="small"
                          />
                        ) : entry.pass_status === false ? (
                          <Chip
                            icon={<FailIcon />}
                            label="Fail"
                            color="error"
                            size="small"
                          />
                        ) : (
                          <Chip label="Pending" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={entry.notes || ''}>
                          {entry.notes || '-'}
                        </Typography>
                        {entry.retest_required && (
                          <Chip label="Retest Required" size="small" color="warning" sx={{ mt: 0.5 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}

      {entries.length === 0 && (
        <Alert severity="info">No test entries recorded for this session.</Alert>
      )}

      {/* Print Styles */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            .print-content {
              padding: 20px;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

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

export default SessionDetail;
