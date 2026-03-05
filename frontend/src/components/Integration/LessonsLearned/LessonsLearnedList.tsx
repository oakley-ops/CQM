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
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { fetchLessonsLearned, createLessonLearned } from '../../../store/slices/integrationSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface LessonsLearnedListProps {
  projectId: number;
}

const LessonsLearnedList = ({ projectId }: LessonsLearnedListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { lessonsLearned, loading } = useSelector((state: RootState) => state.integration);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    what_worked: '',
    what_didnt_work: '',
    recommendations: '',
    category: '',
    phase: 'execution' as 'initiation' | 'planning' | 'execution' | 'monitoring' | 'closing',
    impact: 'neutral' as 'positive' | 'negative' | 'neutral',
  });

  useEffect(() => {
    dispatch(fetchLessonsLearned(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createLessonLearned({ projectId, data: formData })).unwrap();
      toast.success('Lesson learned documented successfully!');
      setOpenDialog(false);
      setFormData({
        title: '',
        description: '',
        what_worked: '',
        what_didnt_work: '',
        recommendations: '',
        category: '',
        phase: 'execution',
        impact: 'neutral',
      });
    } catch (error) {
      toast.error('Failed to document lesson');
    }
  };

  const getImpactColor = (impact: string) => {
    const colors: any = {
      positive: 'success',
      negative: 'error',
      neutral: 'default',
    };
    return colors[impact] || 'default';
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
        <Typography variant="h5">Lessons Learned</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Document Lesson
        </Button>
      </Box>

      {lessonsLearned.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No lessons documented yet
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {lessonsLearned.map((lesson) => (
            <Card key={lesson.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6">{lesson.title}</Typography>
                  <Box display="flex" gap={1}>
                    <Chip label={lesson.impact.toUpperCase()} color={getImpactColor(lesson.impact)} size="small" />
                    {lesson.phase && <Chip label={lesson.phase.toUpperCase()} size="small" variant="outlined" />}
                  </Box>
                </Box>
                {lesson.what_worked && (
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="success.main">
                      What Worked:
                    </Typography>
                    <Typography variant="body2">{lesson.what_worked}</Typography>
                  </Box>
                )}
                {lesson.what_didnt_work && (
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="error.main">
                      What Didn't Work:
                    </Typography>
                    <Typography variant="body2">{lesson.what_didnt_work}</Typography>
                  </Box>
                )}
                {lesson.recommendations && (
                  <Box>
                    <Typography variant="subtitle2" color="primary">
                      Recommendations:
                    </Typography>
                    <Typography variant="body2">{lesson.recommendations}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Document Lesson Learned</DialogTitle>
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
            rows={2}
          />
          <TextField
            fullWidth
            label="What Worked"
            name="what_worked"
            value={formData.what_worked}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="What Didn't Work"
            name="what_didnt_work"
            value={formData.what_didnt_work}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Recommendations"
            name="recommendations"
            value={formData.recommendations}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              select
              label="Phase"
              name="phase"
              value={formData.phase}
              onChange={handleChange}
              margin="normal"
            >
              <MenuItem value="initiation">Initiation</MenuItem>
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="execution">Execution</MenuItem>
              <MenuItem value="monitoring">Monitoring</MenuItem>
              <MenuItem value="closing">Closing</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Impact"
              name="impact"
              value={formData.impact}
              onChange={handleChange}
              margin="normal"
            >
              <MenuItem value="positive">Positive</MenuItem>
              <MenuItem value="negative">Negative</MenuItem>
              <MenuItem value="neutral">Neutral</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
            Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LessonsLearnedList;
