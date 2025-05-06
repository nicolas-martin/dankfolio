-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd

-- Create coins table
CREATE TABLE coins (
    mint_address TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    description TEXT,
    icon_url TEXT,
    tags TEXT[], -- PostgreSQL array type for pq.StringArray
    price DOUBLE PRECISION DEFAULT 0.0,
    change_24h DOUBLE PRECISION DEFAULT 0.0,
    market_cap DOUBLE PRECISION DEFAULT 0.0,
    volume_24h DOUBLE PRECISION DEFAULT 0.0,
    website TEXT,
    twitter TEXT,
    telegram TEXT,
    discord TEXT,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for coins table based on GORM tags
CREATE INDEX idx_coins_symbol ON coins(symbol);
CREATE INDEX idx_coins_tags ON coins USING GIN(tags); -- GIN index for array searching

-- Create trades table
CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    from_coin_id TEXT NOT NULL REFERENCES coins(mint_address), -- Foreign key to coins
    to_coin_id TEXT NOT NULL REFERENCES coins(mint_address),   -- Foreign key to coins
    type TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    fee DOUBLE PRECISION DEFAULT 0.0,
    status TEXT NOT NULL,
    transaction_hash TEXT UNIQUE, -- Pointer means nullable, UNIQUE constraint
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ, -- Pointer means nullable
    confirmations INTEGER DEFAULT 0,
    finalized BOOLEAN DEFAULT FALSE,
    error TEXT -- Pointer means nullable
);

-- Add indexes for trades table based on GORM tags
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_from_coin_id ON trades(from_coin_id);
CREATE INDEX idx_trades_to_coin_id ON trades(to_coin_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at);

-- Optional: Trigger function to update last_updated timestamp on coin update
-- This matches common practice where GORM's default CURRENT_TIMESTAMP for LastUpdated
-- only applies on creation, not on update unless a trigger or hook handles it.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_updated = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER update_coin_last_updated_trigger
BEFORE UPDATE ON coins
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();
-- +goose StatementEnd

-- Create raw_coins table
CREATE TABLE raw_coins (
    mint_address TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd

-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_coin_last_updated_trigger ON coins;
-- +goose StatementEnd
-- +goose StatementBegin
DROP FUNCTION IF EXISTS update_last_updated_column();
-- +goose StatementEnd

DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS coins;
DROP TABLE IF EXISTS raw_coins;
