-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    public_key VARCHAR(255) NOT NULL,
    private_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    balance DECIMAL(24,12) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meme coins table
CREATE TABLE meme_coins (
    id VARCHAR(50) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
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

-- Price history table
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(50) NOT NULL,
    price DECIMAL(24,12) NOT NULL,
    market_cap DECIMAL(24,2),
    volume_24h DECIMAL(24,2),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES meme_coins(id)
);

-- User portfolios table
CREATE TABLE portfolios (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    coin_id VARCHAR(50) NOT NULL,
    amount DECIMAL(24,12) NOT NULL,
    average_buy_price DECIMAL(24,12) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES meme_coins(id),
    CONSTRAINT portfolios_user_coin_unique UNIQUE(user_id, coin_id)
);

-- Trades table
CREATE TABLE trades (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    coin_id VARCHAR(50) NOT NULL,
    coin_symbol VARCHAR(20),
    type VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
    amount DECIMAL(24,12) NOT NULL,
    price DECIMAL(24,12) NOT NULL,
    fee DECIMAL(24,12) NOT NULL,
    transaction_hash VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'failed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES meme_coins(id)
);

-- Create indexes
CREATE INDEX idx_price_history_coin_id_timestamp ON price_history(coin_id, timestamp);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_coin_id ON trades(coin_id);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

-- Insert initial Wrapped SOL token
INSERT INTO meme_coins (
    id,
    symbol,
    name,
    contract_address,
    description,
    image_url,
    price,
    current_price,
    change_24h,
    volume_24h,
    market_cap,
    supply
) VALUES (
    'So11111111111111111111111111111111111111112',
    'SOL',
    'Wrapped SOL',
    'So11111111111111111111111111111111111111112',
    'Wrapped SOL (wSOL) is a token that represents SOL in Solana DeFi applications',
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    1.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0
); 