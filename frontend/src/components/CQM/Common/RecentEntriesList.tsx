import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Skeleton,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
  Edit as DraftIcon,
} from '@mui/icons-material';
import { TestSession, SessionStatus } from '../../../types/cqm';

interface RecentEntriesListProps {
  sessions: TestSession[];
  loading?: boolean;
  onViewSession?: (session: TestSession) => void;
}

const getStatusConfig = (status: SessionStatus) => {
  const configs: Record<
    SessionStatus,
    { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error'; icon: React.ReactNode }
  > = {
    draft: { label: 'Draft', color: 'default', icon: <DraftIcon fontSize="small" /> },
    submitted: { label: 'Submitted', color: 'primary', icon: <PendingIcon fontSize="small" /> },
    approved: { label: 'Approved', color: 'success', icon: <ApprovedIcon fontSize="small" /> },
    rejected: { label: 'Rejected', color: 'error', icon: <RejectedIcon fontSize="small" /> },
  };
  return configs[status];
};

const getPassRateColor = (rate: number) => {
  if (rate >= 95) return 'success';
  if (rate >= 80) return 'warning';
  return 'error';
};

const RecentEntriesList: React.FC<RecentEntriesListProps> = ({
  sessions,
  loading = false,
  onViewSession,
}) => {
  if (loading) {
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Session</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Card Type</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell align="center">Tests</TableCell>
              <TableCell align="center">Pass Rate</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                  <TableCell key={j}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (sessions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No test sessions recorded yet.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Select a category and start recording tests to see them here.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'action.hover' }}>
            <TableCell>
              <Typography variant="subtitle2">Session</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2">Date</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2">Card Type</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2">Batch</Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="subtitle2">Tests</Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="subtitle2">Pass Rate</Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="subtitle2">Status</Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="subtitle2">Actions</Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions.map((session) => {
            const statusConfig = getStatusConfig(session.status);
            const passRate = session.passRate || 0;

            return (
              <TableRow
                key={session.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {session.session_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(session.test_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.card_type}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                    {session.batch_lot_number}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Chip
                      label={session.passedTests || 0}
                      size="small"
                      color="success"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                    <Chip
                      label={session.failedTests || 0}
                      size="small"
                      color="error"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ width: 80, display: 'inline-block' }}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={`${getPassRateColor(passRate)}.main`}
                    >
                      {passRate}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={passRate}
                      color={getPassRateColor(passRate)}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={statusConfig.icon as React.ReactElement}
                    label={statusConfig.label}
                    size="small"
                    color={statusConfig.color}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell align="center">
                  {onViewSession && (
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => onViewSession(session)}
                        color="primary"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentEntriesList;
