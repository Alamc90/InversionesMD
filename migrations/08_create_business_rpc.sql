-- Migration 08: Create RPC function for atomic business creation
-- This bypasses RLS issues by using SECURITY DEFINER
-- ============================================================================

-- First, clean up any orphan businesses from failed attempts
DELETE FROM businesses WHERE id NOT IN (SELECT business_id FROM business_members);

-- Create the atomic function
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
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_business_id UUID;
    v_result JSON;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if user already has a business
    IF EXISTS (SELECT 1 FROM business_members WHERE user_id = v_user_id) THEN
        -- Return existing business
        SELECT json_build_object(
            'id', b.id,
            'name', b.name,
            'nit', b.nit,
            'address', b.address,
            'phone', b.phone,
            'already_existed', true
        ) INTO v_result
        FROM businesses b
        JOIN business_members bm ON bm.business_id = b.id
        WHERE bm.user_id = v_user_id
        LIMIT 1;
        
        RETURN v_result;
    END IF;

    -- Create business
    INSERT INTO businesses (name, nit, address, phone, created_by)
    VALUES (p_name, p_nit, p_address, p_phone, v_user_id)
    RETURNING id INTO v_business_id;

    -- Create admin membership
    INSERT INTO business_members (business_id, user_id, role, display_name, permissions)
    VALUES (
        v_business_id,
        v_user_id,
        'admin',
        p_display_name,
        '{"can_view_dashboard":true,"can_create_deliveries":true,"can_process_payments":true,"can_approve_payments":true,"can_view_balance":true,"can_manage_records":true,"can_manage_config":true,"can_manage_users":true}'::jsonb
    );

    -- Migrate existing user data to business
    UPDATE customers SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE vehicles SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE installment_plans SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE payment_records SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;
    UPDATE payment_plan_templates SET business_id = v_business_id WHERE user_id = v_user_id AND business_id IS NULL;

    -- Return result
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
