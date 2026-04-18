import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';

interface HistogramBin {
  bin_center: number;
  bin_start: number;
  bin_end: number;
  count: number;
  in_spec: boolean;
}

interface CapabilityHistogramProps {
  histogram: HistogramBin[];
  xBar: number;
  sigmaWithin: number;
  specMin?: number | null;
  specMax?: number | null;
  unit?: string;
}

function normalPDF(x: number, mean: number, sigma: number) {
  return Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
}

export const CapabilityHistogram: React.FC<CapabilityHistogramProps> = ({
  histogram,
  xBar,
  sigmaWithin,
  specMin,
  specMax,
  unit,
}) => {
  const theme = useTheme();

  const totalN = histogram.reduce((s, b) => s + b.count, 0);

  // Merge histogram + normal curve into one dataset keyed by bin_center
  const binWidth = histogram.length > 1 ? histogram[1].bin_center - histogram[0].bin_center : 1;
  const chartData = histogram.map(b => ({
    bin_center: b.bin_center,
    count: b.count,
    in_spec: b.in_spec,
    label: `${b.bin_start.toFixed(4)}–${b.bin_end.toFixed(4)}`,
    normal: sigmaWithin > 0
      ? Math.round(normalPDF(b.bin_center, xBar, sigmaWithin) * totalN * binWidth * 1000) / 1000
      : 0,
  }));

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
        Distribution Histogram
      </Typography>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="bin_center"
            type="number"
            domain={['auto', 'auto']}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => v.toFixed(3)}
            label={{ value: unit || '', position: 'insideBottom', offset: -2, fontSize: 11 }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
          />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(val: number, name: string) => [
              val,
              name === 'count' ? 'Frequency' : 'Normal curve',
            ]}
            labelFormatter={(_: unknown, payload: any[]) => payload?.[0]?.payload?.label || ''}
          />

          {/* Spec lines */}
          {specMax !== undefined && specMax !== null && (
            <ReferenceLine yAxisId="left" x={specMax} stroke="#f57c00" strokeDasharray="6 3"
              label={{ value: 'USL', position: 'top', fontSize: 10, fill: '#f57c00' }} />
          )}
          {specMin !== undefined && specMin !== null && (
            <ReferenceLine yAxisId="left" x={specMin} stroke="#f57c00" strokeDasharray="6 3"
              label={{ value: 'LSL', position: 'top', fontSize: 10, fill: '#f57c00' }} />
          )}

          {/* Mean line */}
          <ReferenceLine yAxisId="left" x={xBar} stroke="#1976d2" strokeDasharray="4 2"
            label={{ value: 'X̄', position: 'top', fontSize: 10, fill: '#1976d2' }} />

          {/* Bars */}
          <Bar yAxisId="left" dataKey="count" barSize={20} isAnimationActive={false}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.in_spec ? '#1976d2' : '#d32f2f'} fillOpacity={0.75} />
            ))}
          </Bar>

          {/* Normal curve */}
          <Line
            yAxisId="right"
            dataKey="normal"
            type="monotone"
            stroke="#f57c00"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};
