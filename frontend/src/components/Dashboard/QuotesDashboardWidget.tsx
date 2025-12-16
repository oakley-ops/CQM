import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Assignment } from '@mui/icons-material';
import { quoteService, Quote, QuoteStatistics } from '../../services/quote/quoteService';

const QuotesDashboardWidget: React.FC = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<QuoteStatistics | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, quotesResponse] = await Promise.all([
        quoteService.getStatistics(),
        quoteService.getQuotes({ limit: 5, sort_by: 'created_date', sort_order: 'DESC' }),
      ]);
      setStatistics(statsResponse.data);
      setRecentQuotes(quotesResponse.data);
    } catch (error) {
      console.error('Error fetching quote data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading quote statistics...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment color="primary" />
            <Typography variant="h6">Quote Tracker</Typography>
          </Box>
          <Button size="small" onClick={() => navigate('/quotes')}>
            View All
          </Button>
        </Box>

        {statistics && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {statistics.total_quotes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Quotes
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {statistics.active_quotes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {statistics.conversion_rate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Conversion
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    ${(statistics.pipeline_value / 1000).toFixed(0)}K
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pipeline
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Recent Quotes
            </Typography>
            <List dense>
              {recentQuotes.map((quote) => (
                <ListItem
                  key={quote.id}
                  button
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                  sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {quote.quote_number}
                        </Typography>
                        <Chip label={quote.priority} size="small" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {quote.project_name} - {quote.client?.name || 'No client'}
                      </Typography>
                    }
                  />
                  <Chip label={quote.status} size="small" color="primary" />
                </ListItem>
              ))}
            </List>

            {recentQuotes.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                No quotes yet. Create your first quote!
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotesDashboardWidget;
