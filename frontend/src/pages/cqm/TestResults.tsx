/**
 * Test Results Page
 * View and record test results
 */

import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const TestResults = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Test Results
      </Typography>
      <Card>
        <CardContent>
          <Alert severity="info">
            Test Results management interface - Coming soon
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestResults;

