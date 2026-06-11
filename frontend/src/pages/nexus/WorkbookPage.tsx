// frontend/src/pages/nexus/WorkbookPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import ChapterRail from '../../components/nexus/workbook/ChapterRail';
import SiteProfileChapter from '../../components/nexus/workbook/SiteProfileChapter';
import ScopeChapter from '../../components/nexus/workbook/ScopeChapter';
import { getWorkbook } from '../../services/nexus/workbookService';
import type { WorkbookData } from '../../types/nexus/workbook';

export default function WorkbookPage() {
  const { id } = useParams<{ id: string }>();
  const auditId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<WorkbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState('site-profile');
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getWorkbook(auditId)); }
    catch { setError('Failed to load the workbook.'); }
    finally { setLoading(false); }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => data?.chapters.find(c => c.key === activeKey), [data, activeKey]);
  const activeIdx = useMemo(() => data?.chapters.findIndex(c => c.key === activeKey) ?? -1, [data, activeKey]);
  const next = data && activeIdx >= 0 && activeIdx < data.chapters.length - 1 ? data.chapters[activeIdx + 1] : null;

  if (loading) return <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (error || !data) return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error ?? 'Workbook unavailable'}</Alert>
      <Button variant="contained" onClick={load}>Retry</Button>
    </Box>
  );

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2, maxWidth: 1500, mx: 'auto' }}>
      <ChapterRail chapters={data.chapters} activeKey={activeKey} onSelect={setActiveKey} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
          <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
            {data.audit.site_name}
          </Button>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>{active?.title}</Typography>
          {next && (
            <Button variant="outlined" size="small" onClick={() => setActiveKey(next.key)}>
              Next: {next.title}
            </Button>
          )}
        </Stack>

        {/* Chapter bodies are mounted by kind; Tasks 9-11 replace the placeholders. */}
        {active?.kind === 'site-profile' && (
          <SiteProfileChapter
            audit={data.audit}
            onSaved={() => load()}
            onError={setToast}
          />
        )}
        {active?.kind === 'scope' && (
          <ScopeChapter
            auditId={auditId}
            scopes={active.scopes}
            catalog={data.scopeCatalog}
            onChanged={load}
            onError={setToast}
          />
        )}
        {(active?.kind === 'qms' || active?.kind === 'category' || active?.kind === 'readiness') && (
          <Typography color="text.secondary" sx={{ p: 4 }}>Chapter content arrives in a later task.</Typography>
        )}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity="error" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
