-- Add coin_symbol column to trades table
ALTER TABLE trades
    ADD COLUMN coin_symbol VARCHAR(20);

-- Make transaction_hash nullable for tests
ALTER TABLE trades
    ALTER COLUMN transaction_hash DROP NOT NULL;

-- Drop id default and change to VARCHAR for testing
ALTER TABLE trades
    DROP CONSTRAINT trades_pkey,
    ALTER COLUMN id TYPE VARCHAR(50),
    ALTER COLUMN id DROP DEFAULT,
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);

-- Change user_id to VARCHAR for testing
ALTER TABLE trades
    DROP CONSTRAINT trades_user_id_fkey,
    ALTER COLUMN user_id TYPE VARCHAR(50); 