CREATE TABLE IF NOT EXISTS adhesion_log (
  id                    SERIAL PRIMARY KEY,

  -- Job identity
  job_number            VARCHAR(100),
  job_name              VARCHAR(200),
  side                  VARCHAR(1)   CHECK (side IN ('F', 'B')),
  test_date             DATE         NOT NULL,
  emv                   BOOLEAN      NOT NULL DEFAULT false,
  csr                   BOOLEAN      NOT NULL DEFAULT false,

  -- Ink / print details
  inks                  VARCHAR(300),
  screen_printed        BOOLEAN      NOT NULL DEFAULT false,

  -- Material setup
  core                  VARCHAR(100),
  core_thickness        NUMERIC(6,3),
  overlay               VARCHAR(100),
  coating               VARCHAR(100),

  -- Lamination process
  laminator             VARCHAR(50),
  lam_temp_f            SMALLINT,
  dwell_time_sec        NUMERIC(5,1),
  post_cured            VARCHAR(20),

  -- Strip measurements (lbf/cm); NULL = not measured / "Tore"
  strip_a               NUMERIC(6,3),
  strip_b               NUMERIC(6,3),
  strip_c               NUMERIC(6,3),
  strip_d               NUMERIC(6,3),
  strip_e               NUMERIC(6,3),
  strip_a_tore          BOOLEAN      NOT NULL DEFAULT false,
  strip_b_tore          BOOLEAN      NOT NULL DEFAULT false,
  strip_c_tore          BOOLEAN      NOT NULL DEFAULT false,
  strip_d_tore          BOOLEAN      NOT NULL DEFAULT false,
  strip_e_tore          BOOLEAN      NOT NULL DEFAULT false,

  -- Computed / stored results
  min_lbf_cm            NUMERIC(6,3),
  min_lbf_in            NUMERIC(6,3),

  -- Pass / fail
  pass_threshold        NUMERIC(5,3) NOT NULL DEFAULT 1.50,
  result                VARCHAR(4)   CHECK (result IN ('PASS', 'FAIL')),

  -- ISO / CQM compliance fields
  test_method           VARCHAR(50)  NOT NULL DEFAULT 'Peel Test #7120#',
  tape_spec_confirmed   BOOLEAN      NOT NULL DEFAULT false,
  exclusions            TEXT,

  -- Notes
  notes                 TEXT,

  -- Audit
  created_by            INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adhesion_log_job_number ON adhesion_log(job_number);
CREATE INDEX IF NOT EXISTS idx_adhesion_log_test_date  ON adhesion_log(test_date);
CREATE INDEX IF NOT EXISTS idx_adhesion_log_result     ON adhesion_log(result);
