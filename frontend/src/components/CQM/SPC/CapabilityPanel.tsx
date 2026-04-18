import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip, Divider } from '@mui/material';

interface Capability {
  cp: number | null;
  cpk: number | null;
  cpu?: number | null;
  cpl?: number | null;
  pp: number | null;
  ppk: number | null;
  sigma_within: number;
  sigma_overall: number;
  spec_valid: boolean;
}

interface CapabilityPanelProps {
  capability: Capability | null;
  specMin: number | null;
  specMax: number | null;
  xBar: number;
  unit?: string;
}

function capColor(value: number | null): 'success' | 'warning' | 'error' | 'default' {
  if (value === null) return 'default';
  if (value >= 1.33) return 'success';
  if (value >= 1.0) return 'warning';
  return 'error';
}

function MetricCard({ label, value, subtitle }: { label: string; value: number | null; subtitle?: string }) {
  const color = capColor(value);
  const colorMap = {
    success: '#2e7d32',
    warning: '#e65100',
    error: '#c62828',
    default: '#757575',
  };
  const bgMap = {
    success: '#f1f8e9',
    warning: '#fff3e0',
    error: '#ffebee',
    default: '#f5f5f5',
  };

  return (
    <Card variant="outlined" sx={{ backgroundColor: bgMap[color], borderColor: colorMap[color] }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ color: colorMap[color], fontWeight: 700, lineHeight: 1.2 }}>
          {value !== null ? value.toFixed(2) : 'N/A'}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export const CapabilityPanel: React.FC<CapabilityPanelProps> = ({
  capability,
  specMin,
  specMax,
  xBar,
  unit,
}) => {
  if (!capability) {
    const noSpec = specMin === null || specMax === null;
    return (
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          {noSpec
            ? 'No spec limits defined — Cp/Cpk cannot be computed. Set LSL and USL using the editor below.'
            : 'Capability indices unavailable.'}
        </Typography>
      </Box>
    );
  }

  if (!capability.spec_valid) {
    return (
      <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
        <Typography variant="body2" color="warning.dark" fontWeight={600}>
          Process mean ({xBar.toFixed(4)} {unit}) is outside the spec limits [LSL={specMin}, USL={specMax}].
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Capability indices are suppressed — correct the spec limits or investigate the process shift.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Cp" value={capability.cp} subtitle="Potential (within)" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Cpk" value={capability.cpk} subtitle="Actual (within)" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Pp" value={capability.pp} subtitle="Potential (overall)" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Ppk" value={capability.ppk} subtitle="Actual (overall)" />
        </Grid>
      </Grid>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Typography variant="caption" color="text.secondary">
          σ<sub>within</sub> (MR) = <strong>{capability.sigma_within.toFixed(6)}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          σ<sub>overall</sub> = <strong>{capability.sigma_overall.toFixed(6)}</strong>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small" label="≥ 1.33 capable" color="success" variant="outlined" />
          <Chip size="small" label="1.0–1.32 marginal" color="warning" variant="outlined" />
          <Chip size="small" label="< 1.0 not capable" color="error" variant="outlined" />
        </Box>
      </Box>
    </Box>
  );
};
