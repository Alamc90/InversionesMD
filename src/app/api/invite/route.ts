import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

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
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        // Generar invitación de Supabase (Envía correo oficial de invitacion de Supabase)
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${origin}/update-password` 
        });

        if (error) {
            // Si el error es porque ya existe, está bien, ya podía registrarse
            if (error.message.includes('already exists') || error.message.includes('registered')) {
                 return NextResponse.json({ success: true, message: 'El usuario ya existía en la base de datos' });
            }
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error al enviar invitación:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
