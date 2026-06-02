-- Add status column to businesses table
-- 1 = active (default)
-- 0 = inactive/suspended
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status integer DEFAULT 1;
