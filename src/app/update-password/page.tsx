"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/config/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Eye, EyeOff, Check, X } from "lucide-react";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Al cargar la página, analizamos la URL para ver si vino un mensaje de error desde Supabase
        const hash = window.location.hash;
        if (hash && hash.includes('error=')) {
            const params = new URLSearchParams(hash.substring(1)); // quita el #
            const errorDesc = params.get('error_description') || 'Error en el enlace de invitación';
            toast.error(errorDesc.replace(/\+/g, ' '));
        }

        // Si tenemos un hash con access_token, Supabase debería establecer la sesión 
        // automáticamente, pero nos aseguramos verificando
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Error al obtener sesión:", error);
            }
        });
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Evento Auth:", event);
        });
        
        return () => subscription.unsubscribe();
    }, []);

    const validatePassword = (pwd: string) => {
        if (pwd.length < 8) return "La contraseña debe tener al menos 8 caracteres";
        if (!/[A-Z]/.test(pwd)) return "La contraseña debe tener al menos una mayúscula";
        if (!/[a-z]/.test(pwd)) return "La contraseña debe tener al menos una minúscula";
        if (!/[0-9]/.test(pwd)) return "La contraseña debe tener al menos un número";
        return null;
    };

    const requirements = [
        { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
        { regex: /[A-Z]/, text: "Al menos una mayúscula" },
        { regex: /[a-z]/, text: "Al menos una minúscula" },
        { regex: /[0-9]/, text: "Al menos un número" }
    ];

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            toast.error(passwordError);
            return;
        }

        setLoading(true);
        try {
            // Cuando vienes de un enlace de invitación manual, no tienes una sesión real activa para `updateUser`,
            // ya que al generarlo programáticamente (`generateLink`), no hace el flujo automático en el navegador a menos
            // que parseemos manualmente el hash. Como solo tenemos un token en la URL, 
            // la manera más segura de registrarse la primera vez con ese token es usando `verifyOtp` o `setSession`
            
            const hash = window.location.hash;
            if (hash && hash.includes('access_token=')) {
                // Si la URL tiene el access_token mágico, lo usamos para establecer la sesión nosotros mismos
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                
                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    if (sessionError) throw sessionError;
                }
            }

            // Ahora sí, que tenemos una sesión garantizada, actualizamos la contraseña
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            
            toast.success("Contraseña establecida correctamente");
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.message || "Error al establecer contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Bienvenido, Crea tu Contraseña</CardTitle>
                    <CardDescription>
                        Ingrese su nueva contraseña para activar su cuenta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nueva Contraseña</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            <div className="space-y-2 pt-2">
                                <p className="text-xs font-medium text-muted-foreground">Requisitos de la contraseña:</p>
                                <ul className="text-xs space-y-1">
                                    {requirements.map((req, index) => {
                                        const isMet = req.regex.test(password);
                                        return (
                                            <li key={index} className={`flex items-center gap-2 ${isMet ? "text-green-600" : "text-muted-foreground"}`}>
                                                {isMet ? (
                                                    <Check className="h-3 w-3" />
                                                ) : (
                                                    <div className="h-3 w-3 rounded-full border border-current opacity-50" />
                                                )}
                                                <span>{req.text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <div className="relative">
                                <Input 
                                    id="confirmPassword" 
                                    type={showPassword ? "text" : "password"} 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required 
                                    className={confirmPassword && password !== confirmPassword ? "border-red-500" : ""}
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                        <X className="h-3 w-3" /> Las contraseñas no coinciden
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Creando cuenta...' : 'Crear Cuenta y Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
