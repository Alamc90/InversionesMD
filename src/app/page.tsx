"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/config/supabaseClient';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/dashboard');
            } else {
                router.replace('/login');
            }
        };
        checkSession();
    }, [router]);

    return <div className="flex items-center justify-center min-h-screen">Redirigiendo...</div>;
}
