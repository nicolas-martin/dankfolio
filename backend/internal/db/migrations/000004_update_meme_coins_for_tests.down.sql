-- Drop foreign key constraints
ALTER TABLE price_history
    DROP CONSTRAINT price_history_coin_id_fkey;

ALTER TABLE portfolios
    DROP CONSTRAINT portfolios_coin_id_fkey;

ALTER TABLE trades
    DROP CONSTRAINT trades_coin_id_fkey;

-- Change ID back to UUID
ALTER TABLE meme_coins
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Update related tables
ALTER TABLE price_history
    ALTER COLUMN coin_id TYPE UUID USING coin_id::uuid;

ALTER TABLE portfolios
    ALTER COLUMN coin_id TYPE UUID USING coin_id::uuid;

ALTER TABLE trades
    ALTER COLUMN coin_id TYPE UUID USING coin_id::uuid;

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