ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

UPDATE users SET username = 'admin' WHERE email = 'admin@cqm.com' AND username IS NULL;
