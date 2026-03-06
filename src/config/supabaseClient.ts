import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        sameSite: 'lax',
        maxAge: 31536000,
    }
});

/**
 * Clear legacy/corrupted auth tokens from localStorage.
 */
export function clearCorruptedAuthTokens(): void {
    if (typeof window === 'undefined') return;
    
    const keysToCheck = [
        'vehicle-installment-auth',
        'supabase.auth.token'
    ];
    
    keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
            console.log(`🧹 Clearing legacy auth key: ${key}`);
            localStorage.removeItem(key);
        }
    });
}

// Call on load
clearCorruptedAuthTokens();
