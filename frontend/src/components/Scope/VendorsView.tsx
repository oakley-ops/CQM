import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Rating,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip
} from '@mui/material';
import { 
  Business as VendorIcon, 
  Email, 
  Phone, 
  LocationOn,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Vendor {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  rating: number;
  status: string;
  notes: string;
}

interface VendorsViewProps {
  projectId: number;
}

const VendorsView = ({ projectId }: VendorsViewProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    category: '',
    rating: 3,
    status: 'active',
    notes: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, [projectId]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/scope/vendors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const data = await response.json();
      setVendors(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingVendor
        ? `http://localhost:5000/api/projects/${projectId}/scope/vendors/${editingVendor.id}`
        : `http://localhost:5000/api/projects/${projectId}/scope/vendors`;
      
      const method = editingVendor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save vendor');
      }

      setDialogOpen(false);
      fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!vendorToDelete) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/scope/vendors/${vendorToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete vendor');
      }

      setDeleteDialogOpen(false);
      setVendorToDelete(null);
      fetchVendors();
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

  if (vendors.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <VendorIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Vendors Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Vendor information will appear here once added.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              name: '',
              contact_person: '',
              email: '',
              phone: '',
              address: '',
              category: '',
              rating: 3,
              status: 'active',
              notes: ''
            });
            setEditingVendor(null);
            setDialogOpen(true);
          }}
          sx={{ mt: 2 }}
        >
          Add First Vendor
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Vendors ({vendors.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({
              name: '',
              contact_person: '',
              email: '',
              phone: '',
              address: '',
              category: '',
              rating: 3,
              status: 'active',
              notes: ''
            });
            setEditingVendor(null);
            setDialogOpen(true);
          }}
        >
          Add Vendor
        </Button>
      </Box>

      <Grid container spacing={3}>
        {vendors.map((vendor) => (
          <Grid item xs={12} md={6} lg={4} key={vendor.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" component="div">
                    {vendor.name}
                  </Typography>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFormData({
                            name: vendor.name,
                            contact_person: vendor.contact_person,
                            email: vendor.email,
                            phone: vendor.phone,
                            address: vendor.address,
                            category: vendor.category,
                            rating: vendor.rating,
                            status: vendor.status,
                            notes: vendor.notes
                          });
                          setEditingVendor(vendor);
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
                          setVendorToDelete(vendor);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Chip 
                  label={vendor.category} 
                  color="primary" 
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Box mb={2}>
                  <Rating value={vendor.rating} precision={0.5} readOnly size="small" />
                  <Typography variant="caption" color="text.secondary" ml={1}>
                    {vendor.rating}/5.0
                  </Typography>
                </Box>

                <Box mb={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Contact Person
                  </Typography>
                  <Typography variant="body2">
                    {vendor.contact_person}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {vendor.email}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {vendor.phone}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="start" mb={2}>
                  <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary', mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {vendor.address}
                  </Typography>
                </Box>

                {vendor.notes && (
                  <Box mt={2} pt={2} borderTop={1} borderColor="divider">
                    <Typography variant="caption" color="text.secondary">
                      {vendor.notes}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Vendor Name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Contact Person"
              value={formData.contact_person}
              onChange={(e) => handleFormChange('contact_person', e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              fullWidth
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
              fullWidth
            />
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => handleFormChange('address', e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Category"
              value={formData.category}
              onChange={(e) => handleFormChange('category', e.target.value)}
              fullWidth
              helperText="e.g., Equipment, Construction, Technology"
            />
            <Box>
              <Typography variant="body2" gutterBottom>
                Rating
              </Typography>
              <Rating
                value={formData.rating}
                onChange={(_, value) => handleFormChange('rating', value || 0)}
                precision={0.5}
              />
            </Box>
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
            disabled={submitting || !formData.name}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Vendor</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete vendor "{vendorToDelete?.name}"?
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

export default VendorsView;
