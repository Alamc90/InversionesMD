"use client"

import React, { useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function Home() {
    useEffect(() => {
        // Timeout: if nothing happens in 3s, go to login
        const fallback = setTimeout(() => {
            window.location.href = '/login';
        }, 3000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(fallback);
            if (session) {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/login';
            }
        }).catch(() => {
            clearTimeout(fallback);
            window.location.href = '/login';
        });

        return () => clearTimeout(fallback);
    }, []);

    return <div className="flex items-center justify-center min-h-screen">Redirigiendo...</div>;
}
