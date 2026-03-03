"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Business, BusinessMember, UserPermissions, DEFAULT_ADMIN_PERMISSIONS } from '@/models/Business';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    business: Business | null;
    membership: BusinessMember | null;
    permissions: UserPermissions;
    loading: boolean;
    isAdmin: boolean;
    tablesNotReady: boolean;
    hasPermission: (permission: keyof UserPermissions) => boolean;
    refreshMembership: () => Promise<void>;
}

const defaultPermissions: UserPermissions = {
    can_view_dashboard: false,
    can_create_deliveries: false,
    can_process_payments: false,
    can_approve_payments: false,
    can_view_balance: false,
    can_manage_records: false,
    can_manage_config: false,
    can_manage_users: false,
};

const ALL_PERMISSIONS: UserPermissions = {
    can_view_dashboard: true,
    can_create_deliveries: true,
    can_process_payments: true,
    can_approve_payments: true,
    can_view_balance: true,
    can_manage_records: true,
    can_manage_config: true,
    can_manage_users: true,
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    business: null,
    membership: null,
    permissions: defaultPermissions,
    loading: true,
    isAdmin: false,
    tablesNotReady: false,
    hasPermission: () => false,
    refreshMembership: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ---- Helper functions (outside component to avoid re-creation) ----

async function checkTablesExist(): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('business_members')
            .select('id')
            .limit(0);
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
            return false;
        }
        return !error;
    } catch {
        return false;
    }
}

interface MembershipResult {
    business: Business | null;
    membership: BusinessMember | null;
    permissions: UserPermissions;
    isAdmin: boolean;
    tablesNotReady: boolean;
}

async function fetchMembership(userId: string): Promise<MembershipResult> {
    const empty: MembershipResult = {
        business: null, membership: null,
        permissions: defaultPermissions, isAdmin: false, tablesNotReady: false,
    };

    try {
        const tablesExist = await checkTablesExist();

        if (!tablesExist) {
            return {
                business: { name: 'InversionesMD' } as Business,
                membership: null,
                permissions: ALL_PERMISSIONS,
                isAdmin: true,
                tablesNotReady: true,
            };
        }

        // Check membership
        const { data: memberData, error: memberError } = await supabase
            .from('business_members')
            .select('*, businesses(*)')
            .eq('user_id', userId)
            .maybeSingle();

        if (memberError && memberError.code !== 'PGRST116') {
            console.error('Error fetching membership:', memberError);
        }

        if (memberData) {
            let biz = memberData.businesses as unknown as Business;
            
            // If the join didn't return business data (RLS on businesses table), fetch separately
            if (!biz || !biz.id) {
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('id', memberData.business_id)
                    .maybeSingle();
                biz = bizData as Business;
            }

            const admin = memberData.role === 'admin';
            return {
                business: biz,
                membership: memberData,
                permissions: admin ? DEFAULT_ADMIN_PERMISSIONS : (memberData.permissions || defaultPermissions),
                isAdmin: admin,
                tablesNotReady: false,
            };
        }

        // Check pending invitations
        try {
            const { data: userData } = await supabase.auth.getUser();
            const email = userData?.user?.email;
            if (email) {
                const { data: invitation } = await supabase
                    .from('business_invitations')
                    .select('*')
                    .eq('email', email)
                    .eq('accepted', false)
                    .maybeSingle();

                if (invitation) {
                    const displayName = userData.user?.user_metadata?.first_name
                        ? `${userData.user.user_metadata.first_name} ${userData.user.user_metadata.last_name || ''}`.trim()
                        : email;

                    const { data: newMember, error: insertError } = await supabase
                        .from('business_members')
                        .insert({
                            business_id: invitation.business_id,
                            user_id: userId,
                            role: invitation.role,
                            display_name: displayName,
                            permissions: invitation.permissions,
                        })
                        .select('*, businesses(*)')
                        .single();

                    if (!insertError && newMember) {
                        await supabase
                            .from('business_invitations')
                            .update({ accepted: true })
                            .eq('id', invitation.id);

                        const biz = newMember.businesses as unknown as Business;
                        const admin = newMember.role === 'admin';
                        return {
                            business: biz,
                            membership: newMember,
                            permissions: admin ? DEFAULT_ADMIN_PERMISSIONS : (newMember.permissions || defaultPermissions),
                            isAdmin: admin,
                            tablesNotReady: false,
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Error checking invitations:', e);
        }

        return empty;
    } catch (error) {
        console.error('Error in fetchMembership:', error);
        return empty;
    }
}

// ---- Provider Component ----

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [membership, setMembership] = useState<BusinessMember | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [tablesNotReady, setTablesNotReady] = useState(false);
    const initDone = useRef(false);

    const applyMembership = (result: MembershipResult) => {
        setBusiness(result.business);
        setMembership(result.membership);
        setPermissions(result.permissions);
        setIsAdmin(result.isAdmin);
        setTablesNotReady(result.tablesNotReady);
    };

    // Single init — no unstable deps, runs once
    useEffect(() => {
        // Guard against React Strict Mode double-execution
        if (initDone.current) return;
        initDone.current = true;

        const init = async () => {
            try {
                const { data: { session: s } } = await supabase.auth.getSession();
                setSession(s);
                setUser(s?.user ?? null);

                if (s?.user) {
                    const result = await fetchMembership(s.user.id);
                    applyMembership(result);
                }
            } catch (error) {
                console.error('[AuthContext] init error:', error);
            } finally {
                setLoading(false);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
            setSession(s);
            setUser(s?.user ?? null);

            if (s?.user) {
                const result = await fetchMembership(s.user.id);
                applyMembership(result);
            } else {
                setBusiness(null);
                setMembership(null);
                setPermissions(defaultPermissions);
                setIsAdmin(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshMembership = useCallback(async () => {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.user) {
            const result = await fetchMembership(s.user.id);
            applyMembership(result);
        }
    }, []);

    const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
        if (isAdmin || tablesNotReady) return true;
        return permissions[permission] === true;
    }, [permissions, isAdmin, tablesNotReady]);

    return (
        <AuthContext.Provider value={{
            session, user, business, membership, permissions,
            loading, isAdmin, tablesNotReady,
            hasPermission, refreshMembership,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
