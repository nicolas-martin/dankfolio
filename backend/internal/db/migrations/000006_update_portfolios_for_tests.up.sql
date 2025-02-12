-- Drop foreign key and unique constraints
ALTER TABLE portfolios
    DROP CONSTRAINT portfolios_user_id_fkey,
    DROP CONSTRAINT portfolios_pkey;

-- Change user_id to VARCHAR for testing
ALTER TABLE portfolios
    ALTER COLUMN user_id TYPE VARCHAR(50);

-- Change ID to VARCHAR for testing
ALTER TABLE portfolios
    ALTER COLUMN id TYPE VARCHAR(50),
    ALTER COLUMN id DROP DEFAULT;

-- Re-add primary key constraint
ALTER TABLE portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);

-- Re-add unique constraint on user_id and coin_id
ALTER TABLE portfolios
    ADD CONSTRAINT portfolios_user_coin_unique UNIQUE (user_id, coin_id); 