import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            let response = NextResponse.redirect(`${origin}${next}`);

            const supabase = createServerClient(
                supabaseUrl,
                supabaseKey,
                {
                    cookies: {
                        getAll() {
                            return []; // We don't need to read cookies to exchange the code
                        },
                        setAll(cookiesToSet) {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                response.cookies.set(name, value, options);
                            });
                        },
                    },
                }
            );

            const { error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (!error) {
                return response;
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=Invalid_or_expired_link`);
}
