import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CategoryData {
  categoryCode: string;
  categoryName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
}

interface CategoryTestSummaryProps {
  data: CategoryData[];
  loading?: boolean;
  height?: number;
}

const CategoryTestSummary: React.FC<CategoryTestSummaryProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  const theme = useTheme();

  if (loading) {
    return <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />;
  }

  if (!data || data.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">No test data available</Typography>
      </Paper>
    );
  }

  const chartData = data.map((item) => ({
    name: item.categoryCode,
    fullName: item.categoryName,
    passed: item.passedTests,
    failed: item.failedTests,
    passRate: item.passRate,
  }));

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const item = data.find((d) => d.categoryCode === label);
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" gutterBottom>
            {item?.categoryName || label}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" color="success.main">
              Passed: {payload.find((p) => p.name === 'passed')?.value || 0}
            </Typography>
            <Typography variant="body2" color="error.main">
              Failed: {payload.find((p) => p.name === 'failed')?.value || 0}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              Pass Rate: {item?.passRate || 0}%
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="passed"
            name="Passed"
            stackId="a"
            fill={theme.palette.success.main}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="failed"
            name="Failed"
            stackId="a"
            fill={theme.palette.error.main}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CategoryTestSummary;
