import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Permitir archivos estáticos e imágenes inmediatamente sin cargar Supabase
    if (pathname.includes('.') || pathname.startsWith('/_next/')) {
        return NextResponse.next();
    }

    // 2. Omitir verificación pesada para prefetchs de Next.js
    const isPrefetch = request.headers.get("x-middleware-prefetch") === "1" ||
                       request.headers.get("purpose") === "prefetch";
    if (isPrefetch) {
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Rutas exclusivas de autenticación (solo para usuarios NO logueados)
    const authRoutes = ["/login", "/registro"];
    // Rutas públicas que no requieren autenticación (pero un usuario logueado puede acceder, ej: cambiar contraseña)
    const publicRoutes = ["/api/invite", "/update-password", "/auth/callback"];

    const isAuthRoute = authRoutes.some(route => 
        request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
    );
    const isPublicRoute = publicRoutes.some(route => 
        request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
    );

    // Redirigir a los no autenticados a /login si no están en una ruta autorizada o pública
    if (!user && !isAuthRoute && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirigir a usuarios logueados que intentan acceder a login/registro/raíz
    if (user && (isAuthRoute || request.nextUrl.pathname === "/") && !request.nextUrl.pathname.startsWith('/api')) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Todas las rutas excepto:
         * - _next/static (archivos estáticos)
         * - _next/image (imágenes)
         * - favicon.ico
         * - Archivos en public (ej. swg, png)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
