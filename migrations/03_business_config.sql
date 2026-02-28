-- 0. Enable uuid-ossp extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create table business_config
CREATE TABLE IF NOT EXISTS business_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE, -- One config per user
    business_name TEXT,
    nit TEXT,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Users can view own business config" ON business_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business config" ON business_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business config" ON business_config FOR UPDATE USING (auth.uid() = user_id);
-- No delete policy needed usually, but could add if user wants to delete account
