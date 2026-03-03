-- Migration 05: Business, Users, Permissions, Payment Status, Financial Transactions
-- ==================================================================================

-- 0. Enable uuid-ossp extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================
-- 1. BUSINESSES TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nit TEXT,
    address TEXT,
    phone TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- ==================================================================================
-- 2. BUSINESS_MEMBERS TABLE (links users to businesses with role & permissions)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'employee')) DEFAULT 'employee' NOT NULL,
    display_name TEXT,
    permissions JSONB DEFAULT '{
        "can_view_dashboard": true,
        "can_create_deliveries": false,
        "can_process_payments": true,
        "can_approve_payments": false,
        "can_view_balance": false,
        "can_manage_records": false,
        "can_manage_config": false,
        "can_manage_users": false
    }'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(business_id, user_id)
);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

-- ==================================================================================
-- 3. BUSINESS_INVITATIONS TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS business_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'employee')) DEFAULT 'employee' NOT NULL,
    permissions JSONB DEFAULT '{
        "can_view_dashboard": true,
        "can_create_deliveries": false,
        "can_process_payments": true,
        "can_approve_payments": false,
        "can_view_balance": false,
        "can_manage_records": false,
        "can_manage_config": false,
        "can_manage_users": false
    }'::jsonb NOT NULL,
    accepted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE business_invitations ENABLE ROW LEVEL SECURITY;

-- ==================================================================================
-- 4. FINANCIAL_TRANSACTIONS TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    type TEXT CHECK (type IN ('INGRESO', 'EGRESO')) NOT NULL,
    category TEXT NOT NULL, -- 'PAGO_CUOTA', 'CUOTA_INICIAL', 'COMPRA_VEHICULO', 'GASTOS_OPERATIVOS', 'OTRO'
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    reference_id TEXT, -- e.g., payment_record.id or vehicle.id
    transaction_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- ==================================================================================
-- 5. ADD business_id TO EXISTING TABLES
-- ==================================================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE payment_plan_templates ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- ==================================================================================
-- 6. ADD PAYMENT STATUS TO payment_records
-- ==================================================================================
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('PENDIENTE', 'APROBADO', 'DENEGADO')) DEFAULT 'PENDIENTE';
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- ==================================================================================
-- 7. RLS POLICIES FOR businesses
-- ==================================================================================
CREATE POLICY "Members can view their business"
    ON businesses FOR SELECT
    USING (id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create businesses"
    ON businesses FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their business"
    ON businesses FOR UPDATE
    USING (id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- ==================================================================================
-- 8. RLS POLICIES FOR business_members
-- ==================================================================================
CREATE POLICY "Members can view fellow members"
    ON business_members FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert members"
    ON business_members FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR 
        -- Allow self-insert when accepting invitation
        user_id = auth.uid()
    );

CREATE POLICY "Admins can update members"
    ON business_members FOR UPDATE
    USING (business_id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete members"
    ON business_members FOR DELETE
    USING (business_id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- ==================================================================================
-- 9. RLS POLICIES FOR business_invitations
-- ==================================================================================
CREATE POLICY "Members can view invitations for their business"
    ON business_invitations FOR SELECT
    USING (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid())
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can create invitations"
    ON business_invitations FOR INSERT
    WITH CHECK (business_id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can update invitations"
    ON business_invitations FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM business_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can delete invitations"
    ON business_invitations FOR DELETE
    USING (business_id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- ==================================================================================
-- 10. RLS POLICIES FOR financial_transactions
-- ==================================================================================
CREATE POLICY "Members can view business transactions"
    ON financial_transactions FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert transactions"
    ON financial_transactions FOR INSERT
    WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update transactions"
    ON financial_transactions FOR UPDATE
    USING (business_id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete transactions"
    ON financial_transactions FOR DELETE
    USING (business_id IN (
        SELECT business_id FROM business_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- ==================================================================================
-- 11. UPDATE RLS ON EXISTING TABLES to support business_id
-- These are additive policies. Existing user_id based policies remain for backward
-- compatibility. New queries should filter by business_id.
-- ==================================================================================

-- Customers: members of the same business can access
CREATE POLICY "Business members can view customers" ON customers FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can insert customers" ON customers FOR INSERT
    WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can update customers" ON customers FOR UPDATE
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

-- Vehicles
CREATE POLICY "Business members can view vehicles" ON vehicles FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can insert vehicles" ON vehicles FOR INSERT
    WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can update vehicles" ON vehicles FOR UPDATE
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

-- Installment Plans
CREATE POLICY "Business members can view plans" ON installment_plans FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can insert plans" ON installment_plans FOR INSERT
    WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can update plans" ON installment_plans FOR UPDATE
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

-- Payment Records
CREATE POLICY "Business members can view payments" ON payment_records FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can insert payments" ON payment_records FOR INSERT
    WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can update payments" ON payment_records FOR UPDATE
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

-- Payment Plan Templates
CREATE POLICY "Business members can view templates" ON payment_plan_templates FOR SELECT
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can insert templates" ON payment_plan_templates FOR INSERT
    WITH CHECK (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can update templates" ON payment_plan_templates FOR UPDATE
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));
CREATE POLICY "Business members can delete templates" ON payment_plan_templates FOR DELETE
    USING (business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid()));

-- ==================================================================================
-- 12. HELPER: Set existing payment_records status to APROBADO (migrate old data)
-- ==================================================================================
UPDATE payment_records SET status = 'APROBADO' WHERE status IS NULL;

-- ==================================================================================
-- NOTE: After running this migration, existing users should create a business
-- and migrate their data. The app handles this via a setup flow.
-- ==================================================================================
