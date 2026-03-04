-- Restaurar y optimizar las políticas de seguridad de las tablas principales que fueron borradas
-- Para evitar el error de "RLS habilitado sin políticas" y los warnings de "múltiples políticas"

-- 1. BUSINESS_CONFIG
DROP POLICY IF EXISTS "Users can access their business config" ON business_config;
CREATE POLICY "Users can access their business config" ON business_config
    FOR ALL USING (
        user_id = (select auth.uid())
    );

-- 2. CUSTOMERS
DROP POLICY IF EXISTS "Users can access their customers" ON customers;
CREATE POLICY "Users can access their customers" ON customers
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );

-- 3. VEHICLES
DROP POLICY IF EXISTS "Users can access their vehicles" ON vehicles;
CREATE POLICY "Users can access their vehicles" ON vehicles
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );

-- 4. INSTALLMENT_PLANS
DROP POLICY IF EXISTS "Users can access their plans" ON installment_plans;
CREATE POLICY "Users can access their plans" ON installment_plans
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );

-- 5. PAYMENT_RECORDS
DROP POLICY IF EXISTS "Users can access their payments" ON payment_records;
CREATE POLICY "Users can access their payments" ON payment_records
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );

-- 6. PAYMENT_PLAN_TEMPLATES
DROP POLICY IF EXISTS "Users can access their templates" ON payment_plan_templates;
CREATE POLICY "Users can access their templates" ON payment_plan_templates
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()))
    );
