import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchStakeholders, createStakeholder, deleteStakeholder } from '../../../store/slices/integrationSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface StakeholderListProps {
  projectId: number;
}

const levels = ['very_low', 'low', 'medium', 'high', 'very_high'];

const StakeholderList = ({ projectId }: StakeholderListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { stakeholders, loading } = useSelector((state: RootState) => state.integration);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    interest_level: 'medium',
    influence_level: 'medium',
  });

  useEffect(() => {
    dispatch(fetchStakeholders(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createStakeholder({ projectId, data: formData })).unwrap();
      toast.success('Stakeholder added successfully!');
      setOpenDialog(false);
      setFormData({ name: '', role: '', email: '', interest_level: 'medium', influence_level: 'medium' });
    } catch (error) {
      toast.error('Failed to add stakeholder');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this stakeholder?')) {
      try {
        await dispatch(deleteStakeholder(id)).unwrap();
        toast.success('Stakeholder deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete stakeholder');
      }
    }
  };

  const getLevelColor = (level: string) => {
    const colors: any = {
      very_low: 'default',
      low: 'info',
      medium: 'warning',
      high: 'error',
      very_high: 'error',
    };
    return colors[level] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Stakeholders</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Add Stakeholder
        </Button>
      </Box>

      {stakeholders.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No stakeholders added yet
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {stakeholders.map((stakeholder) => (
            <Grid item xs={12} md={6} key={stakeholder.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box>
                      <Typography variant="h6">{stakeholder.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stakeholder.role}
                      </Typography>
                      {stakeholder.email && (
                        <Typography variant="caption" display="block">
                          {stakeholder.email}
                        </Typography>
                      )}
                    </Box>
                    <Button size="small" color="error" onClick={() => handleDelete(stakeholder.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                  <Box mt={2} display="flex" gap={1}>
                    <Chip
                      label={`Interest: ${stakeholder.interest_level}`}
                      size="small"
                      color={getLevelColor(stakeholder.interest_level)}
                    />
                    <Chip
                      label={`Influence: ${stakeholder.influence_level}`}
                      size="small"
                      color={getLevelColor(stakeholder.influence_level)}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stakeholder</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="Interest Level"
            name="interest_level"
            value={formData.interest_level}
            onChange={handleChange}
            margin="normal"
          >
            {levels.map((level) => (
              <MenuItem key={level} value={level}>
                {level.replace('_', ' ').toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            select
            label="Influence Level"
            name="influence_level"
            value={formData.influence_level}
            onChange={handleChange}
            margin="normal"
          >
            {levels.map((level) => (
              <MenuItem key={level} value={level}>
                {level.replace('_', ' ').toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StakeholderList;
