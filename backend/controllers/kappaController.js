'use strict';

const { KappaStudy, KappaRating, User, TestDefinition, TestCategory, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const kappaService = require('../services/kappaService');

// ── helpers ───────────────────────────────────────────────────────────────────

/** Standard user attributes to include in joins */
const USER_ATTRS = ['id', 'first_name', 'last_name', 'email'];

/** Flatten first_name + last_name → name */
function toName(u) {
  if (!u) return null;
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || `User ${u.id}`;
}

/** Resolve the list of appraisers for a study from kappa_study_appraisers join table */
async function getStudyAppraisers(studyId) {
  const rows = await sequelize.query(
    `SELECT u.id, u.first_name, u.last_name, u.email
     FROM kappa_study_appraisers ksa
     JOIN users u ON u.id = ksa.appraiser_id
     WHERE ksa.study_id = :studyId`,
    { replacements: { studyId }, type: sequelize.QueryTypes.SELECT }
  );
  return rows.map(u => ({ ...u, name: toName(u) }));
}

/** Upsert appraiser list for a study */
async function syncAppraisers(studyId, appraiserIds, transaction) {
  // Delete removed
  await sequelize.query(
    `DELETE FROM kappa_study_appraisers WHERE study_id = :studyId`,
    { replacements: { studyId }, transaction }
  );
  if (!appraiserIds || appraiserIds.length === 0) return;
  const vals = appraiserIds.map(aid => `(${studyId}, ${parseInt(aid, 10)})`).join(', ');
  await sequelize.query(
    `INSERT INTO kappa_study_appraisers (study_id, appraiser_id) VALUES ${vals} ON CONFLICT DO NOTHING`,
    { transaction }
  );
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/kappa-studies
 * List all studies (summary only — no computed results).
 */
exports.listStudies = async (req, res) => {
  try {
    const studies = await KappaStudy.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: USER_ATTRS },
        { model: TestDefinition, as: 'testDefinition', attributes: ['id', 'test_name', 'test_id'] },
        { model: TestCategory, as: 'category', attributes: ['id', 'name', 'category_code'] },
      ],
    });

    // Attach appraiser counts + worst κ summary (cheap, uses stored ratings)
    const result = await Promise.all(studies.map(async (s) => {
      const plain = s.toJSON();
      const appraisers = await getStudyAppraisers(s.id);
      plain.appraiser_count = appraisers.length;
      plain.creator_name = toName(plain.creator);

      // Quick κ summary if study is complete
      if (s.status === 'complete') {
        const ratings = await KappaRating.findAll({ where: { study_id: s.id }, raw: true });
        if (ratings.length > 0 && appraisers.length > 0) {
          const computed = kappaService.computeStudyResults(s, ratings, appraisers);
          const withinKappas = computed.perAppraiser.map(a => a.withinKappa).filter(k => k !== null);
          const worstKappa = withinKappas.length > 0 ? Math.min(...withinKappas) : null;
          plain.worst_within_kappa = worstKappa;
          plain.fleiss_kappa = computed.betweenAppraisers.fleissKappa;
          plain.overall_passed = computed.gate.overallPassed;
        }
      }
      return plain;
    }));

    res.json({ studies: result });
  } catch (err) {
    logger.error('listStudies error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/kappa-studies
 * Create a new study.
 */
exports.createStudy = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      study_name, test_definition_id, category_id, card_type,
      sample_count, trial_count, attribute_type, attribute_options,
      reference_type, reference_data, master_appraiser_id,
      notes, appraiser_ids,
    } = req.body;

    const study = await KappaStudy.create({
      study_name,
      test_definition_id: test_definition_id || null,
      category_id: category_id || null,
      card_type: card_type || null,
      sample_count: parseInt(sample_count, 10),
      trial_count: parseInt(trial_count || 2, 10),
      attribute_type: attribute_type || 'passfail',
      attribute_options: attribute_options || ['Pass', 'Fail'],
      reference_type: reference_type || 'predefined',
      reference_data: reference_data || null,
      master_appraiser_id: master_appraiser_id || null,
      notes: notes || null,
      created_by: req.user?.id || null,
    }, { transaction: t });

    if (appraiser_ids && appraiser_ids.length > 0) {
      await syncAppraisers(study.id, appraiser_ids, t);
    }

    await t.commit();

    const appraisers = await getStudyAppraisers(study.id);
    res.status(201).json({ study: { ...study.toJSON(), appraisers } });
  } catch (err) {
    await t.rollback();
    logger.error('createStudy error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/kappa-studies/:id
 * Full study detail including appraiser list and all ratings.
 */
exports.getStudy = async (req, res) => {
  try {
    const study = await KappaStudy.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: USER_ATTRS },
        { model: User, as: 'masterAppraiser', attributes: USER_ATTRS },
        { model: TestDefinition, as: 'testDefinition', attributes: ['id', 'test_name', 'test_id'] },
        { model: TestCategory, as: 'category', attributes: ['id', 'name', 'category_code'] },
      ],
    });
    if (!study) return res.status(404).json({ error: 'Study not found' });

    const appraisers = await getStudyAppraisers(study.id);
    const ratings = await KappaRating.findAll({
      where: { study_id: study.id },
      include: [{ model: User, as: 'appraiser', attributes: USER_ATTRS }],
      order: [['appraiser_id', 'ASC'], ['sample_number', 'ASC'], ['trial_number', 'ASC']],
    });

    const plain = study.toJSON();
    plain.appraisers = appraisers;
    plain.ratings = ratings.map(r => ({
      ...r.toJSON(),
      appraiser_name: toName(r.appraiser),
    }));

    res.json({ study: plain });
  } catch (err) {
    logger.error('getStudy error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/kappa-studies/:id
 * Update study metadata, reference data, or status.
 */
exports.updateStudy = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const study = await KappaStudy.findByPk(req.params.id, { transaction: t });
    if (!study) { await t.rollback(); return res.status(404).json({ error: 'Study not found' }); }

    const allowed = [
      'study_name', 'card_type', 'notes', 'status',
      'reference_data', 'reference_type', 'master_appraiser_id',
      'attribute_options',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) study[key] = req.body[key];
    }
    await study.save({ transaction: t });

    if (req.body.appraiser_ids !== undefined) {
      await syncAppraisers(study.id, req.body.appraiser_ids, t);
    }

    await t.commit();
    const appraisers = await getStudyAppraisers(study.id);
    res.json({ study: { ...study.toJSON(), appraisers } });
  } catch (err) {
    await t.rollback();
    logger.error('updateStudy error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/kappa-studies/:id
 */
exports.deleteStudy = async (req, res) => {
  try {
    const study = await KappaStudy.findByPk(req.params.id);
    if (!study) return res.status(404).json({ error: 'Study not found' });
    await study.destroy();
    res.json({ message: 'Study deleted' });
  } catch (err) {
    logger.error('deleteStudy error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/kappa-studies/:id/ratings
 * Bulk upsert ratings for ONE appraiser.
 * Body: { appraiser_id, ratings: [{ sample_number, trial_number, rating }] }
 */
exports.submitRatings = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const study = await KappaStudy.findByPk(req.params.id, { transaction: t });
    if (!study) { await t.rollback(); return res.status(404).json({ error: 'Study not found' }); }
    if (study.status === 'complete') {
      await t.rollback();
      return res.status(400).json({ error: 'Study is already complete — ratings are frozen' });
    }

    const { appraiser_id, ratings } = req.body;
    if (!appraiser_id || !Array.isArray(ratings)) {
      await t.rollback();
      return res.status(400).json({ error: 'appraiser_id and ratings[] are required' });
    }

    const categories = Array.isArray(study.attribute_options)
      ? study.attribute_options
      : JSON.parse(study.attribute_options);

    // Validate all ratings before writing any
    for (const r of ratings) {
      if (!categories.includes(r.rating)) {
        await t.rollback();
        return res.status(400).json({
          error: `Invalid rating "${r.rating}" — must be one of: ${categories.join(', ')}`,
        });
      }
    }

    // Upsert each rating
    for (const r of ratings) {
      await KappaRating.upsert({
        study_id: parseInt(req.params.id, 10),
        appraiser_id: parseInt(appraiser_id, 10),
        sample_number: parseInt(r.sample_number, 10),
        trial_number: parseInt(r.trial_number || 1, 10),
        rating: r.rating,
      }, { transaction: t, conflictFields: ['study_id', 'appraiser_id', 'sample_number', 'trial_number'] });
    }

    await t.commit();
    res.json({ saved: ratings.length });
  } catch (err) {
    await t.rollback();
    logger.error('submitRatings error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/kappa-studies/:id/ratings
 * All raw ratings for a study.
 */
exports.getRatings = async (req, res) => {
  try {
    const ratings = await KappaRating.findAll({
      where: { study_id: req.params.id },
      include: [{ model: User, as: 'appraiser', attributes: USER_ATTRS }],
      order: [['appraiser_id', 'ASC'], ['sample_number', 'ASC'], ['trial_number', 'ASC']],
    });
    res.json({ ratings: ratings.map(r => ({ ...r.toJSON(), appraiser_name: toName(r.appraiser) })) });
  } catch (err) {
    logger.error('getRatings error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/kappa-studies/:id/results
 * Compute and return κ results. Study must be complete.
 */
exports.getResults = async (req, res) => {
  try {
    const study = await KappaStudy.findByPk(req.params.id);
    if (!study) return res.status(404).json({ error: 'Study not found' });
    if (study.status !== 'complete') {
      return res.status(400).json({ error: 'Results are only available for complete studies' });
    }

    const ratings = await KappaRating.findAll({ where: { study_id: study.id }, raw: true });
    const appraisers = await getStudyAppraisers(study.id);

    const results = kappaService.computeStudyResults(study, ratings, appraisers);
    res.json({ results });
  } catch (err) {
    logger.error('getResults error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/kappa-studies/trend?test_definition_id=X
 * Historical κ trend across completed studies for a given test.
 */
exports.getTrend = async (req, res) => {
  try {
    const { test_definition_id, category_id } = req.query;
    const where = { status: 'complete' };
    if (test_definition_id) where.test_definition_id = parseInt(test_definition_id, 10);
    if (category_id) where.category_id = parseInt(category_id, 10);

    const studies = await KappaStudy.findAll({
      where,
      order: [['created_at', 'ASC']],
      attributes: ['id', 'study_name', 'created_at', 'sample_count', 'trial_count', 'attribute_options', 'reference_data', 'reference_type'],
    });

    const trend = await Promise.all(studies.map(async (s) => {
      const ratings = await KappaRating.findAll({ where: { study_id: s.id }, raw: true });
      const appraisers = await getStudyAppraisers(s.id);
      if (ratings.length === 0 || appraisers.length === 0) return null;
      const computed = kappaService.computeStudyResults(s, ratings, appraisers);
      return {
        study_id: s.id,
        study_name: s.study_name,
        date: s.created_at,
        fleiss_kappa: computed.betweenAppraisers.fleissKappa,
        worst_within_kappa: computed.perAppraiser
          .map(a => a.withinKappa)
          .filter(k => k !== null)
          .reduce((min, k) => Math.min(min, k), Infinity) || null,
        overall_passed: computed.gate.overallPassed,
      };
    }));

    res.json({ trend: trend.filter(Boolean) });
  } catch (err) {
    logger.error('getTrend error', err);
    res.status(500).json({ error: err.message });
  }
};
