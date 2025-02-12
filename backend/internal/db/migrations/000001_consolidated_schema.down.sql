-- Drop indexes first
DROP INDEX IF EXISTS idx_price_history_coin_id_timestamp;
DROP INDEX IF EXISTS idx_trades_user_id;
DROP INDEX IF EXISTS idx_trades_coin_id;
DROP INDEX IF EXISTS idx_portfolios_user_id;

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS portfolios;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS meme_coins;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users; 