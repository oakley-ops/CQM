import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress,
  FormControl, MenuItem, Paper, Select, Snackbar, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import {
  getStudy, getRatings, submitRatings, getResults, updateStudy, getTrend,
} from '../../services/cqm/kappaService';
import KappaGauge from '../../components/CQM/KappaGauge';
import type {
  KappaStudy, KappaRating, KappaResults, KappaTrendPoint,
} from '../../types/cqm/kappa.types';

// ── helpers ───────────────────────────────────────────────────────────────────

function ratingKey(appraiser_id: number, sample: number, trial: number) {
  return `${appraiser_id}:${sample}:${trial}`;
}

function buildRatingMap(ratings: KappaRating[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of ratings) {
    m.set(ratingKey(r.appraiser_id, r.sample_number, r.trial_number), r.rating);
  }
  return m;
}

// ── Main component ────────────────────────────────────────────────────────────

const KappaStudyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const studyId = parseInt(id!, 10);
  const navigate = useNavigate();
  const currentUser = useSelector((s: RootState) => s.auth?.user);

  const [study, setStudy]       = useState<KappaStudy | null>(null);
  const [_ratings, setRatings]  = useState<KappaRating[]>([]);
  const [results, setResults]   = useState<KappaResults | null>(null);
  const [trend, setTrend]       = useState<KappaTrendPoint[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState(0);
  const [toast, setToast]       = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Pending rating edits (not yet submitted)
  const [pendingRatings, setPendingRatings] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studyRes, ratingsRes] = await Promise.all([
        getStudy(studyId),
        getRatings(studyId),
      ]);
      setStudy(studyRes.study);
      setRatings(ratingsRes.ratings);
      setPendingRatings(buildRatingMap(ratingsRes.ratings));

      if (studyRes.study.status === 'complete') {
        const resRes = await getResults(studyId);
        setResults(resRes.results);

        if (studyRes.study.test_definition_id) {
          const trendRes = await getTrend({ test_definition_id: studyRes.study.test_definition_id });
          setTrend(trendRes.trend);
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => { load(); }, [load]);

  // ── Data Entry: who is the current user as appraiser ─────────────────────
  const currentAppraiser = study?.appraisers?.find(a => a.id === currentUser?.id);
  const isCreator = study?.created_by === currentUser?.id;
  const isReadOnly = study?.status === 'complete';

  const handleRatingChange = (appraiser_id: number, sample: number, trial: number, val: string) => {
    const key = ratingKey(appraiser_id, sample, trial);
    setPendingRatings(prev => {
      const next = new Map(prev);
      next.set(key, val);
      return next;
    });
  };

  const handleSaveRatings = async (appraiser_id: number) => {
    if (!study) return;
    setSaving(true);
    try {
      const ratingPayload: { sample_number: number; trial_number: number; rating: string }[] = [];
      for (let s = 1; s <= study.sample_count; s++) {
        for (let t = 1; t <= study.trial_count; t++) {
          const val = pendingRatings.get(ratingKey(appraiser_id, s, t));
          if (val) ratingPayload.push({ sample_number: s, trial_number: t, rating: val });
        }
      }
      if (ratingPayload.length === 0) { setSaving(false); return; }
      await submitRatings(studyId, { appraiser_id, ratings: ratingPayload });
      const ratingsRes = await getRatings(studyId);
      setRatings(ratingsRes.ratings);
      setPendingRatings(buildRatingMap(ratingsRes.ratings));
      setToast('Ratings saved');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this study as complete? Ratings will be frozen and κ results computed.')) return;
    setCompleting(true);
    try {
      await updateStudy(studyId, { status: 'complete' });
      await load();
      setTab(1);
      setToast('Study completed — κ results are ready');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setCompleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (!study) {
    return <Alert severity="error">Study not found</Alert>;
  }

  const attrOptions = Array.isArray(study.attribute_options)
    ? study.attribute_options
    : JSON.parse(study.attribute_options as any || '["Pass","Fail"]');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Button startIcon={<BackIcon />} onClick={() => navigate('/kappa')} sx={{ mb: 2 }}>
        Back to Studies
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{study.study_name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={study.status === 'complete' ? 'Complete' : 'Open'}
              color={study.status === 'complete' ? 'default' : 'primary'}
              size="small"
            />
            {study.testDefinition && (
              <Chip label={study.testDefinition.test_name} size="small" variant="outlined" />
            )}
            {study.card_type && (
              <Chip label={study.card_type} size="small" variant="outlined" />
            )}
            <Chip label={`${study.sample_count} samples`} size="small" variant="outlined" />
            <Chip label={`${study.trial_count} trials`} size="small" variant="outlined" />
          </Box>
        </Box>

        {study.status === 'open' && isCreator && (
          <Button
            variant="contained"
            color="success"
            startIcon={completing ? <CircularProgress size={16} /> : <LockIcon />}
            onClick={handleComplete}
            disabled={completing}
          >
            Complete Study
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="Data Entry" />
        <Tab label="Results" disabled={study.status !== 'complete'} />
        <Tab label="Trend" disabled={trend.length < 2} />
      </Tabs>

      {/* ── Tab 0: Data Entry ──────────────────────────────────────────────── */}
      {tab === 0 && (
        <DataEntryTab
          study={study}
          attrOptions={attrOptions}
          pendingRatings={pendingRatings}
          isReadOnly={isReadOnly}
          isCreator={isCreator}
          currentAppraiser={currentAppraiser ?? null}
          saving={saving}
          onRatingChange={handleRatingChange}
          onSave={handleSaveRatings}
        />
      )}

      {/* ── Tab 1: Results ─────────────────────────────────────────────────── */}
      {tab === 1 && results && (
        <ResultsTab results={results} />
      )}

      {/* ── Tab 2: Trend ───────────────────────────────────────────────────── */}
      {tab === 2 && (
        <TrendTab trend={trend} currentStudyId={studyId} />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
};

// ── Data Entry Tab ────────────────────────────────────────────────────────────

interface DataEntryProps {
  study: KappaStudy;
  attrOptions: string[];
  pendingRatings: Map<string, string>;
  isReadOnly: boolean;
  isCreator: boolean;
  currentAppraiser: { id: number; name: string } | null;
  saving: boolean;
  onRatingChange: (appraiser_id: number, sample: number, trial: number, val: string) => void;
  onSave: (appraiser_id: number) => void;
}

const DataEntryTab: React.FC<DataEntryProps> = ({
  study, attrOptions, pendingRatings, isReadOnly, isCreator,
  currentAppraiser, saving, onRatingChange, onSave,
}) => {
  const appraisers = study.appraisers || [];
  const hasRef = !!(study.reference_data && Object.keys(study.reference_data).length > 0);
  const ref = study.reference_data || {};

  // Show all appraisers if creator; otherwise only current user
  const visibleAppraisers = isCreator ? appraisers : (currentAppraiser ? [currentAppraiser] : []);

  if (visibleAppraisers.length === 0) {
    return (
      <Alert severity="info">
        You are not listed as an appraiser for this study. Ask the study creator to add you.
      </Alert>
    );
  }

  return (
    <Box>
      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This study is complete. Ratings are read-only.
        </Alert>
      )}

      {visibleAppraisers.map(appraiser => (
        <Box key={appraiser.id} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>{appraiser.name}</Typography>
            {!isReadOnly && (
              <Button
                variant="outlined"
                size="small"
                disabled={saving}
                onClick={() => onSave(appraiser.id)}
              >
                {saving ? 'Saving…' : 'Save Ratings'}
              </Button>
            )}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Sample #</TableCell>
                  {Array.from({ length: study.trial_count }, (_, i) => (
                    <TableCell key={i} sx={{ fontWeight: 700, minWidth: 140 }}>
                      Trial {i + 1}
                    </TableCell>
                  ))}
                  {hasRef && isCreator && (
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main', minWidth: 140 }}>
                      Reference
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: study.sample_count }, (_, i) => i + 1).map(sampleNum => {
                  const refVal = ref[String(sampleNum)];
                  return (
                    <TableRow key={sampleNum} hover>
                      <TableCell>{sampleNum}</TableCell>
                      {Array.from({ length: study.trial_count }, (_, t) => t + 1).map(trialNum => {
                        const key = ratingKey(appraiser.id, sampleNum, trialNum);
                        const val = pendingRatings.get(key) || '';
                        const matchesRef = refVal && val && val === refVal;
                        const missesRef  = refVal && val && val !== refVal;
                        return (
                          <TableCell key={trialNum}>
                            {isReadOnly ? (
                              <Chip
                                label={val || '—'}
                                size="small"
                                color={matchesRef ? 'success' : missesRef ? 'error' : 'default'}
                                variant={val ? 'filled' : 'outlined'}
                              />
                            ) : (
                              <FormControl size="small" sx={{ minWidth: 130 }}>
                                <Select
                                  value={val}
                                  displayEmpty
                                  onChange={e => onRatingChange(appraiser.id, sampleNum, trialNum, e.target.value)}
                                  sx={{
                                    bgcolor: matchesRef ? 'success.50' : missesRef ? 'error.50' : undefined,
                                  }}
                                >
                                  <MenuItem value=""><em>— not rated —</em></MenuItem>
                                  {attrOptions.map(opt => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          </TableCell>
                        );
                      })}
                      {hasRef && isCreator && (
                        <TableCell>
                          {refVal ? (
                            <Chip label={refVal} size="small" color="primary" variant="outlined" />
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
};

// ── Results Tab ───────────────────────────────────────────────────────────────

const ResultsTab: React.FC<{ results: KappaResults }> = ({ results }) => {
  const { gate, perAppraiser, betweenAppraisers } = results;

  return (
    <Box>
      {/* Gate banner */}
      <Paper
        sx={{
          p: 3, mb: 3,
          bgcolor: gate.overallPassed ? 'success.50' : 'error.50',
          border: 2,
          borderColor: gate.overallPassed ? 'success.main' : 'error.main',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {gate.overallPassed
            ? <PassIcon color="success" sx={{ fontSize: 40 }} />
            : <FailIcon color="error" sx={{ fontSize: 40 }} />
          }
          <Box>
            <Typography variant="h6" fontWeight={700} color={gate.overallPassed ? 'success.dark' : 'error.dark'}>
              {gate.overallPassed ? 'Measurement System PASSED' : 'Measurement System FAILED'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Six Sigma MSA gate: κ ≥ {gate.threshold} for all three measurements
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
          <GateItem label="Within-Appraiser (Repeatability)" passed={gate.withinPassed} />
          <GateItem label="Between-Appraiser (Reproducibility)" passed={gate.betweenPassed} />
          {gate.hasReference && <GateItem label="vs. Reference (Accuracy)" passed={gate.vsRefPassed} />}
        </Box>
      </Paper>

      {/* κ Scorecards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <KappaCard
          title="Between-Appraiser κ (Fleiss)"
          subtitle="Reproducibility — do all inspectors agree?"
          kappa={betweenAppraisers.fleissKappa}
          interp={betweenAppraisers.fleissInterpretation}
          extra={`${betweenAppraisers.overallAgreementPct?.toFixed(1) ?? '—'}% all-agree | ${betweenAppraisers.evaluatedSamples} samples`}
          threshold={gate.threshold}
        />
        {perAppraiser.map(a => (
          <KappaCard
            key={a.userId}
            title={`${a.name} — Within-κ`}
            subtitle="Repeatability (trial 1 vs trial 2)"
            kappa={a.withinKappa}
            interp={a.withinInterpretation}
            extra={`Trial agreement: ${a.trialAgreementPct?.toFixed(1) ?? '—'}%`}
            threshold={gate.threshold}
          />
        ))}
        {gate.hasReference && perAppraiser.map(a => (
          <KappaCard
            key={`${a.userId}-ref`}
            title={`${a.name} — vs. Reference κ`}
            subtitle="Accuracy vs. known truth"
            kappa={a.vsReferenceKappa}
            interp={a.vsRefInterpretation}
            extra={`Effective: ${a.effectivePct?.toFixed(1) ?? '—'}%`}
            threshold={gate.threshold}
          />
        ))}
      </Box>

      {/* Per-appraiser breakdown table */}
      <Typography variant="subtitle1" fontWeight={600} mb={1}>Per-Appraiser Breakdown</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Appraiser</TableCell>
              <TableCell align="right">Samples Rated</TableCell>
              <TableCell align="right">Trial Agreement %</TableCell>
              <TableCell align="right">Within-κ</TableCell>
              <TableCell align="right">vs. Reference κ</TableCell>
              <TableCell align="right">Effectiveness %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {perAppraiser.map(a => (
              <TableRow key={a.userId}>
                <TableCell>{a.name}</TableCell>
                <TableCell align="right">{a.completeSamples}</TableCell>
                <TableCell align="right">{a.trialAgreementPct?.toFixed(1) ?? '—'}</TableCell>
                <TableCell align="right">
                  <KappaChip kappa={a.withinKappa} threshold={gate.threshold} />
                </TableCell>
                <TableCell align="right">
                  <KappaChip kappa={a.vsReferenceKappa} threshold={gate.threshold} />
                </TableCell>
                <TableCell align="right">{a.effectivePct?.toFixed(1) ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pairwise κ */}
      {betweenAppraisers.pairwiseKappa.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Pairwise κ (Between Appraisers)</Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Appraiser A</TableCell>
                  <TableCell>Appraiser B</TableCell>
                  <TableCell align="right">κ</TableCell>
                  <TableCell>Interpretation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {betweenAppraisers.pairwiseKappa.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.appraiserA.name}</TableCell>
                    <TableCell>{p.appraiserB.name}</TableCell>
                    <TableCell align="right">
                      <KappaChip kappa={p.kappa} threshold={gate.threshold} />
                    </TableCell>
                    <TableCell>{p.interpretation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Confusion matrices */}
      {gate.hasReference && perAppraiser.some(a => a.confusion) && (
        <>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Confusion Matrices (Appraiser vs. Reference)</Typography>
          {perAppraiser.filter(a => a.confusion).map(a => (
            <Box key={a.userId} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} mb={1}>{a.name}</Typography>
              <ConfusionMatrixView confusion={a.confusion!} />
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};

// ── Trend Tab ─────────────────────────────────────────────────────────────────

const TrendTab: React.FC<{ trend: KappaTrendPoint[]; currentStudyId: number }> = ({ trend, currentStudyId }) => (
  <Box>
    <Typography variant="subtitle1" fontWeight={600} mb={2}>κ Trend Across Studies</Typography>
    {trend.length < 2 ? (
      <Alert severity="info">Need at least two completed studies for the same test to show a trend.</Alert>
    ) : (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Study</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Fleiss κ (Between)</TableCell>
              <TableCell>Worst Within-κ</TableCell>
              <TableCell align="center">Gate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trend.map(p => (
              <TableRow key={p.study_id} selected={p.study_id === currentStudyId}>
                <TableCell>{p.study_name}</TableCell>
                <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                <TableCell><KappaGauge kappa={p.fleiss_kappa} showLabel={false} width={180} /></TableCell>
                <TableCell><KappaGauge kappa={p.worst_within_kappa} showLabel={false} width={180} /></TableCell>
                <TableCell align="center">
                  <Chip
                    label={p.overall_passed ? 'PASS' : 'FAIL'}
                    color={p.overall_passed ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Box>
);

// ── Small sub-components ──────────────────────────────────────────────────────

const GateItem: React.FC<{ label: string; passed: boolean }> = ({ label, passed }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {passed
      ? <PassIcon color="success" fontSize="small" />
      : <FailIcon color="error" fontSize="small" />
    }
    <Typography variant="body2" color={passed ? 'success.dark' : 'error.dark'}>{label}</Typography>
  </Box>
);

const KappaCard: React.FC<{
  title: string; subtitle: string; kappa: number | null; interp: string;
  extra: string; threshold: number;
}> = ({ title, subtitle, kappa, extra, threshold }) => {
  const passed = kappa !== null && kappa >= threshold;
  return (
    <Paper sx={{ p: 2, minWidth: 240, flex: '1 1 240px', border: 1, borderColor: 'divider' }}>
      <Typography variant="body2" fontWeight={700}>{title}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>{subtitle}</Typography>
      <KappaGauge kappa={kappa} showLabel />
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>{extra}</Typography>
      <Chip
        size="small"
        label={passed ? 'PASS' : 'FAIL'}
        color={passed ? 'success' : (kappa === null ? 'default' : 'error')}
        sx={{ mt: 1 }}
      />
    </Paper>
  );
};

const KappaChip: React.FC<{ kappa: number | null; threshold: number }> = ({ kappa, threshold }) => {
  if (kappa === null) return <span>—</span>;
  const passed = kappa >= threshold;
  return (
    <Chip
      label={kappa.toFixed(3)}
      size="small"
      color={passed ? 'success' : 'error'}
      variant="outlined"
      sx={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}
    />
  );
};

const ConfusionMatrixView: React.FC<{ confusion: { matrix: Record<string, Record<string, number>>; categories: string[] } }> = ({ confusion }) => {
  const { matrix, categories } = confusion;
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 400 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Appraiser ↓ / Truth →</TableCell>
            {categories.map(c => <TableCell key={c} align="center" sx={{ fontWeight: 700 }}>{c}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(row => (
            <TableRow key={row}>
              <TableCell sx={{ fontWeight: 600 }}>{row}</TableCell>
              {categories.map(col => {
                const count = matrix[row]?.[col] || 0;
                const isCorrect = row === col;
                return (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      bgcolor: count > 0 ? (isCorrect ? 'success.50' : 'error.50') : undefined,
                      fontWeight: isCorrect ? 700 : 400,
                    }}
                  >
                    {count}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default KappaStudyDetail;
