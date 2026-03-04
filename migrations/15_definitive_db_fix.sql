-- 15_definitive_db_fix.sql
-- =========================================================================
-- This script safely completely overhauls the RPC and policies 
-- to guarantee no lock-ups and correct redirection.

-- 1. Create a bullet-proof RPC for creating a business that BYPASSES RLS cleanly.
CREATE OR REPLACE FUNCTION public.create_business_with_admin(
    p_name TEXT,
    p_nit TEXT DEFAULT '',
    p_address TEXT DEFAULT '',
    p_phone TEXT DEFAULT '',
    p_display_name TEXT DEFAULT 'Admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as postgres (bypasses RLS locks)
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_business_id UUID;
    v_result JSON;
BEGIN
    -- Get current user robustly
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if user already has a business to PREVENT DUPLICATES
    IF EXISTS (SELECT 1 FROM public.business_members WHERE user_id = v_user_id) THEN   
        -- Return existing
        SELECT json_build_object(
            'id', b.id,
            'name', b.name,
            'nit', b.nit,
            'address', b.address,
            'phone', b.phone,
            'already_existed', true
        ) INTO v_result
        FROM public.businesses b
        JOIN public.business_members bm ON bm.business_id = b.id
        WHERE bm.user_id = v_user_id
        LIMIT 1;

        RETURN v_result;
    END IF;

    -- Create business
    INSERT INTO public.businesses (name, nit, address, phone, created_by)
    VALUES (p_name, p_nit, p_address, p_phone, v_user_id)
    RETURNING id INTO v_business_id;

    -- Insert Default Config
    INSERT INTO public.business_config (business_id, currency_symbol, receipt_header, terms_conditions)
    VALUES (v_business_id, 'Q', 'Gracias por su compra', 'Sin cambios ni devoluciones');

    -- Create admin membership
    INSERT INTO public.business_members (business_id, user_id, role, display_name, permissions)
    VALUES (
        v_business_id,
        v_user_id,
        'admin',
        p_display_name,
        '{"can_view_dashboard":true,"can_create_deliveries":true,"can_process_payments":true,"can_approve_payments":true,"can_view_balance":true,"can_manage_records":true,"can_manage_config":true,"can_manage_users":true}'::jsonb
    );

    -- Build output
    SELECT json_build_object(
        'id', v_business_id,
        'name', p_name,
        'nit', p_nit,
        'address', p_address,
        'phone', p_phone,
        'already_existed', false
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 2. Revamp the Get My Business Function to perfectly avoid recursion.
CREATE OR REPLACE FUNCTION public.get_my_business_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
    SELECT business_id FROM public.business_members WHERE user_id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_business_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
    SELECT business_id FROM public.business_members WHERE user_id = (select auth.uid()) AND role = 'admin';
$$;

-- 3. Solidify business_members policies
DROP POLICY IF EXISTS "Members can view fellow members" ON public.business_members;
CREATE POLICY "Members can view fellow members" ON public.business_members 
    FOR SELECT 
    USING (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT public.get_my_business_ids())
    );

DROP POLICY IF EXISTS "Admins can insert members" ON public.business_members;
CREATE POLICY "Admins can insert members" ON public.business_members 
    FOR INSERT 
    WITH CHECK (
        user_id = (select auth.uid()) 
        OR business_id IN (SELECT public.get_my_admin_business_ids())
    );

DROP POLICY IF EXISTS "Admins can update members" ON public.business_members;
CREATE POLICY "Admins can update members" ON public.business_members 
    FOR UPDATE 
    USING (business_id IN (SELECT public.get_my_admin_business_ids()));

-- 4. Set Business Policies 
DROP POLICY IF EXISTS "Members can view their business" ON public.businesses;
CREATE POLICY "Members can view their business" ON public.businesses 
    FOR SELECT USING (id IN (SELECT public.get_my_business_ids()));

-- 5. Set Business Config Policies 
DROP POLICY IF EXISTS "Members can view their config" ON public.business_config;
CREATE POLICY "Members can view their config" ON public.business_config 
    FOR SELECT USING (business_id IN (SELECT public.get_my_business_ids()));

DROP POLICY IF EXISTS "Admins can update config" ON public.business_config;
CREATE POLICY "Admins can update config" ON public.business_config 
    FOR UPDATE USING (business_id IN (SELECT public.get_my_admin_business_ids()));

