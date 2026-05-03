import { Box, Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import type { AuditGrade } from '../../types/nexus';

const CONFIG: Record<AuditGrade, { color: string; bg: string; label: string; months: number }> = {
  A: { color: '#1b5e20', bg: 'rgba(27,94,32,0.12)',  label: 'Grade A — No major NCs',    months: 24 },
  B: { color: '#1565c0', bg: 'rgba(21,101,192,0.12)', label: 'Grade B — Few NCs',         months: 18 },
  C: { color: '#e65100', bg: 'rgba(230,81,0,0.12)',   label: 'Grade C — Many NCs',        months: 12 },
  D: { color: '#b71c1c', bg: 'rgba(183,28,28,0.12)',  label: 'Grade D — Fail',            months: 6  },
};

interface Props {
  grade: AuditGrade;
  showMonths?: boolean;
  sx?: SxProps<Theme>;
}

export default function AuditGradeBadge({ grade, showMonths = false, sx }: Props) {
  const cfg = CONFIG[grade];
  return (
    <Tooltip title={cfg.label} placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: 1.5,
          bgcolor: cfg.bg,
          border: `1.5px solid ${cfg.color}50`,
          ...sx,
        }}
      >
        <Typography fontWeight={800} fontSize={18} sx={{ color: cfg.color, lineHeight: 1 }}>
          {grade}
        </Typography>
        {showMonths && (
          <Typography variant="caption" sx={{ color: cfg.color, opacity: 0.8, lineHeight: 1 }}>
            {cfg.months}mo
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
