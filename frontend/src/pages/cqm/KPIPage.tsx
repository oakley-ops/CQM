import { useEffect, useState, useCallback, useRef } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ShowChart as ChartIcon,
  MonitorHeart as MonitorIcon,
  ZoomOutMap as ResetZoomIcon,
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
  Brush,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { getSpcDefs, getSpcData } from '../../services/cqm/testEntryService';
import type { SpcData, SpcPoint, SpcDef } from '../../services/cqm/testEntryService';

const SESSION_TYPE = 'Monitoring';

const DIMENSION_TABS = [
  {
    label:       'Thickness',
    testId:      '#3003#',
    chipLabel:   '#3003#',
    specText:    'Spec: 0.720 – 0.880 mm (±0.080 mm manufacturing tolerance)',
    desc:        'Thickness outside Contacts, Embossed Areas & Add-on Areas [IS7810]',
    yLabel:      'mm',
    measurement: undefined as 'primary' | 'secondary' | undefined,
  },
  {
    label:       'Width',
    testId:      '#3002#',
    chipLabel:   '#3002# · #8030#',
    specText:    'Spec: −0.130 / +0.120 mm deviation (nominal 85.60 mm)',
    desc:        'Card width deviation from 85.60 mm nominal — measured per ISO/IEC 10373-1 #8030#',
    yLabel:      'mm deviation',
    measurement: 'primary' as const,
  },
  {
    label:       'Height',
    testId:      '#3002#',
    chipLabel:   '#3002# · #8030#',
    specText:    'Spec: −0.060 / +0.050 mm deviation (nominal 53.98 mm)',
    desc:        'Card height deviation from 53.98 mm nominal — measured per ISO/IEC 10373-1 #8030#',
    yLabel:      'mm deviation',
    measurement: 'secondary' as const,
  },
  {
    label:       'Holo Add-On Δ',
    testId:      '#3004#',
    chipLabel:   '#3004# · #8050#',
    specText:    'Spec: Δ ≤ 0.05 mm (IS7810 / ISO 10373-1)',
    desc:        'Hologram add-on relative height — avg inside minus avg outside thickness per #8050#',
    yLabel:      'mm delta',
    measurement: 'primary' as const,
  },
  {
    label:       'Sig Panel Δ',
    testId:      '#3004#',
    chipLabel:   '#3004# · #8050#',
    specText:    'Spec: Δ ≤ 0.05 mm (IS7810 / ISO 10373-1)',
    desc:        'Signature panel add-on relative height — avg inside minus avg outside thickness per #8050#',
    yLabel:      'mm delta',
    measurement: 'secondary' as const,
  },
] as const;

type TabIndex = 0 | 1 | 2 | 3 | 4;

const QUICK = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '90D', days: 90  },
  { label: '1Y',  days: 365 },
];

const C = {
  line:       '#2563eb',
  inControl:  '#2563eb',
  outControl: '#f59e0b',
  outSpec:    '#ef4444',
  ucl:        '#ef4444',
  lcl:        '#ef4444',
  mean:       '#16a34a',
  spec:       '#f97316',
  specZone:   '#dcfce7',
  grid:       '#f1f5f9',
  select:     '#2563eb',
};

interface ChartPoint extends SpcPoint { index: number }

// ── Tooltip ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, unit }: TooltipProps<number, string> & { unit: string }) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as ChartPoint;
  const status = pt.out_of_spec ? 'out-spec' : pt.out_of_control ? 'out-ctrl' : 'ok';
  const statusColor = status === 'out-spec' ? C.outSpec : status === 'out-ctrl' ? C.outControl : C.mean;
  const statusLabel = status === 'out-spec' ? '⚠ Out of specification'
                    : status === 'out-ctrl' ? '⚠ Out of control'
                    : '✓ In control';
  return (
    <Box sx={{ bgcolor: '#0f172a', border: `1px solid ${statusColor}40`, borderRadius: 2, p: 1.5, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
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
        <Typography variant="caption" sx={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</Typography>
      </Box>
    </Box>
  );
};

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <Box sx={{ flex: '1 1 80px', minWidth: 80, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderTop: `3px solid ${accent}`, textAlign: 'center' }}>
    <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, letterSpacing: 0.5 }}>{label}</Typography>
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
      fill={fill} stroke="#fff" strokeWidth={1.5}
      style={{ filter: payload.out_of_spec ? 'drop-shadow(0 0 4px #ef444480)' : undefined }}
    />
  );
};

// ── Page ───────────────────────────────────────────────────────────────────
const KPIPage = () => {
  const [activeTab, setActiveTab]     = useState<TabIndex>(0);
  const [allDefs, setAllDefs]         = useState<SpcDef[]>([]);
  const [defId, setDefId]             = useState<number | null>(null);
  const [spcData, setSpcData]         = useState<SpcData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [activeQuick, setActiveQuick] = useState<number | null>(90);

  // Drag-to-zoom state
  const [refAreaLeft, setRefAreaLeft]   = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isSelecting, setIsSelecting]   = useState(false);
  const [isZoomed, setIsZoomed]         = useState(false);
  const [brushDomain, setBrushDomain]   = useState<{ start: number; end: number } | null>(null);
  const preZoom        = useRef<{ quick: number | null; start: string; end: string }>({ quick: 30, start: '', end: '' });
  const brushDomainRef = useRef<{ start: number; end: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const tab = DIMENSION_TABS[activeTab];

  const loadWithDays = useCallback((id: number, days: number, measurement?: 'primary' | 'secondary') => {
    setLoading(true); setError(null);
    getSpcData(id, { days, sessionType: SESSION_TYPE, measurement })
      .then(d => setSpcData(d))
      .catch(() => setError('Failed to load SPC data.'))
      .finally(() => setLoading(false));
  }, []);

  const loadWithDates = useCallback((id: number, start: string, end: string, measurement?: 'primary' | 'secondary') => {
    setLoading(true); setError(null);
    getSpcData(id, { startDate: start, endDate: end, sessionType: SESSION_TYPE, measurement })
      .then(d => setSpcData(d))
      .catch(() => setError('Failed to load SPC data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getSpcDefs()
      .then(defs => {
        setAllDefs(defs);
        const match = defs.find(d => d.test_id === DIMENSION_TABS[0].testId);
        if (match) { setDefId(match.id); loadWithDays(match.id, 90, DIMENSION_TABS[0].measurement); }
        else setLoading(false);
      })
      .catch(() => { setError('Could not load test definitions.'); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!allDefs.length) return;
    const match = allDefs.find(d => d.test_id === DIMENSION_TABS[activeTab].testId);
    if (match) {
      setDefId(match.id);
      setSpcData(null);
      setStartDate(''); setEndDate('');
      setActiveQuick(90);
      setIsZoomed(false);
      setBrushDomain(null);
      setRefAreaLeft(null); setRefAreaRight(null);
      loadWithDays(match.id, 90, DIMENSION_TABS[activeTab].measurement);
    } else {
      setDefId(null); setSpcData(null); setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, allDefs]);

  const handleQuick = (days: number) => {
    setActiveQuick(days); setStartDate(''); setEndDate('');
    setIsZoomed(false); setBrushDomain(null);
    if (defId) loadWithDays(defId, days, tab.measurement);
  };
  const handleApply = () => {
    if (!startDate || !endDate || !defId) return;
    setActiveQuick(null); setIsZoomed(false); setBrushDomain(null);
    loadWithDates(defId, startDate, endDate, tab.measurement);
  };
  const handleRefresh = () => {
    if (!defId) return;
    activeQuick ? loadWithDays(defId, activeQuick, tab.measurement) : handleApply();
  };

  // ── Drag-select handlers ──────────────────────────────────────────────────
  const handleChartMouseDown = (e: { activeLabel?: string }) => {
    const label = e?.activeLabel != null ? Number(e.activeLabel) : null;
    if (label == null || isNaN(label)) return;
    setRefAreaLeft(label);
    setRefAreaRight(null);
    setIsSelecting(true);
  };

  const handleChartMouseMove = (e: { activeLabel?: string }) => {
    if (!isSelecting) return;
    const label = e?.activeLabel != null ? Number(e.activeLabel) : null;
    if (label == null || isNaN(label)) return;
    setRefAreaRight(label);
  };

  const handleChartMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    if (refAreaLeft == null || refAreaRight == null || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null); setRefAreaRight(null);
      return;
    }

    const [leftIdx, rightIdx] = refAreaLeft < refAreaRight
      ? [refAreaLeft, refAreaRight]
      : [refAreaRight, refAreaLeft];

    const startPt = chartData[leftIdx  - 1];
    const endPt   = chartData[rightIdx - 1];
    if (!startPt || !endPt || !defId) {
      setRefAreaLeft(null); setRefAreaRight(null);
      return;
    }

    preZoom.current = { quick: activeQuick, start: startDate, end: endDate };
    setIsZoomed(true);
    setStartDate(startPt.date);
    setEndDate(endPt.date);
    setActiveQuick(null);
    setBrushDomain(null);
    loadWithDates(defId, startPt.date, endPt.date, tab.measurement);
    setRefAreaLeft(null); setRefAreaRight(null);
  };

  const handleResetZoom = () => {
    const { quick, start, end } = preZoom.current;
    setIsZoomed(false);
    if (quick !== null) {
      handleQuick(quick);
    } else if (start && end && defId) {
      setStartDate(start); setEndDate(end); setActiveQuick(null);
      setBrushDomain(null);
      loadWithDates(defId, start, end, tab.measurement);
    }
  };

  // ── Scroll-wheel zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || chartData.length === 0) return;
    const n = chartData.length;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const plotLeft  = rect.left + 64;   // YAxis width (56) + margin.left (8)
      const plotRight = rect.right - 48;  // margin.right
      const plotWidth = plotRight - plotLeft;
      if (plotWidth <= 0) return;
      const cursorRatio = Math.max(0, Math.min(1, (e.clientX - plotLeft) / plotWidth));
      const curStart  = brushDomainRef.current?.start ?? 0;
      const curEnd    = brushDomainRef.current?.end   ?? n - 1;
      const curWindow = Math.max(1, curEnd - curStart);
      const factor    = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const newWindow = Math.max(10, Math.min(n - 1, Math.round(curWindow * factor)));
      const pivot     = curStart + cursorRatio * curWindow;
      let ns = Math.round(pivot - cursorRatio * newWindow);
      let ne = ns + newWindow;
      if (ns < 0) { ns = 0; ne = newWindow; }
      if (ne >= n) { ne = n - 1; ns = ne - newWindow; }
      ns = Math.max(0, ns); ne = Math.min(n - 1, ne);
      setBrushDomain({ start: ns, end: ne });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spcData]);

  const stats     = spcData?.stats ?? null;
  const unit      = spcData?.definition?.unit_of_measurement ?? tab.yLabel;
  const chartData = (spcData?.points ?? []).map((p, i) => ({ ...p, index: i + 1 })) as ChartPoint[];
  brushDomainRef.current = brushDomain;
  const outOfSpec = chartData.filter(p => p.out_of_spec).length;
  const outOfCtrl = chartData.filter(p => p.out_of_control && !p.out_of_spec).length;

  // Brush tick: show date label for first point in each month
  const brushTick = (idx: number) => {
    const pt = chartData[idx - 1];
    if (!pt) return '';
    const prev = chartData[idx - 2];
    if (!prev || pt.date.slice(0, 7) !== prev.date.slice(0, 7)) {
      return pt.date.slice(0, 7); // YYYY-MM
    }
    return '';
  };

  return (
    <Box>

      {/* ── Page header ── */}
      <Box sx={{ background: 'linear-gradient(135deg, #0066CC 0%, #004C99 100%)', borderRadius: 3, p: 3, mb: 3, color: '#f8fafc' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, mt: 0.5 }}>
              <ChartIcon sx={{ color: '#ffffff', fontSize: 28 }} />
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#f8fafc' }}>
                  Card Dimensions — SPC Control Charts
                </Typography>
                <Chip label={tab.chipLabel} size="small" sx={{ bgcolor: '#2563eb30', color: '#93c5fd', fontWeight: 600, fontSize: 11 }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>{tab.desc}</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <MonitorIcon sx={{ fontSize: 14, color: '#ffffff' }} />
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600 }}>MONITORING</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff', mx: 0.5 }}>·</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff' }}>{tab.specText}</Typography>
              </Box>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {loading && spcData && <CircularProgress size={18} sx={{ color: '#93c5fd' }} />}
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={loading} sx={{ color: '#94a3b8', '&:hover': { color: '#f8fafc', bgcolor: '#ffffff15' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* ── Dimension tabs ── */}
      <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as TabIndex)}
          sx={{
            px: 1,
            '& .MuiTab-root': { fontWeight: 600, fontSize: 13, minHeight: 44, color: '#64748b' },
            '& .Mui-selected': { color: '#0f172a' },
            '& .MuiTabs-indicator': { bgcolor: '#2563eb', height: 3 },
          }}
        >
          {DIMENSION_TABS.map((t, i) => (
            <Tab key={i} label={t.label} />
          ))}
        </Tabs>
      </Paper>

      {/* ── Date controls ── */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <ButtonGroup size="small" disableElevation>
          {QUICK.map(p => (
            <Button
              key={p.days}
              onClick={() => handleQuick(p.days)}
              variant={activeQuick === p.days ? 'contained' : 'outlined'}
              sx={activeQuick === p.days
                ? { bgcolor: '#0066CC', borderColor: '#0066CC', '&:hover': { bgcolor: '#004C99' } }
                : { borderColor: '#cbd5e1', color: '#475569' }}
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
          sx={{ bgcolor: '#0066CC', '&:hover': { bgcolor: '#004C99' }, px: 2.5 }}
        >
          Apply
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && !spcData ? (
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
            Try a different date range or import data for this dimension.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
          {/* ── Stat cards ── */}
          <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
            <StatCard label="Observations"   value={String(chartData.length)}  accent="#2563eb" />
            <StatCard label="Mean (x̄)"       value={`${stats.mean} ${unit}`}  accent="#16a34a" />
            <StatCard label="Std Dev (σ)"     value={`${stats.sigma} ${unit}`} accent="#7c3aed" />
            <StatCard label="UCL"             value={`${stats.ucl} ${unit}`}   accent="#ef4444" />
            <StatCard label="LCL"             value={`${stats.lcl} ${unit}`}   accent="#ef4444" />
            <StatCard label="Out of Control"  value={String(outOfCtrl)}         accent="#f59e0b" />
            <StatCard label="Out of Spec"     value={String(outOfSpec)}         accent={outOfSpec > 0 ? '#ef4444' : '#16a34a'} />
          </Box>

          {/* ── Chart card ── */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

            {/* Chart header */}
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
                  X-bar Control Chart — {tab.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {chartData.length} individual measurements · {tab.specText}
                  {isZoomed && (
                    <Box component="span" sx={{ ml: 1, color: '#2563eb', fontWeight: 600 }}>
                      · zoomed {startDate} → {endDate}
                    </Box>
                  )}
                </Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                {isZoomed && (
                  <Tooltip title="Reset zoom to previous period">
                    <Button
                      size="small"
                      startIcon={<ResetZoomIcon sx={{ fontSize: 16 }} />}
                      onClick={handleResetZoom}
                      sx={{ fontSize: 12, fontWeight: 600, color: '#2563eb', borderColor: '#2563eb40', border: '1px solid', px: 1.5, py: 0.5, borderRadius: 2, '&:hover': { bgcolor: '#2563eb10' } }}
                    >
                      Reset zoom
                    </Button>
                  </Tooltip>
                )}
                {[
                  { color: C.inControl,  label: 'In control'    },
                  { color: C.outControl, label: 'Out of control' },
                  { color: C.outSpec,    label: 'Out of spec'    },
                ].map(l => (
                  <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, bgcolor: `${l.color}15`, borderRadius: 10, border: `1px solid ${l.color}30` }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: l.color }} />
                    <Typography variant="caption" sx={{ color: l.color, fontWeight: 600, fontSize: 11 }}>{l.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Zoom hint */}
            <Box sx={{ px: 3, py: 0.75, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                💡 <strong>Drag</strong> on the chart to zoom into a date range · <strong>Scroll</strong> to zoom in/out · <strong>Brush</strong> the strip below to pan
              </Typography>
            </Box>

            {/* Chart body */}
            <Box sx={{ p: 2, bgcolor: '#fff' }}>
              <Box ref={chartContainerRef} height={490} sx={{ cursor: isSelecting ? 'crosshair' : 'default' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 24, right: 48, left: 8, bottom: 8 }}
                    onMouseDown={handleChartMouseDown}
                    onMouseMove={handleChartMouseMove}
                    onMouseUp={handleChartMouseUp}
                    onMouseLeave={() => { if (isSelecting) { setIsSelecting(false); setRefAreaLeft(null); setRefAreaRight(null); } }}
                    style={{ userSelect: 'none' }}
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke={C.grid} vertical={false} />

                    <XAxis
                      dataKey="index"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      label={{ value: 'Sub-Group Number', position: 'insideBottom', offset: -46, fontSize: 12, fill: '#64748b' }}
                      interval={Math.max(1, Math.floor(chartData.length / 12))}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => v.toFixed(3)}
                      label={{ value: tab.yLabel, angle: -90, position: 'insideLeft', offset: 16, fontSize: 11, fill: '#64748b' }}
                      domain={['auto', 'auto']}
                      width={56}
                    />

                    {/* Suppress tooltip while dragging to avoid flicker */}
                    {!isSelecting && (
                      <RechartTooltip
                        content={<CustomTooltip unit={unit} />}
                        cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                    )}

                    {/* Spec zone shading */}
                    {stats.lsl !== null && stats.usl !== null && (
                      <ReferenceArea y1={stats.lsl} y2={stats.usl} fill={C.specZone} fillOpacity={0.4} ifOverflow="extendDomain" />
                    )}

                    {/* Drag-select highlight */}
                    {isSelecting && refAreaLeft !== null && refAreaRight !== null && (
                      <ReferenceArea
                        x1={Math.min(refAreaLeft, refAreaRight)}
                        x2={Math.max(refAreaLeft, refAreaRight)}
                        stroke={C.select}
                        strokeOpacity={0.4}
                        fill={C.select}
                        fillOpacity={0.08}
                      />
                    )}

                    {/* Spec limits */}
                    {stats.usl !== null && (
                      <ReferenceLine y={stats.usl} stroke={C.spec} strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain"
                        label={{ value: `USL  ${stats.usl}`, fill: C.spec, fontSize: 10, fontWeight: 600, position: 'insideTopRight' }} />
                    )}
                    {stats.lsl !== null && (
                      <ReferenceLine y={stats.lsl} stroke={C.spec} strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain"
                        label={{ value: `LSL  ${stats.lsl}`, fill: C.spec, fontSize: 10, fontWeight: 600, position: 'insideBottomRight' }} />
                    )}

                    {/* Control limits */}
                    <ReferenceLine y={stats.ucl} stroke={C.ucl} strokeWidth={2} strokeDasharray="6 3" ifOverflow="extendDomain"
                      label={{ value: `UCL  ${stats.ucl}`, fill: C.ucl, fontSize: 10, fontWeight: 700, position: 'insideTopLeft' }} />
                    <ReferenceLine y={stats.mean} stroke={C.mean} strokeWidth={2} ifOverflow="extendDomain"
                      label={{ value: `X̄  ${stats.mean}`, fill: C.mean, fontSize: 10, fontWeight: 700, position: 'insideTopLeft' }} />
                    <ReferenceLine y={stats.lcl} stroke={C.lcl} strokeWidth={2} strokeDasharray="6 3" ifOverflow="extendDomain"
                      label={{ value: `LCL  ${stats.lcl}`, fill: C.lcl, fontSize: 10, fontWeight: 700, position: 'insideBottomLeft' }} />

                    {/* Data line */}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={C.line}
                      strokeWidth={2}
                      dot={renderDot}
                      activeDot={isSelecting ? false : { r: 6, strokeWidth: 2, stroke: '#fff' }}
                      name={`Avg ${tab.label}`}
                      isAnimationActive={false}
                    />

                    {/* Brush — pan/window strip (controlled so scroll-wheel zoom drives it) */}
                    <Brush
                      dataKey="index"
                      height={30}
                      stroke="#e2e8f0"
                      fill="#f8fafc"
                      travellerWidth={8}
                      tickFormatter={brushTick}
                      startIndex={brushDomain?.start ?? 0}
                      endIndex={brushDomain?.end ?? chartData.length - 1}
                      onChange={({ startIndex, endIndex }) => {
                        if (startIndex != null && endIndex != null)
                          setBrushDomain({ start: startIndex as number, end: endIndex as number });
                      }}
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
