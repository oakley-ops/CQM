/**
 * kappaService.js
 * Pure-JS Kappa / Attribute Agreement Analysis computation engine.
 *
 * Implements:
 *   - Cohen's κ  (two-rater agreement, used for within-appraiser + vs-reference)
 *   - Fleiss' κ  (N-rater agreement, used for between-appraiser)
 *   - Confusion matrix (appraiser ratings vs. reference truth)
 *   - Six Sigma MSA gate evaluation (pass threshold κ ≥ 0.75)
 *
 * No external dependencies — only built-in JS.
 */

'use strict';

// Six Sigma MSA pass threshold
const KAPPA_THRESHOLD = 0.75;

/**
 * Interpret a κ value with a label.
 * Based on Landis & Koch (1977) scale, standard in industrial MSA.
 */
function interpretKappa(k) {
  if (k === null || k === undefined || isNaN(k)) return 'N/A';
  if (k < 0)    return 'Poor (worse than chance)';
  if (k < 0.20) return 'Slight';
  if (k < 0.40) return 'Fair';
  if (k < 0.60) return 'Moderate';
  if (k < 0.75) return 'Substantial';
  if (k < 0.90) return 'Near-perfect';
  return 'Perfect';
}

/**
 * Cohen's κ for exactly two rating sequences of equal length.
 * Both arrays must be the same length.
 *
 * @param {string[]} raterA  - ratings from rater A
 * @param {string[]} raterB  - ratings from rater B
 * @param {string[]} categories - all possible category labels
 * @returns {number|null}  κ value, or null if not computable
 */
function cohensKappa(raterA, raterB, categories) {
  const n = raterA.length;
  if (n === 0) return null;

  // Count observed agreements
  let observed = 0;
  for (let i = 0; i < n; i++) {
    if (raterA[i] === raterB[i]) observed++;
  }
  const Po = observed / n;

  // Expected agreement by chance
  let Pe = 0;
  for (const cat of categories) {
    const pA = raterA.filter(r => r === cat).length / n;
    const pB = raterB.filter(r => r === cat).length / n;
    Pe += pA * pB;
  }

  if (Pe === 1) return null; // degenerate case
  return (Po - Pe) / (1 - Pe);
}

/**
 * Fleiss' κ for N raters rating M subjects (each subject rated by all raters).
 *
 * @param {string[][]} ratingMatrix  - ratingMatrix[subject][rater] = category string
 * @param {string[]}   categories   - all possible category labels
 * @returns {number|null}  κ value
 */
function fleissKappa(ratingMatrix, categories) {
  const N = ratingMatrix.length; // subjects
  if (N === 0) return null;
  const n = ratingMatrix[0].length; // raters per subject
  if (n < 2) return null;
  const k = categories.length;
  if (k < 2) return null;

  // p_j: proportion of all ratings in category j
  const totals = {};
  categories.forEach(c => { totals[c] = 0; });
  for (const subject of ratingMatrix) {
    for (const r of subject) {
      if (totals[r] !== undefined) totals[r]++;
    }
  }
  const totalRatings = N * n;

  // P_i: proportion of agreeing pairs for subject i
  let sumPi = 0;
  for (const subject of ratingMatrix) {
    let piSum = 0;
    for (const cat of categories) {
      const nij = subject.filter(r => r === cat).length;
      piSum += nij * (nij - 1);
    }
    sumPi += piSum / (n * (n - 1));
  }
  const Pbar = sumPi / N;

  // Pe_bar: expected agreement
  let Pebar = 0;
  for (const cat of categories) {
    const pj = totals[cat] / totalRatings;
    Pebar += pj * pj;
  }

  if (Pebar === 1) return null;
  return (Pbar - Pebar) / (1 - Pebar);
}

/**
 * Build a confusion matrix between appraiser ratings and reference truth.
 * Returns { matrix, categories } where matrix[row][col] = count,
 * row = appraiser said, col = truth.
 *
 * @param {string[]} appraiserRatings - one rating per sample (flattened across trials by majority)
 * @param {string[]} referenceRatings - reference truth per sample (same order)
 * @param {string[]} categories
 */
function buildConfusionMatrix(appraiserRatings, referenceRatings, categories) {
  const matrix = {};
  for (const r of categories) {
    matrix[r] = {};
    for (const c of categories) matrix[r][c] = 0;
  }

  for (let i = 0; i < appraiserRatings.length; i++) {
    const appR = appraiserRatings[i];
    const refR = referenceRatings[i];
    if (matrix[appR] && matrix[appR][refR] !== undefined) {
      matrix[appR][refR]++;
    }
  }
  return { matrix, categories };
}

/**
 * Modal (most frequent) value in an array. Ties broken by first occurrence.
 */
function mode(arr) {
  const counts = {};
  let best = null;
  let bestCount = 0;
  for (const v of arr) {
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > bestCount) { bestCount = counts[v]; best = v; }
  }
  return best;
}

/**
 * Main computation function.
 *
 * @param {object}   study    - study record (with sample_count, trial_count, attribute_options, reference_data, reference_type)
 * @param {object[]} ratings  - kappa_ratings rows: { appraiser_id, appraiser_name, sample_number, trial_number, rating }
 * @param {object[]} appraisers - appraiser user records: { id, name }
 * @returns {object} full results object
 */
function computeStudyResults(study, ratings, appraisers) {
  const categories = Array.isArray(study.attribute_options)
    ? study.attribute_options
    : JSON.parse(study.attribute_options || '["Pass","Fail"]');

  const sampleCount  = study.sample_count;
  const trialCount   = study.trial_count;
  const hasReference = study.reference_data && Object.keys(study.reference_data).length > 0;

  // reference_data is { "1": "Pass", "2": "Fail", ... }
  const ref = hasReference ? study.reference_data : {};

  // Index ratings by appraiser
  // ratingsMap[appraiser_id][sample_number][trial_number] = rating
  const ratingsMap = {};
  for (const r of ratings) {
    const aid = String(r.appraiser_id);
    if (!ratingsMap[aid]) ratingsMap[aid] = {};
    if (!ratingsMap[aid][r.sample_number]) ratingsMap[aid][r.sample_number] = {};
    ratingsMap[aid][r.sample_number][r.trial_number] = r.rating;
  }

  // ── Per-appraiser metrics ──────────────────────────────────────────────────
  const perAppraiser = [];

  for (const appraiser of appraisers) {
    const aid = String(appraiser.id);
    const aRatings = ratingsMap[aid] || {};

    // Build trial-by-trial arrays for samples that have ≥ 2 trials
    const trial1 = [];
    const trial2 = [];
    const majorityRatings = []; // one per sample (mode across trials)
    const refRatings = [];      // matching reference rating per sample

    let completeSamples = 0;
    let trialAgreements = 0;
    let vsRefAgreements = 0;
    let vsRefSamples = 0;

    for (let s = 1; s <= sampleCount; s++) {
      const sampleData = aRatings[s] || {};
      const trials = [];
      for (let t = 1; t <= trialCount; t++) {
        if (sampleData[t] !== undefined) trials.push(sampleData[t]);
      }

      if (trials.length === 0) continue;
      completeSamples++;

      const maj = mode(trials);
      majorityRatings.push(maj);

      if (trials.length >= 2) {
        trial1.push(trials[0]);
        trial2.push(trials[1]);
        if (trials[0] === trials[1]) trialAgreements++;
      }

      if (hasReference && ref[String(s)] !== undefined) {
        refRatings.push(ref[String(s)]);
        if (maj === ref[String(s)]) vsRefAgreements++;
        vsRefSamples++;
      }
    }

    // Within-appraiser κ (trial 1 vs trial 2)
    const withinKappa = trial1.length >= 2
      ? cohensKappa(trial1, trial2, categories)
      : null;

    // Appraiser vs. reference κ
    const vsReferenceKappa = (hasReference && majorityRatings.length >= 2 && refRatings.length >= 2)
      ? cohensKappa(majorityRatings, refRatings, categories)
      : null;

    const trialAgreementPct = trial1.length > 0 ? (trialAgreements / trial1.length) * 100 : null;
    const effectivePct = vsRefSamples > 0 ? (vsRefAgreements / vsRefSamples) * 100 : null;

    // Confusion matrix (appraiser vs reference)
    const confusion = hasReference && majorityRatings.length > 0
      ? buildConfusionMatrix(majorityRatings, refRatings, categories)
      : null;

    perAppraiser.push({
      userId: appraiser.id,
      name: appraiser.name || appraiser.email || `User ${appraiser.id}`,
      completeSamples,
      withinKappa: withinKappa !== null ? Math.round(withinKappa * 1000) / 1000 : null,
      vsReferenceKappa: vsReferenceKappa !== null ? Math.round(vsReferenceKappa * 1000) / 1000 : null,
      trialAgreementPct: trialAgreementPct !== null ? Math.round(trialAgreementPct * 10) / 10 : null,
      effectivePct: effectivePct !== null ? Math.round(effectivePct * 10) / 10 : null,
      withinInterpretation: interpretKappa(withinKappa),
      vsRefInterpretation: interpretKappa(vsReferenceKappa),
      confusion,
    });
  }

  // ── Between-appraiser (Fleiss' κ) ─────────────────────────────────────────
  // Build rating matrix [sample][appraiser] = majority rating
  const ratingMatrix = [];
  let overallAgreements = 0;

  for (let s = 1; s <= sampleCount; s++) {
    const row = [];
    for (const appraiser of appraisers) {
      const aid = String(appraiser.id);
      const sampleData = (ratingsMap[aid] || {})[s] || {};
      const trials = Object.values(sampleData);
      if (trials.length > 0) row.push(mode(trials));
    }
    if (row.length === appraisers.length) {
      ratingMatrix.push(row);
      // All-agree check
      if (new Set(row).size === 1) overallAgreements++;
    }
  }

  const fleissK = ratingMatrix.length >= 2 && appraisers.length >= 2
    ? fleissKappa(ratingMatrix, categories)
    : null;

  const overallAgreementPct = ratingMatrix.length > 0
    ? Math.round((overallAgreements / ratingMatrix.length) * 1000) / 10
    : null;

  // Pairwise Cohen's κ
  const pairwiseKappa = [];
  for (let i = 0; i < appraisers.length; i++) {
    for (let j = i + 1; j < appraisers.length; j++) {
      const aId = String(appraisers[i].id);
      const bId = String(appraisers[j].id);
      const seqA = [], seqB = [];
      for (let s = 1; s <= sampleCount; s++) {
        const dA = (ratingsMap[aId] || {})[s] || {};
        const dB = (ratingsMap[bId] || {})[s] || {};
        const vA = Object.values(dA);
        const vB = Object.values(dB);
        if (vA.length > 0 && vB.length > 0) {
          seqA.push(mode(vA));
          seqB.push(mode(vB));
        }
      }
      const k = seqA.length >= 2 ? cohensKappa(seqA, seqB, categories) : null;
      pairwiseKappa.push({
        appraiserA: { id: appraisers[i].id, name: appraisers[i].name || appraisers[i].username },
        appraiserB: { id: appraisers[j].id, name: appraisers[j].name || appraisers[j].username },
        kappa: k !== null ? Math.round(k * 1000) / 1000 : null,
        interpretation: interpretKappa(k),
      });
    }
  }

  // ── Gate evaluation ────────────────────────────────────────────────────────
  const withinKappas = perAppraiser.map(a => a.withinKappa).filter(k => k !== null);
  const vsRefKappas  = perAppraiser.map(a => a.vsReferenceKappa).filter(k => k !== null);

  const withinPassed  = withinKappas.length > 0 && withinKappas.every(k => k >= KAPPA_THRESHOLD);
  const betweenPassed = fleissK !== null && fleissK >= KAPPA_THRESHOLD;
  const vsRefPassed   = vsRefKappas.length > 0 && vsRefKappas.every(k => k >= KAPPA_THRESHOLD);
  const overallPassed = withinPassed && betweenPassed && (hasReference ? vsRefPassed : true);

  return {
    perAppraiser,
    betweenAppraisers: {
      fleissKappa: fleissK !== null ? Math.round(fleissK * 1000) / 1000 : null,
      fleissInterpretation: interpretKappa(fleissK),
      pairwiseKappa,
      overallAgreementPct,
      raterCount: appraisers.length,
      evaluatedSamples: ratingMatrix.length,
    },
    gate: {
      threshold: KAPPA_THRESHOLD,
      withinPassed,
      betweenPassed,
      vsRefPassed,
      overallPassed,
      hasReference,
    },
    meta: {
      sampleCount,
      trialCount,
      categories,
      completedBy: perAppraiser.filter(a => a.completeSamples > 0).length,
    },
  };
}

module.exports = {
  computeStudyResults,
  cohensKappa,
  fleissKappa,
  interpretKappa,
  KAPPA_THRESHOLD,
};
