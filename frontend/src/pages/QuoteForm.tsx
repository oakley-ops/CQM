import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { quoteService, clientService, Client } from '../services/quote/quoteService';

const QuoteForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<{
    client_id: string;
    project_name: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    deadline: string;
    notes: string;
    quote_value: string;
    probability_percentage: string;
  }>({
    client_id: '',
    project_name: '',
    priority: 'Medium',
    deadline: '',
    notes: '',
    quote_value: '',
    probability_percentage: '50',
  });

  useEffect(() => {
    fetchClients();
    if (id) {
      fetchQuote();
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const response = await clientService.getClients({ limit: 100 });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchQuote = async () => {
    try {
      const response = await quoteService.getQuoteById(Number(id));
      const quote = response.data;
      setFormData({
        client_id: quote.client_id?.toString() || '',
        project_name: quote.project_name,
        priority: quote.priority,
        deadline: quote.deadline || '',
        notes: quote.notes || '',
        quote_value: quote.quote_value?.toString() || '',
        probability_percentage: quote.probability_percentage?.toString() || '50',
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        client_id: formData.client_id ? Number(formData.client_id) : undefined,
        quote_value: formData.quote_value ? Number(formData.quote_value) : undefined,
        probability_percentage: Number(formData.probability_percentage),
      };

      if (id) {
        await quoteService.updateQuote(Number(id), data);
      } else {
        await quoteService.createQuote(data);
      }
      navigate('/quotes');
    } catch (error) {
      console.error('Error saving quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quotes')}>
          Back
        </Button>
        <Typography variant="h4">
          {id ? 'Edit Quote' : 'New Quote'}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Project Name"
                  value={formData.project_name}
                  onChange={(e) => handleChange('project_name', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(option) => option.name}
                  value={clients.find(c => c.id.toString() === formData.client_id) || null}
                  onChange={(_, newValue) => handleChange('client_id', newValue?.id.toString() || '')}
                  renderInput={(params) => <TextField {...params} label="Client" />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => handleChange('priority', e.target.value)}
                  >
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Deadline"
                  value={formData.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quote Value"
                  value={formData.quote_value}
                  onChange={(e) => handleChange('quote_value', e.target.value)}
                  InputProps={{ startAdornment: '$' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Probability %"
                  value={formData.probability_percentage}
                  onChange={(e) => handleChange('probability_percentage', e.target.value)}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button onClick={() => navigate('/quotes')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Quote'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default QuoteForm;
