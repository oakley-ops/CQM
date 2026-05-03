import { useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, MenuItem, Paper,
  Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { NexusDesignReview, ReviewOutcome } from '../../types/nexus';
import { createReview, updateReview } from '../../services/nexus/nexusService';

const OUTCOME_CONFIG: Record<ReviewOutcome, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  approved:    { label: 'Approved',    color: 'success' },
  conditional: { label: 'Conditional', color: 'warning' },
  rejected:    { label: 'Rejected',    color: 'error' },
  pending:     { label: 'Pending',     color: 'default' },
};

interface Props {
  auditId: number;
  planId: number;
  reviews: NexusDesignReview[];
  onUpdate: (updated: NexusDesignReview[]) => void;
}

export default function DesignReviewSignOff({ auditId, planId, reviews, onUpdate }: Props) {
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleCreate = async (type: 'intermediate' | 'final') => {
    setSaving(s => ({ ...s, [`new_${type}`]: true }));
    try {
      const review = await createReview(auditId, planId, {
        review_type: type,
        outcome: 'pending',
      });
      onUpdate([...reviews, review]);
    } finally {
      setSaving(s => ({ ...s, [`new_${type}`]: false }));
    }
  };

  const handleUpdate = async (review: NexusDesignReview, patch: Partial<NexusDesignReview>) => {
    setSaving(s => ({ ...s, [review.id]: true }));
    try {
      const updated = await updateReview(auditId, planId, review.id, patch);
      onUpdate(reviews.map(r => r.id === review.id ? updated : r));
    } finally {
      setSaving(s => ({ ...s, [review.id]: false }));
    }
  };

  const hasIntermediate = reviews.some(r => r.review_type === 'intermediate');
  const hasFinal = reviews.some(r => r.review_type === 'final');

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        #0571# Design Reviews
      </Typography>
      <Stack spacing={1.5}>
        {reviews
          .slice()
          .sort((a, b) => a.review_type.localeCompare(b.review_type))
          .map(review => {
            const cfg = OUTCOME_CONFIG[review.outcome] ?? OUTCOME_CONFIG.pending;
            return (
              <Paper key={review.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                  <Chip
                    label={review.review_type === 'intermediate' ? 'Intermediate' : 'Final'}
                    size="small"
                    variant="outlined"
                    color={review.review_type === 'final' ? 'primary' : 'default'}
                  />
                  {saving[review.id] ? <CircularProgress size={16} /> : (
                    <TextField
                      select
                      size="small"
                      value={review.outcome}
                      onChange={e => handleUpdate(review, { outcome: e.target.value as ReviewOutcome })}
                      sx={{ width: 140 }}
                    >
                      {(Object.keys(OUTCOME_CONFIG) as ReviewOutcome[]).map(o => (
                        <MenuItem key={o} value={o}>
                          <Chip label={OUTCOME_CONFIG[o].label} size="small" color={OUTCOME_CONFIG[o].color} />
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  <TextField
                    size="small"
                    placeholder="Reviewer name"
                    value={review.reviewer ?? ''}
                    onChange={e => onUpdate(reviews.map(r => r.id === review.id ? { ...r, reviewer: e.target.value } : r))}
                    onBlur={e => handleUpdate(review, { reviewer: e.target.value })}
                    sx={{ width: 180, '& .MuiInputBase-input': { fontSize: 12 } }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    value={review.review_date ?? ''}
                    onChange={e => onUpdate(reviews.map(r => r.id === review.id ? { ...r, review_date: e.target.value } : r))}
                    onBlur={e => handleUpdate(review, { review_date: e.target.value })}
                    sx={{ width: 150 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Chip label={cfg.label} size="small" color={cfg.color} />
                </Stack>
                {review.outcome !== 'approved' && (
                  <TextField
                    size="small"
                    multiline
                    maxRows={2}
                    placeholder="Notes / conditions…"
                    value={review.notes ?? ''}
                    onChange={e => onUpdate(reviews.map(r => r.id === review.id ? { ...r, notes: e.target.value } : r))}
                    onBlur={e => handleUpdate(review, { notes: e.target.value })}
                    fullWidth
                    sx={{ mt: 1, '& .MuiInputBase-input': { fontSize: 12 } }}
                  />
                )}
              </Paper>
            );
          })}

        <Stack direction="row" spacing={1}>
          {!hasIntermediate && (
            <Button
              size="small"
              startIcon={saving['new_intermediate'] ? <CircularProgress size={14} /> : <AddIcon />}
              onClick={() => handleCreate('intermediate')}
              disabled={!!saving['new_intermediate']}
              variant="outlined"
            >
              Add Intermediate Review
            </Button>
          )}
          {!hasFinal && (
            <Button
              size="small"
              startIcon={saving['new_final'] ? <CircularProgress size={14} /> : <AddIcon />}
              onClick={() => handleCreate('final')}
              disabled={!!saving['new_final']}
              variant="outlined"
            >
              Add Final Review
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
