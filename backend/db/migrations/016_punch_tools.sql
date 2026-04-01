-- Punch tool registry — tracks serial numbers of card punching tools
CREATE TABLE IF NOT EXISTS punch_tools (
  id          SERIAL PRIMARY KEY,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  description   VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_punch_tools_active ON punch_tools (is_active);
