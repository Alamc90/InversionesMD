-- Corregir el bug CATASTRÓFICO de RECURSIÓN INFINITA y RLS
-- =========================================================================================
-- Cuando reescribimos las políticas para arreglar las advertencias de Supabase,
-- volvimos a introducir sub-consultas cíclicas (donde business_members se lee a sí mismo),
-- lo que congela por completo la base de datos (timeout) al hacer "Creando...".
--
-- Aquí vamos a usar las funciones ultra-optimizadas "get_my_business_ids()" de tu versión anterior,
-- pero aplicando el truco de `(select auth.uid())` para mantener todo rápido y libre de alertas.

-- 1. FUNCIONES EN CACHÉ (Evitan que Supabase se cuelgue leyendo permisos)
CREATE OR REPLACE FUNCTION public.get_my_business_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_business_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid() AND role = 'admin';
$$;

-- 2. POLÍTICAS CRÍTICAS DE NEGOCIOS (Sin recursión)
DROP POLICY IF EXISTS "Members can view their business" ON businesses;
CREATE POLICY "Members can view their business" ON businesses 
    FOR SELECT USING (id IN (SELECT public.get_my_business_ids()));

DROP POLICY IF EXISTS "Members can view fellow members" ON business_members;
CREATE POLICY "Members can view fellow members" ON business_members 
    FOR SELECT USING (
        user_id = (select auth.uid()) OR business_id IN (SELECT public.get_my_business_ids())
    );

DROP POLICY IF EXISTS "Users can insert own membership or admins can insert" ON business_members;
DROP POLICY IF EXISTS "Admins can insert members" ON business_members;
CREATE POLICY "Admins can insert members" ON business_members 
    FOR INSERT WITH CHECK (
        business_id IN (SELECT public.get_my_admin_business_ids()) OR user_id = (select auth.uid())
    );

-- 3. POLÍTICAS DE TABLAS PRINCIPALES RESTAURADAS (Usando la función correcta)
-- CUSTOMERS
DROP POLICY IF EXISTS "Users can access their customers" ON customers;
CREATE POLICY "Users can access their customers" ON customers FOR ALL USING (
    user_id = (select auth.uid()) OR business_id IN (SELECT public.get_my_business_ids())
);

-- VEHICLES
DROP POLICY IF EXISTS "Users can access their vehicles" ON vehicles;
CREATE POLICY "Users can access their vehicles" ON vehicles FOR ALL USING (
    user_id = (select auth.uid()) OR business_id IN (SELECT public.get_my_business_ids())
);

-- INSTALLMENT PLANS
DROP POLICY IF EXISTS "Users can access their plans" ON installment_plans;
CREATE POLICY "Users can access their plans" ON installment_plans FOR ALL USING (
    user_id = (select auth.uid()) OR business_id IN (SELECT public.get_my_business_ids())
);

-- PAYMENT RECORDS
DROP POLICY IF EXISTS "Users can access their payments" ON payment_records;
CREATE POLICY "Users can access their payments" ON payment_records FOR ALL USING (
    user_id = (select auth.uid()) OR business_id IN (SELECT public.get_my_business_ids())
);

-- PAYMENT PLAN TEMPLATES
DROP POLICY IF EXISTS "Users can access their templates" ON payment_plan_templates;
CREATE POLICY "Users can access their templates" ON payment_plan_templates FOR ALL USING (
    user_id = (select auth.uid()) OR business_id IN (SELECT public.get_my_business_ids())
);
