// frontend/src/components/nexus/workbook/PlanDrawer.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Drawer, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import api from '../../../services/api';
import type { GateState } from '../../../types/nexus/workbook';

interface PlanItem { id: number; requirement_id?: string; title: string; status: string }
interface Review { id: number; review_type: string; outcome: string }
// API: getPlan returns { ...plan, items, reviews, gate } — "reviews" key (not "designReviews")
interface Plan { id: number; plan_type: string; status: string; product_scope_id?: number; items?: PlanItem[]; reviews?: Review[] }

// Matches NexusQualificationItem model: ['pending', 'in-progress', 'complete', 'not-applicable']
const ITEM_STATUSES = ['pending', 'in-progress', 'complete', 'not-applicable'];

interface Props {
  auditId: number;
  scopeId: number | null;       // null = closed
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function PlanDrawer({ auditId, scopeId, onClose, onError }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!scopeId) return;
    setLoading(true);
    try {
      const list = (await api.get(`/nexus/audits/${auditId}/plans`)).data as Plan[];
      let p = list.find(x => x.product_scope_id === scopeId) ?? null;
      if (!p) {
        p = (await api.post(`/nexus/audits/${auditId}/plans`, {
          plan_type: 'product', product_scope_id: scopeId,
        })).data;
      }
      // getPlan response includes items, reviews (not designReviews), and gate inline
      const detail = (await api.get(`/nexus/audits/${auditId}/plans/${p!.id}`)).data as Plan & { gate?: GateState };
      const { gate: inlineGate, ...planOnly } = detail;
      setPlan(planOnly);
      // Gate is returned inline by getPlan; fall back to dedicated endpoint if absent
      if (inlineGate) {
        setGate(inlineGate);
      } else {
        setGate((await api.get(`/nexus/audits/${auditId}/plans/${p!.id}/gate`)).data);
      }
    } catch { onError('Failed to load qualification plan'); }
    finally { setLoading(false); }
  }, [auditId, scopeId, onError]);

  useEffect(() => { load(); }, [load]);

  const setItemStatus = async (item: PlanItem, status: string) => {
    if (!plan) return;
    try {
      await api.patch(`/nexus/audits/${auditId}/plans/${plan.id}/items/${item.id}`, { status });
      load();
    } catch { onError('Failed to update checklist item'); }
  };

  return (
    <Drawer anchor="right" open={scopeId !== null} onClose={onClose}
      PaperProps={{ sx: { width: 460, p: 2 } }}>
      <Typography variant="h6" fontWeight={700} mb={1}>Qualification Plan</Typography>
      {loading && <CircularProgress size={24} />}
      {!loading && plan && (
        <Box>
          <Stack direction="row" spacing={1} mb={2}>
            <Chip label={plan.plan_type} size="small" />
            <Chip label={plan.status} size="small" variant="outlined" />
            {gate && (
              <Chip label={gate.passed ? '#0706# gate: PASS' : '#0706# gate: FAIL'} size="small"
                color={gate.passed ? 'success' : 'error'} />
            )}
          </Stack>
          {gate && !gate.passed && (
            <Box mb={2}>
              {gate.conditions.filter(c => !c.passed).map(c => (
                <Typography key={c.label} variant="caption" color="error" display="block">
                  ✗ {c.label}{c.detail ? ` — ${c.detail}` : ''}
                </Typography>
              ))}
            </Box>
          )}
          {(plan.items ?? []).map(item => (
            <Stack key={item.id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.requirement_id ? `${item.requirement_id} ` : ''}{item.title}
              </Typography>
              <TextField select size="small" value={item.status} sx={{ width: 150 }}
                onChange={e => setItemStatus(item, e.target.value)}>
                {ITEM_STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
          ))}
          <Typography variant="subtitle2" fontWeight={700} mt={2}>Design Reviews</Typography>
          {(plan.reviews ?? []).map(r => (
            <Typography key={r.id} variant="body2">{r.review_type}: {r.outcome}</Typography>
          ))}
          <Button size="small" sx={{ mt: 2 }} href={`/nexus/audits/${auditId}/plans`}>
            Open full Qualification Hub →
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
