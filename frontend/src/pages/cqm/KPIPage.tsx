/**
 * KPI Performance Page
 * Dedicated page for tracking and configuring quality KPIs
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Divider,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircleOutline as GreenIcon,
  Warning as YellowIcon,
  Cancel as RedIcon,
  HelpOutline as GreyIcon,
  OpenInNew as DrillDownIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchKPIs, fetchKPIHistory, updateKPIThreshold } from '../../store/slices/cqm/testEntrySlice';
import type { RootState, AppDispatch } from '../../store/store';
import type { KPIResult, KPIStatus, KPIHistoryPoint } from '../../types/cqm';

const kpiColors: Record<KPIStatus, string> = {
  green:  '#4caf50',
  yellow: '#ff9800',
  red:    '#f44336',
  grey:   '#9e9e9e',
};

const kpiBgColors: Record<KPIStatus, string> = {
  green:  '#f1f8e9',
  yellow: '#fff8e1',
  red:    '#ffebee',
  grey:   '#f5f5f5',
};

const KPIStatusIcon = ({ status, size = 32 }: { status: KPIStatus; size?: number }) => {
  const sx = { fontSize: size, color: kpiColors[status] };
  if (status === 'green')  return <GreenIcon sx={sx} />;
  if (status === 'yellow') return <YellowIcon sx={sx} />;
  if (status === 'red')    return <RedIcon sx={sx} />;
  return <GreyIcon sx={sx} />;
};

const formatValue = (kpi: KPIResult): string => {
  if (kpi.currentValue === null) return '—';
  if (kpi.unit === '%')        return `${kpi.currentValue}%`;
  if (kpi.unit === 'days')     return `${kpi.currentValue}d`;
  return String(kpi.currentValue);
};

const historyFieldMap: Record<string, keyof KPIHistoryPoint> = {
  overall_pass_rate:    'overallPassRate',
  first_pass_yield:     'firstPassYield',
  rejection_rate:       'rejectionRate',
  avg_days_to_approve:  'avgDaysToApprove',
};

// ---- Edit Dialog ----

interface EditDialogProps {
  kpi: KPIResult;
  open: boolean;
  onClose: () => void;
  onSave: (kpiKey: string, target: number, warning: number | null) => void;
  saving: boolean;
}

const EditThresholdDialog = ({ kpi, open, onClose, onSave, saving }: EditDialogProps) => {
  const [target, setTarget]   = useState(String(kpi.targetValue));
  const [warning, setWarning] = useState(kpi.warningThreshold !== null ? String(kpi.warningThreshold) : '');

  useEffect(() => {
    if (open) {
      setTarget(String(kpi.targetValue));
      setWarning(kpi.warningThreshold !== null ? String(kpi.warningThreshold) : '');
    }
  }, [open, kpi]);

  const handleSave = () => {
    const t = parseFloat(target);
    const w = warning !== '' ? parseFloat(warning) : null;
    if (isNaN(t)) return;
    onSave(kpi.kpiKey, t, w);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Thresholds — {kpi.kpiName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {kpi.description}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          {kpi.higherIsBetter ? 'Higher is better (≥ target = green)' : 'Lower is better (≤ target = green)'}
        </Typography>
        <TextField
          label={`Target (${kpi.unit}) — Green`}
          value={target}
          onChange={e => setTarget(e.target.value)}
          type="number"
          fullWidth
          sx={{ mb: 2 }}
          size="small"
        />
        <TextField
          label={`Warning threshold (${kpi.unit}) — Yellow`}
          value={warning}
          onChange={e => setWarning(e.target.value)}
          type="number"
          fullWidth
          size="small"
          helperText="Leave empty to disable yellow zone"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---- KPI Summary Card ----

interface KPISummaryCardProps {
  kpi: KPIResult;
  onEdit: (kpi: KPIResult) => void;
  onDrillDown?: () => void;
}

const KPISummaryCard = ({ kpi, onEdit, onDrillDown }: KPISummaryCardProps) => (
  <Paper
    elevation={1}
    sx={{
      p: 2.5,
      borderRadius: 2,
      border: `2px solid ${kpiColors[kpi.status]}30`,
      bgcolor: kpiBgColors[kpi.status],
      height: '100%',
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <KPIStatusIcon status={kpi.status} size={36} />
      <Box display="flex" gap={0.5}>
        {onDrillDown && (
          <Tooltip title="View related sessions">
            <IconButton size="small" onClick={onDrillDown}>
              <DrillDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Edit thresholds">
          <IconButton size="small" onClick={() => onEdit(kpi)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>

    <Typography variant="h3" sx={{ fontWeight: 700, color: kpiColors[kpi.status], mt: 1 }}>
      {formatValue(kpi)}
    </Typography>

    <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 0.5 }}>
      {kpi.kpiName}
    </Typography>

    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 36 }}>
      {kpi.description}
    </Typography>

    <Divider sx={{ my: 1.5 }} />

    <Box display="flex" gap={1} flexWrap="wrap">
      <Chip
        size="small"
        label={`Target: ${kpi.higherIsBetter ? '≥' : '≤'} ${kpi.targetValue}${kpi.unit}`}
        sx={{ bgcolor: '#4caf5020', color: '#2e7d32' }}
      />
      {kpi.warningThreshold !== null && (
        <Chip
          size="small"
          label={`Warning: ${kpi.higherIsBetter ? '≥' : '≤'} ${kpi.warningThreshold}${kpi.unit}`}
          sx={{ bgcolor: '#ff980020', color: '#e65100' }}
        />
      )}
    </Box>
  </Paper>
);

// ---- Trend Chart ----

interface KPITrendChartProps {
  kpi: KPIResult;
  historyData: KPIHistoryPoint[];
  loading: boolean;
}

const KPITrendChart = ({ kpi, historyData, loading }: KPITrendChartProps) => {
  const field = historyFieldMap[kpi.kpiKey];
  if (!field) return null;

  const chartData = historyData.map(d => ({
    month: d.month as string,
    value: d[field] as number | null,
  }));

  const hasData = chartData.some(d => d.value !== null);

  return (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        {kpi.kpiName} — Monthly Trend
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={200}>
          <CircularProgress size={24} />
        </Box>
      ) : !hasData ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={200}>
          <Typography variant="body2" color="text.secondary">No historical data yet</Typography>
        </Box>
      ) : (
        <Box height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={kpi.unit === '%' ? [0, 100] : ['auto', 'auto']}
              />
              <RechartTooltip
                formatter={(val: unknown) =>
                  val === null ? ['—', kpi.kpiName] : [`${val}${kpi.unit}`, kpi.kpiName]
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={kpi.kpiName}
                stroke={kpiColors[kpi.status]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

// ---- Main Page ----

const KPIPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { kpis, kpiHistory, loading } = useSelector((state: RootState) => state.testEntry);

  const [editTarget, setEditTarget] = useState<KPIResult | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchKPIs());
    dispatch(fetchKPIHistory(6));
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchKPIs());
    dispatch(fetchKPIHistory(6));
  };

  const handleSaveThreshold = async (kpiKey: string, targetValue: number, warningThreshold: number | null) => {
    setSaving(true);
    setSaveError(null);
    try {
      await dispatch(updateKPIThreshold({ kpiKey, targetValue, warningThreshold })).unwrap();
      setEditTarget(null);
      dispatch(fetchKPIs());
    } catch {
      setSaveError('Failed to save threshold. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDrillDownAction = (kpi: KPIResult): (() => void) | undefined => {
    if (kpi.kpiKey === 'pending_approval')    return () => navigate('/sessions?status=submitted');
    if (kpi.kpiKey === 'rejection_rate')      return () => navigate('/sessions?status=rejected');
    if (kpi.kpiKey === 'avg_days_to_approve') return () => navigate('/sessions?status=approved');
    return undefined;
  };

  const chartableKpis = kpis.filter(k => historyFieldMap[k.kpiKey]);

  if (loading.kpis && kpis.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            KPI Performance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor quality targets and monthly trends. Click the pencil icon to adjust thresholds.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading.kpis || loading.kpiHistory}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* KPI Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {kpis.map(kpi => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={kpi.kpiKey}>
            <KPISummaryCard
              kpi={kpi}
              onEdit={setEditTarget}
              onDrillDown={getDrillDownAction(kpi)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Trend Charts */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Monthly Trends — Last 6 Months
      </Typography>
      <Grid container spacing={2}>
        {chartableKpis.map(kpi => (
          <Grid item xs={12} sm={6} key={kpi.kpiKey}>
            <KPITrendChart
              kpi={kpi}
              historyData={kpiHistory}
              loading={loading.kpiHistory}
            />
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      {editTarget && (
        <EditThresholdDialog
          kpi={editTarget}
          open={Boolean(editTarget)}
          onClose={() => { setEditTarget(null); setSaveError(null); }}
          onSave={handleSaveThreshold}
          saving={saving}
        />
      )}
    </Box>
  );
};

export default KPIPage;
