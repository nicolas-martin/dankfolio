-- Drop foreign key constraints
ALTER TABLE price_history
    DROP CONSTRAINT price_history_coin_id_fkey;

ALTER TABLE portfolios
    DROP CONSTRAINT portfolios_coin_id_fkey;

ALTER TABLE trades
    DROP CONSTRAINT trades_coin_id_fkey;

-- Revert foreign key references back to UUID
ALTER TABLE trades
    ALTER COLUMN coin_id TYPE UUID USING coin_id::uuid;

ALTER TABLE portfolios
    ALTER COLUMN coin_id TYPE UUID USING coin_id::uuid;

ALTER TABLE price_history
    ALTER COLUMN coin_id TYPE UUID USING coin_id::uuid,
    ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE 
    USING to_timestamp(timestamp);

-- Revert meme_coins id back to UUID
ALTER TABLE meme_coins
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

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

-- Remove added columns from meme_coins table
ALTER TABLE meme_coins
    DROP COLUMN description,
    DROP COLUMN image_url,
    DROP COLUMN price,
    DROP COLUMN current_price,
    DROP COLUMN change_24h,
    DROP COLUMN volume_24h,
    DROP COLUMN market_cap,
    DROP COLUMN supply; 