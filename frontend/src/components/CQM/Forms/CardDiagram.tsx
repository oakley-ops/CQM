import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Divider, TextField, Typography } from '@mui/material';

const CARD_W = 320;
const CARD_H = Math.round(CARD_W / 1.5856); // 202px — ISO/IEC 7810 ID-1 aspect ratio
const STRIP_W = Math.round(CARD_W * 0.87);  // 278px — strip span: left 5% to right 8%
const EMV_CHIP_IMAGE = '/emv-chip-test.png';

export interface AreaRow {
  leftMm: string;
  centerMm: string;
  rightMm: string;
}

export type AreaResult = {
  avgInside: number;
  delta: number | null;
  areaPass: boolean | null;
} | null;

type DragPos = { top: number; left: number };

const STORAGE_KEY = 'card-area-positions';

function loadPositions(): Record<string, DragPos> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePositions(pos: Record<string, DragPos>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
}

// Fixed positions for well-known add-on area names (matched case-insensitively)
// spread: true   → L/C/R inputs distributed across full strip width
// vertical: true → L/C/R inputs stacked in a column (e.g. hologram bottom-left)
const AREA_POSITIONS: Record<string, { side: 'front' | 'back'; top: number; left: number; spread?: boolean; vertical?: boolean }> = {
  'hologram':        { side: 'back',  top: 57, left:  4, vertical: true },
  'signature panel': { side: 'back',  top: 36, left:  5, spread: true },
  'embossing':       { side: 'front', top: 37, left:  7 },
  'name embossing':  { side: 'front', top: 50, left:  7 },
  'foil':            { side: 'front', top: 19, left: 42 },
  'debit':           { side: 'back',  top: 55, left: 44 },
  'credit':          { side: 'back',  top: 55, left: 44 },
  'magnetic stripe': { side: 'back',  top:  9, left:  7 },
  'signature strip': { side: 'back',  top: 57, left:  7 },
  'card thickness':  { side: 'back',  top: 76, left: 47 },
};

// Fallback positions for areas whose names don't match the lookup
const FALLBACK: Array<{ side: 'front' | 'back'; top: number; left: number; spread?: boolean; vertical?: boolean }> = [
  { side: 'front', top: 11, left:  7 },
  { side: 'front', top: 59, left:  7 },
  { side: 'back',  top: 19, left: 42 },
  { side: 'back',  top: 57, left: 42 },
  { side: 'front', top: 35, left:  7 },
  { side: 'back',  top: 38, left: 42 },
];

function getPos(label: string, idx: number) {
  return AREA_POSITIONS[label.trim().toLowerCase()] ?? FALLBACK[idx % FALLBACK.length];
}

interface CardFaceProps {
  side: 'front' | 'back';
  areaLabels: string[];
  areas: AreaRow[];
  areaResults: AreaResult[];
  onReadingChange: (areaIdx: number, field: keyof AreaRow, value: string) => void;
}

const CardFace: React.FC<CardFaceProps> = ({ side, areaLabels, areas, areaResults, onReadingChange }) => {
  const [positions, setPositions] = useState<Record<string, DragPos>>(loadPositions);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    savePositions(positions);
  }, [positions]);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const handleDragStart = (
    e: React.MouseEvent,
    areaKey: string,
    base: DragPos
  ) => {
    e.preventDefault();

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const current = positions[areaKey] ?? base;

    const onMove = (move: MouseEvent) => {
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;

      const newTop = clamp(current.top + (dy / rect.height) * 100, 2, 98);
      const newLeft = clamp(current.left + (dx / rect.width) * 100, 2, 98);

      setPositions(prev => ({
        ...prev,
        [areaKey]: { top: newTop, left: newLeft },
      }));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const shown = areaLabels
    .map((label, idx) => {
      const base = getPos(label, idx);
      const areaKey = `${side}:${idx}:${label.trim().toLowerCase()}`;
      const saved = positions[areaKey];
      return {
        label,
        idx,
        base,
        pos: saved ?? { top: base.top, left: base.left },
        areaKey,
      };
    })
    .filter(a => a.base.side === side);

  return (
    <Box>
      <Typography sx={{
        display: 'block', mb: 0.75, fontWeight: 700, letterSpacing: 1.5,
        textTransform: 'uppercase', fontSize: '0.62rem', color: 'text.secondary',
      }}>
        {side}
      </Typography>

      <Box
        ref={cardRef}
        sx={{
        position: 'relative',
        width: CARD_W,
        height: CARD_H,
        borderRadius: '10px',
        background: 'linear-gradient(145deg, #0f2f6b 0%, #1d4e9e 55%, #2b67c0 100%)',
        border: '1.5px solid',
        borderColor: '#356fc4',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      >

        {/* Front: EMV chip */}
        {side === 'front' && (
          <Box sx={{
            position: 'absolute', top: '38%', left: '10%',
            width: 50,
            height: 38,
            borderRadius: '4px',
            backgroundImage: `url("${EMV_CHIP_IMAGE}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}>
            {/* Uses user-provided EMV chip image */}
          </Box>
        )}

        {/* Back: magnetic stripe band */}
        {side === 'back' && (
          <Box sx={{
            position: 'absolute', top: '5%', left: 0, right: 0,
            height: '18%', background: '#111',
          }} />
        )}

        {/* Back: signature strip — centered, slightly below the mag stripe */}
        {side === 'back' && (
          <Box sx={{
            position: 'absolute', top: '28%', left: '5%', right: '5%',
            height: '18%',
            background: 'repeating-linear-gradient(90deg, #f0f0f0 0px, #f0f0f0 5px, #ddd 5px, #ddd 10px)',
            borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.2)',
          }} />
        )}

        {/* Per-area input groups */}
        {shown.map(({ idx, pos, base, areaKey }) => {
          const area = areas[idx] ?? { leftMm: '', centerMm: '', rightMm: '' };
          const result = areaResults[idx];
          const pass = result?.areaPass;         // true | false | null | undefined
          const hasAny = area.leftMm !== '' || area.centerMm !== '' || area.rightMm !== '';
          // null → readings complete but baseline missing (show orange)
          const showPending = (pass === null || pass === undefined) && result !== null && hasAny;

          const labelRow = (
            <Box
              onMouseDown={(e) => handleDragStart(e, areaKey, { top: base.top, left: base.left })}
              sx={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'grab', '&:active': { cursor: 'grabbing' }, mb: '3px' }}
            >
              <Typography sx={{
                fontSize: '0.6rem', fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap',
                color: 'rgba(255,255,255,0.92)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}>
                {areaLabels[idx]}
              </Typography>
              {pass === true  && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4caf50', flexShrink: 0 }} />}
              {pass === false && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f44336', flexShrink: 0 }} />}
              {showPending    && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#ff9800', flexShrink: 0 }} />}
            </Box>
          );

          const advanceFocus = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('input[type="number"]')) as HTMLElement[];
            const idx2 = inputs.indexOf(e.currentTarget as HTMLElement);
            if (idx2 >= 0 && idx2 < inputs.length - 1) inputs[idx2 + 1].focus();
          };

          const inputField = (field: keyof AreaRow) => (
            <TextField
              type="number"
              size="small"
              value={area[field]}
              onChange={e => onReadingChange(idx, field, e.target.value)}
              onKeyDown={advanceFocus}
              inputProps={{
                step: 0.001,
                style: { textAlign: 'center', fontSize: '0.7rem', padding: '3px 1px', width: 44 },
              }}
              sx={{
                width: 50,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  '& fieldset': {
                    borderColor: pass === false ? '#f44336' : 'rgba(0,0,0,0.22)',
                    borderWidth: pass === false ? '1.5px' : '1px',
                  },
                  '&:hover fieldset': { borderColor: '#1976d2' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                },
              }}
            />
          );

          const lcr = ['leftMm', 'centerMm', 'rightMm'] as const;

          const inputRow = base.vertical ? (
            // Vertical stack: L / C / R rows, label to the left of each input
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {lcr.map((field, fi) => (
                <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Typography sx={{
                    fontSize: '0.5rem', fontWeight: 600, lineHeight: 1, width: 7, flexShrink: 0,
                    color: 'rgba(255,255,255,0.6)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}>
                    {['L', 'C', 'R'][fi]}
                  </Typography>
                  {inputField(field)}
                </Box>
              ))}
            </Box>
          ) : (
            // Horizontal row: spread across strip width, or compact with gap
            <Box sx={base.spread
              ? { display: 'flex', width: STRIP_W, justifyContent: 'space-between' }
              : { display: 'flex', gap: '3px' }
            }>
              {lcr.map((field, fi) => (
                <Box key={field} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {!base.spread && (
                    <Typography sx={{
                      fontSize: '0.5rem', fontWeight: 600, lineHeight: 1, mb: '2px',
                      color: 'rgba(255,255,255,0.6)',
                    }}>
                      {['L', 'C', 'R'][fi]}
                    </Typography>
                  )}
                  {inputField(field)}
                </Box>
              ))}
            </Box>
          );

          return (
            <Box key={idx} sx={{ position: 'absolute', top: `${pos.top}%`, left: `${pos.left}%` }}>
              {/* Non-spread: label above inputs */}
              {!base.spread && labelRow}
              {inputRow}
              {/* Spread (e.g. Signature Panel): label centered below inputs */}
              {base.spread && (
                <Box sx={{ mt: '15px', width: STRIP_W, display: 'flex', justifyContent: 'center' }}>
                  {labelRow}
                </Box>
              )}
            </Box>
          );
        })}

        {/* Hint when no areas are assigned to this face */}
        {shown.length === 0 && (
          <Typography sx={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            textAlign: 'center', fontSize: '0.62rem', userSelect: 'none',
            color: side === 'front' ? 'rgba(90,130,200,0.4)' : 'rgba(255,255,255,0.18)',
          }}>
            No areas on this face
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export interface CardDiagramProps {
  areaLabels: string[];
  areas: AreaRow[];
  areaResults: AreaResult[];
  onReadingChange: (areaIdx: number, field: keyof AreaRow, value: string) => void;
}

const CardDiagram: React.FC<CardDiagramProps> = ({ areaLabels, areas, areaResults, onReadingChange }) => {
  const anyEntered = areaLabels.some((_, i) => {
    const a = areas[i];
    return a && (a.leftMm !== '' || a.centerMm !== '' || a.rightMm !== '');
  });

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <CardFace side="front" areaLabels={areaLabels} areas={areas} areaResults={areaResults} onReadingChange={onReadingChange} />
      <CardFace side="back"  areaLabels={areaLabels} areas={areas} areaResults={areaResults} onReadingChange={onReadingChange} />

      {/* ── Results panel in the whitespace to the right of the back card ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 180, maxWidth: 220, pt: 2.5 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
          Area Results
        </Typography>

        {!anyEntered && (
          <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontStyle: 'italic' }}>
            Enter readings to see results
          </Typography>
        )}

        {areaLabels.map((label, i) => {
          const result = areaResults[i];
          const area = areas[i];
          const hasAny = area && (area.leftMm !== '' || area.centerMm !== '' || area.rightMm !== '');
          if (!hasAny && !result) return null;

          const complete = result !== null;
          const failed  = complete && result!.areaPass === false;
          const passed  = complete && result!.areaPass === true;
          const pending = complete && result!.areaPass === null; // baseline not entered

          return (
            <Box key={i}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, gap: 1 }}>
                <Typography sx={{
                  fontSize: '0.75rem', fontWeight: failed ? 700 : 500,
                  color: failed ? 'error.main' : 'text.primary',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100,
                }}>
                  {label}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
                  {complete ? (
                    <>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, lineHeight: 1, color: failed ? 'error.main' : passed ? 'success.main' : 'text.secondary' }}>
                        avg: {result!.avgInside.toFixed(3)} mm
                      </Typography>
                      {result!.delta !== null && (
                        <Typography sx={{ fontSize: '0.68rem', lineHeight: 1, color: failed ? 'error.main' : passed ? 'success.main' : 'text.secondary' }}>
                          Δ: {result!.delta >= 0 ? '+' : ''}{result!.delta.toFixed(3)} mm
                        </Typography>
                      )}
                      {passed  && <Chip label="PASS" color="success" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                      {failed  && <Chip label="FAIL" color="error"   size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                      {pending && <Chip label="—"    color="default" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                    </>
                  ) : (
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
                      incomplete
                    </Typography>
                  )}
                </Box>
              </Box>
              {i < areaLabels.length - 1 && <Divider />}
            </Box>
          );
        })}

        {/* Overall card verdict */}
        {anyEntered && (() => {
          const completeResults = areaResults.filter((r): r is NonNullable<typeof r> => r !== null);
          if (completeResults.length === 0 || completeResults.length < areaLabels.length) return null;
          const anyFail = completeResults.some(r => r.areaPass === false);
          const allPass = !anyFail && completeResults.every(r => r.areaPass === true);
          const isPending = !anyFail && !allPass; // baseline not entered
          const verdict = anyFail ? 'FAIL' : allPass ? 'PASS' : '—';
          const chipColor = anyFail ? 'error' : allPass ? 'success' : 'default';
          const borderColor = anyFail ? 'error.main' : allPass ? 'success.main' : 'divider';
          const textColor = anyFail ? 'error.main' : allPass ? 'success.main' : 'text.secondary';
          return (
            <Box sx={{ mt: 1.5, pt: 1, borderTop: '2px solid', borderColor }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: textColor }}>
                  {isPending ? 'Card (need baseline)' : 'Card'}
                </Typography>
                <Chip
                  label={verdict}
                  color={chipColor as 'error' | 'success' | 'default'}
                  size="small"
                  sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                />
              </Box>
            </Box>
          );
        })()}
      </Box>
    </Box>
  );
};

export default CardDiagram;
