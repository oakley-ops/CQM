/**
 * KappaGauge — linear gauge visualising a κ value with colour zones.
 *
 * κ < 0.4  → red (poor)
 * κ 0.4–0.75 → amber (acceptable but below Six Sigma gate)
 * κ ≥ 0.75 → green (passes Six Sigma MSA standard)
 */
import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';

const THRESHOLD = 0.75;

function interpretKappa(k: number | null): string {
  if (k === null || k === undefined) return 'N/A';
  if (k < 0)    return 'Poor (worse than chance)';
  if (k < 0.20) return 'Slight';
  if (k < 0.40) return 'Fair';
  if (k < 0.60) return 'Moderate';
  if (k < 0.75) return 'Substantial';
  if (k < 0.90) return 'Near-perfect';
  return 'Perfect';
}

function kappaColor(k: number | null): string {
  if (k === null) return '#9e9e9e';
  if (k < 0.40) return '#f44336';
  if (k < THRESHOLD) return '#ff9800';
  return '#4caf50';
}

interface Props {
  kappa: number | null;
  label?: string;
  showLabel?: boolean;
  width?: number | string;
}

const KappaGauge: React.FC<Props> = ({ kappa, label, showLabel = true, width = '100%' }) => {
  const pct = kappa === null ? 0 : Math.max(0, Math.min(1, kappa)) * 100;
  const color = kappaColor(kappa);
  const interp = interpretKappa(kappa);
  const thresholdPct = THRESHOLD * 100;

  return (
    <Box sx={{ width }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* κ value */}
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color, minWidth: 46, fontVariantNumeric: 'tabular-nums' }}
        >
          {kappa === null ? '—' : kappa.toFixed(3)}
        </Typography>

        {/* Bar */}
        <Tooltip title={`${interp} (Six Sigma gate: κ ≥ ${THRESHOLD})`} arrow>
          <Box sx={{ flex: 1, position: 'relative', height: 14, borderRadius: 1, bgcolor: 'grey.200' }}>
            {/* Fill */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${pct}%`,
                bgcolor: color,
                borderRadius: 1,
                transition: 'width 0.4s ease',
              }}
            />
            {/* Threshold tick */}
            <Box
              sx={{
                position: 'absolute',
                left: `${thresholdPct}%`,
                top: -3,
                bottom: -3,
                width: 2,
                bgcolor: 'grey.700',
                borderRadius: 1,
              }}
            />
          </Box>
        </Tooltip>

        {/* Scale labels */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24 }}>
          1.0
        </Typography>
      </Box>

      {showLabel && (
        <Typography variant="caption" sx={{ color, display: 'block', mt: 0.3 }}>
          {interp}
        </Typography>
      )}
    </Box>
  );
};

export default KappaGauge;
