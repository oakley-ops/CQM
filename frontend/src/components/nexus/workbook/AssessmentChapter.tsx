// frontend/src/components/nexus/workbook/AssessmentChapter.tsx
import { useMemo, useState } from 'react';
import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import RequirementRow from './RequirementRow';
import { CHIP_ORDER } from './ConformityChips';
import type { Conformity } from '../../../types/nexus';
import type { CapaBadge } from '../../../types/nexus/workbook';

export interface AssessmentRowVM {
  id: number | string;
  tag: string;
  title: string;
  conformity: Conformity;
  section?: 'process' | 'qualification' | 'product';
  capa?: CapaBadge;
  hasTestEvidence?: boolean;
  detailFields: { key: string; label: string; value: string; multiline?: boolean; options?: string[] }[];
}

const SECTION_TITLES: Record<string, string> = {
  process: 'Process Steps',
  qualification: 'Qualification & Design (D&D spine)',
  product: 'Product Requirements',
};

interface Props {
  rows: AssessmentRowVM[];
  grouped?: boolean;                      // category chapters group by section
  savingIds: Set<number | string>;
  onConformity: (row: AssessmentRowVM, c: Conformity) => void;
  onDetailSave: (row: AssessmentRowVM, key: string, value: string) => void;
  onOpenPlan?: (row: AssessmentRowVM) => void;
}

export default function AssessmentChapter({ rows, grouped, savingIds, onConformity, onDetailSave, onOpenPlan }: Props) {
  const [focusIdx, setFocusIdx] = useState(0);

  const sections = useMemo(() => {
    if (!grouped) return [{ title: null as string | null, rows }];
    return (['process', 'qualification', 'product'] as const)
      .map(s => ({ title: SECTION_TITLES[s], rows: rows.filter(r => r.section === s) }))
      .filter(s => s.rows.length > 0);
  }, [rows, grouped]);

  const flat = useMemo(() => sections.flatMap(s => s.rows), [sections]);

  const isUnassessed = (r: AssessmentRowVM) =>
    r.conformity === 'tbd' || r.conformity.startsWith('Not assessed');

  const jumpNextUnassessed = () => {
    const start = (focusIdx + 1) % flat.length;
    for (let i = 0; i < flat.length; i++) {
      const idx = (start + i) % flat.length;
      if (isUnassessed(flat[idx])) { setFocusIdx(idx); return; }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    else if (/^[1-7]$/.test(e.key)) {
      e.preventDefault();
      const row = flat[focusIdx];
      if (row) onConformity(row, CHIP_ORDER[Number(e.key) - 1]);
    }
  };

  let runningIdx = -1;
  return (
    <Box tabIndex={0} onKeyDown={onKeyDown} sx={{ outline: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="caption" color="text.secondary">
          Keyboard: ↑/↓ select row · 1–7 set conformity (1=Full … 7=tbd)
        </Typography>
        <Button size="small" startIcon={<SkipNextIcon />} onClick={jumpNextUnassessed}>
          Next unassessed
        </Button>
      </Stack>
      {sections.map((s, si) => (
        <Box key={s.title ?? si} mb={2}>
          {s.title && (<><Typography variant="subtitle2" fontWeight={700} sx={{ my: 1 }}>{s.title}</Typography><Divider /></>)}
          {s.rows.map((r) => {
            runningIdx += 1;
            const idx = runningIdx;
            return (
              <RequirementRow
                key={r.id}
                tag={r.tag} title={r.title} conformity={r.conformity}
                saving={savingIds.has(r.id)} focused={idx === focusIdx}
                capa={r.capa} hasTestEvidence={r.hasTestEvidence}
                onConformity={(c) => onConformity(r, c)}
                onFocus={() => setFocusIdx(idx)}
                onOpenPlan={onOpenPlan && r.section === 'qualification' ? () => onOpenPlan(r) : undefined}
              >
                {r.detailFields.length > 0 ? r.detailFields.map(f => f.options ? (
                  // Enum-validated fields render as a select; saving on change.
                  <TextField
                    key={f.key} label={f.label} size="small" fullWidth select
                    value={f.value}
                    onChange={(e) => { if (e.target.value !== f.value) onDetailSave(r, f.key, e.target.value); }}
                  >
                    {f.options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                ) : (
                  <TextField
                    key={f.key} label={f.label} size="small" fullWidth multiline={f.multiline}
                    defaultValue={f.value}
                    onBlur={(e) => { if (e.target.value !== f.value) onDetailSave(r, f.key, e.target.value); }}
                  />
                )) : undefined}
              </RequirementRow>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
