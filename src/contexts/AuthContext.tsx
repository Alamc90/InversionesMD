"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, clearCorruptedAuthTokens } from '@/config/supabaseClient';
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
    loadingSlow: boolean;
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
    loadingSlow: false,
    hasPermission: () => false,
    refreshMembership: async () => { },
});

export const useAuth = () => useContext(AuthContext);

// ---- Constants ----
const AUTH_TIMEOUT_MS = 5000; // 5 seconds, matching Stockwear
const RELOAD_FLAG_KEY = 'auth_deadlock_reload';

// ---- Helper: Promise.race with timeout (Stockwear pattern) ----

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(`[AuthContext] Timeout reached (${ms}ms) for: ${label}`);
            resolve(null);
        }, ms);
    });

    return Promise.race([promise, timeoutPromise]).then((result) => {
        clearTimeout(timeoutId);
        return result;
    });
}

// ---- Helper functions (outside component to avoid re-creation) ----

interface MembershipResult {
    business: Business | null;
    membership: BusinessMember | null;
    permissions: UserPermissions;
    isAdmin: boolean;
    tablesNotReady: boolean;
}

/**
 * Simplified fetchMembership — no internal retries or AbortControllers.
 * The timeout control is handled at the caller level via Promise.race.
 */
async function fetchMembership(user: User): Promise<MembershipResult> {
    const empty: MembershipResult = {
        business: null, membership: null,
        permissions: defaultPermissions, isAdmin: false, tablesNotReady: false,
    };

    try {
        console.log('[AuthContext] Fetching membership...');
        const result = await supabase
            .from('business_members')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

        // Si la tabla no existe (42P01), es local sin migraciones
        if (result.error && (result.error.code === '42P01' || result.error.message?.includes('does not exist'))) {
            return {
                business: { name: 'InversionesMD' } as Business,
                membership: null,
                permissions: ALL_PERMISSIONS,
                isAdmin: true,
                tablesNotReady: true,
            };
        }

        if (result.error && result.error.code !== 'PGRST116') {
            console.error('Error fetching membership:', result.error);

            // Check for refresh token errors (Stockwear pattern)
            if (result.error.message?.includes('Refresh Token')) {
                console.warn('🧹 Corrupted refresh token detected in fetchMembership');
                clearCorruptedAuthTokens();
            }

            throw result.error;
        }

        const memberData = result.data;

        if (memberData) {
            let biz: Business | null = null;

            // Fetch business separately (RLS checks are safer this way)
            if (memberData.business_id) {
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
            const email = user.email;
            if (email) {
                const invitationResult = await supabase
                    .from('business_invitations')
                    .select('*')
                    .eq('email', email)
                    .eq('accepted', false)
                    .maybeSingle();

                if (invitationResult.error) {
                    throw invitationResult.error;
                }

                const invitation = invitationResult.data;

                if (invitation) {
                    const displayName = user.user_metadata?.first_name
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
                        : email;

                    const { data: newMember, error: insertError } = await supabase
                        .from('business_members')
                        .insert({
                            business_id: invitation.business_id,
                            user_id: user.id,
                            role: invitation.role,
                            display_name: displayName,
                            permissions: invitation.permissions,
                        })
                        .select('*, businesses(*)')
                        .single();

                    // 23505 means unique constraint violation (member already exists)
                    if (insertError && insertError.code === '23505') {
                        console.log('[AuthContext] Member already inserted. Retrying fetch...');
                        return fetchMembership(user); // Loop back once
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
        // Check for refresh token errors (Stockwear pattern)
        if (error instanceof Error && error.message?.includes('Refresh Token')) {
            console.warn('🧹 Corrupted refresh token detected in fetchMembership catch');
            clearCorruptedAuthTokens();
        }
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
    const [loadingSlow, setLoadingSlow] = useState(false);
    const membershipCache = useRef<MembershipResult | null>(null);
    const initDone = useRef(false);

    const applyMembership = useCallback((result: MembershipResult) => {
        membershipCache.current = result;
        setBusiness(result.business);
        setMembership(result.membership);
        setPermissions(result.permissions);
        setIsAdmin(result.isAdmin);
        setTablesNotReady(result.tablesNotReady);
    }, []);

    // ---- Mount-based initialization (Stockwear pattern) ----
    // Instead of relying on onAuthStateChange for the initial load,
    // we proactively fetch the session on mount and wrap it in a timeout.
    useEffect(() => {
        let isMounted = true;
        let slowTimer: ReturnType<typeof setTimeout>;

        const initialize = async () => {
            console.log('[AuthContext] Initializing (mount-based)...');

            // Show slow loading indicator after 3 seconds
            slowTimer = setTimeout(() => {
                if (isMounted) setLoadingSlow(true);
            }, 3000);

            try {
                // Step 1: Get session with timeout (Stockwear pattern)
                const sessionResult = await withTimeout(
                    supabase.auth.getSession(),
                    AUTH_TIMEOUT_MS,
                    'getSession'
                );

                if (!isMounted) return;

                // Timeout case: sessionResult is null
                if (!sessionResult) {
                    console.warn('[AuthContext] getSession timed out — possible Supabase deadlock');
                    handleDeadlockRecovery();
                    return;
                }

                const currentSession = sessionResult.data?.session;

                if (!currentSession) {
                    // No session = not logged in
                    console.log('[AuthContext] No session found');
                    if (isMounted) {
                        setSession(null);
                        setUser(null);
                        setBusiness(null);
                        setMembership(null);
                        setPermissions(defaultPermissions);
                        setIsAdmin(false);
                        setLoading(false);
                    }
                    return;
                }

                // We have a session
                if (isMounted) {
                    setSession(currentSession);
                    setUser(currentSession.user);
                }

                // Step 2: Fetch membership with timeout (Stockwear pattern)
                const membershipResult = await withTimeout(
                    fetchMembership(currentSession.user),
                    AUTH_TIMEOUT_MS,
                    'fetchMembership'
                );

                if (!isMounted) return;

                if (!membershipResult) {
                    console.warn('[AuthContext] fetchMembership timed out');
                    handleDeadlockRecovery();
                    return;
                }

                applyMembership(membershipResult);

            } catch (error) {
                console.error('[AuthContext] Initialization error:', error);

                if (error instanceof Error && error.message?.includes('Refresh Token')) {
                    console.warn('🧹 Corrupted refresh token detected during init');
                    clearCorruptedAuthTokens();
                }
            } finally {
                if (isMounted) {
                    clearTimeout(slowTimer);
                    setLoadingSlow(false);
                    setLoading(false);
                    initDone.current = true;
                    // Clear the reload flag on successful initialization
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem(RELOAD_FLAG_KEY);
                    }
                }
            }
        };

        /**
         * Deadlock recovery: if the Supabase client is stuck (internal lock),
         * attempt a single hard page reload. This historically breaks the deadlock.
         * A sessionStorage flag prevents infinite reload loops.
         */
        const handleDeadlockRecovery = () => {
            if (typeof window === 'undefined' || !isMounted) return;

            const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG_KEY);
            if (alreadyReloaded) {
                // Already tried reloading once — give up and show the app as logged out
                console.warn('[AuthContext] Deadlock persists after reload. Falling back to logged-out state.');
                sessionStorage.removeItem(RELOAD_FLAG_KEY);
                setSession(null);
                setUser(null);
                setBusiness(null);
                setMembership(null);
                setPermissions(defaultPermissions);
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            console.log('[AuthContext] Attempting deadlock recovery via page reload...');
            sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
            clearCorruptedAuthTokens();
            window.location.reload();
        };

        initialize();

        // ---- Passive onAuthStateChange listener (Stockwear pattern) ----
        // This listener does NOT trigger the initial load. It only reacts to
        // subsequent auth events like sign-out or token refresh.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!isMounted) return;

            // Ignore the INITIAL_SESSION event — we handle it ourselves above
            if (event === 'INITIAL_SESSION') return;

            if (event === 'SIGNED_OUT') {
                console.log('[AuthContext] User signed out');
                membershipCache.current = null;
                setSession(null);
                setUser(null);
                setBusiness(null);
                setMembership(null);
                setPermissions(defaultPermissions);
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            if (event === 'TOKEN_REFRESHED' && s) {
                // Just update the session/user objects in memory, don't re-fetch membership
                setSession(s);
                setUser(s.user);
                return;
            }

            if (event === 'SIGNED_IN' && s) {
                // If the cache already has this user's data, just update session
                if (membershipCache.current?.membership?.user_id === s.user.id) {
                    setSession(s);
                    setUser(s.user);
                    return;
                }

                // New sign-in (different user or first time) — re-fetch membership
                setSession(s);
                setUser(s.user);
                try {
                    const result = await withTimeout(
                        fetchMembership(s.user),
                        AUTH_TIMEOUT_MS,
                        'fetchMembership (SIGNED_IN)'
                    );
                    if (isMounted && result) {
                        applyMembership(result);
                    }
                } catch (error) {
                    console.error('[AuthContext] Error fetching membership on SIGNED_IN:', error);
                }
                if (isMounted) setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(slowTimer);
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshMembership = useCallback(async () => {
        const sessionResult = await withTimeout(
            supabase.auth.getSession(),
            AUTH_TIMEOUT_MS,
            'refreshMembership.getSession'
        );
        if (sessionResult?.data?.session?.user) {
            const result = await withTimeout(
                fetchMembership(sessionResult.data.session.user),
                AUTH_TIMEOUT_MS,
                'refreshMembership.fetchMembership'
            );
            if (result) {
                applyMembership(result);
            }
        }
    }, [applyMembership]);

    const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
        if (isAdmin || tablesNotReady) return true;
        return permissions[permission] === true;
    }, [permissions, isAdmin, tablesNotReady]);

    return (
        <AuthContext.Provider value={{
            session, user, business, membership, permissions,
            loading, isAdmin, tablesNotReady, loadingSlow,
            hasPermission, refreshMembership,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
