-- Add missing columns to meme_coins table
ALTER TABLE meme_coins
    ADD COLUMN description TEXT,
    ADD COLUMN image_url TEXT,
    ADD COLUMN price DECIMAL(24,12),
    ADD COLUMN current_price DECIMAL(24,12),
    ADD COLUMN change_24h DECIMAL(24,12),
    ADD COLUMN volume_24h DECIMAL(24,2),
    ADD COLUMN market_cap DECIMAL(24,2),
    ADD COLUMN supply DECIMAL(24,12);

-- Drop unique constraints
ALTER TABLE meme_coins
    DROP CONSTRAINT meme_coins_symbol_key,
    DROP CONSTRAINT meme_coins_contract_address_key;

-- Drop foreign key constraints
ALTER TABLE price_history
    DROP CONSTRAINT price_history_coin_id_fkey;

ALTER TABLE portfolios
    DROP CONSTRAINT portfolios_coin_id_fkey;

ALTER TABLE trades
    DROP CONSTRAINT trades_coin_id_fkey;

-- Change coin_id to be a string instead of UUID for better readability and usability
ALTER TABLE meme_coins
    ALTER COLUMN id TYPE VARCHAR(50),
    ALTER COLUMN id SET DEFAULT NULL;

-- Update foreign key references
ALTER TABLE price_history
    ALTER COLUMN coin_id TYPE VARCHAR(50),
    ALTER COLUMN timestamp TYPE BIGINT USING EXTRACT(EPOCH FROM timestamp)::BIGINT;

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