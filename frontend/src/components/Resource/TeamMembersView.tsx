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
  Chip,
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
  Tooltip,
  Avatar
} from '@mui/material';
import { 
  People as TeamIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface TeamMember {
  id: number;
  user_id: number;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  hourly_rate: number;
  skills: string;
  status: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface TeamMembersViewProps {
  projectId: number;
}

const TeamMembersView = ({ projectId }: TeamMembersViewProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    role: '',
    allocation_percentage: '100',
    start_date: '',
    end_date: '',
    hourly_rate: '',
    skills: '',
    status: 'active'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchUsers();
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/resources/team`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      setTeamMembers(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'success' | 'default' | 'warning' } = {
      'active': 'success',
      'inactive': 'default',
      'on-leave': 'warning'
    };
    return colors[status] || 'default';
  };

  const parseSkills = (skillsString: string): string[] => {
    try {
      return JSON.parse(skillsString);
    } catch {
      return [];
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingMember
        ? `http://localhost:5000/api/projects/${projectId}/resources/team/${editingMember.id}`
        : `http://localhost:5000/api/projects/${projectId}/resources/team`;
      
      const method = editingMember ? 'PUT' : 'POST';
      
      // Parse skills as JSON array
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          user_id: parseInt(formData.user_id),
          allocation_percentage: parseInt(formData.allocation_percentage),
          hourly_rate: parseFloat(formData.hourly_rate),
          skills: JSON.stringify(skillsArray)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save team member');
      }

      setDialogOpen(false);
      fetchTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/resources/team/${memberToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete team member');
      }

      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      fetchTeamMembers();
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

  if (teamMembers.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <TeamIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Team Members Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Add team members to manage project resources.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              user_id: '',
              role: '',
              allocation_percentage: '100',
              start_date: '',
              end_date: '',
              hourly_rate: '',
              skills: '',
              status: 'active'
            });
            setEditingMember(null);
            setDialogOpen(true);
          }}
          sx={{ mt: 2 }}
        >
          Add First Team Member
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Team Members ({teamMembers.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              user_id: '',
              role: '',
              allocation_percentage: '100',
              start_date: '',
              end_date: '',
              hourly_rate: '',
              skills: '',
              status: 'active'
            });
            setEditingMember(null);
            setDialogOpen(true);
          }}
        >
          Add Team Member
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Member</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Allocation</strong></TableCell>
              <TableCell><strong>Period</strong></TableCell>
              <TableCell><strong>Rate</strong></TableCell>
              <TableCell><strong>Skills</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {member.user?.name?.charAt(0) || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {member.user?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.user?.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{member.role}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${member.allocation_percentage}%`} 
                    size="small"
                    color={member.allocation_percentage === 100 ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(member.start_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    to {new Date(member.end_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    ${member.hourly_rate}/hr
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {parseSkills(member.skills).slice(0, 2).map((skill, idx) => (
                      <Chip key={idx} label={skill} size="small" variant="outlined" />
                    ))}
                    {parseSkills(member.skills).length > 2 && (
                      <Chip label={`+${parseSkills(member.skills).length - 2}`} size="small" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={member.status}
                    color={getStatusColor(member.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const skills = parseSkills(member.skills).join(', ');
                        setFormData({
                          user_id: member.user_id.toString(),
                          role: member.role,
                          allocation_percentage: member.allocation_percentage.toString(),
                          start_date: member.start_date.split('T')[0],
                          end_date: member.end_date.split('T')[0],
                          hourly_rate: member.hourly_rate.toString(),
                          skills: skills,
                          status: member.status
                        });
                        setEditingMember(member);
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
                        setMemberToDelete(member);
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
          {editingMember ? 'Edit Team Member' : 'Add Team Member'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="User"
              value={formData.user_id}
              onChange={(e) => handleFormChange('user_id', e.target.value)}
              fullWidth
              required
              disabled={!!editingMember}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id.toString()}>
                  {user.name} ({user.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Role"
              value={formData.role}
              onChange={(e) => handleFormChange('role', e.target.value)}
              fullWidth
              required
              helperText="e.g., Project Manager, Developer, Designer"
            />
            <TextField
              label="Allocation Percentage"
              type="number"
              value={formData.allocation_percentage}
              onChange={(e) => handleFormChange('allocation_percentage', e.target.value)}
              fullWidth
              required
              InputProps={{
                endAdornment: <Typography>%</Typography>
              }}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleFormChange('start_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleFormChange('end_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hourly Rate"
              type="number"
              value={formData.hourly_rate}
              onChange={(e) => handleFormChange('hourly_rate', e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
              }}
            />
            <TextField
              label="Skills"
              value={formData.skills}
              onChange={(e) => handleFormChange('skills', e.target.value)}
              fullWidth
              multiline
              rows={2}
              helperText="Comma-separated list of skills"
            />
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="on-leave">On Leave</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={submitting || !formData.user_id || !formData.role}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{memberToDelete?.user?.name}" from the project team?
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
            {submitting ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamMembersView;
