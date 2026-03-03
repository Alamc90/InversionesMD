"use client"

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import { supabase } from '@/config/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Session } from '@supabase/supabase-js';
import { Settings, DollarSign, ClipboardCheck, Menu, X, Plus, LayoutDashboard, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { session, business, hasPermission, isAdmin, loading: authLoading, membership, tablesNotReady } = useAuth();

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!authLoading && !session) {
            router.replace('/login');
        }
    }, [authLoading, session, router]);

    useEffect(() => {
        if (!authLoading && session && !business && !tablesNotReady) {
            router.replace('/setup-negocio');
        }
    }, [authLoading, session, business, tablesNotReady, router]);

    const handleLogout = async () => {
        setMobileMenuOpen(false);
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen">Cargando sesión...</div>;
    }

    if (!session) return null;

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
                        <h1 className="text-lg md:text-xl font-bold truncate">{business?.name || 'InversionesMD'}</h1>
                        {membership && (
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block ${
                                isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {isAdmin ? 'Admin' : 'Empleado'}
                            </span>
                        )}
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
