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
}

async function fetchMembership(user: User): Promise<MembershipResult> {
    const empty: MembershipResult = {
        business: null, membership: null,
        permissions: defaultPermissions, isAdmin: false, tablesNotReady: false,
    };

    try {
        // Ejecutamos la consulta con un AbortController para romper deadlocks
        let memberResult: any = null;
        let lastError: any = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort(new Error('Timeout'));
            }, 6000); // 6 segundos de límite duro por intento

            try {
                console.log(`[AuthContext] Fetching membership (Attempt ${attempt}/3)...`);
                const result = await supabase
                    .from('business_members')
                    .select('*')
                    .eq('user_id', user.id)
                    .limit(1)
                    .abortSignal(controller.signal)
                    .maybeSingle();

                clearTimeout(timeoutId);

                // Si fue abortado a nivel de red, el mensaje suele decir "aborted"
                if (result.error && result.error.message?.toLowerCase().includes('abort')) {
                    throw result.error;
                }

                memberResult = result;
                break; // Éxito, salir del loop
            } catch (err: any) {
                clearTimeout(timeoutId);
                console.warn(`[AuthContext] fetchMembership attempt ${attempt} failed/timed out:`, err.message || err);
                lastError = err;
                
                if (attempt === 3) break; // Si era el último, rendirse
                // Esperar 1 segundo antes de intentar de nuevo
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!memberResult) {
            console.error('[AuthContext] Todas las retries fallaron. Último error:', lastError);
            return empty;
        }

        const result = memberResult;

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
                let invitationResult: any = null;

                for (let attempt = 1; attempt <= 3; attempt++) {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), 6000);

                    try {
                        const result = await supabase
                                .from('business_invitations')
                                .select('*')
                                .eq('email', email)
                                .eq('accepted', false)
                                .abortSignal(controller.signal)
                                .maybeSingle();
                        
                        clearTimeout(timeoutId);

                        if (result.error && result.error.message?.toLowerCase().includes('abort')) {
                            throw result.error;
                        }

                        invitationResult = result;
                        break;
                    } catch (err: any) {
                        clearTimeout(timeoutId);
                        if (attempt === 3) break;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (!invitationResult) throw new Error('Invitations query failed after retries');

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

                    // 409 means Conflict (The member already exists due to a parallel race condition)
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
    const activeCheckRef = useRef<Promise<void> | null>(null);

    const applyMembership = (result: MembershipResult) => {
        membershipCache.current = result;
        setBusiness(result.business);
        setMembership(result.membership);
        setPermissions(result.permissions);
        setIsAdmin(result.isAdmin);
        setTablesNotReady(result.tablesNotReady);
    };

    useEffect(() => {
        let isMounted = true;
        let slowTimer: ReturnType<typeof setTimeout>;

        // Safety net: always stop loading after 30s absolute max
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

        const internalCheckAuth = async (s: Session | null, forceSetLoading: boolean) => {
            if (!isMounted) return;
            setSession(s);
            setUser(s?.user ?? null);

            if (s?.user) {
                // Solo mostrar loader de pantalla completa si es forzado o si no hay datos previos
                if (forceSetLoading && !membershipCache.current) {
                    setLoading(true);
                    setLoadingSlow(false);
                    // Si pasan 5s, indicar que está tardando más de lo esperado
                    slowTimer = setTimeout(() => {
                        if (isMounted) setLoadingSlow(true);
                    }, 5000);
                }
                
                // Sin timeout — dejamos que la query corra hasta que responda
                try {
                    const result = await fetchMembership(s.user);
                    if (isMounted) {
                        applyMembership(result);
                    }
                } catch (error) {
                    console.error('[AuthContext] fetchMembership error:', error);
                    // On error, apply cache if available, otherwise empty state
                    if (isMounted && membershipCache.current) {
                        applyMembership(membershipCache.current);
                    }
                }
                
                if (isMounted) {
                    clearTimeout(slowTimer);
                    setLoadingSlow(false);
                    setLoading(false);
                }
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
        };

        const checkAuth = async (s: Session | null, forceSetLoading: boolean = true) => {
            // Wait for any previous checkAuth to finish before starting a new one
            // This prevents concurrent membership fetches if multiple auth events fire quickly
            while (activeCheckRef.current) {
                await activeCheckRef.current;
            }

            const checkPromise = internalCheckAuth(s, forceSetLoading);
            activeCheckRef.current = checkPromise;
            
            try {
                await checkPromise;
            } finally {
                // Remove the lock once done, but only if it's our promise
                if (activeCheckRef.current === checkPromise) {
                    activeCheckRef.current = null;
                }
                if (isMounted) clearTimeout(safetyTimeout);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
            if (!isMounted) return;
            
            // Si ya tenemos en caché la información de membresía y el id de usuario coincide,
            // simplemente actualizamos la sesión pero omitimos la recarga completa para evitar loops de UI
            if (s?.user && membershipCache.current?.membership?.user_id === s.user.id) {
                setSession(s);
                setUser(s.user);
                return;
            }
            
            // Forzamos el loading de la UI solo en el inicio (si no hay cache), los demás eventos son silenciosos
            await checkAuth(s, _event === 'INITIAL_SESSION'); 
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            clearTimeout(slowTimer);
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshMembership = useCallback(async () => {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.user) {
            const result = await fetchMembership(s.user);
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
            loading, isAdmin, tablesNotReady, loadingSlow,
            hasPermission, refreshMembership,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
