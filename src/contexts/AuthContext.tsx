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
        // Check membership (with retry for transient network errors)
        const { data: memberData, error: memberError } = await withRetry(async () => {
            const result = await supabase
                .from('business_members')
                .select('*, businesses(*)')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle();

            // Si la tabla no existe (42P01), es local sin migraciones
            if (result.error && (result.error.code === '42P01' || result.error.message?.includes('does not exist'))) {
                return { data: null, error: { ...result.error, isMissingTable: true } };
            }

            // Only retry on network-level errors, not on Supabase/RLS errors
            if (result.error && !result.error.code) {
                throw result.error;
            }
            return result;
        }, 2, 1000);

        if (memberError && (memberError as any).isMissingTable) {
            return {
                business: { name: 'InversionesMD' } as Business,
                membership: null,
                permissions: ALL_PERMISSIONS,
                isAdmin: true,
                tablesNotReady: true,
            };
        }

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

                    // 409 means Conflict (The member already exists due to a parallel race condition)
                    if (insertError && insertError.code === '23505') {
                        console.log('[AuthContext] Member already inserted. Retrying fetch...');
                        return fetchMembership(userId); // Loop back once
                    }

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

    useEffect(() => {
        let isMounted = true;
        // Safety net: always stop loading after max timeout
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                setLoading((current) => {
                    if (current) {
                        console.warn('[AuthContext] Safety timeout: forcing loading=false after 30s');
                    }
                    return false;
                });
            }
        }, 30000);

        const checkAuth = async (s: Session | null, forceSetLoading: boolean = true) => {
            if (!isMounted) return;
            setSession(s);
            setUser(s?.user ?? null);

            if (s?.user) {
                // Solo mostrar loader de pantalla completa si es forzado o si no hay datos previos
                if (forceSetLoading && !membershipCache.current) {
                    setLoading(true);
                }
                
                // Use timeout to prevent hanging on auth state changes
                const { value: result, timedOut } = await withTimeout(
                    fetchMembership(s.user.id),
                    15000,
                    membershipCache.current || { business: null, membership: null, permissions: defaultPermissions, isAdmin: false, tablesNotReady: false }
                );
                
                if (isMounted && !timedOut) {
                    applyMembership(result);
                } else if (isMounted && timedOut) {
                    // Try to apply whatever we have, or at least show connection failed
                    applyMembership(membershipCache.current || { business: null, membership: null, permissions: defaultPermissions, isAdmin: false, tablesNotReady: false }, true);
                    
                    // If timed out, schedule a silent auto-retry in background
                    const userId = s.user.id;
                    setTimeout(async () => {
                        if (!isMounted) return;
                        console.log('[AuthContext] Auto-retrying membership fetch after timeout...');
                        try {
                            const retryResult = await fetchMembership(userId);
                            if (isMounted) applyMembership(retryResult, false);
                        } catch (e) {
                            console.error('[AuthContext] Auto-retry failed:', e);
                        }
                    }, 3000);
                }
                
                if (isMounted) setLoading(false);
            } else {
                membershipCache.current = null;
                if (isMounted) {
                    setBusiness(null);
                    setMembership(null);
                    setPermissions(defaultPermissions);
                    setIsAdmin(false);
                    setLoading(false);
                }
            }
            if (isMounted) clearTimeout(safetyTimeout);
        };

        const initSession = async () => {
            try {
                const { data: { session: s } } = await supabase.auth.getSession();
                await checkAuth(s, true);
            } catch (error) {
                console.error('[AuthContext] init error:', error);
                if (isMounted) setLoading(false);
            }
        };

        let initSessionTriggered = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
            if (!isMounted) return;
            
            // Allow manual sync logic to happen first before processing events
            if (_event === 'INITIAL_SESSION') {
                if (!initSessionTriggered) {
                    initSessionTriggered = true;
                    initSession();
                }
                return;
            }
            
            // Si ya tenemos en caché la información de membresía y el id de usuario coincide,
            // simplemente actualizamos la sesión pero omitimos la recarga completa para evitar loops de UI
            if (s?.user && membershipCache.current?.membership?.user_id === s.user.id) {
                setSession(s);
                setUser(s.user);
                return;
            }
            
            await checkAuth(s, false); // For external state changes avoid blasting UI loader
        });

        // Fail-safe init call in case INITIAL_SESSION event bug happens in Supabase
        if (!initSessionTriggered) {
             initSessionTriggered = true;
             initSession();
        }

        return () => {
            isMounted = false;
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
