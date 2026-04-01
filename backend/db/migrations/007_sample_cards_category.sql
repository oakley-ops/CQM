-- Add category_id to sample_cards so each category can have its own set of sample cards
ALTER TABLE sample_cards ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES test_categories(id) ON DELETE SET NULL;

-- Drop old unique constraint on (session_id, card_number)
ALTER TABLE sample_cards DROP CONSTRAINT IF EXISTS sample_cards_session_id_card_number_key;

-- New unique constraint: each card number is unique per session+category combo
CREATE UNIQUE INDEX IF NOT EXISTS sample_cards_session_category_card
  ON sample_cards(session_id, category_id, card_number);
