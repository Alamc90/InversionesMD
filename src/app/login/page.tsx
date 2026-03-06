"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginView } from '@/views/LoginView';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function LoginPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [forceShow, setForceShow] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // If already logged in (e.g., navigated here manually), redirect
    useEffect(() => {
        if (!loading && session) {
            router.replace('/dashboard');
        }
    }, [loading, session, router]);

    // Safety: if loading takes more than 800ms, force-show the login form
    useEffect(() => {
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

    // After login/signup, use full-page navigation to ensure
    // the new session is picked up cleanly by AuthContext on reload
    return <LoginView 
        onLoginSuccess={() => {
            window.location.href = '/dashboard';
        }}
        onSignUpSuccess={() => {
            window.location.href = '/setup-negocio';
        }}
    />;
}
