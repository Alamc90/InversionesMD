-- Eliminar políticas antiguas (Users can ... own ...)
-- Customers
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
DROP POLICY IF EXISTS "Allow public select on customers" ON customers;
DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated select on customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated insert on customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated update on customers" ON customers;

-- Vehicles
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow public select on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow public insert on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow public update on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated select on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated insert on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated update on vehicles" ON vehicles;

-- Installment Plans
DROP POLICY IF EXISTS "Users can view own plans" ON installment_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON installment_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON installment_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON installment_plans;
DROP POLICY IF EXISTS "Allow public select on installment_plans" ON installment_plans;
DROP POLICY IF EXISTS "Allow public insert on installment_plans" ON installment_plans;
DROP POLICY IF EXISTS "Allow public update on installment_plans" ON installment_plans;
DROP POLICY IF EXISTS "Allow authenticated select on installment_plans" ON installment_plans;
DROP POLICY IF EXISTS "Allow authenticated insert on installment_plans" ON installment_plans;
DROP POLICY IF EXISTS "Allow authenticated update on installment_plans" ON installment_plans;

-- Payment Records
DROP POLICY IF EXISTS "Users can view own payments" ON payment_records;
DROP POLICY IF EXISTS "Users can insert own payments" ON payment_records;
DROP POLICY IF EXISTS "Users can update own payments" ON payment_records;
DROP POLICY IF EXISTS "Users can delete own payments" ON payment_records;
DROP POLICY IF EXISTS "Allow public select on payment_records" ON payment_records;
DROP POLICY IF EXISTS "Allow public insert on payment_records" ON payment_records;
DROP POLICY IF EXISTS "Allow public update on payment_records" ON payment_records;
DROP POLICY IF EXISTS "Allow authenticated select on payment_records" ON payment_records;
DROP POLICY IF EXISTS "Allow authenticated insert on payment_records" ON payment_records;
DROP POLICY IF EXISTS "Allow authenticated update on payment_records" ON payment_records;

-- Payment Plan Templates
DROP POLICY IF EXISTS "Users can view own plan templates" ON payment_plan_templates;
DROP POLICY IF EXISTS "Users can insert own plan templates" ON payment_plan_templates;
DROP POLICY IF EXISTS "Users can update own plan templates" ON payment_plan_templates;
DROP POLICY IF EXISTS "Users can delete own plan templates" ON payment_plan_templates;

-- Business Config
DROP POLICY IF EXISTS "Users can view own business config" ON business_config;
DROP POLICY IF EXISTS "Users can insert own business config" ON business_config;
DROP POLICY IF EXISTS "Users can update own business config" ON business_config;

-- Business Members
DROP POLICY IF EXISTS "Users can insert own membership or admins can insert" ON business_members;
CREATE POLICY "Users can insert own membership or admins can insert" ON business_members 
    FOR INSERT WITH CHECK (
        user_id = (select auth.uid()) OR 
        EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = business_members.business_id AND bm.user_id = (select auth.uid()) AND bm.role = 'admin')
    );

DROP POLICY IF EXISTS "Members can view fellow members" ON business_members;
CREATE POLICY "Members can view fellow members" ON business_members 
    FOR SELECT USING (
        user_id = (select auth.uid()) OR 
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );

-- Businesses
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON businesses;
CREATE POLICY "Authenticated users can create businesses" ON businesses 
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Members can view their business" ON businesses;
CREATE POLICY "Members can view their business" ON businesses 
    FOR SELECT USING (
        id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );

-- Invitations
DROP POLICY IF EXISTS "Members can view invitations for their business" ON business_invitations;
CREATE POLICY "Members can view invitations for their business" ON business_invitations 
    FOR SELECT USING (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid())) OR 
        email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    );

DROP POLICY IF EXISTS "Admins can update invitations" ON business_invitations;
CREATE POLICY "Admins can update invitations" ON business_invitations 
    FOR UPDATE USING (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()) AND role = 'admin') OR
        email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    );
