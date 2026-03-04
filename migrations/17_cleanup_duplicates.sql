-- 17_cleanup_duplicates.sql
-- =========================================================================
-- This script cleans up duplicate memberships and businesses that might exist
-- from previous failed "infinite loop" attempts.

-- 1. Remove duplicate memberships (keep the most recent one)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY created_at DESC
         ) as row_num
  FROM public.business_members
)
DELETE FROM public.business_members
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 2. Remove orphaned businesses (businesses with no members)
DELETE FROM public.businesses
WHERE id NOT IN (SELECT business_id FROM public.business_members);

-- 3. Ensure the RPC is strictly correct (re-applying just in case)
CREATE OR REPLACE FUNCTION public.create_business_with_admin(
    p_name TEXT,
    p_nit TEXT DEFAULT '',
    p_address TEXT DEFAULT '',
    p_phone TEXT DEFAULT '',
    p_display_name TEXT DEFAULT 'Admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_business_id UUID;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Return existing if found
    IF EXISTS (SELECT 1 FROM public.business_members WHERE user_id = v_user_id) THEN   
        SELECT json_build_object(
            'id', b.id, 'name', b.name, 'nit', b.nit,
            'address', b.address, 'phone', b.phone, 'already_existed', true
        ) INTO v_result
        FROM public.businesses b
        JOIN public.business_members bm ON bm.business_id = b.id
        WHERE bm.user_id = v_user_id
        LIMIT 1;
        RETURN v_result;
    END IF;

    -- Create new
    INSERT INTO public.businesses (name, nit, address, phone, created_by)
    VALUES (p_name, p_nit, p_address, p_phone, v_user_id)
    RETURNING id INTO v_business_id;

    INSERT INTO public.business_members (business_id, user_id, role, display_name, permissions)
    VALUES (
        v_business_id, v_user_id, 'admin', p_display_name,
        '{"can_view_dashboard":true,"can_create_deliveries":true,"can_process_payments":true,"can_approve_payments":true,"can_view_balance":true,"can_manage_records":true,"can_manage_config":true,"can_manage_users":true}'::jsonb
    );

    -- Migrate orphans
    UPDATE public.customers SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE public.vehicles SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE public.installment_plans SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE public.payment_records SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;

    SELECT json_build_object(
        'id', v_business_id, 'name', p_name, 'already_existed', false
    ) INTO v_result;
    RETURN v_result;
END;
$$;
