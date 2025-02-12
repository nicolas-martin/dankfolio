-- Update meme_coins table
ALTER TABLE meme_coins ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE meme_coins ALTER COLUMN symbol TYPE VARCHAR(255);

-- Update foreign key columns in other tables
ALTER TABLE price_history ALTER COLUMN coin_id TYPE VARCHAR(255);
ALTER TABLE portfolios ALTER COLUMN coin_id TYPE VARCHAR(255);
ALTER TABLE trades ALTER COLUMN coin_id TYPE VARCHAR(255);
ALTER TABLE trades ALTER COLUMN coin_symbol TYPE VARCHAR(255); 