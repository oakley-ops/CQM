import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Edit as EditIcon, Check as ApproveIcon, Save as SaveIcon } from '@mui/icons-material';
import { fetchCharter, createCharter, updateCharter } from '../../../store/slices/integrationSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface CharterViewProps {
  projectId: number;
}

const CharterView = ({ projectId }: CharterViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { charter, loading } = useSelector((state: RootState) => state.integration);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    business_case: '',
    objectives: '',
    success_criteria: '',
    high_level_requirements: '',
    assumptions: '',
    constraints: '',
    high_level_risks: '',
    summary_budget: '',
    summary_timeline: '',
    key_stakeholders: '',
  });

  useEffect(() => {
    dispatch(fetchCharter(projectId));
  }, [dispatch, projectId]);

  useEffect(() => {
    if (charter) {
      setFormData({
        business_case: charter.business_case || '',
        objectives: charter.objectives || '',
        success_criteria: charter.success_criteria || '',
        high_level_requirements: charter.high_level_requirements || '',
        assumptions: charter.assumptions || '',
        constraints: charter.constraints || '',
        high_level_risks: charter.high_level_risks || '',
        summary_budget: charter.summary_budget?.toString() || '',
        summary_timeline: charter.summary_timeline || '',
        key_stakeholders: charter.key_stakeholders || '',
      });
    }
  }, [charter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        summary_budget: formData.summary_budget ? parseFloat(formData.summary_budget) : undefined,
      };

      if (charter) {
        await dispatch(updateCharter({ projectId, data })).unwrap();
        toast.success('Charter updated successfully!');
      } else {
        await dispatch(createCharter({ projectId, data })).unwrap();
        toast.success('Charter created successfully!');
      }
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save charter');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!charter && !isEditing) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h6" gutterBottom>
          No Charter Created Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Create a project charter to define the project scope and objectives
        </Typography>
        <Button variant="contained" onClick={() => setIsEditing(true)}>
          Create Charter
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Project Charter</Typography>
        <Box>
          {charter?.approved_at && (
            <Chip label="Approved" color="success" sx={{ mr: 1 }} icon={<ApproveIcon />} />
          )}
          {!isEditing ? (
            <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button onClick={() => setIsEditing(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                Save
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Business Case"
            name="business_case"
            value={formData.business_case}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Objectives"
            name="objectives"
            value={formData.objectives}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Success Criteria"
            name="success_criteria"
            value={formData.success_criteria}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Assumptions"
            name="assumptions"
            value={formData.assumptions}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Constraints"
            name="constraints"
            value={formData.constraints}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="High Level Risks"
            name="high_level_risks"
            value={formData.high_level_risks}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Summary Budget"
            name="summary_budget"
            value={formData.summary_budget}
            onChange={handleChange}
            type="number"
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Summary Timeline"
            name="summary_timeline"
            value={formData.summary_timeline}
            onChange={handleChange}
            disabled={!isEditing}
            InputProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                }
              }
            }}
            InputLabelProps={{
              sx: {
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CharterView;
