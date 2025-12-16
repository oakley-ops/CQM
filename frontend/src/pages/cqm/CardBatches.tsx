/**
 * Card Batches Page
 * Production batch tracking
 */

import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const CardBatches = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Card Batches
      </Typography>
      <Card>
        <CardContent>
          <Alert severity="info">
            Card Batches management interface - Coming soon
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CardBatches;

