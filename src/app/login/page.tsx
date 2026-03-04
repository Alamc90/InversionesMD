"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginView } from '@/views/LoginView';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function LoginPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    // Show login form immediately — no artificial delay.
    // If auth resolves fast, the redirect effect handles it.
    const [forceShow, setForceShow] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // If already logged in, redirect to dashboard always
    useEffect(() => {
        if (!loading && session) {
            router.replace('/dashboard');
        }
    }, [loading, session, router]);

    // Safety: if loading takes more than 1.5s, force-show the login form
    useEffect(() => {
        // We only wait a short while before assuming they should see the login form
        // especially if they navigated here manually
        timerRef.current = setTimeout(() => setForceShow(true), 800);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Already authenticated — redirect in progress
    if (!loading && session) {
        return <LoadingScreen message="Redirigiendo..." submessage="Ya iniciaste sesión" />;
    }

    // Still loading and haven't hit the safety timeout → show spinner
    if (loading && !forceShow) {
        return <LoadingScreen message="Cargando..." />;
    }

    // Show login form (either loading finished with no session, or safety timeout hit)
    return <LoginView 
        onLoginSuccess={() => {
            router.push('/dashboard');
        }}
        onSignUpSuccess={() => {
            router.push('/setup-negocio');
        }}
    />;
}
