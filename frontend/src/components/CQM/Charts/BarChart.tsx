/**
 * Bar Chart Component
 * Displays data in a bar chart
 */

import { Card, CardContent, Typography, Box } from '@mui/material';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarData {
  name: string;
  [key: string]: string | number;
}

interface BarChartProps {
  title: string;
  data: BarData[];
  bars: Array<{ dataKey: string; name: string; color: string }>;
  height?: number;
}

const BarChart = ({ title, data, bars, height = 300 }: BarChartProps) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box height={height}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {bars.map((bar) => (
                <Bar key={bar.dataKey} dataKey={bar.dataKey} name={bar.name} fill={bar.color} />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BarChart;

