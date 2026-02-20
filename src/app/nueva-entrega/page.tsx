"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/config/supabaseClient';
import { IssueBikeView } from '@/views/IssueBikeView';
import { MainLayout } from '@/components/MainLayout';

export default function NewDeliveryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Redirigir si no tiene sesión
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.replace('/login');
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.replace('/login');
            }
        });
        return () => subscription.unsubscribe();
    }, [router]);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;

    return (
        <MainLayout>
            <IssueBikeView />
        </MainLayout>
    );
}