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
  Description as ContractIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Contract {
  id: number;
  contract_number: string;
  title: string;
  description: string;
  contract_type: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  status: string;
  terms: string;
  vendor?: {
    id: number;
    name: string;
  };
}

interface Vendor {
  id: number;
  name: string;
}

interface ContractsViewProps {
  projectId: number;
}

const ContractsView = ({ projectId }: ContractsViewProps) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    contract_number: '',
    title: '',
    description: '',
    vendor_id: '',
    contract_type: 'fixed-price',
    contract_value: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    terms: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContracts();
    fetchVendors();
  }, [projectId]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/scope/contracts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }

      const data = await response.json();
      setContracts(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/scope/vendors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendors(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'success' | 'warning' | 'error' } = {
      'draft': 'default',
      'pending': 'warning',
      'active': 'primary',
      'completed': 'success',
      'cancelled': 'error'
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'info' } = {
      'fixed-price': 'primary',
      'time-and-materials': 'secondary',
      'cost-plus': 'info'
    };
    return colors[type] || 'primary';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingContract
        ? `http://localhost:5000/api/projects/${projectId}/scope/contracts/${editingContract.id}`
        : `http://localhost:5000/api/projects/${projectId}/scope/contracts`;
      
      const method = editingContract ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          contract_value: parseFloat(formData.contract_value),
          vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save contract');
      }

      setDialogOpen(false);
      fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/scope/contracts/${contractToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete contract');
      }

      setDeleteDialogOpen(false);
      setContractToDelete(null);
      fetchContracts();
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

  if (contracts.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <ContractIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Contracts Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Contract information will appear here once added.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              contract_number: '',
              title: '',
              description: '',
              vendor_id: '',
              contract_type: 'fixed-price',
              contract_value: '',
              start_date: '',
              end_date: '',
              status: 'draft',
              terms: ''
            });
            setEditingContract(null);
            setDialogOpen(true);
          }}
          sx={{ mt: 2 }}
        >
          Add First Contract
        </Button>
      </Box>
    );
  }

  const totalValue = contracts.reduce((sum, contract) => sum + Number(contract.contract_value), 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6">
            Contracts ({contracts.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Value: {formatCurrency(totalValue)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              contract_number: '',
              title: '',
              description: '',
              vendor_id: '',
              contract_type: 'fixed-price',
              contract_value: '',
              start_date: '',
              end_date: '',
              status: 'draft',
              terms: ''
            });
            setEditingContract(null);
            setDialogOpen(true);
          }}
        >
          Add Contract
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Contract #</strong></TableCell>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Vendor</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Value</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {contract.contract_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {contract.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {contract.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {contract.vendor?.name || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={contract.contract_type.replace('-', ' ')}
                    color={getTypeColor(contract.contract_type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(Number(contract.contract_value))}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(contract.start_date)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    to {formatDate(contract.end_date)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={contract.status}
                    color={getStatusColor(contract.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData({
                          contract_number: contract.contract_number,
                          title: contract.title,
                          description: contract.description,
                          vendor_id: contract.vendor?.id?.toString() || '',
                          contract_type: contract.contract_type,
                          contract_value: contract.contract_value.toString(),
                          start_date: contract.start_date.split('T')[0],
                          end_date: contract.end_date.split('T')[0],
                          status: contract.status,
                          terms: contract.terms
                        });
                        setEditingContract(contract);
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
                        setContractToDelete(contract);
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
          {editingContract ? 'Edit Contract' : 'Add New Contract'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Contract Number"
              value={formData.contract_number}
              onChange={(e) => handleFormChange('contract_number', e.target.value)}
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
              rows={2}
              fullWidth
            />
            <TextField
              select
              label="Vendor"
              value={formData.vendor_id}
              onChange={(e) => handleFormChange('vendor_id', e.target.value)}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {vendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id.toString()}>
                  {vendor.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Contract Type"
              value={formData.contract_type}
              onChange={(e) => handleFormChange('contract_type', e.target.value)}
              fullWidth
            >
              <MenuItem value="fixed-price">Fixed Price</MenuItem>
              <MenuItem value="time-and-materials">Time and Materials</MenuItem>
              <MenuItem value="cost-plus">Cost Plus</MenuItem>
            </TextField>
            <TextField
              label="Contract Value"
              type="number"
              value={formData.contract_value}
              onChange={(e) => handleFormChange('contract_value', e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
              }}
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
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              label="Terms"
              value={formData.terms}
              onChange={(e) => handleFormChange('terms', e.target.value)}
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
            disabled={submitting || !formData.contract_number || !formData.title || !formData.contract_value}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Contract</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete contract "{contractToDelete?.contract_number} - {contractToDelete?.title}"?
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

export default ContractsView;
