"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginView } from '@/views/LoginView';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { session, business, loading, tablesNotReady } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    // If already logged in, redirect away
    useEffect(() => {
        if (!loading && session) {
            if (tablesNotReady || business) {
                router.replace('/dashboard');
            } else {
                router.replace('/setup-negocio');
            }
        }
    }, [loading, session, business, tablesNotReady, router]);

    // Always show login form after a brief moment, even if auth is still loading
    useEffect(() => {
        const timer = setTimeout(() => setShowLogin(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // Show login form immediately if not loading and no session
    // OR after 500ms timeout regardless of loading state
    if (!loading && session) {
        return <div className="flex items-center justify-center min-h-screen">Redirigiendo...</div>;
    }

    if (!showLogin && loading) {
        return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
    }

    return <LoginView onLoginSuccess={() => {
        setTimeout(() => {
            router.push('/dashboard');
        }, 500);
    }} />;
}
