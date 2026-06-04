"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, clearCorruptedAuthTokens } from '@/config/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Business, BusinessMember, UserPermissions, DEFAULT_ADMIN_PERMISSIONS } from '@/models/Business';
import { AlertTriangle } from 'lucide-react';

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
    syncError: boolean;
    hasPermission: (permission: keyof UserPermissions) => boolean;
    refreshMembership: () => Promise<void>;
    retryInit: () => void;
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
    syncError: false,
    hasPermission: () => false,
    refreshMembership: async () => { },
    retryInit: () => { },
});

export const useAuth = () => useContext(AuthContext);

const AUTH_TIMEOUT_MS = 5000;

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

interface MembershipResult {
    business: Business | null;
    membership: BusinessMember | null;
    permissions: UserPermissions;
    isAdmin: boolean;
    tablesNotReady: boolean;
}

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
            if (result.error.message?.includes('Refresh Token')) {
                console.warn('🧹 Corrupted refresh token detected in fetchMembership');
                clearCorruptedAuthTokens();
            }
            throw result.error;
        }

        const memberData = result.data;

        if (memberData) {
            let biz: Business | null = null;
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

                    if (insertError && insertError.code === '23505') {
                        console.log('[AuthContext] Member already inserted. Retrying fetch...');
                        return fetchMembership(user);
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
        if (error instanceof Error && error.message?.includes('Refresh Token')) {
            console.warn('🧹 Corrupted refresh token detected in fetchMembership catch');
            clearCorruptedAuthTokens();
        }
        console.error('Error in fetchMembership:', error);
        return empty;
    }
}

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
    const [syncError, setSyncError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const autoRetryCount = useRef(0);
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

    // ---- Event-Driven Initialization (v8) ----
    useEffect(() => {
        let isMounted = true;
        let slowTimer: ReturnType<typeof setTimeout>;
        let watchdogTimer: ReturnType<typeof setTimeout>;

        console.log(`[AuthContext] Initializing (event-driven, retry: ${retryCount})...`);
        setSyncError(false);

        slowTimer = setTimeout(() => {
            if (isMounted) setLoadingSlow(true);
        }, 5000);

        // Fail-safe if Supabase events totally hang or fetch fails
        const triggerFailureRecovery = () => {
            if (!isMounted) return;
            if (autoRetryCount.current < 2) {
                autoRetryCount.current += 1;
                console.log(`[AuthContext] Event timeout or failure. Auto-retrying... (${autoRetryCount.current}/2)`);
                setRetryCount(prev => prev + 1);
            } else {
                console.log('[AuthContext] Max auto-retries reached. Displaying sync error recovery UI.');
                setSyncError(true);
                setLoading(false);
                setLoadingSlow(false);
            }
        };

        // Watchdog: If INITIAL_SESSION doesn't fire within 5s, something is badly locked
        watchdogTimer = setTimeout(() => {
            if (isMounted && !initDone.current) {
                console.warn('[AuthContext] Watchdog: INITIAL_SESSION or fetchMembership timed out.');
                triggerFailureRecovery();
            }
        }, AUTH_TIMEOUT_MS);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!isMounted) return;

            // We only care about initial load or active sign-ins for membership fetching
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                console.log(`[AuthContext] Event received: ${event}`);

                if (!s || !s.user) {
                    console.log('[AuthContext] No session found on event.');
                    setSession(null);
                    setUser(null);
                    setBusiness(null);
                    setMembership(null);
                    setPermissions(defaultPermissions);
                    setIsAdmin(false);
                    initDone.current = true;
                    clearTimeout(watchdogTimer);
                    clearTimeout(slowTimer);
                    setLoadingSlow(false);
                    setLoading(false);
                    return;
                }

                // If cache exists and matches user, skip fetch
                if (membershipCache.current?.membership?.user_id === s.user.id) {
                    setSession(s);
                    setUser(s.user);
                    initDone.current = true;
                    clearTimeout(watchdogTimer);
                    clearTimeout(slowTimer);
                    setLoadingSlow(false);
                    setLoading(false);
                    return;
                }

                // New fetch needed
                setSession(s);
                setUser(s.user);

                try {
                    const result = await withTimeout(
                        fetchMembership(s.user),
                        AUTH_TIMEOUT_MS,
                        `fetchMembership (${event})`
                    );

                    if (!isMounted) return;

                    if (result) {
                        applyMembership(result);
                        initDone.current = true;
                        clearTimeout(watchdogTimer);
                        clearTimeout(slowTimer);
                        setLoadingSlow(false);
                        setLoading(false);
                    } else {
                        // Result null = fetchMembership timed out internally
                        console.warn('[AuthContext] fetchMembership timed out inside event handler.');
                        triggerFailureRecovery();
                    }
                } catch (error) {
                    console.error('[AuthContext] Error fetching membership:', error);
                    if (error instanceof Error && error.message?.includes('Refresh Token')) {
                        clearCorruptedAuthTokens();
                    }
                    if (isMounted) triggerFailureRecovery();
                }
            }

            if (event === 'SIGNED_OUT') {
                console.log('[AuthContext] User signed out');
                membershipCache.current = null;
                setSession(null);
                setUser(null);
                setBusiness(null);
                setMembership(null);
                setPermissions(defaultPermissions);
                setIsAdmin(false);
                setSyncError(false);
                setLoading(false);
                initDone.current = true;
                clearTimeout(watchdogTimer);
            }

            if (event === 'TOKEN_REFRESHED' && s) {
                setSession(s);
                setUser(s.user);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(slowTimer);
            clearTimeout(watchdogTimer);
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    const refreshMembership = useCallback(async () => {
        // We shouldn't use getSession directly here either to prevent random deadlocks
        // but since refresh is manual, we can afford it if needed.
        // Actually, we already have the session in state!
        if (session?.user) {
            const result = await withTimeout(
                fetchMembership(session.user),
                AUTH_TIMEOUT_MS,
                'refreshMembership.fetchMembership'
            );
            if (result) {
                applyMembership(result);
                setSyncError(false);
            }
        } else {
            // Fallback if session is somehow missing but they try to refresh
            const sessionResult = await withTimeout(
                supabase.auth.getSession(),
                AUTH_TIMEOUT_MS,
                'refreshMembership.getSession'
            );
            if (sessionResult?.data?.session?.user) {
                const result = await withTimeout(
                    fetchMembership(sessionResult.data.session.user),
                    AUTH_TIMEOUT_MS,
                    'refreshMembership.fetchMembershipFallback'
                );
                if (result) {
                    applyMembership(result);
                    setSyncError(false);
                }
            }
        }
    }, [applyMembership, session]);

    const retryInit = useCallback(() => {
        setLoading(true);
        setSyncError(false);
        autoRetryCount.current = 0;
        setRetryCount(prev => prev + 1);
    }, []);

    const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
        if (isAdmin || tablesNotReady) return true;
        return permissions[permission] === true;
    }, [permissions, isAdmin, tablesNotReady]);

    const handleLogout = async () => {
        try {
            console.log('[AuthContext] Manual logout from sync error recovery');
            clearCorruptedAuthTokens();
            if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.includes('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });
            }
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[AuthContext] Error in signOut:', e);
        } finally {
            setSession(null);
            setUser(null);
            setBusiness(null);
            setMembership(null);
            setPermissions(defaultPermissions);
            setIsAdmin(false);
            setSyncError(false);
            setLoading(false);
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    };

    if (syncError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Error de Conexión</h3>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        No pudimos sincronizar los datos de tu sesión con la base de datos. Esto suele deberse a un problema temporal de conexión.
                    </p>
                    <div className="flex flex-col space-y-3">
                        <button
                            onClick={retryInit}
                            className="w-full bg-slate-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Reintentar conexión
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full border border-slate-200 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            session, user, business, membership, permissions,
            loading, isAdmin, tablesNotReady, loadingSlow, syncError,
            hasPermission, refreshMembership, retryInit,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
