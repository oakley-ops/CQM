-- NEXUS: Individual checklist items within a qualification plan
CREATE TABLE IF NOT EXISTS nexus_qualification_items (
  id               SERIAL PRIMARY KEY,
  plan_id          INTEGER NOT NULL REFERENCES nexus_qualification_plans(id) ON DELETE CASCADE,
  requirement_id   VARCHAR(10),           -- #XXXX# reference
  section          VARCHAR(30),
  title            TEXT NOT NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in-progress','complete','not-applicable')),
  evidence_type    VARCHAR(50),           -- document / test-session / photo / link
  evidence_ref     TEXT,
  responsible      VARCHAR(255),
  target_date      DATE,
  completed_date   DATE,
  notes            TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_qual_items_plan ON nexus_qualification_items(plan_id);
