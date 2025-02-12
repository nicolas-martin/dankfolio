-- Add completed_at column to trades table
ALTER TABLE trades
    ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE; 