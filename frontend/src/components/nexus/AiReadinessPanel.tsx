import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { postReadinessScore } from '../../services/nexus/nexusService';
import type { AiReadinessResult } from '../../types/nexus';

const RATING_COLOR: Record<string, 'success' | 'primary' | 'warning' | 'error'> = {
  High: 'success',
  Medium: 'primary',
  Low: 'warning',
  'Critical Risk': 'error',
};

interface Props {
  auditId: number;
}

export default function AiReadinessPanel({ auditId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postReadinessScore(auditId);
      setResult(data);
    } catch {
      setError('Failed to get AI readiness score. Check that ANTHROPIC_API_KEY is set.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={result ? 2 : 0}>
        <AutoAwesomeIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>AI Readiness Check</Typography>
          <Typography variant="body2" color="text.secondary">
            Claude analyses QMS score, open CAPAs, and overdue items to rate audit readiness.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
          onClick={handleRun}
          disabled={loading}
        >
          {loading ? 'Analysing…' : result ? 'Re-run' : 'Run AI Readiness Check'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}

      <Collapse in={!!result}>
        {result && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
              <Typography variant="h2" fontWeight={800} color={
                result.score >= 70 ? 'success.main' : result.score >= 40 ? 'warning.main' : 'error.main'
              }>
                {result.score}
              </Typography>
              <Box>
                <Chip
                  label={result.rating}
                  color={RATING_COLOR[result.rating] ?? 'default'}
                  sx={{ fontWeight: 700, mb: 0.5 }}
                />
                <Typography variant="caption" display="block" color="text.secondary">readiness score / 100</Typography>
              </Box>
            </Stack>

            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Recommended Actions</Typography>
            <List dense disablePadding>
              {result.actions.map((action, i) => (
                <ListItem key={i} sx={{ py: 0.25, pl: 1 }}>
                  <ListItemText
                    primary={action}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
}
