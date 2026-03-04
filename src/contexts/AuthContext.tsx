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
    connectionFailed: boolean;
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
    connectionFailed: false,
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
    timedOut?: boolean;
}

// Wraps a promise with a timeout to prevent hanging forever
// IMPORTANT: Cleans up the timer when the promise resolves to avoid orphaned warnings
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<{ value: T; timedOut: boolean }> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([
        promise.then(value => {
            clearTimeout(timer);
            return { value, timedOut: false };
        }),
        new Promise<{ value: T; timedOut: boolean }>((resolve) => {
            timer = setTimeout(() => {
                console.warn(`[AuthContext] Operation timed out after ${ms}ms`);
                resolve({ value: fallback, timedOut: true });
            }, ms);
        }),
    ]);
}

// Retry a function with exponential backoff
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.warn(`[AuthContext] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

async function fetchMembership(userId: string): Promise<MembershipResult> {
    const empty: MembershipResult = {
        business: null, membership: null,
        permissions: defaultPermissions, isAdmin: false, tablesNotReady: false,
    };

    try {
        const { value: tablesExist } = await withTimeout(checkTablesExist(), 8000, true);

        if (!tablesExist) {
            return {
                business: { name: 'InversionesMD' } as Business,
                membership: null,
                permissions: ALL_PERMISSIONS,
                isAdmin: true,
                tablesNotReady: true,
            };
        }

        // Check membership (with retry for transient network errors)
        const { data: memberData, error: memberError } = await withRetry(async () => {
            const result = await supabase
                .from('business_members')
                .select('*, businesses(*)')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle();
            // Only retry on network-level errors, not on Supabase/RLS errors
            if (result.error && !result.error.code) {
                throw result.error;
            }
            return result;
        }, 2, 1500);

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
    const [connectionFailed, setConnectionFailed] = useState(false);
    const initDone = useRef(false);
    const membershipCache = useRef<MembershipResult | null>(null);

    const applyMembership = (result: MembershipResult, didTimeout: boolean = false) => {
        membershipCache.current = result;
        setBusiness(result.business);
        setMembership(result.membership);
        setPermissions(result.permissions);
        setIsAdmin(result.isAdmin);
        setTablesNotReady(result.tablesNotReady);
        setConnectionFailed(didTimeout);
    };

    // Single init — guarded by initDone ref to prevent double-runs in StrictMode
    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        // Safety net: always stop loading after max timeout
        const safetyTimeout = setTimeout(() => {
            setLoading((current) => {
                if (current) {
                    console.warn('[AuthContext] Safety timeout: forcing loading=false after 30s');
                }
                return false;
            });
        }, 30000);

        const init = async () => {
            try {
                const { data: { session: s } } = await supabase.auth.getSession();
                setSession(s);
                setUser(s?.user ?? null);

                if (s?.user) {
                    const { value: result, timedOut } = await withTimeout(
                        fetchMembership(s.user.id),
                        20000,
                        { business: null, membership: null, permissions: defaultPermissions, isAdmin: false, tablesNotReady: false }
                    );
                    applyMembership(result, timedOut);

                    // If timed out, schedule a silent auto-retry in background
                    if (timedOut && s.user) {
                        const userId = s.user.id;
                        setTimeout(async () => {
                            console.log('[AuthContext] Auto-retrying membership fetch after timeout...');
                            try {
                                const retryResult = await fetchMembership(userId);
                                applyMembership(retryResult, false);
                            } catch (e) {
                                console.error('[AuthContext] Auto-retry failed:', e);
                            }
                        }, 3000);
                    }
                }
            } catch (error) {
                console.error('[AuthContext] init error:', error);
            } finally {
                clearTimeout(safetyTimeout);
                setLoading(false);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
            setSession(s);
            setUser(s?.user ?? null);

            if (s?.user) {
                // If we already have membership data cached, skip re-fetch on TOKEN_REFRESHED
                if (_event === 'TOKEN_REFRESHED' && membershipCache.current?.business) {
                    return;
                }
                // Use timeout to prevent hanging on auth state changes
                const { value: result, timedOut } = await withTimeout(
                    fetchMembership(s.user.id),
                    15000,
                    membershipCache.current || { business: null, membership: null, permissions: defaultPermissions, isAdmin: false, tablesNotReady: false }
                );
                if (!timedOut) {
                    applyMembership(result);
                }
            } else {
                membershipCache.current = null;
                setBusiness(null);
                setMembership(null);
                setPermissions(defaultPermissions);
                setIsAdmin(false);
            }
        });

        return () => {
            clearTimeout(safetyTimeout);
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
            loading, isAdmin, tablesNotReady, connectionFailed,
            hasPermission, refreshMembership,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
