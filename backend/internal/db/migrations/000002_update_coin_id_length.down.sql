-- Revert changes to meme_coins table
ALTER TABLE meme_coins ALTER COLUMN id TYPE VARCHAR(50);
ALTER TABLE meme_coins ALTER COLUMN symbol TYPE VARCHAR(20);

-- Revert changes to foreign key columns in other tables
ALTER TABLE price_history ALTER COLUMN coin_id TYPE VARCHAR(50);
ALTER TABLE portfolios ALTER COLUMN coin_id TYPE VARCHAR(50);
ALTER TABLE trades ALTER COLUMN coin_id TYPE VARCHAR(50);
ALTER TABLE trades ALTER COLUMN coin_symbol TYPE VARCHAR(20); 