-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd

ALTER TABLE raw_coins
ADD COLUMN jupiter_created_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_raw_coins_jupiter_created_at ON raw_coins(jupiter_created_at);

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd

DROP INDEX IF EXISTS idx_raw_coins_jupiter_created_at;

ALTER TABLE raw_coins
DROP COLUMN jupiter_created_at;
