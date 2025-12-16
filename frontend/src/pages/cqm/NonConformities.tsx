/**
 * Non-Conformities Page
 * Track and manage non-conformities
 */

import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const NonConformities = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Non-Conformities
      </Typography>
      <Card>
        <CardContent>
          <Alert severity="info">
            Non-Conformities management interface - Coming soon
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NonConformities;

