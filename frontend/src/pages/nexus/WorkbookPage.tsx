// frontend/src/pages/nexus/WorkbookPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import ChapterRail from '../../components/nexus/workbook/ChapterRail';
import SiteProfileChapter from '../../components/nexus/workbook/SiteProfileChapter';
import ScopeChapter from '../../components/nexus/workbook/ScopeChapter';
import AssessmentChapter from '../../components/nexus/workbook/AssessmentChapter';
import ReadinessChapter from '../../components/nexus/workbook/ReadinessChapter';
import PlanDrawer from '../../components/nexus/workbook/PlanDrawer';
import { getWorkbook, patchQmsRow, patchStep } from '../../services/nexus/workbookService';
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
  const [savingIds, setSavingIds] = useState<Set<number | string>>(new Set());
  const [drawerScopeId, setDrawerScopeId] = useState<number | null>(null);

  const markSaving = (id: number | string, on: boolean) =>
    setSavingIds(prev => { const n = new Set(prev); if (on) { n.add(id); } else { n.delete(id); } return n; });

  // Optimistic mutate: update local chapter state, call API, revert on failure.
  const mutateRow = async (
    chapterKey: string, rowId: number | string,
    patch: Record<string, unknown>,
    call: () => Promise<unknown>,
  ) => {
    const prev = data;
    setData(d => !d ? d : ({
      ...d,
      chapters: d.chapters.map(c =>
        c.key === chapterKey && 'rows' in c
          ? { ...c, rows: (c.rows as { id: number | string }[]).map(r => r.id === rowId ? { ...r, ...patch } : r) } as typeof c
          : c),
    }));
    markSaving(rowId, true);
    try { await call(); }
    catch { setData(prev); setToast('Save failed — value reverted.'); }
    finally { markSaving(rowId, false); }
  };

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
        {active?.kind === 'qms' && (
          <AssessmentChapter
            rows={active.rows.map(r => ({
              id: r.id, tag: r.requirement_id, title: r.title, conformity: r.conformity,
              capa: data.capas[`qms:${r.id}`],
              detailFields: [
                // vendor_compliance is enum-validated server-side — render as a select, not free text.
                { key: 'vendor_compliance', label: 'Vendor compliance', value: r.vendor_compliance ?? 'tbd', options: ['Yes', 'Procedure only', 'Practice only', 'No', 'tbd', 'n/a'] },
                { key: 'vendor_evidence_ref', label: 'Evidence reference (doc / QM section)', value: r.vendor_evidence_ref ?? '' },
                { key: 'auditor_comment', label: 'Notes', value: r.auditor_comment ?? '', multiline: true },
              ],
            }))}
            savingIds={savingIds}
            onConformity={(row, c) =>
              mutateRow('qms', row.id, { conformity: c },
                () => patchQmsRow(auditId, row.tag, { conformity: c }).then(() => { if (['NC+', 'NCC', 'nc-'].includes(c)) load(); }))}
            onDetailSave={(row, key, value) =>
              mutateRow('qms', row.id, { [key]: value }, () => patchQmsRow(auditId, row.tag, { [key]: value }))}
          />
        )}
        {active?.kind === 'category' && (
          <AssessmentChapter
            grouped
            rows={active.rows.map(r => ({
              id: r.id, tag: r.process_tag, title: r.process_name, conformity: r.conformity,
              section: r.section,
              capa: data.capas[`process-step:${r.id}`],
              hasTestEvidence: data.testEvidenceTags.includes(r.process_tag),
              detailFields: [
                { key: 'vendor_site', label: 'Vendor site (name, city, country)', value: r.vendor_site ?? '' },
                { key: 'vendor_process_spec_ref', label: 'Process spec ref', value: r.vendor_process_spec_ref ?? '' },
                { key: 'vendor_control_plan_ref', label: 'Control plan ref', value: r.vendor_control_plan_ref ?? '' },
                { key: 'production_equipment', label: 'Production equipment', value: r.production_equipment ?? '' },
                { key: 'test_equipment', label: 'Test equipment', value: r.test_equipment ?? '' },
                { key: 'auditor_notes', label: 'Notes', value: r.auditor_notes ?? '', multiline: true },
              ],
            }))}
            savingIds={savingIds}
            onConformity={(row, c) =>
              mutateRow(active.key, row.id, { conformity: c },
                () => patchStep(auditId, active.scopeId, Number(row.id), { conformity: c }).then(() => { if (['NC+', 'NCC', 'nc-'].includes(c)) load(); }))}
            onDetailSave={(row, key, value) =>
              mutateRow(active.key, row.id, { [key]: value }, () => patchStep(auditId, active.scopeId, Number(row.id), { [key]: value }))}
            onOpenPlan={() => setDrawerScopeId(active.scopeId)}
          />
        )}
        {active?.kind === 'readiness' && (
          <ReadinessChapter auditId={auditId} onJump={setActiveKey} onError={setToast} />
        )}

        <PlanDrawer auditId={auditId} scopeId={drawerScopeId} onClose={() => setDrawerScopeId(null)} onError={setToast} />
      </Box>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity="error" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
