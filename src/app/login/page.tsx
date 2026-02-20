"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginView } from '@/views/LoginView';
import { supabase } from '@/config/supabaseClient';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Redirigir si ya tiene sesión
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace('/dashboard');
            }
            setLoading(false);
        });
    }, [router]);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;

    return <LoginView onLoginSuccess={() => router.push('/dashboard')} />;
}
