/**
 * Audits Page
 * Manage CQM audits
 */

import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const Audits = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="600">
        CQM Audits
      </Typography>
      <Card>
        <CardContent>
          <Alert severity="info">
            Audits management interface - Coming soon
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Audits;

