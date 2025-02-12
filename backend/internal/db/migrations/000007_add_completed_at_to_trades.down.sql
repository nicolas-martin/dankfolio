-- Remove completed_at column from trades table
ALTER TABLE trades
    DROP COLUMN completed_at; 