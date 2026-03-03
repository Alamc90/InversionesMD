-- Migration 06: Fix infinite recursion in RLS policies for business_members
-- ============================================================================
-- The problem: policies on business_members reference business_members itself,
-- causing infinite recursion. Fix: use auth.uid() directly instead of subquery.
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL existing policies on business_members
-- ============================================================================
DROP POLICY IF EXISTS "Members can view fellow members" ON business_members;
DROP POLICY IF EXISTS "Admins can insert members" ON business_members;
DROP POLICY IF EXISTS "Admins can update members" ON business_members;
DROP POLICY IF EXISTS "Admins can delete members" ON business_members;

-- ============================================================================
-- 2. RECREATE policies WITHOUT self-referencing subqueries
-- ============================================================================

-- SELECT: A user can see all members of any business they belong to.
-- Uses a direct check: either the row IS the current user, or the current user
-- has a row in the same business (using EXISTS with a non-recursive check).
CREATE POLICY "Members can view fellow members"
    ON business_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM business_members bm
            WHERE bm.business_id = business_members.business_id
              AND bm.user_id = auth.uid()
        )
    );

-- Hmm, the above still references business_members. We need a SECURITY DEFINER function.

-- Drop the policy we just created (it would still recurse)
DROP POLICY IF EXISTS "Members can view fellow members" ON business_members;

-- ============================================================================
-- 3. Create a SECURITY DEFINER function to check membership without RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- 4. RECREATE all policies using the helper function (no recursion)
-- ============================================================================

-- business_members policies
CREATE POLICY "Members can view fellow members"
    ON business_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR business_id IN (SELECT public.get_my_business_ids())
    );

CREATE POLICY "Admins can insert members"
    ON business_members FOR INSERT
    WITH CHECK (
        -- Admin of the business
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid() AND bm.role = 'admin'
        )
        OR
        -- Self-insert (accepting invitation)
        user_id = auth.uid()
    );
-- The insert policy also self-references... fix it too:
DROP POLICY IF EXISTS "Admins can insert members" ON business_members;

CREATE OR REPLACE FUNCTION public.get_my_admin_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid() AND role = 'admin';
$$;

CREATE POLICY "Admins can insert members"
    ON business_members FOR INSERT
    WITH CHECK (
        business_id IN (SELECT public.get_my_admin_business_ids())
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins can update members"
    ON business_members FOR UPDATE
    USING (business_id IN (SELECT public.get_my_admin_business_ids()));

CREATE POLICY "Admins can delete members"
    ON business_members FOR DELETE
    USING (business_id IN (SELECT public.get_my_admin_business_ids()));

-- ============================================================================
-- 5. Fix businesses policies (they reference business_members too)
-- ============================================================================
DROP POLICY IF EXISTS "Members can view their business" ON businesses;
DROP POLICY IF EXISTS "Admins can update their business" ON businesses;

CREATE POLICY "Members can view their business"
    ON businesses FOR SELECT
    USING (id IN (SELECT public.get_my_business_ids()));

CREATE POLICY "Admins can update their business"
    ON businesses FOR UPDATE
    USING (id IN (SELECT public.get_my_admin_business_ids()));

-- ============================================================================
-- 6. Fix business_invitations policies
-- ============================================================================
DROP POLICY IF EXISTS "Members can view invitations for their business" ON business_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON business_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON business_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON business_invitations;

CREATE POLICY "Members can view invitations for their business"
    ON business_invitations FOR SELECT
    USING (
        business_id IN (SELECT public.get_my_business_ids())
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can create invitations"
    ON business_invitations FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_admin_business_ids()));

CREATE POLICY "Admins can update invitations"
    ON business_invitations FOR UPDATE
    USING (
        business_id IN (SELECT public.get_my_admin_business_ids())
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can delete invitations"
    ON business_invitations FOR DELETE
    USING (business_id IN (SELECT public.get_my_admin_business_ids()));

-- ============================================================================
-- 7. Fix financial_transactions policies
-- ============================================================================
DROP POLICY IF EXISTS "Members can view business transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Members can insert transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON financial_transactions;

CREATE POLICY "Members can view business transactions"
    ON financial_transactions FOR SELECT
    USING (business_id IN (SELECT public.get_my_business_ids()));

CREATE POLICY "Members can insert transactions"
    ON financial_transactions FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_business_ids()));

CREATE POLICY "Admins can update transactions"
    ON financial_transactions FOR UPDATE
    USING (business_id IN (SELECT public.get_my_admin_business_ids()));

CREATE POLICY "Admins can delete transactions"
    ON financial_transactions FOR DELETE
    USING (business_id IN (SELECT public.get_my_admin_business_ids()));

-- ============================================================================
-- 8. Fix policies on existing tables (customers, vehicles, etc.)
-- ============================================================================
DROP POLICY IF EXISTS "Business members can view customers" ON customers;
DROP POLICY IF EXISTS "Business members can insert customers" ON customers;
DROP POLICY IF EXISTS "Business members can update customers" ON customers;

CREATE POLICY "Business members can view customers" ON customers FOR SELECT
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can insert customers" ON customers FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can update customers" ON customers FOR UPDATE
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);

DROP POLICY IF EXISTS "Business members can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Business members can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Business members can update vehicles" ON vehicles;

CREATE POLICY "Business members can view vehicles" ON vehicles FOR SELECT
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can insert vehicles" ON vehicles FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can update vehicles" ON vehicles FOR UPDATE
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);

DROP POLICY IF EXISTS "Business members can view plans" ON installment_plans;
DROP POLICY IF EXISTS "Business members can insert plans" ON installment_plans;
DROP POLICY IF EXISTS "Business members can update plans" ON installment_plans;

CREATE POLICY "Business members can view plans" ON installment_plans FOR SELECT
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can insert plans" ON installment_plans FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can update plans" ON installment_plans FOR UPDATE
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);

DROP POLICY IF EXISTS "Business members can view payments" ON payment_records;
DROP POLICY IF EXISTS "Business members can insert payments" ON payment_records;
DROP POLICY IF EXISTS "Business members can update payments" ON payment_records;

CREATE POLICY "Business members can view payments" ON payment_records FOR SELECT
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can insert payments" ON payment_records FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can update payments" ON payment_records FOR UPDATE
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);

DROP POLICY IF EXISTS "Business members can view templates" ON payment_plan_templates;
DROP POLICY IF EXISTS "Business members can insert templates" ON payment_plan_templates;
DROP POLICY IF EXISTS "Business members can update templates" ON payment_plan_templates;
DROP POLICY IF EXISTS "Business members can delete templates" ON payment_plan_templates;

CREATE POLICY "Business members can view templates" ON payment_plan_templates FOR SELECT
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can insert templates" ON payment_plan_templates FOR INSERT
    WITH CHECK (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can update templates" ON payment_plan_templates FOR UPDATE
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
CREATE POLICY "Business members can delete templates" ON payment_plan_templates FOR DELETE
    USING (business_id IN (SELECT public.get_my_business_ids()) OR business_id IS NULL);
