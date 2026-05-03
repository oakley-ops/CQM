import {
  Box, Chip, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import type { GateResult } from '../../types/nexus';

interface Props {
  gate: GateResult | null;
  loading?: boolean;
}

export default function GateControl({ gate, loading }: Props) {
  if (loading) return <CircularProgress size={20} sx={{ m: 2 }} />;
  if (!gate) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: gate.passed ? 'success.main' : 'error.main',
        bgcolor: gate.passed ? 'rgba(46,125,50,0.04)' : 'rgba(198,40,40,0.04)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
        {gate.passed
          ? <LockOpenIcon sx={{ color: 'success.main' }} />
          : <LockIcon sx={{ color: 'error.main' }} />}
        <Typography fontWeight={700} color={gate.passed ? 'success.main' : 'error.main'}>
          #0706# Qualification Gate — {gate.passed ? 'PASSED' : 'NOT PASSED'}
        </Typography>
        <Chip
          label={gate.passed ? 'Production Permitted' : 'Production Blocked'}
          size="small"
          color={gate.passed ? 'success' : 'error'}
        />
      </Stack>

      <Stack spacing={0.75}>
        {gate.conditions.map((c, i) => (
          <Stack key={i} direction="row" alignItems="flex-start" spacing={1}>
            {c.passed
              ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18, mt: 0.2 }} />
              : <CancelIcon sx={{ color: 'error.main', fontSize: 18, mt: 0.2 }} />}
            <Box>
              <Typography variant="body2" fontWeight={c.passed ? 400 : 600} color={c.passed ? 'text.primary' : 'error.main'}>
                {c.label}
              </Typography>
              {!c.passed && c.detail && (
                <Typography variant="caption" color="text.secondary">{c.detail}</Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
