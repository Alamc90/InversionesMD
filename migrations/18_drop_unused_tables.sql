-- 18_drop_unused_tables.sql
-- =========================================================================
-- This script removes the legacy table "business_config" which is no longer
-- used by the application (we now store config directly in "businesses").

-- 1. Drop the table if it exists
DROP TABLE IF EXISTS public.business_config CASCADE;

-- 2. Clean up any other potential leftovers
DROP FUNCTION IF EXISTS public.create_business_rpc; -- Old function name if any

-- 3. Verify clean state for RPC
-- (Just ensuring the good one is still there, no change needed)
