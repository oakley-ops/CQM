/**
 * SPC Engine — Statistical Process Control calculations
 * Implements I-MR (Individuals & Moving Range) chart statistics
 * and process capability indices (Cp, Cpk, Pp, Ppk).
 */

const D2 = 1.128;  // d2 constant for subgroup size n=2 (used to estimate σ from MR-bar)
const D4 = 3.267;  // D4 constant for subgroup size n=2 (UCL multiplier for MR chart)
const D3 = 0;      // D3 constant for n=2 (LCL = 0 for MR chart)

/**
 * Compute full SPC statistics for an ordered array of individual measurements.
 * @param {number[]} values - Individual measurements in chronological order
 * @param {number|null} lsl - Lower Spec Limit (null = no spec)
 * @param {number|null} usl - Upper Spec Limit (null = no spec)
 * @returns {object} Full SPC result
 */
function computeSPC(values, lsl = null, usl = null) {
  const n = values.length;
  if (n < 2) {
    return { error: 'Need at least 2 measurements for SPC', n };
  }

  // ── Individuals statistics ────────────────────────────────────────
  const xBar = values.reduce((s, v) => s + v, 0) / n;

  // Overall sigma (sample std dev — for Pp/Ppk)
  const variance = values.reduce((s, v) => s + Math.pow(v - xBar, 2), 0) / (n - 1);
  const sigmaOverall = Math.sqrt(variance);

  // Moving ranges
  const movingRanges = [];
  for (let i = 1; i < n; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]));
  }
  const mrBar = movingRanges.reduce((s, v) => s + v, 0) / movingRanges.length;

  // Within-subgroup sigma (from moving ranges — for Cp/Cpk)
  const sigmaWithin = mrBar / D2;

  // Individuals chart control limits
  const uclI = xBar + 3 * sigmaWithin;
  const lclI = xBar - 3 * sigmaWithin;

  // Moving range chart control limits
  const uclMR = D4 * mrBar;
  const lclMR = D3 * mrBar; // = 0

  // ── Process capability ────────────────────────────────────────────
  let capability = null;
  const specValid = lsl !== null && usl !== null && lsl < xBar && xBar < usl;

  if (lsl !== null && usl !== null && sigmaWithin > 0) {
    const cp   = (usl - lsl) / (6 * sigmaWithin);
    const cpu  = (usl - xBar) / (3 * sigmaWithin);
    const cpl  = (xBar - lsl) / (3 * sigmaWithin);
    const cpk  = Math.min(cpu, cpl);

    let pp = null, ppk = null, ppu = null, ppl = null;
    if (sigmaOverall > 0) {
      pp  = (usl - lsl) / (6 * sigmaOverall);
      ppu = (usl - xBar) / (3 * sigmaOverall);
      ppl = (xBar - lsl) / (3 * sigmaOverall);
      ppk = Math.min(ppu, ppl);
    }

    capability = {
      cp:   round4(cp),
      cpk:  round4(cpk),
      cpu:  round4(cpu),
      cpl:  round4(cpl),
      pp:   pp !== null ? round4(pp) : null,
      ppk:  ppk !== null ? round4(ppk) : null,
      sigma_within:  round6(sigmaWithin),
      sigma_overall: round6(sigmaOverall),
      spec_valid: specValid,
    };
  }

  // ── Run rule violations (Nelson rules 1–4) ────────────────────────
  const violations = detectRunRules(values, xBar, sigmaWithin, uclI, lclI, uclMR, movingRanges);

  // ── Histogram bins ────────────────────────────────────────────────
  const histogram = buildHistogram(values, lsl, usl, 12);

  // ── Annotated individuals (for chart rendering) ───────────────────
  const individuals = values.map((v, i) => ({
    idx: i + 1,
    value: round6(v),
    out_of_control: v > uclI || v < lclI,
    out_of_spec: (lsl !== null && v < lsl) || (usl !== null && v > usl),
  }));

  const mrAnnotated = movingRanges.map((mr, i) => ({
    idx: i + 2,  // MR_i corresponds to measurement i+2
    mr_value: round6(mr),
    out_of_control: mr > uclMR,
  }));

  return {
    n,
    x_bar:         round6(xBar),
    sigma_within:  round6(sigmaWithin),
    sigma_overall: round6(sigmaOverall),
    mr_bar:        round6(mrBar),
    // Individuals chart limits
    ucl_i:  round6(uclI),
    lcl_i:  round6(lclI),
    // Moving range chart limits
    ucl_mr: round6(uclMR),
    lcl_mr: lclMR,
    // Annotated data
    individuals,
    moving_ranges: mrAnnotated,
    // Capability
    capability,
    spec_valid: specValid,
    // Run rules
    violations,
    // Histogram
    histogram,
  };
}

/**
 * Nelson run rules 1–4 applied to the individuals chart.
 */
function detectRunRules(values, xBar, sigma, uclI, lclI, uclMR, movingRanges) {
  const violations = [];

  // Rule 1: Any point beyond UCL or LCL
  const r1 = values.reduce((acc, v, i) => {
    if (v > uclI || v < lclI) acc.push(i + 1);
    return acc;
  }, []);
  if (r1.length) violations.push({ rule: 1, description: 'Point beyond 3σ control limit', indices: r1 });

  // Rule 2: 9+ consecutive points same side of center line
  const r2 = [];
  let runStart = 0, runSide = values[0] >= xBar ? 1 : -1, runLen = 1;
  for (let i = 1; i < values.length; i++) {
    const side = values[i] >= xBar ? 1 : -1;
    if (side === runSide) {
      runLen++;
      if (runLen === 9) {
        for (let j = runStart; j <= i; j++) r2.push(j + 1);
      } else if (runLen > 9) {
        r2.push(i + 1);
      }
    } else {
      runStart = i; runSide = side; runLen = 1;
    }
  }
  if (r2.length) violations.push({ rule: 2, description: '9+ consecutive points same side of center line', indices: [...new Set(r2)] });

  // Rule 3: 6 consecutive points steadily increasing or decreasing
  const r3 = [];
  for (let i = 5; i < values.length; i++) {
    const seg = values.slice(i - 5, i + 1);
    const allUp   = seg.every((v, j) => j === 0 || v > seg[j - 1]);
    const allDown = seg.every((v, j) => j === 0 || v < seg[j - 1]);
    if (allUp || allDown) {
      for (let j = i - 5; j <= i; j++) r3.push(j + 1);
    }
  }
  if (r3.length) violations.push({ rule: 3, description: '6 consecutive points steadily increasing or decreasing', indices: [...new Set(r3)] });

  // Rule 4: 14 consecutive alternating up/down
  const r4 = [];
  for (let i = 13; i < values.length; i++) {
    const seg = values.slice(i - 13, i + 1);
    const alternating = seg.every((v, j) => {
      if (j === 0) return true;
      const up = v > seg[j - 1];
      return j % 2 === 1 ? up : !up;
    });
    if (alternating) {
      for (let j = i - 13; j <= i; j++) r4.push(j + 1);
    }
  }
  if (r4.length) violations.push({ rule: 4, description: '14 consecutive points alternating up/down', indices: [...new Set(r4)] });

  return violations;
}

/**
 * Build histogram bins for distribution chart.
 */
function buildHistogram(values, lsl, usl, numBins = 12) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ bin_center: min, bin_start: min, bin_end: max, count: values.length, in_spec: true }];

  // Extend range slightly so min/max fall inside bins
  const range = max - min;
  const binWidth = range / numBins;
  const start = min - binWidth * 0.1;

  const bins = Array.from({ length: numBins }, (_, i) => ({
    bin_start:  round6(start + i * binWidth),
    bin_end:    round6(start + (i + 1) * binWidth),
    bin_center: round6(start + (i + 0.5) * binWidth),
    count: 0,
    in_spec: true,
  }));

  values.forEach(v => {
    const idx = Math.min(Math.floor((v - start) / binWidth), numBins - 1);
    if (idx >= 0 && idx < numBins) {
      bins[idx].count++;
      if ((lsl !== null && bins[idx].bin_center < lsl) || (usl !== null && bins[idx].bin_center > usl)) {
        bins[idx].in_spec = false;
      }
    }
  });

  return bins.filter(b => b.count > 0);
}

/**
 * Compute normal distribution PDF value (for histogram overlay).
 */
function normalPDF(x, mean, sigma) {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2));
}

function round4(v) { return Math.round(v * 10000) / 10000; }
function round6(v) { return Math.round(v * 1000000) / 1000000; }

module.exports = { computeSPC, normalPDF };
