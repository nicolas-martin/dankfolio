-- Drop constraints
ALTER TABLE portfolios
    DROP CONSTRAINT portfolios_pkey,
    DROP CONSTRAINT portfolios_user_coin_unique;

-- Change ID back to UUID
ALTER TABLE portfolios
    ALTER COLUMN id TYPE UUID USING id::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Change user_id back to UUID
ALTER TABLE portfolios
    ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Re-add primary key constraint
ALTER TABLE portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);

-- Re-add foreign key constraint
ALTER TABLE portfolios
    ADD CONSTRAINT portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id); 