import { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, CircularProgress, Alert, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip, Chip
} from '@mui/material';
import { Event as MeetingIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface MeetingMinute {
  id: number;
  meeting_date: string;
  meeting_type: string;
  meeting_title: string;
  attendees: string;
  agenda: string;
  discussion: string;
  decisions: string;
  action_items: string;
  next_meeting: string;
}

interface MeetingMinutesViewProps {
  projectId: number;
}

const MeetingMinutesView = ({ projectId }: MeetingMinutesViewProps) => {
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState<MeetingMinute | null>(null);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_type: 'status',
    meeting_title: '',
    attendees: '',
    agenda: '',
    discussion: '',
    decisions: '',
    action_items: '',
    next_meeting: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [minuteToDelete, setMinuteToDelete] = useState<MeetingMinute | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMinutes();
  }, [projectId]);

  const fetchMinutes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/communications/meeting-minutes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch meeting minutes');
      const data = await response.json();
      setMinutes(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'info' } = {
      'kickoff': 'success',
      'status': 'primary',
      'planning': 'info',
      'review': 'secondary'
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
      const url = editingMinute
        ? `http://localhost:5000/api/projects/${projectId}/communications/meeting-minutes/${editingMinute.id}`
        : `http://localhost:5000/api/projects/${projectId}/communications/meeting-minutes`;
      
      const response = await fetch(url, {
        method: editingMinute ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save meeting minute');
      setDialogOpen(false);
      fetchMinutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!minuteToDelete) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/communications/meeting-minutes/${minuteToDelete.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error('Failed to delete meeting minute');
      setDeleteDialogOpen(false);
      setMinuteToDelete(null);
      fetchMinutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

  if (minutes.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <MeetingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">No Meeting Minutes Found</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>Document meeting discussions and decisions.</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ meeting_date: '', meeting_type: 'status', meeting_title: '', attendees: '', agenda: '', discussion: '', decisions: '', action_items: '', next_meeting: '' });
          setEditingMinute(null);
          setDialogOpen(true);
        }} sx={{ mt: 2 }}>Add First Meeting</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Meeting Minutes ({minutes.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ meeting_date: '', meeting_type: 'status', meeting_title: '', attendees: '', agenda: '', discussion: '', decisions: '', action_items: '', next_meeting: '' });
          setEditingMinute(null);
          setDialogOpen(true);
        }}>Add Meeting</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Attendees</strong></TableCell>
              <TableCell><strong>Decisions</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {minutes.map((minute) => (
              <TableRow key={minute.id} hover>
                <TableCell>{new Date(minute.meeting_date).toLocaleDateString()}</TableCell>
                <TableCell><Typography variant="body2" fontWeight="medium">{minute.meeting_title}</Typography></TableCell>
                <TableCell><Chip label={minute.meeting_type} color={getTypeColor(minute.meeting_type)} size="small" /></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{minute.attendees}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{minute.decisions.substring(0, 50)}...</Typography></TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => {
                      setFormData({
                        meeting_date: minute.meeting_date.split('T')[0],
                        meeting_type: minute.meeting_type,
                        meeting_title: minute.meeting_title,
                        attendees: minute.attendees,
                        agenda: minute.agenda,
                        discussion: minute.discussion,
                        decisions: minute.decisions,
                        action_items: minute.action_items,
                        next_meeting: minute.next_meeting ? minute.next_meeting.split('T')[0] : ''
                      });
                      setEditingMinute(minute);
                      setDialogOpen(true);
                    }}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => {
                      setMinuteToDelete(minute);
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
        <DialogTitle>{editingMinute ? 'Edit Meeting Minutes' : 'Add Meeting Minutes'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Meeting Date" type="date" value={formData.meeting_date} onChange={(e) => handleFormChange('meeting_date', e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField label="Meeting Title" value={formData.meeting_title} onChange={(e) => handleFormChange('meeting_title', e.target.value)} fullWidth required />
            <TextField select label="Meeting Type" value={formData.meeting_type} onChange={(e) => handleFormChange('meeting_type', e.target.value)} fullWidth>
              <MenuItem value="kickoff">Kickoff</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="review">Review</MenuItem>
            </TextField>
            <TextField label="Attendees" value={formData.attendees} onChange={(e) => handleFormChange('attendees', e.target.value)} fullWidth helperText="Comma-separated names" />
            <TextField label="Agenda" value={formData.agenda} onChange={(e) => handleFormChange('agenda', e.target.value)} multiline rows={2} fullWidth />
            <TextField label="Discussion" value={formData.discussion} onChange={(e) => handleFormChange('discussion', e.target.value)} multiline rows={3} fullWidth />
            <TextField label="Decisions" value={formData.decisions} onChange={(e) => handleFormChange('decisions', e.target.value)} multiline rows={2} fullWidth />
            <TextField label="Action Items" value={formData.action_items} onChange={(e) => handleFormChange('action_items', e.target.value)} multiline rows={2} fullWidth />
            <TextField label="Next Meeting" type="date" value={formData.next_meeting} onChange={(e) => handleFormChange('next_meeting', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={submitting || !formData.meeting_date || !formData.meeting_title}>{submitting ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Meeting Minutes</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{minuteToDelete?.meeting_title}"?</Typography>
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

export default MeetingMinutesView;
