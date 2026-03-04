-- Corregir el error de "permission denied" en auth.users
-- Las políticas RLS de Supabase no pueden consultar directamente la tabla auth.users
-- En su lugar debemos leer el email directamente del JWT de la sesión usando: auth.jwt() ->> 'email'

DROP POLICY IF EXISTS "Members can view invitations for their business" ON business_invitations;
CREATE POLICY "Members can view invitations for their business" ON business_invitations 
    FOR SELECT USING (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid())) OR 
        email = (auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS "Admins can update invitations" ON business_invitations;
CREATE POLICY "Admins can update invitations" ON business_invitations 
    FOR UPDATE USING (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()) AND role = 'admin') OR
        email = (auth.jwt() ->> 'email')
    );

-- Para asegurarse de que los administradores pueden crear invitaciones
DROP POLICY IF EXISTS "Admins can create invitations" ON business_invitations;
CREATE POLICY "Admins can create invitations" ON business_invitations 
    FOR INSERT WITH CHECK (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()) AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can delete invitations" ON business_invitations;
CREATE POLICY "Admins can delete invitations" ON business_invitations 
    FOR DELETE USING (
        business_id IN (SELECT business_id FROM business_members WHERE user_id = (select auth.uid()) AND role = 'admin')
    );
