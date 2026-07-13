const { TestEntry, TestSession, TestDefinition, TestCategory, TestEntryMetadata, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const multer = require('multer');
const pdf = require('pdf-parse');

// In-memory multer for PDF uploads (no disk writes)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadMiddleware = upload.single('pdf');

/**
 * Parse peel strength PDF text into structured rows.
 * Handles both Card Center (>= 3.5 N/cm) and Card Edge (>= 5 N/cm) tables.
 */
function parsePeelText(rawText) {
  // pdf-parse may insert spaces around decimal points — normalise first
  const text = rawText
    .replace(/(\d)\s+\./g, '$1.')
    .replace(/\.\s+(\d)/g, '.$1');

  // QCard Force Gauge PDF exports tokens with NO separators between fields.
  // All numeric values have exactly 2 decimal places (e.g. 10.63, 5.60).
  // Using \d{1,2}\.\d{2} makes the split unambiguous without backtracking issues.
  // Non-greedy H_\d+? expands minimally until the rest of the pattern can match,
  // correctly handling both single-digit (H_1) and multi-digit (H_10) section IDs.
  //
  // Center: H_N avgPeel maxPeel location Front|Back L-->R|R-->L YES|NO minPeel PASS|FAIL
  const centerRegex = /(H_\d+?)(\d{1,2}\.\d{2})(\d{1,2}\.\d{2})(\d{1,2}\.\d{2})(Front|Back)(L-->R|R-->L)(YES|NO)(\d{1,2}\.\d{2})(PASS|FAIL)/gi;
  // Edge: same layout but without the Tearing column (YES|NO)
  const edgeRegex = /(H_\d+?)(\d{1,2}\.\d{2})(\d{1,2}\.\d{2})(\d{1,2}\.\d{2})(Front|Back)(L-->R|R-->L)(\d{1,2}\.\d{2})(PASS|FAIL)/gi;

  const centerRows = [];
  const edgeRows = [];
  let m;

  while ((m = centerRegex.exec(text)) !== null) {
    centerRows.push({
      sectionId: m[1],
      avgPeel: parseFloat(m[2]),
      maxPeel: parseFloat(m[3]),
      frontBack: m[5],
      direction: m[6],
      tearing: m[7],
      minPeel: parseFloat(m[8]),
      passFail: m[9],
      sectionType: 'Center',
    });
  }

  // Edge regex would also match center rows (since YES/NO blocks it) - safe to run on full text
  while ((m = edgeRegex.exec(text)) !== null) {
    // Skip section IDs already captured as center rows
    const alreadyCenter = centerRows.some(r => {
      // Check if this match position overlaps a center match by comparing sectionId + values
      return r.sectionId === m[1] && r.maxPeel === parseFloat(m[3]) && r.minPeel === parseFloat(m[7]);
    });
    if (!alreadyCenter) {
      edgeRows.push({
        sectionId: m[1],
        avgPeel: parseFloat(m[2]),
        maxPeel: parseFloat(m[3]),
        frontBack: m[5],
        direction: m[6],
        minPeel: parseFloat(m[7]),
        passFail: m[8],
        sectionType: 'Edge',
      });
    }
  }

  const jobId = rawText.match(/Job\s+ID[:\s]+(\S+)/i)?.[1]?.trim() ?? null;

  return { centerRows, edgeRows, jobId };
}

/**
 * Parse a peel strength PDF and return structured row data
 * POST /api/test-entries/parse-peel-pdf
 */
exports.parsePeelPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const data = await pdf(req.file.buffer);
    const { centerRows, edgeRows } = parsePeelText(data.text);

    res.json({
      success: true,
      data: { centerRows, edgeRows, rawText: data.text },
    });
  } catch (error) {
    logger.error('Error parsing peel PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to parse PDF', error: error.message });
  }
};

/**
 * Parse SmartQC individual-card report PDF text.
 * Format: single card, fields like "PICC tested number", "Chip answer", etc.
 */
function parseSmartQcText(text) {
  const t = text.replace(/\s+/g, ' ').trim();

  const num = (pattern) => {
    const m = t.match(pattern);
    const v = parseFloat(m?.[1] ?? '');
    return isNaN(v) ? null : v;
  };
  const str = (pattern) => t.match(pattern)?.[1]?.trim() ?? null;

  return {
    piccNumber:            parseInt(str(/PICC tested number\s*:\s*(\d+)/i) ?? '1'),
    resonanceFrequencyMHz: num(/Resonance frequency\s+([\d.]+)\s*MHz/i),
    qFactor:               num(/Q-Factor\s+(\d+(?:\.\d+)?)/i),
    readingPowerV:         num(/Reading power\s+([\d.]+)\s*V/i),
    chipAnswer:            str(/Chip answer\s+((?:[0-9A-Fa-f]{2}\s*){4,})/i),
    testerSerial:          str(/Tester Serial Number[^:]*:\s*(UC#[^\n]+?)(?:\s{2,}|\s*Software|\s*Firmware)/i),
    softwareVersion:       str(/Software version\s+(SmartQC[\s\d.]+)/i),
    firmwareVersion:       str(/Firmware version\s+([\w][\w\s.]+?)(?:\s{2,}|\s*VNA|\s*Hardware)/i),
    vnaPowerDbm:           num(/VNA power value\s+(-?[\d.]+)\s*dBm/i),
    freqMinKhz:            num(/Freq Min \(kHz\)\s+(\d+)/i),
    freqMaxKhz:            num(/Freq Max \(kHz\)\s+(\d+)/i),
    freqStepKhz:           num(/Freq Step \(kHz\)\s+(\d+)/i),
    testDate:              str(/(\d{4}\/\d{2}\/\d{2})/),
  };
}

/**
 * Parse a SmartQC "Profile Cards List" (batch) PDF.
 * Captures only: profile name + per-card measurements (Card#, Resonance MHz, Q-Factor, Power V).
 * Test conditions and hardware configuration are intentionally ignored.
 */
function parseProfileCardsListText(text) {
  // ── Profile name ─────────────────────────────────────────────────────────────
  const profileName = text.match(/Profile name[:\s]+(.+)/i)?.[1]?.trim() ?? null;

  // ── Card count ────────────────────────────────────────────────────────────────
  const countMatch = text.match(/Number of cards\s*[:\s]*(\d+)/i);
  const N = countMatch ? parseInt(countMatch[1]) : null;
  if (!N) return { profileName, cards: [], totalCards: 0 };

  // ── Data section: from first timestamp to "Number of cards" ──────────────────
  // pdf-parse may read the table in row order OR column order, and frequently
  // stores table cells as separate text objects — so "13.880" can arrive as
  // "13 .880" and "7.7" as "7 .7". We normalise decimal spacing first.
  const firstTsMatch = text.match(/20\d{2}\/\d{2}\/\d{2}/);
  if (!firstTsMatch) return { profileName, cards: [], totalCards: 0 };

  const rawData = text.slice(firstTsMatch.index, text.indexOf(countMatch[0]));

  // Normalise: collapse whitespace that pdf-parse inserts around decimal points
  // "13 .880" → "13.880",  "7 .7" → "7.7",  "13. 880" → "13.880"
  const dataSection = rawData
    .replace(/(\d)\s+\./g, '$1.')
    .replace(/\.\s+(\d)/g, '.$1');

  // Extract timestamps separately (used for the timestamp field on each card)
  const tsMatches = [...dataSection.matchAll(/(20\d{2}\/\d{2}\/\d{2}[\s\S]{0,4}\d{2}:\d{2}:\d{2})/g)]
    .slice(0, N)
    .map(m => m[1].replace(/\s+/g, ' ').trim());

  // ── Strategy 1a: Concatenated values (no spaces between columns) ──────────
  // pdf-parse sometimes joins table cells with no separator, producing strings like:
  //   "13.880137.7" = resonance "13.880" + Q-Factor "13" + power "7.7"
  // We match this compact triple directly.
  const concatRegex = /(1[0-9]\.\d{3})(\d{1,3})(\d{1,2}\.\d)/g;
  const concatMatches = [...dataSection.matchAll(concatRegex)];

  if (concatMatches.length === N) {
    const cards = concatMatches.map((m, i) => ({
      cardNumber:            i + 1,
      timestamp:             tsMatches[i] ?? null,
      resonanceFrequencyMHz: parseFloat(m[1]),
      qFactor:               parseInt(m[2]),
      readingPowerV:         parseFloat(m[3]),
    }));
    return { profileName, cards, totalCards: cards.length };
  }

  // ── Strategy 1b: Space-separated row order ────────────────────────────────
  // Some PDFs output values with spaces:  "13.880  13  7.7"
  const tripleRegex = /(1[0-9]\.\d{2,4})\s+(\d{1,3})\s+(\d{1,2}\.\d{1,2})/g;
  const tripleMatches = [...dataSection.matchAll(tripleRegex)];

  if (tripleMatches.length === N) {
    const cards = tripleMatches.map((m, i) => ({
      cardNumber:            i + 1,
      timestamp:             tsMatches[i] ?? null,
      resonanceFrequencyMHz: parseFloat(m[1]),
      qFactor:               parseInt(m[2]),
      readingPowerV:         parseFloat(m[3]),
    }));
    return { profileName, cards, totalCards: cards.length };
  }

  // ── Strategy 2: Field-based extraction (column-by-column PDF reading) ────────
  // When pdf-parse reads column-by-column, all timestamps come together, then all
  // resonances, then all Q-Factors, then all powers — no card number contamination.

  // Extract N timestamps
  const timestamps = [...dataSection.matchAll(/(20\d{2}\/\d{2}\/\d{2}[\s\S]{0,4}\d{2}:\d{2}:\d{2})/g)]
    .slice(0, N)
    .map(m => m[1].replace(/\s+/g, ' ').trim());

  // Extract N resonance frequencies (NFC carrier: 13.xxx or 14.xxx MHz)
  const resonances = [...dataSection.matchAll(/\b(1[0-9]\.\d{2,4})\b/g)]
    .slice(0, N)
    .map(m => parseFloat(m[1]));

  // Strip timestamps and resonances to isolate Q-Factor / Power
  let stripped = dataSection;
  stripped = stripped.replace(/(20\d{2}\/\d{2}\/\d{2}[\s\S]{0,4}\d{2}:\d{2}:\d{2})/g, ' ');
  stripped = stripped.replace(/\b1[0-9]\.\d{2,4}\b/g, ' ');

  // Power readings: decimal values in a reasonable voltage range (e.g. 7.7, 8.1)
  const powers = [...stripped.matchAll(/\b(\d{1,2}\.\d{1,2})\b/g)]
    .map(m => parseFloat(m[1]))
    .filter(v => v >= 1 && v <= 20)
    .slice(0, N);

  // Q-Factors: integers remaining after removing power decimals
  const noDecimals = stripped.replace(/\b\d{1,2}\.\d{1,2}\b/g, ' ');
  const qFactors = [...noDecimals.matchAll(/\b(\d{1,3})\b/g)]
    .map(m => parseInt(m[1]))
    .filter(v => v >= 1 && v <= 999)
    .slice(0, N);

  // Build cards
  const cards = [];
  for (let i = 0; i < N; i++) {
    if (!timestamps[i]) break;
    cards.push({
      cardNumber:            i + 1,
      timestamp:             timestamps[i],
      resonanceFrequencyMHz: resonances[i] ?? null,
      qFactor:               qFactors[i] ?? null,
      readingPowerV:         powers[i] ?? null,
    });
  }

  return { profileName, cards, totalCards: cards.length };
}

/**
 * Parse an Imada peel-strength (laminate adhesion) PDF.
 * Expects rows like:  01  0.42  0.39  PASS
 * The two numeric values are P1 and P2 in N/mm.
 */
function parseLaminatePeelText(text) {
  const MIN_FORCE = 0.05;  // below this → header / noise
  const MAX_FORCE = 10.0;  // above this → not a peel force value

  // Match lines that contain two decimal numbers in the peel-force range.
  // Optionally prefixed by a row number / "Card" / "Sample", optionally followed by PASS/FAIL.
  const rowRegex = /^(?:(?:Card|Sample)?\s*\d+)?\s*(0?\.\d+|\d+\.\d+)\s+(0?\.\d+|\d+\.\d+)(?:\s+(PASS|FAIL))?/i;

  const rows = [];
  let cardNumber = 1;

  for (const raw of text.split(/\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const m = rowRegex.exec(line);
    if (!m) continue;

    const p1 = parseFloat(m[1]);
    const p2 = parseFloat(m[2]);
    if (p1 < MIN_FORCE || p1 > MAX_FORCE || p2 < MIN_FORCE || p2 > MAX_FORCE) continue;

    const explicitPass = m[3] ? m[3].toUpperCase() === 'PASS' : null;
    const pass = explicitPass !== null ? explicitPass : (p1 >= 0.35 && p2 >= 0.35);

    rows.push({ cardNumber: cardNumber++, p1, p2, pass });
  }

  return rows;
}

/**
 * Parse an Imada laminate-peel PDF and return P1/P2 per card
 * POST /api/test-entries/parse-laminate-peel-pdf
 */
exports.parseLaminatePeelPdf = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    const data = await pdf(req.file.buffer);
    const rows = parseLaminatePeelText(data.text);
    res.json({ success: true, data: { rows, rawText: data.text } });
  } catch (error) {
    logger.error('Error parsing laminate peel PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to parse PDF', error: error.message });
  }
};

/**
 * Parse a SmartQC PDF — auto-detects format:
 *   "PROFILE CARDS LIST" → batch report (all cards in one PDF)
 *   Otherwise            → individual card report
 * POST /api/test-entries/parse-smartqc-pdf
 * Response: { success, format: 'profile-cards-list' | 'single-card', data }
 */
exports.parseSmartQcPdf = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    const { text } = await pdf(req.file.buffer);

    if (/PROFILE[\s\S]{0,5}CARDS[\s\S]{0,5}LIST/i.test(text)) {
      const data = parseProfileCardsListText(text);
      return res.json({ success: true, format: 'profile-cards-list', data });
    }

    const data = parseSmartQcText(text);
    return res.json({ success: true, format: 'single-card', data });
  } catch (error) {
    logger.error('Error parsing SmartQC PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to parse SmartQC PDF', error: error.message });
  }
};

/**
 * Create or update a test entry
 * POST /api/test-entries
 */
exports.createOrUpdateEntry = async (req, res) => {
  try {
    const {
      sessionId,
      testDefinitionId,
      measurementValue,
      assessmentValue,
      passStatus,
      multiValueNotes,
      notes,
      retestRequired
    } = req.body;

    // Verify session exists and is editable
    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only add entries to draft sessions'
      });
    }

    // Auto-derive pass_status from acceptable range if not explicitly provided
    let resolvedPassStatus = passStatus ?? null;
    if ((resolvedPassStatus === null || resolvedPassStatus === undefined) && typeof measurementValue === 'number') {
      const def = await TestDefinition.findByPk(testDefinitionId, { attributes: ['min_acceptable_value', 'max_acceptable_value'] });
      if (def) {
        const hasMin = def.min_acceptable_value !== null && def.min_acceptable_value !== undefined;
        const hasMax = def.max_acceptable_value !== null && def.max_acceptable_value !== undefined;
        if (hasMin || hasMax) {
          const aboveMin = hasMin ? measurementValue >= parseFloat(def.min_acceptable_value) : true;
          const belowMax = hasMax ? measurementValue <= parseFloat(def.max_acceptable_value) : true;
          resolvedPassStatus = aboveMin && belowMax;
        }
      }
    }

    // Upsert the entry
    const [entry, created] = await TestEntry.upsert({
      session_id: sessionId,
      test_definition_id: testDefinitionId,
      measurement_value: measurementValue,
      assessment_value: assessmentValue,
      pass_status: resolvedPassStatus,
      multi_value_notes: multiValueNotes,
      notes,
      retest_required: retestRequired || false
    }, {
      returning: true
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: entry,
      message: created ? 'Test entry created' : 'Test entry updated'
    });
  } catch (error) {
    logger.error('Error creating/updating test entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test entry',
      error: error.message
    });
  }
};

/**
 * Bulk save test entries for a session
 * POST /api/test-entries/bulk
 */
exports.bulkSaveEntries = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { sessionId, entries, partial } = req.body;

    // Verify session exists and is editable
    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Can only add entries to draft sessions'
      });
    }

    const defIds = [...new Set(entries.map(e => e.testDefinitionId).filter(Boolean))];

    // Delete-then-reinsert makes the save idempotent. Full mode (the session
    // hub, which always sends the complete session) clears every entry.
    // partial: true (per-test save on TestEntryPage) clears only the entries
    // of the definitions being saved, so sibling tests' data survives.
    await TestEntry.destroy({
      where: partial
        ? { session_id: sessionId, test_definition_id: defIds }
        : { session_id: sessionId },
      transaction,
    });
    const defs = defIds.length > 0
      ? await TestDefinition.findAll({ where: { id: defIds }, attributes: ['id', 'min_acceptable_value', 'max_acceptable_value'], transaction })
      : [];
    const defMap = new Map(defs.map(d => [d.id, d]));

    // Insert all entries fresh
    const results = await TestEntry.bulkCreate(
      entries.map(entry => {
        let passStatus = entry.passStatus ?? null;
        // If no explicit pass/fail was provided but a numeric measurement exists,
        // derive it automatically from the test definition's acceptable range.
        if (passStatus === null || passStatus === undefined) {
          const def = defMap.get(entry.testDefinitionId);
          const val = typeof entry.measurementValue === 'number' ? entry.measurementValue : null;
          if (def && val !== null) {
            const hasMin = def.min_acceptable_value !== null && def.min_acceptable_value !== undefined;
            const hasMax = def.max_acceptable_value !== null && def.max_acceptable_value !== undefined;
            if (hasMin || hasMax) {
              const aboveMin = hasMin ? val >= parseFloat(def.min_acceptable_value) : true;
              const belowMax = hasMax ? val <= parseFloat(def.max_acceptable_value) : true;
              passStatus = aboveMin && belowMax;
            }
          }
        }
        return {
          session_id: sessionId,
          test_definition_id: entry.testDefinitionId,
          sample_card_id: entry.sampleCardId || null,
          measurement_value: entry.measurementValue,
          secondary_measurement_value: entry.secondaryMeasurementValue ?? null,
          assessment_value: entry.assessmentValue,
          pass_status: passStatus,
          multi_value_notes: entry.multiValueNotes,
          notes: entry.notes,
          retest_required: entry.retestRequired || false,
        };
      }),
      { transaction }
    );

    await transaction.commit();

    // Get updated stats
    const allEntries = await TestEntry.findAll({
      where: { session_id: sessionId }
    });

    const totalTests = allEntries.length;
    const passedTests = allEntries.filter(e => e.pass_status === true).length;
    const failedTests = allEntries.filter(e => e.pass_status === false).length;

    res.json({
      success: true,
      data: {
        savedCount: results.length,
        totalTests,
        passedTests,
        failedTests,
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      message: `${results.length} test entries saved successfully`
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error bulk saving test entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test entries',
      error: error.message
    });
  }
};

/**
 * Get all entries for a session
 * GET /api/test-entries/session/:sessionId
 */
exports.getEntriesBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const entries = await TestEntry.findAll({
      where: { session_id: sessionId },
      include: [{
        model: TestDefinition,
        as: 'definition',
        include: [{
          model: TestCategory,
          as: 'category'
        }]
      }],
      order: [[{ model: TestDefinition, as: 'definition' }, 'id', 'ASC']]
    });

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    logger.error('Error fetching test entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test entries',
      error: error.message
    });
  }
};

/**
 * Delete a test entry
 * DELETE /api/test-entries/:id
 */
exports.deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await TestEntry.findByPk(id, {
      include: [{
        model: TestSession,
        as: 'session'
      }]
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Test entry not found'
      });
    }

    if (entry.session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete entries from draft sessions'
      });
    }

    await entry.destroy();

    res.json({
      success: true,
      message: 'Test entry deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting test entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test entry',
      error: error.message
    });
  }
};

/**
 * Upsert test-level metadata (header fields for specialized forms like warpage)
 * POST /api/test-entries/metadata
 */
exports.upsertEntryMetadata = async (req, res) => {
  try {
    const { sessionId, testDefinitionId, metadata } = req.body;

    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Test session not found' });
    }
    if (session.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Can only edit metadata on draft sessions' });
    }

    const values = {
      sampled_by:              metadata.sampledBy ?? null,
      technician:              metadata.technician ?? null,
      test_time:               metadata.testTime ?? null,
      temperature_c:           metadata.temperatureC ?? null,
      temperature_f:           metadata.temperatureF ?? null,
      humidity_pct:            metadata.humidityPct ?? null,
      calibration_verified:    metadata.calibrationVerified ?? null,
      calibration_valid_until: metadata.calibrationValidUntil ?? null,
      env_logger_id:           metadata.envLoggerId ?? null,
      cal_valid_until:         metadata.calValidUntil ?? null,
      sample_preconditioned:   metadata.samplePreconditioned ?? null,
      job_notes:               metadata.jobNotes ?? null,
      extra_data:              metadata.extraData ?? null,
    };

    const [record, created] = await TestEntryMetadata.findOrCreate({
      where: { session_id: sessionId, test_definition_id: testDefinitionId },
      defaults: values,
    });

    if (!created) {
      await record.update(values);
    }

    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('Error upserting entry metadata:', error);
    res.status(500).json({ success: false, message: 'Failed to save metadata', error: error.message });
  }
};

/**
 * Store rendered PDF page images for a test entry (OverlayPeel)
 * POST /api/test-entries/metadata/pdf-pages
 */
exports.storePdfPages = async (req, res) => {
  try {
    const { sessionId, testDefinitionId, pages } = req.body;

    if (!Array.isArray(pages)) {
      return res.status(400).json({ success: false, message: 'pages must be an array' });
    }

    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Test session not found' });
    }
    if (session.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Can only update metadata on draft sessions' });
    }

    const [record, created] = await TestEntryMetadata.findOrCreate({
      where: { session_id: sessionId, test_definition_id: testDefinitionId },
      defaults: { pdf_pages: pages },
    });
    if (!created) {
      await record.update({ pdf_pages: pages });
    }

    res.json({ success: true, message: `${pages.length} page(s) stored` });
  } catch (error) {
    logger.error('Error storing PDF pages:', error);
    res.status(500).json({ success: false, message: 'Failed to store PDF pages', error: error.message });
  }
};

/**
 * Get test-level metadata for a specific session + test definition
 * GET /api/test-entries/metadata/:sessionId/:testDefinitionId
 */
exports.getEntryMetadata = async (req, res) => {
  try {
    const { sessionId, testDefinitionId } = req.params;
    const record = await TestEntryMetadata.findOne({
      where: { session_id: sessionId, test_definition_id: testDefinitionId }
    });
    res.json({ success: true, data: record || null });
  } catch (error) {
    logger.error('Error fetching entry metadata:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch metadata', error: error.message });
  }
};

/**
 * Get specializedMetadata from the most recently submitted entry for a test code
 * GET /api/test-entries/metadata/last?testCode=:code
 */
exports.getLastEntryMetadata = async (req, res) => {
  try {
    const { testCode } = req.query;
    if (!testCode) {
      return res.status(400).json({ success: false, message: 'testCode query param required' });
    }

    const record = await TestEntryMetadata.findOne({
      attributes: { exclude: ['pdf_pages'] },
      include: [
        {
          model: TestSession,
          as: 'session',
          where: { status: { [Op.in]: ['submitted', 'approved'] } },
          attributes: ['id', 'test_date', 'session_number'],
          required: true,
        },
        {
          model: TestDefinition,
          as: 'definition',
          where: { test_id: testCode },
          attributes: [],
          required: true,
        },
      ],
      order: [
        [{ model: TestSession, as: 'session' }, 'test_date', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });

    if (!record) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        metadata: {
          sampledBy: record.sampled_by ?? undefined,
          technician: record.technician ?? undefined,
          testTime: record.test_time ?? undefined,
          temperatureC: record.temperature_c ?? undefined,
          temperatureF: record.temperature_f ?? undefined,
          humidityPct: record.humidity_pct ?? undefined,
          calibrationVerified: record.calibration_verified ?? undefined,
          samplePreconditioned: record.sample_preconditioned ?? undefined,
          jobNotes: record.job_notes ?? undefined,
          extraData: record.extra_data ?? undefined,
        },
        sessionDate: record.session.test_date,
        sessionNumber: record.session.session_number,
      },
    });
  } catch (error) {
    logger.error('Error fetching last entry metadata:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch last metadata', error: error.message });
  }
};
