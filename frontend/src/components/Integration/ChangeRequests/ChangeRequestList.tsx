import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { fetchChangeRequests, createChangeRequest } from '../../../store/slices/integrationSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface ChangeRequestListProps {
  projectId: number;
}

const ChangeRequestList = ({ projectId }: ChangeRequestListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { changeRequests, loading } = useSelector((state: RootState) => state.integration);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    justification: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    scope_impact: false,
    schedule_impact: false,
    cost_impact: false,
  });

  useEffect(() => {
    dispatch(fetchChangeRequests(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createChangeRequest({ projectId, data: formData })).unwrap();
      toast.success('Change request created successfully!');
      setOpenDialog(false);
      setFormData({
        title: '',
        description: '',
        justification: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        scope_impact: false,
        schedule_impact: false,
        cost_impact: false,
      });
    } catch (error) {
      toast.error('Failed to create change request');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'default',
      under_review: 'info',
      approved: 'success',
      rejected: 'error',
      implemented: 'success',
    };
    return colors[status] || 'default';
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
        <Typography variant="h5">Change Requests</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          New Change Request
        </Button>
      </Box>

      {changeRequests.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No change requests yet
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {changeRequests.map((cr) => (
            <Card key={cr.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="h6">{cr.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cr.description}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Chip label={cr.status.replace('_', ' ').toUpperCase()} color={getStatusColor(cr.status)} size="small" />
                    <Chip label={cr.priority.toUpperCase()} size="small" />
                  </Box>
                </Box>
                {(cr.scope_impact || cr.schedule_impact || cr.cost_impact) && (
                  <Box mt={2} display="flex" gap={1}>
                    {cr.scope_impact && <Chip label="Scope Impact" size="small" variant="outlined" />}
                    {cr.schedule_impact && <Chip label="Schedule Impact" size="small" variant="outlined" />}
                    {cr.cost_impact && <Chip label="Cost Impact" size="small" variant="outlined" />}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Change Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Justification"
            name="justification"
            value={formData.justification}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            select
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </TextField>
          <Box mt={2}>
            <FormControlLabel
              control={<Checkbox name="scope_impact" checked={formData.scope_impact} onChange={handleChange} />}
              label="Scope Impact"
            />
            <FormControlLabel
              control={<Checkbox name="schedule_impact" checked={formData.schedule_impact} onChange={handleChange} />}
              label="Schedule Impact"
            />
            <FormControlLabel
              control={<Checkbox name="cost_impact" checked={formData.cost_impact} onChange={handleChange} />}
              label="Cost Impact"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChangeRequestList;
