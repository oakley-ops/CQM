-- NEXUS: Design review sign-offs (#0571# per product)
CREATE TABLE IF NOT EXISTS nexus_design_reviews (
  id           SERIAL PRIMARY KEY,
  plan_id      INTEGER NOT NULL REFERENCES nexus_qualification_plans(id) ON DELETE CASCADE,
  review_type  VARCHAR(20) NOT NULL CHECK (review_type IN ('intermediate','final')),
  reviewer     VARCHAR(255),
  review_date  DATE,
  outcome      VARCHAR(20) CHECK (outcome IN ('approved','conditional','rejected','pending')) DEFAULT 'pending',
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_design_reviews_plan ON nexus_design_reviews(plan_id);
