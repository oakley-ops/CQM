import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  ArrowBack,
} from '@mui/icons-material';
import axios from 'axios';

interface Milestone {
  id: number;
  name: string;
  description: string;
  sequence_order: number;
  target_duration_days: number | null;
  is_active: boolean;
}

const MilestoneManagement: React.FC = () => {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_duration_days: '',
  });

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/quote-milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMilestones(response.data.data);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        target_duration_days: milestone.target_duration_days?.toString() || '',
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        name: '',
        description: '',
        target_duration_days: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMilestone(null);
    setFormData({
      name: '',
      description: '',
      target_duration_days: '',
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = {
        name: formData.name,
        description: formData.description,
        target_duration_days: formData.target_duration_days ? parseInt(formData.target_duration_days) : null,
      };

      if (editingMilestone) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/quote-milestones/${editingMilestone.id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/quote-milestones`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      handleCloseDialog();
      fetchMilestones();
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/quote-milestones/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newMilestones = [...milestones];
    const temp = newMilestones[index];
    newMilestones[index] = newMilestones[index - 1];
    newMilestones[index - 1] = temp;

    // Update sequence orders
    const reorderedMilestones = newMilestones.map((m, i) => ({
      id: m.id,
      sequence_order: i + 1
    }));

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/quote-milestones/reorder`,
        { milestones: reorderedMilestones },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMilestones();
    } catch (error) {
      console.error('Error reordering milestones:', error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === milestones.length - 1) return;

    const newMilestones = [...milestones];
    const temp = newMilestones[index];
    newMilestones[index] = newMilestones[index + 1];
    newMilestones[index + 1] = temp;

    // Update sequence orders
    const reorderedMilestones = newMilestones.map((m, i) => ({
      id: m.id,
      sequence_order: i + 1
    }));

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/quote-milestones/reorder`,
        { milestones: reorderedMilestones },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMilestones();
    } catch (error) {
      console.error('Error reordering milestones:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/quotes')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">Milestone Management</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Milestone
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage the milestone templates used for quote tracking. These milestones will be applied to all new quotes.
          </Typography>
          <List>
            {milestones.map((milestone, index) => (
              <Paper key={milestone.id} sx={{ mb: 1, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      ▲
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === milestones.length - 1}
                    >
                      ▼
                    </IconButton>
                  </Box>
                  <DragIcon color="action" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">{milestone.name}</Typography>
                    {milestone.description && (
                      <Typography variant="body2" color="text.secondary">
                        {milestone.description}
                      </Typography>
                    )}
                    {milestone.target_duration_days && (
                      <Typography variant="caption" color="text.secondary">
                        Target Duration: {milestone.target_duration_days} days
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(milestone)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(milestone.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Milestone Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              fullWidth
              label="Target Duration (days)"
              type="number"
              value={formData.target_duration_days}
              onChange={(e) => setFormData({ ...formData, target_duration_days: e.target.value })}
              helperText="Optional: Expected number of days to complete this milestone"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name}
          >
            {editingMilestone ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MilestoneManagement;
