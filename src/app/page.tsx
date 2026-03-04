"use client"

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/config/supabaseClient';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Home() {
    const router = useRouter();
    const redirected = useRef(false);

    const goTo = (path: string) => {
        if (redirected.current) return;
        redirected.current = true;
        // Native window location change is more reliable at root page
        // when dealing with auth redirects in Next.js
        window.location.href = path;
    };

    useEffect(() => {
        // Hard fallback: always redirect to login after 2s no matter what
        const fallback = setTimeout(() => goTo('/login'), 2000);

        let cancelled = false;

        const check = async () => {
            try {
                const result = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
                ]);

                if (cancelled) return;

                if (result && typeof result === 'object' && 'data' in result) {
                    const session = (result as any).data?.session;
                    if (session) {
                        goTo('/dashboard');
                    } else {
                        goTo('/login');
                    }
                } else {
                    // Timed out
                    goTo('/login');
                }
            } catch {
                if (!cancelled) goTo('/login');
            }
        };

        check();

        return () => {
            cancelled = true;
            clearTimeout(fallback);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <LoadingScreen message="Redirigiendo..." />;
}
