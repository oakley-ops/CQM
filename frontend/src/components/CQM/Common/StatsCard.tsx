/**
 * Stats Card Component
 * Display key statistics
 */

import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

const StatsCard = ({ title, value, icon, color, trend, subtitle }: StatsCardProps) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend.isPositive ? (
                  <TrendingUpIcon fontSize="small" color="success" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={trend.isPositive ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(trend.value)}%
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                backgroundColor: color ? `${color}20` : 'primary.light',
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;

