-- Up
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Down
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL; 