import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

interface Individual {
  idx: number;
  value: number;
  out_of_control: boolean;
  out_of_spec: boolean;
  date?: string;
  operator_name?: string;
  card_identifier?: string;
}

interface MRPoint {
  idx: number;
  mr_value: number;
  out_of_control: boolean;
}

interface IMRChartProps {
  individuals: Individual[];
  movingRanges: MRPoint[];
  xBar: number;
  uclI: number;
  lclI: number;
  mrBar: number;
  uclMR: number;
  specMin?: number | null;
  specMax?: number | null;
  unit?: string;
}

// Custom dot — red if out-of-control, blue otherwise
const ControlDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const color = payload.out_of_control ? '#d32f2f' : '#1976d2';
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1} />;
};

const MRDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const color = payload.out_of_control ? '#d32f2f' : '#388e3c';
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1} />;
};

const formatTooltipValue = (value: number, unit?: string) =>
  unit ? `${value} ${unit}` : String(value);

export const IMRChart: React.FC<IMRChartProps> = ({
  individuals,
  movingRanges,
  xBar,
  uclI,
  lclI,
  mrBar,
  uclMR,
  specMin,
  specMax,
  unit,
}) => {
  const theme = useTheme();

  const iData = individuals.map(p => ({
    idx: p.idx,
    value: p.value,
    out_of_control: p.out_of_control,
    out_of_spec: p.out_of_spec,
    label: p.card_identifier || `#${p.idx}`,
    date: p.date ? new Date(p.date).toLocaleDateString() : '',
    operator: p.operator_name || '',
  }));

  const mrData = movingRanges.map(p => ({
    idx: p.idx,
    mr_value: p.mr_value,
    out_of_control: p.out_of_control,
  }));

  const chartCommon = {
    margin: { top: 8, right: 24, left: 0, bottom: 4 },
  };

  return (
    <Box>
      {/* ── Individuals Chart ─────────────────────────── */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
        Individuals Chart (X)
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={iData} {...chartCommon}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="idx" tick={{ fontSize: 11 }} label={{ value: 'Observation', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: unit || '', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(val: number) => [formatTooltipValue(val, unit), 'Value']}
            labelFormatter={(idx) => {
              const pt = iData.find(d => d.idx === idx);
              return pt ? `${pt.label} — ${pt.date}` : `Point ${idx}`;
            }}
          />

          {/* Spec limits — dashed */}
          {specMax !== undefined && specMax !== null && (
            <ReferenceLine y={specMax} stroke="#f57c00" strokeDasharray="6 3" label={{ value: 'USL', position: 'right', fontSize: 10, fill: '#f57c00' }} />
          )}
          {specMin !== undefined && specMin !== null && (
            <ReferenceLine y={specMin} stroke="#f57c00" strokeDasharray="6 3" label={{ value: 'LSL', position: 'right', fontSize: 10, fill: '#f57c00' }} />
          )}

          {/* Control limits — solid red */}
          <ReferenceLine y={uclI} stroke="#d32f2f" strokeWidth={1.5} label={{ value: 'UCL', position: 'right', fontSize: 10, fill: '#d32f2f' }} />
          <ReferenceLine y={lclI} stroke="#d32f2f" strokeWidth={1.5} label={{ value: 'LCL', position: 'right', fontSize: 10, fill: '#d32f2f' }} />

          {/* Center line */}
          <ReferenceLine y={xBar} stroke="#1976d2" strokeWidth={1.5} strokeDasharray="4 2" label={{ value: 'X̄', position: 'right', fontSize: 10, fill: '#1976d2' }} />

          {/* Data line */}
          <Line
            type="linear"
            dataKey="value"
            stroke="#1976d2"
            strokeWidth={1.5}
            dot={<ControlDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* ── Moving Range Chart ────────────────────────── */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
        Moving Range Chart (MR)
      </Typography>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={mrData} {...chartCommon}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="idx" tick={{ fontSize: 11 }} label={{ value: 'Observation', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
          <Tooltip formatter={(val: number) => [formatTooltipValue(val, unit), 'MR']} labelFormatter={(idx) => `Point ${idx}`} />

          {/* UCL */}
          <ReferenceLine y={uclMR} stroke="#d32f2f" strokeWidth={1.5} label={{ value: 'UCL', position: 'right', fontSize: 10, fill: '#d32f2f' }} />

          {/* MR-bar */}
          <ReferenceLine y={mrBar} stroke="#388e3c" strokeWidth={1.5} strokeDasharray="4 2" label={{ value: 'MR̄', position: 'right', fontSize: 10, fill: '#388e3c' }} />

          {/* LCL = 0 */}
          <ReferenceLine y={0} stroke="#888" strokeWidth={1} />

          <Line
            type="linear"
            dataKey="mr_value"
            stroke="#388e3c"
            strokeWidth={1.5}
            dot={<MRDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};
