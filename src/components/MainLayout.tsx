"use client"

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import { supabase } from '@/config/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Session } from '@supabase/supabase-js';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) {
                 router.replace('/login');
             } else {
                 setSession(session);
             }
             setLoading(false);
        };
        
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.replace('/login');
            } else {
                setSession(session);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Cargando sessión...</div>;
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                <div className="container mx-auto py-4 px-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">InversionesMD</h1>
                    <nav className="flex gap-4 items-center">
                        <Link href="/dashboard">
                            <Button 
                                variant={pathname === '/dashboard' ? "default" : "ghost"} 
                            >
                                Dashboard
                            </Button>
                        </Link>
                        <Link href="/nueva-entrega">
                            <Button 
                                variant={pathname === '/nueva-entrega' ? "default" : "ghost"}
                            >
                                + Nueva Entrega
                            </Button>
                        </Link>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={handleLogout}
                            className="ml-4"
                        >
                            Salir
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                {children}
            </main>
        </div>
    );
};
