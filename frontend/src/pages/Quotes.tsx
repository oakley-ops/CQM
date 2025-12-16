import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { quoteService, Quote } from '../services/quote/quoteService';

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await quoteService.getQuotes({ limit: 50 });
      setQuotes(response.data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      Critical: 'error',
      High: 'warning',
      Medium: 'info',
      Low: 'default',
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      Completed: 'success',
      'In Process': 'primary',
      'On Hold': 'warning',
      Cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">Quote Tracker</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/milestones')}
          >
            Manage Milestones
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quotes/new')}
          >
            New Quote
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Quote #</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No quotes found</TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id} hover>
                  <TableCell>{quote.quote_number}</TableCell>
                  <TableCell>{quote.project_name}</TableCell>
                  <TableCell>{quote.client?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip label={quote.priority} color={getPriorityColor(quote.priority)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={quote.status} color={getStatusColor(quote.status)} size="small" />
                  </TableCell>
                  <TableCell>{quote.current_stage || '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => navigate(`/quotes/${quote.id}`)}>
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Quotes;
