import { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Typography, CircularProgress, Alert, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip
} from '@mui/material';
import { Chat as LogIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface CommunicationLog {
  id: number;
  communication_date: string;
  communication_type: string;
  subject: string;
  description?: string;
  recipients?: string;
  sender?: { name: string };
}

interface CommunicationLogsViewProps {
  projectId: number;
}

const CommunicationLogsView = ({ projectId }: CommunicationLogsViewProps) => {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CommunicationLog | null>(null);
  const [formData, setFormData] = useState({
    communication_date: '',
    communication_type: 'email',
    subject: '',
    description: '',
    recipients: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<CommunicationLog | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [projectId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/communications/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch communication logs');
      const data = await response.json();
      setLogs(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' } = {
      'email': 'primary',
      'phone': 'success',
      'meeting': 'secondary'
    };
    return colors[type] || 'primary';
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingLog
        ? `http://localhost:5000/api/projects/${projectId}/communications/logs/${editingLog.id}`
        : `http://localhost:5000/api/projects/${projectId}/communications/logs`;
      
      const response = await fetch(url, {
        method: editingLog ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save communication log');
      setDialogOpen(false);
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/communications/logs/${logToDelete.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error('Failed to delete communication log');
      setDeleteDialogOpen(false);
      setLogToDelete(null);
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

  if (logs.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <LogIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">No Communication Logs Found</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>Track all project communications and correspondence.</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ communication_date: '', communication_type: 'email', subject: '', description: '', recipients: '' });
          setEditingLog(null);
          setDialogOpen(true);
        }} sx={{ mt: 2 }}>Add First Log</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Communication Logs ({logs.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ communication_date: '', communication_type: 'email', subject: '', description: '', recipients: '' });
          setEditingLog(null);
          setDialogOpen(true);
        }}>Add Log</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Subject</strong></TableCell>
              <TableCell><strong>Recipients</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.communication_date).toLocaleDateString()}</TableCell>
                <TableCell><Chip label={log.communication_type} color={getTypeColor(log.communication_type)} size="small" /></TableCell>
                <TableCell><Typography variant="body2" fontWeight="medium">{log.subject}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{log.recipients || 'N/A'}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{log.description?.substring(0, 50) || 'N/A'}...</Typography></TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => {
                      setFormData({
                        communication_date: log.communication_date.split('T')[0],
                        communication_type: log.communication_type,
                        subject: log.subject,
                        description: log.description || '',
                        recipients: log.recipients || ''
                      });
                      setEditingLog(log);
                      setDialogOpen(true);
                    }}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => {
                      setLogToDelete(log);
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
        <DialogTitle>{editingLog ? 'Edit Communication Log' : 'Add Communication Log'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Communication Date" type="date" value={formData.communication_date} onChange={(e) => handleFormChange('communication_date', e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField select label="Communication Type" value={formData.communication_type} onChange={(e) => handleFormChange('communication_type', e.target.value)} fullWidth>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="phone">Phone</MenuItem>
              <MenuItem value="meeting">Meeting</MenuItem>
            </TextField>
            <TextField label="Subject" value={formData.subject} onChange={(e) => handleFormChange('subject', e.target.value)} fullWidth required />
            <TextField label="Recipients" value={formData.recipients} onChange={(e) => handleFormChange('recipients', e.target.value)} fullWidth helperText="Comma-separated recipients" />
            <TextField label="Description" value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)} multiline rows={4} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={submitting || !formData.communication_date || !formData.subject}>{submitting ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Communication Log</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this communication log?</Typography>
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

export default CommunicationLogsView;
