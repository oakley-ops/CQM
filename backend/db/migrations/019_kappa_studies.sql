-- Migration 019: Kappa / Attribute Agreement Analysis (MSA)
-- Supports within-appraiser (repeatability), between-appraiser (reproducibility),
-- and appraiser-vs-reference (accuracy) Kappa studies per Six Sigma MSA standards.

-- ── Studies ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kappa_studies (
  id                   SERIAL PRIMARY KEY,
  study_name           VARCHAR(200)  NOT NULL,
  test_definition_id   INTEGER       REFERENCES test_definitions(id) ON DELETE SET NULL,
  category_id          INTEGER       REFERENCES test_categories(id)  ON DELETE SET NULL,
  card_type            VARCHAR(50),
  sample_count         INTEGER       NOT NULL CHECK (sample_count BETWEEN 1 AND 200),
  trial_count          INTEGER       NOT NULL DEFAULT 2 CHECK (trial_count BETWEEN 1 AND 10),
  -- attribute_type: 'passfail' (binary) or 'categorical' (multi-label)
  attribute_type       VARCHAR(30)   NOT NULL DEFAULT 'passfail'
                         CHECK (attribute_type IN ('passfail', 'categorical')),
  -- JSON array of allowed rating labels, e.g. ["Pass","Fail"] or ["Pass","Fail","Borderline"]
  attribute_options    JSONB         NOT NULL DEFAULT '["Pass","Fail"]',
  -- reference_type: 'predefined' (QA set upfront) | 'master_appraiser' (designated expert)
  reference_type       VARCHAR(30)   NOT NULL DEFAULT 'predefined'
                         CHECK (reference_type IN ('predefined', 'master_appraiser')),
  -- JSON object mapping sample number (string key) → reference rating
  -- e.g. {"1":"Pass","2":"Fail","3":"Pass",...}
  -- NULL until reference is recorded
  reference_data       JSONB,
  -- master_appraiser_id: used when reference_type = 'master_appraiser'
  master_appraiser_id  INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  -- status: open (data entry) → complete (results frozen)
  status               VARCHAR(30)   NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'complete')),
  notes                TEXT,
  created_by           INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kappa_studies IS
  'Attribute Agreement Analysis (AAA) study setup for Kappa MSA. '
  'Each study selects N sample items, assigns appraisers, and records their pass/fail (or categorical) ratings across multiple trials.';

-- ── Ratings ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kappa_ratings (
  id             SERIAL      PRIMARY KEY,
  study_id       INTEGER     NOT NULL REFERENCES kappa_studies(id) ON DELETE CASCADE,
  appraiser_id   INTEGER     NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  sample_number  INTEGER     NOT NULL CHECK (sample_number >= 1),
  trial_number   INTEGER     NOT NULL DEFAULT 1 CHECK (trial_number >= 1),
  rating         VARCHAR(50) NOT NULL,   -- must be one of study.attribute_options
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One rating per (study, appraiser, sample, trial)
  CONSTRAINT uq_kappa_rating UNIQUE (study_id, appraiser_id, sample_number, trial_number)
);

COMMENT ON TABLE kappa_ratings IS
  'Individual ratings from each appraiser for each sample item and trial within a Kappa study.';

-- ── Appraiser assignment (which users participate in each study) ──────────────
CREATE TABLE IF NOT EXISTS kappa_study_appraisers (
  study_id      INTEGER NOT NULL REFERENCES kappa_studies(id) ON DELETE CASCADE,
  appraiser_id  INTEGER NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  PRIMARY KEY (study_id, appraiser_id)
);

COMMENT ON TABLE kappa_study_appraisers IS
  'Many-to-many join: which users are assigned as appraisers to a Kappa study.';

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kappa_ratings_study    ON kappa_ratings (study_id);
CREATE INDEX IF NOT EXISTS idx_kappa_ratings_appraiser ON kappa_ratings (study_id, appraiser_id);
CREATE INDEX IF NOT EXISTS idx_kappa_studies_status   ON kappa_studies (status);
CREATE INDEX IF NOT EXISTS idx_kappa_studies_testdef  ON kappa_studies (test_definition_id);
