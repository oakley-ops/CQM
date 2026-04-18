import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  ButtonGroup,
  Tooltip,
  IconButton,
  TextField,
  Divider,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ShowChart as ChartIcon,
  MonitorHeart as MonitorIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { getSpcDefs, getSpcData } from '../../services/cqm/testEntryService';
import type { SpcData, SpcPoint } from '../../services/cqm/testEntryService';

const TARGET_TEST_ID = 'IT-PHY-002';
const SESSION_TYPE   = 'Monitoring';

const QUICK = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '90D', days: 90  },
  { label: '1Y',  days: 365 },
];

// Colour palette
const C = {
  line:        '#2563eb',
  inControl:   '#2563eb',
  outControl:  '#f59e0b',
  outSpec:     '#ef4444',
  ucl:         '#ef4444',
  lcl:         '#ef4444',
  mean:        '#16a34a',
  spec:        '#f97316',
  specZone:    '#dcfce7',
  specZoneStr: '#bbf7d0',
  grid:        '#f1f5f9',
};

interface ChartPoint extends SpcPoint { index: number }

// ── Tooltip ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, unit }: TooltipProps<number, string> & { unit: string }) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as ChartPoint;
  const status = pt.out_of_spec ? 'out-spec' : pt.out_of_control ? 'out-ctrl' : 'ok';
  const statusColor = status === 'out-spec' ? C.outSpec : status === 'out-ctrl' ? C.outControl : C.mean;
  const statusLabel = status === 'out-spec' ? '⚠ Out of specification' : status === 'out-ctrl' ? '⚠ Out of control' : '✓ In control';
  return (
    <Box sx={{
      bgcolor: '#0f172a',
      border: `1px solid ${statusColor}40`,
      borderRadius: 2,
      p: 1.5,
      minWidth: 180,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
        Observation #{pt.index} · {pt.date}
      </Typography>
      <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>
        {pt.value} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{unit}</span>
      </Typography>
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
        Job {pt.session_number?.split('-')[0]}
      </Typography>
      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #1e293b' }}>
        <Typography variant="caption" sx={{ color: statusColor, fontWeight: 600 }}>
          {statusLabel}
        </Typography>
      </Box>
    </Box>
  );
};

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <Box sx={{
    flex: '1 1 80px',
    minWidth: 80,
    p: 1.5,
    borderRadius: 2,
    bgcolor: '#f8fafc',
    border: `1px solid #e2e8f0`,
    borderTop: `3px solid ${accent}`,
    textAlign: 'center',
  }}>
    <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, letterSpacing: 0.5 }}>
      {label}
    </Typography>
  </Box>
);

// ── Custom dot ─────────────────────────────────────────────────────────────
const renderDot = (props: { cx: number; cy: number; payload: ChartPoint }) => {
  const { cx, cy, payload } = props;
  const fill = payload.out_of_spec ? C.outSpec : payload.out_of_control ? C.outControl : C.inControl;
  const r    = payload.out_of_spec || payload.out_of_control ? 5 : 3.5;
  return (
    <circle
      key={`dot-${payload.index}`}
      cx={cx} cy={cy} r={r}
      fill={fill}
      stroke="#fff"
      strokeWidth={1.5}
      style={{ filter: payload.out_of_spec ? 'drop-shadow(0 0 4px #ef444480)' : undefined }}
    />
  );
};

// ── Page ───────────────────────────────────────────────────────────────────
const KPIPage = () => {
  const [defId, setDefId]             = useState<number | null>(null);
  const [spcData, setSpcData]         = useState<SpcData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [unit, setUnit]               = useState('mm');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [activeQuick, setActiveQuick] = useState<number | null>(30);

  const loadWithDates = useCallback((id: number, start: string, end: string) => {
    setLoading(true); setError(null);
    getSpcData(id, { startDate: start, endDate: end, sessionType: SESSION_TYPE })
      .then(d => setSpcData(d))
      .catch(() => setError('Failed to load SPC data.'))
      .finally(() => setLoading(false));
  }, []);

  const loadWithDays = useCallback((id: number, days: number) => {
    setLoading(true); setError(null);
    getSpcData(id, { days, sessionType: SESSION_TYPE })
      .then(d => setSpcData(d))
      .catch(() => setError('Failed to load SPC data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getSpcDefs()
      .then(defs => {
        const match = defs.find(d => d.test_id === TARGET_TEST_ID);
        if (match) { setDefId(match.id); setUnit(match.unit_of_measurement ?? 'mm'); loadWithDays(match.id, 30); }
        else setLoading(false);
      })
      .catch(() => { setError('Could not load test definitions.'); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuick = (days: number) => {
    setActiveQuick(days); setStartDate(''); setEndDate('');
    if (defId) loadWithDays(defId, days);
  };
  const handleApply = () => {
    if (!startDate || !endDate || !defId) return;
    setActiveQuick(null); loadWithDates(defId, startDate, endDate);
  };
  const handleRefresh = () => {
    if (!defId) return;
    activeQuick ? loadWithDays(defId, activeQuick) : handleApply();
  };

  const stats     = spcData?.stats ?? null;
  const chartData = (spcData?.points ?? []).map((p, i) => ({ ...p, index: i + 1 })) as ChartPoint[];
  const outOfSpec = chartData.filter(p => p.out_of_spec).length;
  const outOfCtrl = chartData.filter(p => p.out_of_control && !p.out_of_spec).length;

  return (
    <Box>

      {/* ── Page header ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        borderRadius: 3,
        p: 3,
        mb: 3,
        color: '#f8fafc',
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <Box sx={{ p: 1, bgcolor: '#2563eb20', borderRadius: 2, mt: 0.5 }}>
              <ChartIcon sx={{ color: '#60a5fa', fontSize: 28 }} />
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#f8fafc' }}>
                  Thickness Control Chart
                </Typography>
                <Chip
                  label="IT-PHY-002"
                  size="small"
                  sx={{ bgcolor: '#2563eb30', color: '#93c5fd', fontWeight: 600, fontSize: 11 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Thickness outside Contacts, Embossed Areas &amp; Add-on Areas [IS7810]
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <MonitorIcon sx={{ fontSize: 14, color: '#34d399' }} />
                <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 600 }}>
                  MONITORING
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', mx: 0.5 }}>·</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Spec: 0.76 – 0.84 mm (IS7810 #3003#)
                </Typography>
              </Box>
            </Box>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading} sx={{ color: '#94a3b8', '&:hover': { color: '#f8fafc', bgcolor: '#ffffff15' } }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Date controls ── */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <ButtonGroup size="small" disableElevation>
          {QUICK.map(p => (
            <Button
              key={p.days}
              onClick={() => handleQuick(p.days)}
              variant={activeQuick === p.days ? 'contained' : 'outlined'}
              sx={activeQuick === p.days ? { bgcolor: '#0f172a', borderColor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } } : { borderColor: '#cbd5e1', color: '#475569' }}
            >
              {p.label}
            </Button>
          ))}
        </ButtonGroup>
        <Divider orientation="vertical" flexItem sx={{ borderColor: '#e2e8f0' }} />
        <TextField
          label="Start date" type="date" size="small" value={startDate}
          onChange={e => { setStartDate(e.target.value); setActiveQuick(null); }}
          InputLabelProps={{ shrink: true }} sx={{ width: 155 }}
        />
        <TextField
          label="End date" type="date" size="small" value={endDate}
          onChange={e => { setEndDate(e.target.value); setActiveQuick(null); }}
          InputLabelProps={{ shrink: true }} sx={{ width: 155 }}
        />
        <Button
          variant="contained" size="small" onClick={handleApply}
          disabled={!startDate || !endDate || loading}
          sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' }, px: 2.5 }}
        >
          Apply
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={480}>
          <Box textAlign="center">
            <CircularProgress sx={{ color: '#2563eb' }} />
            <Typography variant="body2" color="text.secondary" mt={2}>Loading SPC data…</Typography>
          </Box>
        </Box>
      ) : !spcData || !stats || chartData.length === 0 ? (
        <Paper elevation={0} sx={{ p: 8, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
          <ChartIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>No data for this period</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Try a different date range — data is available Mar–Jul 2025.
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* ── Stat cards ── */}
          <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
            <StatCard label="Observations" value={String(chartData.length)}  accent="#2563eb" />
            <StatCard label="Mean (x̄)"     value={`${stats.mean} ${unit}`}  accent="#16a34a" />
            <StatCard label="Std Dev (σ)"   value={`${stats.sigma} ${unit}`} accent="#7c3aed" />
            <StatCard label="UCL"           value={`${stats.ucl} ${unit}`}   accent="#ef4444" />
            <StatCard label="LCL"           value={`${stats.lcl} ${unit}`}   accent="#ef4444" />
            <StatCard label="Out of Control" value={String(outOfCtrl)}       accent="#f59e0b" />
            <StatCard label="Out of Spec"    value={String(outOfSpec)}        accent={outOfSpec > 0 ? '#ef4444' : '#16a34a'} />
          </Box>

          {/* ── Chart card ── */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Chart header */}
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
                  X-bar Control Chart
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {chartData.length} individual measurements · IS7810 spec 0.76–0.84 mm
                </Typography>
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap">
                {[
                  { color: C.inControl,  label: 'In control'       },
                  { color: C.outControl, label: 'Out of control'    },
                  { color: C.outSpec,    label: 'Out of spec'       },
                ].map(l => (
                  <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, bgcolor: `${l.color}15`, borderRadius: 10, border: `1px solid ${l.color}30` }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: l.color }} />
                    <Typography variant="caption" sx={{ color: l.color, fontWeight: 600, fontSize: 11 }}>{l.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Chart body */}
            <Box sx={{ p: 2, bgcolor: '#fff' }}>
              <Box height={440}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 24, right: 48, left: 8, bottom: 32 }}>

                    <CartesianGrid strokeDasharray="2 4" stroke={C.grid} vertical={false} />

                    <XAxis
                      dataKey="index"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      label={{ value: 'Sub-Group Number', position: 'insideBottom', offset: -18, fontSize: 12, fill: '#64748b' }}
                      interval={Math.max(1, Math.floor(chartData.length / 12))}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => v.toFixed(3)}
                      label={{ value: unit || 'mm', angle: -90, position: 'insideLeft', offset: 16, fontSize: 11, fill: '#64748b' }}
                      domain={['auto', 'auto']}
                      width={56}
                    />

                    <RechartTooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    {/* Spec zone green shading */}
                    {stats.lsl !== null && stats.usl !== null && (
                      <ReferenceArea y1={stats.lsl} y2={stats.usl} fill={C.specZone} fillOpacity={0.4} ifOverflow="extendDomain" />
                    )}

                    {/* USL */}
                    {stats.usl !== null && (
                      <ReferenceLine y={stats.usl} stroke={C.spec} strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain"
                        label={{ value: `USL  ${stats.usl}`, fill: C.spec, fontSize: 10, fontWeight: 600, position: 'insideTopRight' }} />
                    )}
                    {/* LSL */}
                    {stats.lsl !== null && (
                      <ReferenceLine y={stats.lsl} stroke={C.spec} strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain"
                        label={{ value: `LSL  ${stats.lsl}`, fill: C.spec, fontSize: 10, fontWeight: 600, position: 'insideBottomRight' }} />
                    )}
                    {/* UCL */}
                    <ReferenceLine y={stats.ucl} stroke={C.ucl} strokeWidth={2} strokeDasharray="6 3" ifOverflow="extendDomain"
                      label={{ value: `UCL  ${stats.ucl}`, fill: C.ucl, fontSize: 10, fontWeight: 700, position: 'insideTopLeft' }} />
                    {/* Mean */}
                    <ReferenceLine y={stats.mean} stroke={C.mean} strokeWidth={2} ifOverflow="extendDomain"
                      label={{ value: `X̄  ${stats.mean}`, fill: C.mean, fontSize: 10, fontWeight: 700, position: 'insideTopLeft' }} />
                    {/* LCL */}
                    <ReferenceLine y={stats.lcl} stroke={C.lcl} strokeWidth={2} strokeDasharray="6 3" ifOverflow="extendDomain"
                      label={{ value: `LCL  ${stats.lcl}`, fill: C.lcl, fontSize: 10, fontWeight: 700, position: 'insideBottomLeft' }} />

                    {/* Data line */}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={C.line}
                      strokeWidth={2}
                      dot={renderDot}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      name="Avg Thickness"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default KPIPage;
