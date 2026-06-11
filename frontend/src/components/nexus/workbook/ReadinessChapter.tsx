import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  downloadCqmapXlsx, downloadReadinessPdf, getReadiness, patchScopeRow,
} from '../../../services/nexus/workbookService';
import type { ConformitySummary, ReadinessData } from '../../../types/nexus/workbook';

const RANK_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error'> =
  { A: 'success', B: 'info', C: 'warning', D: 'error' };

const pct = (s: ConformitySummary, k: keyof ConformitySummary['pct']) =>
  s.pct[k] === null ? '—' : `${s.pct[k]}%`;

interface Props {
  auditId: number;
  onJump: (chapterKey: string) => void;
  onError: (msg: string) => void;
}

export default function ReadinessChapter({ auditId, onJump, onError }: Props) {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getReadiness(auditId)); }
    catch { onError('Failed to compute readiness'); }
  }, [auditId, onError]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const confirmRank = async (scopeId: number, rank: string) => {
    setBusy(true);
    try { await patchScopeRow(auditId, scopeId, { rank: rank as never }); load(); }
    catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        ?? (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error;
      onError(msg ?? 'Rank rejected — the #0706# qualification gate must pass first.');
    } finally { setBusy(false); }
  };

  const startExport = () => data.overall.complete ? doExport() : setConfirmExport(true);
  const doExport = async () => {
    setConfirmExport(false);
    try { await downloadCqmapXlsx(auditId); } catch { onError('Export failed'); }
  };

  const unassessedCount = data.blockers.filter(b => b.type === 'unassessed').length;

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">WOULD WE PASS TODAY?</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <Chip
              label={data.overall.worstRank ? `Worst rank suggestion: ${data.overall.worstRank}` : 'Not enough assessed'}
              color={data.overall.worstRank ? RANK_COLOR[data.overall.worstRank] : 'default'}
            />
            <Chip
              label={data.overall.complete ? 'Fully assessed' : 'Assessment incomplete'}
              variant="outlined"
              color={data.overall.complete ? 'success' : 'warning'}
            />
          </Stack>
          {data.previous && data.previousAt && (
            <Typography variant="caption" color="text.secondary">
              Since {new Date(data.previousAt).toLocaleString()}: blockers{' '}
              {data.blockers.length - data.previous.blockerCount >= 0 ? '+' : ''}
              {data.blockers.length - data.previous.blockerCount},{' '}
              Full {data.categories.reduce((a, c) => a + c.summary.counts.Full, 0) -
                data.previous.categories.reduce((a, c) => a + c.summary.counts.Full, 0) >= 0 ? '+' : ''}
              {data.categories.reduce((a, c) => a + c.summary.counts.Full, 0) -
                data.previous.categories.reduce((a, c) => a + c.summary.counts.Full, 0)}
            </Typography>
          )}
        </Paper>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={startExport}>
          Export official CQMAP (xlsx)
        </Button>
        <Button variant="outlined" startIcon={<PictureAsPdfIcon />}
          onClick={() => downloadReadinessPdf(auditId).catch(() => onError('PDF export failed'))}>
          Readiness PDF
        </Button>
      </Stack>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Conformity percentages (official workbook math — tbd counts in the denominator)
      </Typography>
      <Table size="small" component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Area</TableCell><TableCell>NCC%</TableCell><TableCell>NC+%</TableCell>
            <TableCell>nc-%</TableCell><TableCell>RI%</TableCell><TableCell>Full%</TableCell>
            <TableCell>tbd%</TableCell><TableCell>Assessed</TableCell>
            <TableCell>Rank (suggested)</TableCell><TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {[{ label: 'QMS', summary: data.qms.summary, rankSuggestion: data.qms.rankSuggestion, scopeId: null as number | null, currentRank: null as string | null },
            ...data.categories.map(c => ({ label: c.label, summary: c.summary, rankSuggestion: c.rankSuggestion, scopeId: c.scopeId as number | null, currentRank: c.currentRank }))]
            .map(row => (
              <TableRow key={row.label}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{pct(row.summary, 'NCC')}</TableCell>
                <TableCell>{pct(row.summary, 'NC+')}</TableCell>
                <TableCell>{pct(row.summary, 'nc-')}</TableCell>
                <TableCell>{pct(row.summary, 'RI')}</TableCell>
                <TableCell>{pct(row.summary, 'Full')}</TableCell>
                <TableCell>{pct(row.summary, 'tbd')}</TableCell>
                <TableCell>{row.summary.assessed}/{row.summary.total}</TableCell>
                <TableCell>
                  {row.rankSuggestion
                    ? <Chip size="small" label={row.currentRank ?? `→ ${row.rankSuggestion}`} color={RANK_COLOR[row.rankSuggestion]} />
                    : '—'}
                </TableCell>
                <TableCell>
                  {row.scopeId && row.rankSuggestion && row.currentRank !== row.rankSuggestion && (
                    <Button size="small" disabled={busy} onClick={() => confirmRank(row.scopeId!, row.rankSuggestion!)}>
                      Confirm {row.rankSuggestion}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Blockers ({data.blockers.length})
      </Typography>
      <Paper variant="outlined">
        {data.blockers.length === 0 && <Typography sx={{ p: 2 }} color="success.main">None — ready for the auditor. 🎉</Typography>}
        {data.blockers.map((b, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="center"
            sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Chip size="small" label={b.type} color={b.type === 'finding' ? 'error' : b.type === 'gate' ? 'warning' : 'default'} sx={{ width: 96 }} />
            {b.tag && <Chip size="small" label={b.tag} sx={{ fontFamily: 'monospace', fontSize: 10 }} />}
            <Typography variant="body2" sx={{ flex: 1 }}>{b.title}{b.detail ? ` — ${b.detail}` : ''}</Typography>
            <Link component="button" variant="caption" onClick={() => onJump(b.chapterKey)}>Go to chapter →</Link>
          </Stack>
        ))}
      </Paper>

      <Dialog open={confirmExport} onClose={() => setConfirmExport(false)}>
        <DialogTitle>Assessment incomplete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {unassessedCount} area(s) still have unassessed requirements. The exported CQMAP
            will contain "tbd" cells. Export anyway?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmExport(false)}>Keep working</Button>
          <Button variant="contained" onClick={doExport}>Export anyway</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
