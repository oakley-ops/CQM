import React from 'react';
import { Box, Alert, Typography, Chip, Stack } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface Violation {
  rule: number;
  description: string;
  indices: number[];
}

interface RunRuleAlertsProps {
  violations: Violation[];
}

export const RunRuleAlerts: React.FC<RunRuleAlertsProps> = ({ violations }) => {
  if (!violations || violations.length === 0) {
    return (
      <Alert severity="success" icon={false} sx={{ py: 0.75 }}>
        <Typography variant="body2">No Nelson run rule violations detected — process appears stable.</Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={1}>
      {violations.map(v => (
        <Alert
          key={v.rule}
          severity="warning"
          icon={<WarningAmberIcon fontSize="small" />}
          sx={{ py: 0.5, alignItems: 'flex-start' }}
        >
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Rule {v.rule}: {v.description}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {v.indices.map(i => (
                <Chip key={i} label={`#${i}`} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              ))}
            </Box>
          </Box>
        </Alert>
      ))}
    </Stack>
  );
};
