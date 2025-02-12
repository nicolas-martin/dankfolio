-- Drop foreign key constraints
ALTER TABLE price_history
    DROP CONSTRAINT price_history_coin_id_fkey;

ALTER TABLE portfolios
    DROP CONSTRAINT portfolios_coin_id_fkey;

ALTER TABLE trades
    DROP CONSTRAINT trades_coin_id_fkey;

-- Drop unique constraints
ALTER TABLE meme_coins
    DROP CONSTRAINT meme_coins_pkey,
    ADD CONSTRAINT meme_coins_pkey PRIMARY KEY (id);

-- Change ID to VARCHAR for testing
ALTER TABLE meme_coins
    ALTER COLUMN id TYPE VARCHAR(50),
    ALTER COLUMN id DROP DEFAULT;

-- Update related tables
ALTER TABLE price_history
    ALTER COLUMN coin_id TYPE VARCHAR(50);

ALTER TABLE portfolios
    ALTER COLUMN coin_id TYPE VARCHAR(50);

ALTER TABLE trades
    ALTER COLUMN coin_id TYPE VARCHAR(50);

-- Re-add foreign key constraints
ALTER TABLE price_history
    ADD CONSTRAINT price_history_coin_id_fkey
    FOREIGN KEY (coin_id) REFERENCES meme_coins(id);

ALTER TABLE portfolios
    ADD CONSTRAINT portfolios_coin_id_fkey
    FOREIGN KEY (coin_id) REFERENCES meme_coins(id);

ALTER TABLE trades
    ADD CONSTRAINT trades_coin_id_fkey
    FOREIGN KEY (coin_id) REFERENCES meme_coins(id); 