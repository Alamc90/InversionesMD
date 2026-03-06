import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

    // Rutas públicas que no requieren autenticación
    const publicRoutes = ["/login", "/registro", "/api/invite", "/update-password"];
    // Verificar si es exactamente la ruta de login o empieza por las otras
    const isPublicRoute = publicRoutes.some(route => 
        request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
    );

    // Permitir archivos estáticos explícitamente por si el matcher falla
    if (request.nextUrl.pathname.includes('.')) {
        return response;
    }

    // Redirigir a los no autenticados a /login si no están en una ruta autorizada
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirigir a usuarios logueados que intentan acceder a login/registro/raíz
    if (user && (isPublicRoute || request.nextUrl.pathname === "/") && !request.nextUrl.pathname.startsWith('/api')) {
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
