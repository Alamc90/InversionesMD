import { supabase } from '@/config/supabaseClient';
import { Business, BusinessMember, BusinessInvitation, UserPermissions, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS } from '@/models/Business';

export const BusinessService = {
    /**
     * Create a new business and make the current user its admin
     */
    async createBusiness(business: Partial<Business>): Promise<Business> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const displayName = user.user_metadata?.first_name 
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
            : user.email || 'Admin';

        // Use RPC to create business + membership atomically (bypasses RLS chicken-and-egg)
        const { data, error } = await supabase.rpc('create_business_with_admin', {
            p_name: business.name || '',
            p_nit: business.nit || '',
            p_address: business.address || '',
            p_phone: business.phone || '',
            p_display_name: displayName,
        });

        if (error) {
            console.error('Error creating business via RPC:', error);
            throw new Error(`Error al crear negocio: ${error.message}`);
        }

        return data as Business;
    },

    /**
     * Migrate existing user_id-based data to business_id
     */
    async migrateExistingData(userId: string, businessId: string) {
        // Update all existing records that belong to this user
        const tables = ['customers', 'vehicles', 'installment_plans', 'payment_records', 'payment_plan_templates'];
        
        for (const table of tables) {
            await supabase
                .from(table)
                .update({ business_id: businessId })
                .eq('user_id', userId)
                .is('business_id', null);
        }
    },

    /**
     * Update business details
     */
    async updateBusiness(businessId: string, updates: Partial<Business>) {
        const { data, error } = await supabase
            .from('businesses')
            .update({
                name: updates.name,
                nit: updates.nit,
                address: updates.address,
                phone: updates.phone,
                updated_at: new Date().toISOString(),
            })
            .eq('id', businessId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all members of a business
     */
    async getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
        const { data, error } = await supabase
            .from('business_members')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Update a member's role and permissions
     */
    async updateMember(memberId: string, updates: { role?: string; permissions?: UserPermissions; display_name?: string }) {
        const { data, error } = await supabase
            .from('business_members')
            .update(updates)
            .eq('id', memberId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Remove a member from the business
     */
    async removeMember(memberId: string) {
        const { error } = await supabase
            .from('business_members')
            .delete()
            .eq('id', memberId);

        if (error) throw error;
    },

    /**
     * Create an invitation for a new user
     */
    async createInvitation(
        businessId: string, 
        email: string, 
        role: 'admin' | 'employee' = 'employee',
        permissions?: UserPermissions
    ): Promise<BusinessInvitation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const finalPermissions = permissions || (role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS);

        const { data, error } = await supabase
            .from('business_invitations')
            .insert({
                business_id: businessId,
                email: email.toLowerCase().trim(),
                role,
                permissions: finalPermissions,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all invitations for a business
     */
    async getInvitations(businessId: string): Promise<BusinessInvitation[]> {
        const { data, error } = await supabase
            .from('business_invitations')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Delete an invitation
     */
    async deleteInvitation(invitationId: string) {
        const { error } = await supabase
            .from('business_invitations')
            .delete()
            .eq('id', invitationId);

        if (error) throw error;
    },

    /**
     * Get the business for the current user
     */
    async getCurrentBusiness(): Promise<{ business: Business; membership: BusinessMember } | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('business_members')
            .select('*, businesses(*)')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error || !data) return null;

        return {
            business: data.businesses as unknown as Business,
            membership: data,
        };
    },
};
