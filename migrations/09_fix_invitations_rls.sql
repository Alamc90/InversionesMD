-- Migration 09: Fix business_invitations RLS policy
-- The auth.users table is not accessible from RLS policies.
-- Use auth.jwt() ->> 'email' instead.

DROP POLICY IF EXISTS "Members can view invitations for their business" ON business_invitations;
CREATE POLICY "Members can view invitations for their business"
    ON business_invitations FOR SELECT
    USING (
        business_id IN (SELECT public.get_my_business_ids())
        OR email = (auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS "Admins can update invitations" ON business_invitations;
CREATE POLICY "Admins can update invitations"
    ON business_invitations FOR UPDATE
    USING (
        business_id IN (SELECT public.get_my_admin_business_ids())
        OR email = (auth.jwt() ->> 'email')
    );
