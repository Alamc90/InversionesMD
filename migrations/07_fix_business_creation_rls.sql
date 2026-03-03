-- Migration 07: Fix business creation RLS
-- The problem: after INSERT on businesses, the .select() fails because
-- the SELECT policy requires membership, but member hasn't been created yet.
-- Fix: Also allow the creator to SELECT their own business.

-- Fix businesses SELECT policy  
DROP POLICY IF EXISTS "Members can view their business" ON businesses;
CREATE POLICY "Members can view their business"
    ON businesses FOR SELECT
    USING (
        id IN (SELECT public.get_my_business_ids())
        OR created_by = auth.uid()
    );

-- Fix business_members INSERT policy — ensure self-insert always works
DROP POLICY IF EXISTS "Admins can insert members" ON business_members;
CREATE POLICY "Users can insert own membership or admins can insert"
    ON business_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR business_id IN (SELECT public.get_my_admin_business_ids())
    );
