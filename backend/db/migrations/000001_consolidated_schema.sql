-- Up

-- Meme coins table
CREATE TABLE meme_coins (
    id VARCHAR(255) PRIMARY KEY,
    symbol VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    image_url TEXT,
    website_url VARCHAR(255),
    price DECIMAL(24,12),
    current_price DECIMAL(24,12),
    change_24h DECIMAL(24,12),
    volume_24h DECIMAL(24,2),
    market_cap DECIMAL(24,2),
    supply DECIMAL(24,12),
    labels JSONB DEFAULT '[]',
    socials JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Price history table
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(255) NOT NULL REFERENCES meme_coins(id),
    price DECIMAL(24,12) NOT NULL,
    market_cap DECIMAL(24,2),
    volume_24h DECIMAL(24,2),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(255) NOT NULL REFERENCES meme_coins(id),
    amount DECIMAL(24,12) NOT NULL,
    price DECIMAL(24,12) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    tx_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Down
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS meme_coins; 