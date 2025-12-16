import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip
} from '@mui/material';
import { 
  Assignment as AllocationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface ResourceAllocation {
  id: number;
  team_member_id: number;
  task_id: number | null;
  allocated_hours: number;
  start_date: string;
  end_date: string;
  notes: string;
  teamMember?: {
    role: string;
    user?: {
      name: string;
    };
  };
  task?: {
    name: string;
  };
}

interface TeamMember {
  id: number;
  role: string;
  user?: {
    name: string;
  };
}

interface Task {
  id: number;
  name: string;
}

interface ResourceAllocationViewProps {
  projectId: number;
}

const ResourceAllocationView = ({ projectId }: ResourceAllocationViewProps) => {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ResourceAllocation | null>(null);
  const [formData, setFormData] = useState({
    team_member_id: '',
    task_id: '',
    allocated_hours: '',
    start_date: '',
    end_date: '',
    notes: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<ResourceAllocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAllocations();
    fetchTeamMembers();
    fetchTasks();
  }, [projectId]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/resources/allocations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch allocations');
      }

      const data = await response.json();
      setAllocations(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/resources/team`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/schedule/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingAllocation
        ? `http://localhost:5000/api/projects/${projectId}/resources/allocations/${editingAllocation.id}`
        : `http://localhost:5000/api/projects/${projectId}/resources/allocations`;
      
      const method = editingAllocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          team_member_id: parseInt(formData.team_member_id),
          task_id: formData.task_id ? parseInt(formData.task_id) : null,
          allocated_hours: parseFloat(formData.allocated_hours)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save allocation');
      }

      setDialogOpen(false);
      fetchAllocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!allocationToDelete) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/resources/allocations/${allocationToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete allocation');
      }

      setDeleteDialogOpen(false);
      setAllocationToDelete(null);
      fetchAllocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (allocations.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <AllocationIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Resource Allocations Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Allocate team members to tasks to track resource utilization.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              team_member_id: '',
              task_id: '',
              allocated_hours: '',
              start_date: '',
              end_date: '',
              notes: ''
            });
            setEditingAllocation(null);
            setDialogOpen(true);
          }}
          sx={{ mt: 2 }}
        >
          Add First Allocation
        </Button>
      </Box>
    );
  }

  const totalHours = allocations.reduce((sum, a) => sum + Number(a.allocated_hours), 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6">
            Resource Allocations ({allocations.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Hours: {totalHours}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              team_member_id: '',
              task_id: '',
              allocated_hours: '',
              start_date: '',
              end_date: '',
              notes: ''
            });
            setEditingAllocation(null);
            setDialogOpen(true);
          }}
        >
          Add Allocation
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Team Member</strong></TableCell>
              <TableCell><strong>Task</strong></TableCell>
              <TableCell><strong>Hours</strong></TableCell>
              <TableCell><strong>Period</strong></TableCell>
              <TableCell><strong>Notes</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {allocation.teamMember?.user?.name || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {allocation.teamMember?.role}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {allocation.task?.name || 'General'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {allocation.allocated_hours}h
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(allocation.start_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    to {new Date(allocation.end_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {allocation.notes}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData({
                          team_member_id: allocation.team_member_id.toString(),
                          task_id: allocation.task_id?.toString() || '',
                          allocated_hours: allocation.allocated_hours.toString(),
                          start_date: allocation.start_date.split('T')[0],
                          end_date: allocation.end_date.split('T')[0],
                          notes: allocation.notes
                        });
                        setEditingAllocation(allocation);
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setAllocationToDelete(allocation);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAllocation ? 'Edit Allocation' : 'Add Resource Allocation'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Team Member"
              value={formData.team_member_id}
              onChange={(e) => handleFormChange('team_member_id', e.target.value)}
              fullWidth
              required
            >
              {teamMembers.map((member) => (
                <MenuItem key={member.id} value={member.id.toString()}>
                  {member.user?.name} - {member.role}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Task (Optional)"
              value={formData.task_id}
              onChange={(e) => handleFormChange('task_id', e.target.value)}
              fullWidth
            >
              <MenuItem value="">None (General)</MenuItem>
              {tasks.map((task) => (
                <MenuItem key={task.id} value={task.id.toString()}>
                  {task.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Allocated Hours"
              type="number"
              value={formData.allocated_hours}
              onChange={(e) => handleFormChange('allocated_hours', e.target.value)}
              fullWidth
              required
              InputProps={{
                endAdornment: <Typography>hours</Typography>
              }}
            />
            <TextField
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleFormChange('start_date', e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleFormChange('end_date', e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={submitting || !formData.team_member_id || !formData.allocated_hours}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Allocation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this resource allocation?
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="contained" 
            color="error"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceAllocationView;
