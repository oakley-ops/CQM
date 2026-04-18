import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Paper, Grid, Chip, Tabs, Tab, CircularProgress,
  Alert, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Select, MenuItem, FormControl, InputLabel,
  Stack, Button, Tooltip, Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchJob, fetchJobStatistics, fetchJobSPC,
  clearSelectedJob, clearSpcData,
} from '../../../store/slices/cqm/jobSlice';
import { IMRChart, CapabilityPanel, CapabilityHistogram, RunRuleAlerts, SpecLimitEditor } from '../../../components/CQM/SPC';
import type { JobStatus } from '../../../types/cqm';

const STATUS_COLORS: Record<JobStatus, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'success', completed: 'default', on_hold: 'warning', cancelled: 'error',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Paper sx={{ p: 2, textAlign: 'center', borderTop: `3px solid ${color || '#1976d2'}` }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
      <Typography variant="body2" fontWeight={600}>{label}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

// ─── SPC Tab ──────────────────────────────────────────────────────────────────
function SPCTab({ jobNumber }: { jobNumber: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { statistics, spcData, spcLoading } = useSelector((s: RootState) => s.jobs);
  const [selectedDef, setSelectedDef] = useState<number | ''>('');
  const [specOverride, setSpecOverride] = useState<{ lsl: number | null; usl: number | null } | null>(null);

  const measurementDefs = statistics?.measurements.filter(m => m.n > 0) || [];

  // Auto-select first definition
  useEffect(() => {
    if (measurementDefs.length && selectedDef === '') {
      setSelectedDef(measurementDefs[0].test_definition_id);
    }
  }, [measurementDefs.length]); // eslint-disable-line

  // Fetch SPC when selection changes
  useEffect(() => {
    if (selectedDef) {
      setSpecOverride(null);
      dispatch(fetchJobSPC({ jobNumber, testDefinitionId: selectedDef as number }));
    } else {
      dispatch(clearSpcData());
    }
  }, [dispatch, jobNumber, selectedDef]);

  const selectedMeasure = statistics?.measurements.find(m => m.test_definition_id === selectedDef);

  const specMin = specOverride ? specOverride.lsl : (spcData?.spec_min ?? null);
  const specMax = specOverride ? specOverride.usl : (spcData?.spec_max ?? null);

  return (
    <Box>
      {/* ── Test Selector ── */}
      <Stack direction="row" spacing={2} alignItems="center" mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Measurement Type</InputLabel>
          <Select
            value={selectedDef}
            label="Measurement Type"
            onChange={e => setSelectedDef(e.target.value as number)}
          >
            {measurementDefs.map(m => (
              <MenuItem key={m.test_definition_id} value={m.test_definition_id}>
                {m.test_name} (n={m.n})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedMeasure && (
          <Stack direction="row" spacing={1}>
            {selectedMeasure.spec_min != null && (
              <Chip label={`LSL: ${selectedMeasure.spec_min} ${selectedMeasure.unit || ''}`} size="small" color="error" variant="outlined" />
            )}
            {selectedMeasure.spec_max != null && (
              <Chip label={`USL: ${selectedMeasure.spec_max} ${selectedMeasure.unit || ''}`} size="small" color="error" variant="outlined" />
            )}
            {selectedMeasure.cpk != null && (
              <Chip
                label={`Cpk: ${selectedMeasure.cpk}`}
                size="small"
                color={
                  selectedMeasure.cpk >= 1.33 ? 'success'
                  : selectedMeasure.cpk >= 1.0 ? 'warning'
                  : 'error'
                }
              />
            )}
          </Stack>
        )}
      </Stack>

      {spcLoading && <Box textAlign="center" py={6}><CircularProgress /></Box>}

      {!spcLoading && spcData && (
        <>
          {/* ── Spec Limit Editor ── */}
          {selectedDef && (
            <Box mb={2}>
              <SpecLimitEditor
                testDefinitionId={selectedDef as number}
                testName={spcData.test_name}
                currentLSL={specMin}
                currentUSL={specMax}
                currentUnit={spcData.unit}
                onSaved={(lsl, usl) => {
                  setSpecOverride({ lsl, usl });
                  // Re-fetch SPC with updated limits
                  dispatch(fetchJobSPC({ jobNumber, testDefinitionId: selectedDef as number }));
                }}
              />
            </Box>
          )}

          {spcData.error ? (
            <Alert severity="info" sx={{ mb: 2 }}>{spcData.error}</Alert>
          ) : (
            <>
              {/* ── Capability Panel ── */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={1.5}>Process Capability</Typography>
                <CapabilityPanel
                  capability={spcData.capability}
                  specMin={specMin}
                  specMax={specMax}
                  xBar={spcData.x_bar}
                  unit={spcData.unit}
                />
              </Paper>

              {/* ── I-MR Control Chart ── */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={1}>
                  I-MR Control Chart — {spcData.test_name}
                  {spcData.unit ? ` (${spcData.unit})` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  n={spcData.n} &nbsp;|&nbsp; X̄={spcData.x_bar.toFixed(4)} &nbsp;|&nbsp;
                  UCL={spcData.ucl_i.toFixed(4)} &nbsp;|&nbsp; LCL={spcData.lcl_i.toFixed(4)} &nbsp;|&nbsp;
                  σ<sub>mr</sub>={spcData.sigma_within.toFixed(6)}
                </Typography>
                <IMRChart
                  individuals={spcData.individuals}
                  movingRanges={spcData.moving_ranges}
                  xBar={spcData.x_bar}
                  uclI={spcData.ucl_i}
                  lclI={spcData.lcl_i}
                  mrBar={spcData.mr_bar}
                  uclMR={spcData.ucl_mr}
                  specMin={specMin}
                  specMax={specMax}
                  unit={spcData.unit}
                />
              </Paper>

              {/* ── Histogram ── */}
              {spcData.histogram.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <CapabilityHistogram
                    histogram={spcData.histogram}
                    xBar={spcData.x_bar}
                    sigmaWithin={spcData.sigma_within}
                    specMin={specMin}
                    specMax={specMax}
                    unit={spcData.unit}
                  />
                </Paper>
              )}

              {/* ── Run Rule Violations ── */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={1}>Run Rule Analysis</Typography>
                <RunRuleAlerts violations={spcData.violations} />
              </Paper>
            </>
          )}
        </>
      )}

      {!spcLoading && !spcData && selectedDef && (
        <Alert severity="info">No measurement data found for this test type on this job.</Alert>
      )}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function JobDetail() {
  const { jobNumber } = useParams<{ jobNumber: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { selectedJob, statistics, loading, statsLoading, error } = useSelector((s: RootState) => s.jobs);
  const tab = searchParams.get('tab') === 'stats' ? 1 : 0;

  useEffect(() => {
    if (jobNumber) {
      dispatch(fetchJob(jobNumber));
      dispatch(fetchJobStatistics(jobNumber));
    }
    return () => { dispatch(clearSelectedJob()); };
  }, [dispatch, jobNumber]);

  const handleTabChange = (_: unknown, v: number) => {
    setSearchParams(v === 1 ? { tab: 'stats' } : {});
  };

  if (loading && !selectedJob) {
    return <Box textAlign="center" pt={8}><CircularProgress /></Box>;
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!selectedJob && !loading) return <Alert severity="warning">Job not found</Alert>;

  const job = selectedJob;
  const stats = statistics;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/jobs')} size="small">
          Jobs
        </Button>
        <Divider orientation="vertical" flexItem />
        <Box flex={1}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" fontWeight={700}>{job?.job_number}</Typography>
            {job?.status && (
              <Chip label={job.status.replace('_', ' ')} size="small" color={STATUS_COLORS[job.status]} />
            )}
            {job?.card_type && <Chip label={job.card_type} size="small" variant="outlined" />}
          </Stack>
          {job?.description && (
            <Typography variant="body2" color="text.secondary">{job.description}</Typography>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <StatCard label="Sessions" value={stats.summary.total_sessions} color="#1976d2" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Pass Rate"
              value={stats.summary.pass_rate != null ? `${stats.summary.pass_rate}%` : '—'}
              sub={`${stats.summary.pass_count} pass / ${stats.summary.fail_count} fail`}
              color={
                stats.summary.pass_rate == null ? '#9e9e9e'
                  : stats.summary.pass_rate >= 98 ? '#4caf50'
                  : stats.summary.pass_rate >= 90 ? '#ff9800'
                  : '#f44336'
              }
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard label="Start Date" value={stats.date_range.start || '—'} color="#9c27b0" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard label="End Date" value={stats.date_range.end || '—'} color="#9c27b0" />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs value={tab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Sessions" />
          <Tab label="Statistics & SPC" />
        </Tabs>

        <Box p={3}>
          {/* ── Sessions Tab ── */}
          {tab === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Session #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Inspector</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell>
                    </TableRow>
                  )}
                  {!loading && (job as any)?.sessions?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">No sessions yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {((job as any)?.sessions || []).map((s: any) => (
                    <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/session/${s.id}`)}>
                      <TableCell>{s.test_date}</TableCell>
                      <TableCell>{s.session_number || s.id}</TableCell>
                      <TableCell>
                        <Chip label={s.session_type || 'Monitoring'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {s.inspector
                          ? `${s.inspector.first_name || ''} ${s.inspector.last_name || ''}`.trim() || '—'
                          : '—'}
                      </TableCell>
                      <TableCell>{s.equipment_id || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={s.status}
                          size="small"
                          color={s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View session">
                          <span style={{ fontSize: 12, color: '#1976d2', cursor: 'pointer' }}>View →</span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* ── Statistics & SPC Tab ── */}
          {tab === 1 && (
            <Box>
              {statsLoading && <Box textAlign="center" py={4}><CircularProgress /></Box>}

              {!statsLoading && stats && (
                <>
                  {/* Measurement summary table */}
                  {stats.measurements.length > 0 && (
                    <Box mb={4}>
                      <Typography variant="h6" fontWeight={600} mb={2}>Measurement Summary</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                              <TableCell>Test</TableCell>
                              <TableCell align="right">n</TableCell>
                              <TableCell align="right">Mean</TableCell>
                              <TableCell align="right">Std Dev</TableCell>
                              <TableCell align="right">Min</TableCell>
                              <TableCell align="right">Max</TableCell>
                              <TableCell align="right">LSL</TableCell>
                              <TableCell align="right">USL</TableCell>
                              <TableCell align="right">Cpk</TableCell>
                              <TableCell align="right">Fails</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {stats.measurements.map(m => {
                              const cpkColor = m.cpk == null ? undefined : m.cpk >= 1.33 ? '#4caf50' : m.cpk >= 1.0 ? '#ff9800' : '#f44336';
                              return (
                                <TableRow key={m.test_definition_id}>
                                  <TableCell>
                                    <Typography fontSize="0.8rem" fontWeight={500}>{m.test_name}</Typography>
                                    {m.unit && <Typography variant="caption" color="text.secondary">{m.unit}</Typography>}
                                  </TableCell>
                                  <TableCell align="right">{m.n}</TableCell>
                                  <TableCell align="right">{m.mean != null ? Number(m.mean).toFixed(4) : '—'}</TableCell>
                                  <TableCell align="right">{m.std_dev != null ? Number(m.std_dev).toFixed(4) : '—'}</TableCell>
                                  <TableCell align="right">{m.min_val != null ? Number(m.min_val).toFixed(4) : '—'}</TableCell>
                                  <TableCell align="right">{m.max_val != null ? Number(m.max_val).toFixed(4) : '—'}</TableCell>
                                  <TableCell align="right">{m.spec_min != null ? m.spec_min : '—'}</TableCell>
                                  <TableCell align="right">{m.spec_max != null ? m.spec_max : '—'}</TableCell>
                                  <TableCell align="right">
                                    {m.cpk != null
                                      ? <Typography fontWeight={700} fontSize="0.85rem" color={cpkColor}>{m.cpk}</Typography>
                                      : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                                  </TableCell>
                                  <TableCell align="right">
                                    {m.fail_count > 0
                                      ? <Chip icon={<FailIcon />} label={m.fail_count} size="small" color="error" />
                                      : <Chip icon={<PassIcon />} label="0" size="small" color="success" />
                                    }
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Operator breakdown */}
                  {stats.operators.length > 0 && (
                    <Box mb={4}>
                      <Typography variant="h6" fontWeight={600} mb={2}>Operator Breakdown</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                              <TableCell>Operator</TableCell>
                              <TableCell align="right">Sessions</TableCell>
                              <TableCell align="right">Pass</TableCell>
                              <TableCell align="right">Fail</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {stats.operators.map((op, i) => (
                              <TableRow key={i}>
                                <TableCell>{op.operator_name || 'Unknown'}</TableCell>
                                <TableCell align="right">{op.session_count}</TableCell>
                                <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 600 }}>{op.pass_count}</TableCell>
                                <TableCell align="right" sx={{ color: op.fail_count > 0 ? '#f44336' : undefined, fontWeight: 600 }}>
                                  {op.fail_count}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  <Divider sx={{ mb: 3 }} />

                  {/* SPC Analysis section */}
                  <Typography variant="h6" fontWeight={600} mb={2}>Statistical Process Control</Typography>
                  <SPCTab jobNumber={jobNumber!} />
                </>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
