import { useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Switch, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { createScopeRow, patchScopeRow } from '../../../services/nexus/workbookService';
import type { NexusProductScope } from '../../../types/nexus';
import type { ScopeCatalog } from '../../../types/nexus/workbook';

interface Props {
  auditId: number;
  scopes: NexusProductScope[];
  catalog: ScopeCatalog;
  onChanged: () => void;          // refetch workbook (chapters appear/disappear)
  onError: (msg: string) => void;
}

export default function ScopeChapter({ auditId, scopes, catalog, onChanged, onError }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const rowFor = (label: string) => scopes.find(s => s.product_label === label);

  const toggle = async (category: string, label: string, isPrimary: boolean, field: 'in_scope' | 'audited', value: boolean) => {
    setBusy(label);
    try {
      const existing = rowFor(label);
      if (existing) {
        await patchScopeRow(auditId, existing.id, { [field]: value });
      } else {
        // New row: primary rows seed the category's process steps; variants don't.
        await createScopeRow(auditId, {
          product_category: category, product_variant: label,
          in_scope: field === 'in_scope' ? value : false,
          seed_steps: isPrimary,
        });
      }
      onChanged();
    } catch { onError(`Failed to update scope for ${label}`); }
    finally { setBusy(null); }
  };

  const categories = Object.entries(catalog).filter(([key]) => key !== 'qms');

  // "Common case" quick-start: pre-ticks the typical card-vendor scope rows.
  const QUICK_PICKS: { label: string; rows: { category: string; variant: string; primary: boolean }[] }[] = [
    {
      label: 'We make personalized plastic ICCs',
      rows: [
        { category: 'icc', variant: 'ICC - Any IC Card', primary: true },
        { category: 'icc', variant: 'plICC - plastic ICC', primary: false },
        { category: 'p', variant: 'P - Any Personalisation activity', primary: true },
      ],
    },
  ];

  const applyQuickPick = async (pick: typeof QUICK_PICKS[number]) => {
    setBusy(pick.label);
    try {
      for (const r of pick.rows) {
        const existing = rowFor(r.variant);
        if (existing) {
          if (!existing.in_scope) await patchScopeRow(auditId, existing.id, { in_scope: true });
        } else {
          await createScopeRow(auditId, {
            product_category: r.category, product_variant: r.variant,
            in_scope: true, seed_steps: r.primary,
          });
        }
      }
      onChanged();
    } catch { onError('Quick-start failed'); }
    finally { setBusy(null); }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Tick what this site does (the doc's "Audit Scope" table). Ticking a category's first
        ("Any") row creates its requirements chapter. Rank and percentages are computed in
        Readiness — never entered here. Unticking hides a chapter but keeps its data.
      </Typography>
      <Stack direction="row" spacing={1} mb={2}>
        {QUICK_PICKS.map(p => (
          <Chip key={p.label} label={`Quick start: ${p.label}`} onClick={() => applyQuickPick(p)}
            disabled={busy !== null} variant="outlined" color="primary" />
        ))}
      </Stack>
      {categories.map(([key, cat]) => {
        const anyInScope = cat.variants.some(v => rowFor(v.label)?.in_scope);
        return (
          <Accordion key={key} defaultExpanded={anyInScope} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography fontWeight={700} variant="body2">{cat.label}</Typography>
                {anyInScope && <Chip label="in scope" color="primary" size="small" sx={{ height: 20, fontSize: 10 }} />}
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {cat.variants.map(v => {
                const row = rowFor(v.label);
                return (
                  <Stack key={v.label} direction="row" alignItems="center" spacing={2}
                    sx={{ py: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {v.label}{v.primary ? ' ★' : ''}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">In scope</Typography>
                      <Switch size="small" checked={!!row?.in_scope} disabled={busy === v.label}
                        onChange={e => toggle(key, v.label, !!v.primary, 'in_scope', e.target.checked)} />
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">Audited</Typography>
                      <Switch size="small" checked={!!row?.audited} disabled={busy === v.label || !row}
                        onChange={e => toggle(key, v.label, !!v.primary, 'audited', e.target.checked)} />
                    </Stack>
                  </Stack>
                );
              })}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
