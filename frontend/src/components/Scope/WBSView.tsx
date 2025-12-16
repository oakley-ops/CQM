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
  AccountTree as WBSIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface WBSItem {
  id: number;
  wbs_code: string;
  name: string;
  description: string;
  level: number;
  estimated_hours?: number;
  actual_hours?: number;
  status?: string;
}

interface WBSViewProps {
  projectId: number;
}

const WBSView = ({ projectId }: WBSViewProps) => {
  const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WBSItem | null>(null);
  const [formData, setFormData] = useState({
    wbs_code: '',
    name: '',
    description: '',
    level: 1,
    status: 'not-started'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WBSItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWBSItems();
  }, [projectId]);

  const fetchWBSItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/scope/wbs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch WBS items');
      }

      const data = await response.json();
      setWbsItems(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'success' | 'warning' | 'error' } = {
      'not-started': 'default',
      'in-progress': 'primary',
      'completed': 'success',
      'on-hold': 'warning',
      'cancelled': 'error'
    };
    return colors[status || ''] || 'default';
  };

  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingItem
        ? `http://localhost:5000/api/projects/${projectId}/scope/wbs/${editingItem.id}`
        : `http://localhost:5000/api/projects/${projectId}/scope/wbs`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save WBS item');
      }

      setDialogOpen(false);
      fetchWBSItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/scope/wbs/${itemToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete WBS item');
      }

      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchWBSItems();
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

  if (wbsItems.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <WBSIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No WBS Items Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Work breakdown structure items will appear here once added.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              wbs_code: '',
              name: '',
              description: '',
              level: 1,
              status: 'not-started'
            });
            setEditingItem(null);
            setDialogOpen(true);
          }}
          sx={{ mt: 2 }}
        >
          Add First WBS Item
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Work Breakdown Structure ({wbsItems.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              wbs_code: '',
              name: '',
              description: '',
              level: 1,
              status: 'not-started'
            });
            setEditingItem(null);
            setDialogOpen(true);
          }}
        >
          Add WBS Item
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>WBS Code</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Level</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wbsItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {item.wbs_code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    sx={{ 
                      pl: item.level * 2,
                      fontWeight: item.level === 1 ? 'bold' : 'medium'
                    }}
                  >
                    {item.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`Level ${item.level}`} 
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {item.status && (
                    <Chip
                      label={item.status.replace('-', ' ')}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData({
                          wbs_code: item.wbs_code,
                          name: item.name,
                          description: item.description,
                          level: item.level,
                          status: item.status || 'not-started'
                        });
                        setEditingItem(item);
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
                        setItemToDelete(item);
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
          {editingItem ? 'Edit WBS Item' : 'Add New WBS Item'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="WBS Code"
              value={formData.wbs_code}
              onChange={(e) => handleFormChange('wbs_code', e.target.value)}
              fullWidth
              required
              helperText="e.g., 1.0, 2.1, 3.2.1"
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
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
              label="Level"
              value={formData.level}
              onChange={(e) => handleFormChange('level', parseInt(e.target.value))}
              fullWidth
              helperText="Hierarchy level (1 = top level)"
            >
              <MenuItem value={1}>Level 1 (Top)</MenuItem>
              <MenuItem value={2}>Level 2</MenuItem>
              <MenuItem value={3}>Level 3</MenuItem>
              <MenuItem value={4}>Level 4</MenuItem>
              <MenuItem value={5}>Level 5</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="not-started">Not Started</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="on-hold">On Hold</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
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
            disabled={submitting || !formData.wbs_code || !formData.name}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete WBS Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete WBS item "{itemToDelete?.wbs_code} - {itemToDelete?.name}"?
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

export default WBSView;
