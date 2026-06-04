"use client"

import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { supabase } from '@/config/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Session } from '@supabase/supabase-js';
import { Settings, DollarSign, ClipboardCheck, Menu, X, Plus, LayoutDashboard, FileText, Calculator, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PrinterStatusBadge } from '@/components/PrinterSetup';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Card, CardContent } from '@/components/ui/card';
import { autoReconnectPrinter, getSavedPrinterInfo, getPrinterStatus } from '@/lib/thermalPrinter';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { session, business, hasPermission, isAdmin, loading: authLoading, membership, tablesNotReady, loadingSlow, refreshMembership } = useAuth();
    const prevPathname = useRef(pathname);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Auto-reconnect saved printer on app mount
    useEffect(() => {
        const saved = getSavedPrinterInfo();
        if (saved && !getPrinterStatus().connected) {
            autoReconnectPrinter().then((ok) => {
                if (ok) {
                    console.log(`[MainLayout] Impresora ${saved.name} reconectada automáticamente`);
                }
            }).catch(() => {});
        }
    }, []);

    // Auto-reload on navigation when data is stale (no business loaded)
    useEffect(() => {
        if (prevPathname.current !== pathname) {
            prevPathname.current = pathname;
            if (session && !business && !tablesNotReady && !authLoading) {
                console.log('[MainLayout] Stale data detected on navigation, reloading...');
                window.location.href = pathname;
                return;
            }
        }
    }, [pathname, session, business, tablesNotReady, authLoading]);

    // Auto-reload when tab regains focus after inactivity
    // This prevents stale data — reload BEFORE broken fetches start
    useEffect(() => {
        let lastActive = Date.now();

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                const elapsed = Date.now() - lastActive;
                // After 2 minutes of inactivity, always do a hard reload
                // This ensures Supabase connections are fresh
                if (elapsed > 2 * 60 * 1000) {
                    console.log(`[MainLayout] Tab was inactive for ${Math.round(elapsed / 1000)}s, reloading page...`);
                    window.location.reload();
                    return;
                }
                lastActive = Date.now();
            } else {
                lastActive = Date.now();
            }
        };

        // Also listen for user interaction after potential idle
        let idleTimer: NodeJS.Timeout | null = null;
        let isIdle = false;

        const resetIdle = () => {
            if (isIdle) {
                // User just interacted after being idle — check if we need to reload
                isIdle = false;
                if (!business && !tablesNotReady && session) {
                    console.log('[MainLayout] User returned from idle with stale data, reloading...');
                    window.location.reload();
                    return;
                }
            }
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                isIdle = true;
            }, 90000); // Mark as idle after 90s of no interaction
        };

        document.addEventListener('visibilitychange', handleVisibility);
        document.addEventListener('mousedown', resetIdle);
        document.addEventListener('keydown', resetIdle);
        document.addEventListener('touchstart', resetIdle);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            document.removeEventListener('mousedown', resetIdle);
            document.removeEventListener('keydown', resetIdle);
            document.removeEventListener('touchstart', resetIdle);
            if (idleTimer) clearTimeout(idleTimer);
        };
    }, [session, business, tablesNotReady]);

    useEffect(() => {
        if (!authLoading && !session) {
            router.replace('/login');
        } else if (!authLoading && session && !business && !tablesNotReady) {
            router.replace('/setup-negocio');
        }
    }, [authLoading, session, business, tablesNotReady, router]);

    const handleLogout = async () => {
        setMobileMenuOpen(false);
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[MainLayout] Error en signOut:', e);
        }
        window.location.href = '/login';
    };

    if (authLoading) {
        return <LoadingScreen 
            message="Cargando sesión..." 
            submessage={loadingSlow ? "Esto está tardando más de lo esperado, por favor espera..." : "Verificando permisos"} 
        />;
    }

    if (!session) return null;



    // Business suspended
    if (business && business.status === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="max-w-md w-full mx-4 animate-fade-in">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <LogOut className="h-8 w-8 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold mb-1">Cuenta de negocio inactiva</h2>
                                <p className="text-sm text-muted-foreground">
                                    Tu negocio ha sido suspendido o se encuentra inactivo. Contacta al administrador del sistema.
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground mt-4">
                                <LogOut className="h-4 w-4 mr-1" />
                                Cerrar sesión
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // No business found (successful query, truly no business) — redirecting to setup-negocio
    if (!business && !tablesNotReady) {
        return <LoadingScreen message="Redirigiendo..." submessage="Preparando configuración" />;
    }

    const showApprovals = hasPermission('can_approve_payments');
    const showBalance = hasPermission('can_view_balance');
    const showRecords = hasPermission('can_manage_records');
    const showNewDelivery = hasPermission('can_create_deliveries');
    const showConfig = hasPermission('can_manage_config');
    const showDashboard = hasPermission('can_view_dashboard');

    const navItems = [
        showNewDelivery && { href: '/nueva-entrega', label: '+ Nueva Entrega', icon: Plus, isGreen: true },
        showDashboard && { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        showBalance && { href: '/balance', label: 'Balance', icon: DollarSign },
        showApprovals && { href: '/aprobaciones', label: 'Aprobaciones', icon: ClipboardCheck },
        showRecords && { href: '/registros', label: 'Registros', icon: FileText },
        showConfig && { href: '/simulador', label: 'Simulador', icon: Calculator }, 
        showConfig && { href: '/configuracion', label: 'Configuración', icon: Settings },
    ].filter(Boolean) as { href: string; label: string; icon: any; isGreen?: boolean }[];

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
                <div className="container mx-auto py-3 px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                        {business?.logo_url && (
                            <img 
                                src={business.logo_url} 
                                alt="Logo" 
                                className="h-8 w-8 object-contain rounded shrink-0"
                            />
                        )}
                        <h1 className="text-lg md:text-xl font-bold truncate">{business?.name || 'Inversiones Manager'}</h1>
                        {membership && (
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block ${
                                isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {isAdmin ? 'Admin' : 'Empleado'}
                            </span>
                        )}
                        <PrinterStatusBadge />
                        <PrinterStatusBadge />
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex gap-2 items-center">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    size="sm"
                                    variant={item.isGreen ? undefined : pathname === item.href ? "default" : "ghost"}
                                    className={item.isGreen ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                >
                                    {!item.isGreen && <item.icon className="h-4 w-4 mr-1" />}
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                        <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={handleLogout}
                            className="ml-2"
                        >
                            Salir
                        </Button>
                    </nav>

                    {/* Mobile: New Delivery + Hamburger */}
                    <div className="flex md:hidden items-center gap-2">
                        {showNewDelivery && (
                            <Link href="/nueva-entrega">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menú"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-background animate-in slide-in-from-top-2 duration-200">
                        <nav className="container mx-auto py-2 px-4 flex flex-col">
                            {membership && (
                                <div className="flex items-center gap-2 px-3 py-2 mb-1 text-sm text-muted-foreground">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {isAdmin ? 'Admin' : 'Empleado'}
                                    </span>
                                </div>
                            )}
                            {navItems.filter(item => !item.isGreen).map((item) => (
                                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                    <div className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                                        pathname === item.href 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'hover:bg-muted'
                                    }`}>
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </div>
                                </Link>
                            ))}
                            <div className="border-t my-2" />
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar Sesión
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            <main className="container mx-auto py-4 md:py-8 px-3 md:px-4">
                {children}
            </main>
        </div>
    );
};
