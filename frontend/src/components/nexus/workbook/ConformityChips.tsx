// frontend/src/components/nexus/workbook/ConformityChips.tsx
import { Chip, CircularProgress, Stack, Tooltip } from '@mui/material';
import type { Conformity } from '../../../types/nexus';

export const CHIP_ORDER: Conformity[] = ['Full', 'RI', 'nc-', 'NC+', 'NCC', 'n/a', 'tbd'];

const CHIP_COLORS: Record<Conformity, string> = {
  Full: '#388e3c', RI: '#1976d2', 'nc-': '#f57c00',
  'NC+': '#d32f2f', NCC: '#7b1fa2', 'n/a': '#bdbdbd', tbd: '#9e9e9e',
};

interface Props {
  value: Conformity;
  onChange: (c: Conformity) => void;
  saving?: boolean;
}

export default function ConformityChips({ value, onChange, saving }: Props) {
  if (saving) return <CircularProgress size={18} />;
  return (
    <Stack direction="row" spacing={0.5}>
      {CHIP_ORDER.map((c, i) => (
        <Tooltip key={c} title={`${c} (key ${i + 1})`}>
          <Chip
            label={c}
            size="small"
            onClick={() => onChange(c)}
            sx={{
              fontSize: 10, height: 22, cursor: 'pointer',
              bgcolor: value === c ? CHIP_COLORS[c] : 'transparent',
              color: value === c ? '#fff' : 'text.secondary',
              border: '1px solid', borderColor: value === c ? CHIP_COLORS[c] : 'divider',
              fontWeight: value === c ? 700 : 400,
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
