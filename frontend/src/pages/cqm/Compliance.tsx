/**
 * Compliance Page
 * ISO standards compliance tracking
 */

import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const Compliance = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="600">
        ISO Compliance
      </Typography>
      <Card>
        <CardContent>
          <Alert severity="info">
            ISO Compliance tracking interface - Coming soon
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Compliance;

