import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, businessName } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            console.error('Faltan variables de entorno SUPABASE_SERVICE_ROLE_KEY o URL');
            return NextResponse.json(
                { error: 'Configuración del servidor incompleta para enviar correos.' },
                { status: 500 }
            );
        }

        // Crear cliente Supabase con privilegios de administrador (Service Role)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Determinar dinámicamente el dominio base (localhost o el deploy de Vercel)
        const protocol = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        
        // Prioridad:
        // 1. Variable NEXT_PUBLIC_SITE_URL absoluta (si la definiste manualmente)
        // 2. Dominio asignado por Vercel dinámicamente
        // 3. Reconstrucción con los headers (generalmente el req host real o localhost)
        const origin = process.env.NEXT_PUBLIC_SITE_URL 
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `${protocol}://${host}`);

        // Dependiendo de si la cuenta ya se invitó, generar invitacion o reenviar email mágico
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { 
                invited_by_business: businessName || 'Sistema de Gestión' 
            },
            redirectTo: `${origin}/registro` 
        });

        if (error) {
            // Si ya existe en auth, lo que hace falta es reenviar su acceso directo para "reanudar" el registro
            if (error.message.includes('already exists') || error.message.includes('registered')) {
                 const { error: resendError } = await supabaseAdmin.auth.resend({
                      type: 'invite',
                      email: email,
                      options: { emailRedirectTo: `${origin}/registro` }
                 });
                 if (resendError) {
                     // Solo para compatibilidad en versiones anteriores, intentar recuperacion como alternativa
                     const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                         redirectTo: `${origin}/registro`
                     });
                     if (resetError) throw resetError;
                 }
                 return NextResponse.json({ success: true, message: 'Invitación reenviada correctamente a la cuenta existente.' });
            }
            throw error;
        }

        // Devolvemos el success a la vista (quitamos action_link porque ya vas a usar correo automatizado)
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error al enviar invitación:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
