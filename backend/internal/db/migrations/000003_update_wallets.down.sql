-- Drop primary key constraint first
ALTER TABLE wallets
    DROP CONSTRAINT wallets_pkey;

-- Change ID back to UUID
ALTER TABLE wallets
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Re-add primary key constraint
ALTER TABLE wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

-- Add back unique constraint on public_key
ALTER TABLE wallets
    ADD CONSTRAINT wallets_public_key_key UNIQUE (public_key);

-- Add back user_id foreign key constraint
ALTER TABLE wallets
    ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- Add back encrypted_private_key column
ALTER TABLE wallets
    ADD COLUMN encrypted_private_key TEXT NOT NULL DEFAULT '';

-- Drop balance and last_updated columns
ALTER TABLE wallets
    DROP COLUMN balance,
    DROP COLUMN last_updated; 