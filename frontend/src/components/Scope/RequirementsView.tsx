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
  Tooltip
} from '@mui/material';
import { 
  CheckCircle as RequirementIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Requirement {
  id: number;
  requirement_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  acceptance_criteria: string;
}

interface RequirementsViewProps {
  projectId: number;
}

const RequirementsView = ({ projectId }: RequirementsViewProps) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [formData, setFormData] = useState({
    requirement_id: '',
    title: '',
    description: '',
    category: 'functional',
    priority: 'medium',
    status: 'draft',
    source: '',
    acceptance_criteria: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequirements();
  }, [projectId]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/scope/requirements`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requirements');
      }

      const data = await response.json();
      setRequirements(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'info' } = {
      'functional': 'primary',
      'non-functional': 'secondary',
      'business': 'success',
      'technical': 'info',
      'regulatory': 'warning'
    };
    return colors[category] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: 'error' | 'warning' | 'info' | 'default' } = {
      'critical': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'default'
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'success' | 'info' | 'error' } = {
      'draft': 'default',
      'approved': 'primary',
      'implemented': 'info',
      'verified': 'success',
      'rejected': 'error'
    };
    return colors[status] || 'default';
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingRequirement
        ? `http://localhost:5000/api/projects/${projectId}/scope/requirements/${editingRequirement.id}`
        : `http://localhost:5000/api/projects/${projectId}/scope/requirements`;
      
      const method = editingRequirement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save requirement');
      }

      setDialogOpen(false);
      fetchRequirements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!requirementToDelete) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/scope/requirements/${requirementToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete requirement');
      }

      setDeleteDialogOpen(false);
      setRequirementToDelete(null);
      fetchRequirements();
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

  if (requirements.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <RequirementIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Requirements Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Requirements will appear here once added to the project.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Requirements ({requirements.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              requirement_id: '',
              title: '',
              description: '',
              category: 'functional',
              priority: 'medium',
              status: 'draft',
              source: '',
              acceptance_criteria: ''
            });
            setEditingRequirement(null);
            setDialogOpen(true);
          }}
        >
          Add Requirement
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Priority</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Source</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requirements.map((req) => (
              <TableRow key={req.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {req.requirement_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {req.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {req.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={req.category}
                    color={getCategoryColor(req.category)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={req.priority}
                    color={getPriorityColor(req.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={req.status}
                    color={getStatusColor(req.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {req.source}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData({
                          requirement_id: req.requirement_id,
                          title: req.title,
                          description: req.description,
                          category: req.category,
                          priority: req.priority,
                          status: req.status,
                          source: req.source,
                          acceptance_criteria: req.acceptance_criteria
                        });
                        setEditingRequirement(req);
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
                        setRequirementToDelete(req);
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
          {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Requirement ID"
              value={formData.requirement_id}
              onChange={(e) => handleFormChange('requirement_id', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) => handleFormChange('category', e.target.value)}
              fullWidth
            >
              <MenuItem value="functional">Functional</MenuItem>
              <MenuItem value="non-functional">Non-Functional</MenuItem>
              <MenuItem value="business">Business</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="regulatory">Regulatory</MenuItem>
            </TextField>
            <TextField
              select
              label="Priority"
              value={formData.priority}
              onChange={(e) => handleFormChange('priority', e.target.value)}
              fullWidth
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="implemented">Implemented</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
            <TextField
              label="Source"
              value={formData.source}
              onChange={(e) => handleFormChange('source', e.target.value)}
              fullWidth
            />
            <TextField
              label="Acceptance Criteria"
              value={formData.acceptance_criteria}
              onChange={(e) => handleFormChange('acceptance_criteria', e.target.value)}
              multiline
              rows={2}
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
            disabled={submitting || !formData.requirement_id || !formData.title}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Requirement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete requirement "{requirementToDelete?.requirement_id} - {requirementToDelete?.title}"?
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

export default RequirementsView;
