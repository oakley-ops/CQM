// frontend/src/components/nexus/workbook/RequirementRow.tsx
import { useState, type ReactNode } from 'react';
import {
  Box, Chip, Collapse, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { conformityRowTint } from '../ConformityBadge';
import ConformityChips from './ConformityChips';
import type { Conformity } from '../../../types/nexus';
import type { CapaBadge } from '../../../types/nexus/workbook';

interface Props {
  tag: string;
  title: string;
  conformity: Conformity;
  saving?: boolean;
  focused?: boolean;
  capa?: CapaBadge;
  hasTestEvidence?: boolean;
  onConformity: (c: Conformity) => void;
  onFocus: () => void;
  onOpenPlan?: () => void;          // qualification-spine rows only
  children?: ReactNode;             // expandable detail fields
}

export default function RequirementRow({
  tag, title, conformity, saving, focused, capa, hasTestEvidence,
  onConformity, onFocus, onOpenPlan, children,
}: Props) {
  const [open, setOpen] = useState(false);
  // normalize suffixed values for tinting ('NC+ (Subcontractor)' → 'NC+')
  const base = (conformity.startsWith('Not assessed') ? 'tbd' : conformity.replace(/ \(Subcontractor\)$/, '')) as Conformity;

  return (
    <Box
      onClick={onFocus}
      data-row-tag={tag}
      sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.75,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: conformityRowTint(base),
        outline: focused ? '2px solid' : 'none', outlineColor: 'primary.main', outlineOffset: -2,
      }}
    >
      <Chip label={tag} size="small" sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: 'action.hover', minWidth: 76 }} />
      <Typography variant="body2" sx={{ flex: 1 }} fontWeight={base === 'NC+' || base === 'NCC' ? 700 : 400}>
        {title}
      </Typography>

      {capa && (
        <Tooltip title={`CAPA ${capa.action_id} — ${capa.status}`}>
          <Chip label={capa.action_id} size="small" color="error" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
        </Tooltip>
      )}
      {hasTestEvidence && (
        <Tooltip title="Physical test data exists for this requirement (see Test Sessions)">
          <ScienceIcon fontSize="small" color="info" />
        </Tooltip>
      )}
      {onOpenPlan && (
        <Tooltip title="Open Qualification Plan">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenPlan(); }}>
            <AssignmentIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <ConformityChips value={base} onChange={onConformity} saving={saving} />

      {children && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
          <ExpandMoreIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </IconButton>
      )}
      {children && (
        <Collapse in={open} sx={{ width: '100%', flexBasis: '100%' }} unmountOnExit>
          <Stack sx={{ py: 1, pl: 6 }} spacing={1}>{children}</Stack>
        </Collapse>
      )}
    </Box>
  );
}
