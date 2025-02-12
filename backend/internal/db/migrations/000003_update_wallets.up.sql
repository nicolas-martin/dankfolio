-- Drop primary key constraint first
ALTER TABLE wallets
    DROP CONSTRAINT wallets_pkey;

-- Change ID to VARCHAR for testing
ALTER TABLE wallets
    ALTER COLUMN id TYPE VARCHAR(50),
    ALTER COLUMN id DROP DEFAULT;

-- Re-add primary key constraint
ALTER TABLE wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

-- Add balance and last_updated columns to wallets table
ALTER TABLE wallets
    ADD COLUMN balance DECIMAL(24,12) NOT NULL DEFAULT 0,
    ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Drop encrypted_private_key as it's not needed for tests
ALTER TABLE wallets
    DROP COLUMN encrypted_private_key;

-- Drop user_id foreign key constraint for testing
ALTER TABLE wallets
    DROP CONSTRAINT wallets_user_id_fkey,
    ALTER COLUMN user_id TYPE VARCHAR(50);

-- Drop unique constraint on public_key for testing
ALTER TABLE wallets
    DROP CONSTRAINT wallets_public_key_key; 