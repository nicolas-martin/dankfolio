-- Up
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    public_key VARCHAR(255) NOT NULL,
    private_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    balance DECIMAL(24,12) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE meme_coins (
    id VARCHAR(50) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    image_url TEXT,
    price DECIMAL(24,12),
    current_price DECIMAL(24,12),
    change_24h DECIMAL(24,12),
    volume_24h DECIMAL(24,2),
    market_cap DECIMAL(24,2),
    supply DECIMAL(24,12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(50) NOT NULL REFERENCES meme_coins(id),
    price DECIMAL(24,12) NOT NULL,
    market_cap DECIMAL(24,2),
    volume_24h DECIMAL(24,2),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(24,12) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    coin_id VARCHAR(50) NOT NULL REFERENCES meme_coins(id),
    type VARCHAR(10) NOT NULL,
    amount DECIMAL(24,12) NOT NULL,
    price DECIMAL(24,12) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portfolios (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    coin_id VARCHAR(50) NOT NULL REFERENCES meme_coins(id),
    amount DECIMAL(24,12) NOT NULL,
    average_buy_price DECIMAL(24,12) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT portfolios_user_coin_unique UNIQUE(user_id, coin_id)
);

-- Create indexes
CREATE INDEX idx_price_history_coin_id_timestamp ON price_history(coin_id, timestamp);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_coin_id ON trades(coin_id);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);

-- Down
DROP TABLE portfolios;
DROP TABLE trades;
DROP TABLE deposits;
DROP TABLE price_history;
DROP TABLE meme_coins;
DROP TABLE wallets;
DROP TABLE users; 