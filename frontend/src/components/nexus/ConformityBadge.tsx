import { Chip, type SxProps, type Theme } from '@mui/material';
import type { Conformity } from '../../types/nexus';

const CONFIG: Record<Conformity, { label: string; color: string; bg: string }> = {
  'NC+': { label: 'NC+',  color: '#c62828', bg: 'rgba(198,40,40,0.1)' },
  'nc-': { label: 'nc−',  color: '#e65100', bg: 'rgba(230,81,0,0.1)' },
  'RI':  { label: 'RI',   color: '#f57f17', bg: 'rgba(245,127,23,0.1)' },
  'Full':{ label: 'Full', color: '#2e7d32', bg: 'rgba(46,125,50,0.1)' },
  'NCC': { label: 'NCC',  color: '#546e7a', bg: 'rgba(84,110,122,0.1)' },
  'tbd': { label: 'tbd',  color: '#9e9e9e', bg: 'rgba(158,158,158,0.1)' },
  'n/a': { label: 'n/a',  color: '#bdbdbd', bg: 'rgba(189,189,189,0.1)' },
};

interface Props {
  value: Conformity;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export default function ConformityBadge({ value, size = 'small', sx }: Props) {
  const cfg = CONFIG[value] ?? CONFIG['tbd'];
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        fontWeight: 700,
        fontFamily: 'monospace',
        color: cfg.color,
        bgcolor: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        ...sx,
      }}
    />
  );
}
