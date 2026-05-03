import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, LinearProgress, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ConformityBadge from '../../components/nexus/ConformityBadge';
import AlertBanner from '../../components/nexus/AlertBanner';
import { getAudit, getQmsSummary, listQms, updateQms } from '../../services/nexus/nexusService';
import type { Conformity, NexusAuditRecord, NexusQmsAssessment, QmsSummary } from '../../types/nexus';

const CONFORMITY_OPTIONS: Conformity[] = ['Full', 'RI', 'nc-', 'NC+', 'NCC', 'n/a', 'tbd'];

function ScoreBar({ summary }: { summary: QmsSummary }) {
  const score = summary.score ?? 0;
  const color = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error';
  const counts = summary.counts ?? {};
  const scored = summary.total - (counts.tbd ?? 0) - (counts['n/a'] ?? 0);
  const passing = (counts.Full ?? 0) + (counts.RI ?? 0);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 280 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Conformity Score
        </Typography>
        <Typography variant="h5" fontWeight={800} color={`${color}.main`}>
          {summary.score !== null ? `${summary.score}%` : '—'}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={score}
        color={color}
        sx={{ height: 8, borderRadius: 4, mb: 1 }}
      />
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary">{scored} scored</Typography>
        <Typography variant="caption" color="success.main">{passing} passing</Typography>
        <Typography variant="caption" color="text.secondary">{summary.total} total</Typography>
      </Stack>
      {summary.score !== null && summary.score < 80 && (
        <Chip
          label="Below 80% threshold"
          size="small"
          color="error"
          variant="outlined"
          sx={{ mt: 1, fontSize: 10 }}
        />
      )}
    </Paper>
  );
}

export default function QmsAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [rows, setRows] = useState<NexusQmsAssessment[]>([]);
  const [summary, setSummary] = useState<QmsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'' | Conformity>('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, q, s] = await Promise.all([
        getAudit(auditId),
        listQms(auditId),
        getQmsSummary(auditId),
      ]);
      setAudit(a);
      setRows(q);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleConformity = async (req: NexusQmsAssessment, conformity: Conformity) => {
    setSaving(s => ({ ...s, [req.requirement_id]: true }));
    try {
      const updated = await updateQms(auditId, req.requirement_id, { conformity });
      setRows(r => r.map(x => x.requirement_id === req.requirement_id ? updated : x));
      const s = await getQmsSummary(auditId);
      setSummary(s);
    } finally {
      setSaving(s => ({ ...s, [req.requirement_id]: false }));
    }
  };

  const handleVendorCompliance = async (req: NexusQmsAssessment, vendor_compliance: string) => {
    setSaving(s => ({ ...s, [`vc_${req.requirement_id}`]: true }));
    try {
      const updated = await updateQms(auditId, req.requirement_id, { vendor_compliance });
      setRows(r => r.map(x => x.requirement_id === req.requirement_id ? updated : x));
    } finally {
      setSaving(s => ({ ...s, [`vc_${req.requirement_id}`]: false }));
    }
  };

  const visible = useMemo(() => {
    let r = rows;
    if (filter) r = r.filter(x => x.conformity === filter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        x.requirement_id.toLowerCase().includes(q) ||
        x.title.toLowerCase().includes(q) ||
        (x.section ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, filter, search]);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
          {audit?.site_name ?? 'Audit'}
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>QMS Self-Assessment</Typography>
          <Typography variant="body2" color="text.secondary">
            {audit?.iso_9001_certified ? '31 requirements (ISO 9001 certified)' : '60 requirements (non-certified)'}
            {' · '}Mastercard CQMAP V3.A — QMS sheet
          </Typography>
        </Box>
        {summary && <ScoreBar summary={summary} />}
        <Tooltip title="Refresh">
          <Button size="small" startIcon={<RefreshIcon />} onClick={load} variant="outlined">
            Refresh
          </Button>
        </Tooltip>
      </Stack>

      {/* ── Filters ── */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search requirement ID or title…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 280 }}
        />
        <TextField
          select
          size="small"
          label="Filter by conformity"
          value={filter}
          onChange={e => setFilter(e.target.value as '' | Conformity)}
          sx={{ width: 200 }}
        >
          <MenuItem value="">All conformity</MenuItem>
          {CONFORMITY_OPTIONS.map(c => (
            <MenuItem key={c} value={c}><ConformityBadge value={c} /></MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {visible.length} / {rows.length} requirements
        </Typography>
      </Stack>

      {/* ── Table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, width: 110 }}>Req. ID</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 90 }}>Section</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Requirement</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 200 }}>Vendor Compliance</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160 }}>Conformity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map(req => (
              <TableRow
                key={req.requirement_id}
                sx={{
                  bgcolor: req.conformity === 'NC+' ? 'rgba(198,40,40,0.04)'
                    : req.conformity === 'nc-' ? 'rgba(230,81,0,0.03)'
                    : 'inherit',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <TableCell>
                  <Chip
                    label={req.requirement_id}
                    size="small"
                    sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: 'action.hover' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{req.section ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={req.conformity === 'NC+' ? 700 : 400}>
                    {req.title}
                  </Typography>
                  {req.conformity === 'NC+' && (
                    <Chip label="CAPA required" size="small" color="error" sx={{ fontSize: 10, height: 18, mt: 0.3 }} />
                  )}
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    multiline
                    maxRows={3}
                    value={req.vendor_compliance ?? ''}
                    onChange={e => setRows(r => r.map(x => x.requirement_id === req.requirement_id
                      ? { ...x, vendor_compliance: e.target.value } : x))}
                    onBlur={e => handleVendorCompliance(req, e.target.value)}
                    placeholder="Vendor notes…"
                    sx={{ fontSize: 12, '& .MuiInputBase-input': { fontSize: 12 } }}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  {saving[req.requirement_id]
                    ? <CircularProgress size={18} />
                    : (
                      <TextField
                        select
                        size="small"
                        value={req.conformity}
                        onChange={e => handleConformity(req, e.target.value as Conformity)}
                        sx={{ width: 130 }}
                      >
                        {CONFORMITY_OPTIONS.map(c => (
                          <MenuItem key={c} value={c}>
                            <ConformityBadge value={c} />
                          </MenuItem>
                        ))}
                      </TextField>
                    )
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
