import { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Typography, CircularProgress, Alert, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip
} from '@mui/material';
import { Assessment as ReportIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface StatusReport {
  id: number;
  report_date: string;
  reporting_period: string;
  overall_status: string;
  accomplishments: string;
  planned_activities: string;
  issues: string;
  risks: string;
  creator?: { name: string };
}

interface StatusReportsViewProps {
  projectId: number;
}

const StatusReportsView = ({ projectId }: StatusReportsViewProps) => {
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<StatusReport | null>(null);
  const [formData, setFormData] = useState({
    report_date: '',
    reporting_period: '',
    overall_status: 'on-track',
    accomplishments: '',
    planned_activities: '',
    issues: '',
    risks: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<StatusReport | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/communications/status-reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'success' | 'warning' | 'error' } = {
      'on-track': 'success',
      'at-risk': 'warning',
      'off-track': 'error'
    };
    return colors[status] || 'success';
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingReport
        ? `http://localhost:5000/api/projects/${projectId}/communications/status-reports/${editingReport.id}`
        : `http://localhost:5000/api/projects/${projectId}/communications/status-reports`;
      
      const response = await fetch(url, {
        method: editingReport ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save report');
      setDialogOpen(false);
      fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/communications/status-reports/${reportToDelete.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error('Failed to delete report');
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

  if (reports.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <ReportIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">No Status Reports Found</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>Create status reports to track project progress.</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ report_date: '', reporting_period: '', overall_status: 'on-track', accomplishments: '', planned_activities: '', issues: '', risks: '' });
          setEditingReport(null);
          setDialogOpen(true);
        }} sx={{ mt: 2 }}>Add First Report</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Status Reports ({reports.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ report_date: '', reporting_period: '', overall_status: 'on-track', accomplishments: '', planned_activities: '', issues: '', risks: '' });
          setEditingReport(null);
          setDialogOpen(true);
        }}>Add Report</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Period</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Accomplishments</strong></TableCell>
              <TableCell><strong>Issues</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id} hover>
                <TableCell>{new Date(report.report_date).toLocaleDateString()}</TableCell>
                <TableCell>{report.reporting_period}</TableCell>
                <TableCell>
                  <Chip label={report.overall_status.replace('-', ' ')} color={getStatusColor(report.overall_status)} size="small" />
                </TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{report.accomplishments.substring(0, 100)}...</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{report.issues || 'None'}</Typography></TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => {
                      setFormData({
                        report_date: report.report_date.split('T')[0],
                        reporting_period: report.reporting_period,
                        overall_status: report.overall_status,
                        accomplishments: report.accomplishments,
                        planned_activities: report.planned_activities,
                        issues: report.issues,
                        risks: report.risks
                      });
                      setEditingReport(report);
                      setDialogOpen(true);
                    }}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => {
                      setReportToDelete(report);
                      setDeleteDialogOpen(true);
                    }}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingReport ? 'Edit Status Report' : 'Add Status Report'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Report Date" type="date" value={formData.report_date} onChange={(e) => handleFormChange('report_date', e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField label="Reporting Period" value={formData.reporting_period} onChange={(e) => handleFormChange('reporting_period', e.target.value)} fullWidth helperText="e.g., January 2025" />
            <TextField select label="Overall Status" value={formData.overall_status} onChange={(e) => handleFormChange('overall_status', e.target.value)} fullWidth>
              <MenuItem value="on-track">On Track</MenuItem>
              <MenuItem value="at-risk">At Risk</MenuItem>
              <MenuItem value="off-track">Off Track</MenuItem>
            </TextField>
            <TextField label="Accomplishments" value={formData.accomplishments} onChange={(e) => handleFormChange('accomplishments', e.target.value)} multiline rows={3} fullWidth />
            <TextField label="Planned Activities" value={formData.planned_activities} onChange={(e) => handleFormChange('planned_activities', e.target.value)} multiline rows={3} fullWidth />
            <TextField label="Issues" value={formData.issues} onChange={(e) => handleFormChange('issues', e.target.value)} multiline rows={2} fullWidth />
            <TextField label="Risks" value={formData.risks} onChange={(e) => handleFormChange('risks', e.target.value)} multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={submitting || !formData.report_date}>{submitting ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Status Report</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this status report?</Typography>
          <Typography color="error" sx={{ mt: 2 }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StatusReportsView;
