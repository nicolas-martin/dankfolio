-- Drop coin_symbol column
ALTER TABLE trades
    DROP COLUMN coin_symbol;

-- Make transaction_hash NOT NULL again
ALTER TABLE trades
    ALTER COLUMN transaction_hash SET NOT NULL;

-- Change ID back to UUID
ALTER TABLE trades
    DROP CONSTRAINT trades_pkey,
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);

-- Change user_id back to UUID and add foreign key
ALTER TABLE trades
    ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
    ADD CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id); 