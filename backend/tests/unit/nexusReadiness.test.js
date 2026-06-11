const {
  normalizeConformity,
  summarizeConformities,
  suggestRank,
  BASE_BUCKETS,
} = require('../../utils/nexusReadiness');

test('BASE_BUCKETS exports the six canonical bucket names in order', () => {
  expect(BASE_BUCKETS).toEqual(['NCC', 'NC+', 'nc-', 'RI', 'Full', 'tbd']);
});

describe('normalizeConformity', () => {
  test.each([
    ['Full', 'Full'],
    ['NC+', 'NC+'],
    ['NC+ (Subcontractor)', 'NC+'],
    ['Full (Subcontractor)', 'Full'],
    ['Not assessed (timing constraints)', 'tbd'],
    ['Not assessed (Subcontractor)', 'tbd'],
    ['Not assessed', 'tbd'],
    ['n/a', 'n/a'],
    [null, 'tbd'],
    [undefined, 'tbd'],
    ['garbage', 'tbd'],
  ])('maps %s → %s', (input, expected) => {
    expect(normalizeConformity(input)).toBe(expected);
  });
});

describe('summarizeConformities (xlsx-faithful: % = count / total-incl-tbd, n/a excluded)', () => {
  test('hand-computed fixture: 2 Full, 1 RI, 1 nc-, 1 NC+, 1 NCC, 2 tbd, 1 n/a', () => {
    const s = summarizeConformities([
      'Full', 'Full', 'RI', 'nc-', 'NC+', 'NCC', 'tbd', 'tbd', 'n/a',
    ]);
    expect(s.counts).toEqual({ NCC: 1, 'NC+': 1, 'nc-': 1, RI: 1, Full: 2, tbd: 2, 'n/a': 1 });
    expect(s.total).toBe(8);            // 9 rows minus the n/a row
    expect(s.assessed).toBe(6);         // total minus tbd
    expect(s.pct.Full).toBe(25);        // 2/8
    expect(s.pct.NCC).toBe(12.5);       // 1/8
    expect(s.pct.tbd).toBe(25);         // 2/8 — tbd is in the denominator, per the xlsx
    expect(s.complete).toBe(false);
  });

  test('subcontractor variants are folded into base buckets', () => {
    const s = summarizeConformities(['Full (Subcontractor)', 'NC+ (Subcontractor)']);
    expect(s.counts.Full).toBe(1);
    expect(s.counts['NC+']).toBe(1);
  });

  test('empty input → null percentages, not NaN', () => {
    const s = summarizeConformities([]);
    expect(s.total).toBe(0);
    expect(s.pct.Full).toBeNull();
    expect(s.complete).toBe(false);
  });

  test('non-array input treated as empty', () => {
    const s = summarizeConformities(null);
    expect(s.total).toBe(0);
    expect(s.pct.Full).toBeNull();
    expect(s.complete).toBe(false);
  });

  test('complete when no tbd remains', () => {
    expect(summarizeConformities(['Full', 'RI']).complete).toBe(true);
  });
});

describe('suggestRank (severity ladder — OURS, not in the official xlsx)', () => {
  const sum = (vals) => summarizeConformities(vals);
  test('NCC anywhere → D', () => expect(suggestRank(sum(['Full', 'NCC']))).toBe('D'));
  test('NC+ (no NCC) → C', () => expect(suggestRank(sum(['Full', 'NC+']))).toBe('C'));
  test('nc- (no NC+/NCC) → B', () => expect(suggestRank(sum(['Full', 'nc-']))).toBe('B'));
  test('only Full/RI → A', () => expect(suggestRank(sum(['Full', 'RI']))).toBe('A'));
  test('partially assessed still suggests from findings so far', () =>
    expect(suggestRank(sum(['nc-', 'tbd']))).toBe('B'));
  test('nothing assessed → null', () => expect(suggestRank(sum(['tbd', 'tbd']))).toBeNull());
  test('empty → null', () => expect(suggestRank(sum([]))).toBeNull());
});
