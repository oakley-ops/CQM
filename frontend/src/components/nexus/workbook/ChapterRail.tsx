// frontend/src/components/nexus/workbook/ChapterRail.tsx
import { Box, LinearProgress, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { WorkbookChapter } from '../../../types/nexus/workbook';

interface Props {
  chapters: WorkbookChapter[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function ChapterRail({ chapters, activeKey, onSelect }: Props) {
  const totals = chapters.reduce(
    (acc, c) => c.progress ? { done: acc.done + c.progress.done, total: acc.total + c.progress.total } : acc,
    { done: 0, total: 0 },
  );
  const overallPct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <Box sx={{ width: 270, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', pr: 1 }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Overall progress
        </Typography>
        <LinearProgress variant="determinate" value={overallPct} sx={{ height: 8, borderRadius: 4, my: 0.5 }} />
        <Typography variant="caption" color="text.secondary">{totals.done} / {totals.total} assessed · {overallPct}%</Typography>
      </Box>
      <List dense>
        {chapters.map((c, i) => (
          <ListItemButton key={c.key} selected={c.key === activeKey} onClick={() => onSelect(c.key)} sx={{ borderRadius: 1 }}>
            <ListItemText
              primary={`${i + 1}. ${c.title}`}
              secondary={c.progress ? `${c.progress.done} / ${c.progress.total}` : undefined}
              primaryTypographyProps={{ fontSize: 13, fontWeight: c.key === activeKey ? 700 : 400 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
