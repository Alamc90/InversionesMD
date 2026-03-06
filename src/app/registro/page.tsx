"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/config/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Eye, EyeOff, Check, X, UserPlus, AlertCircle } from "lucide-react";

export default function RegisterUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [sessionReady, setSessionReady] = useState(false);
    const [fatalError, setFatalError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const initializeSession = async () => {
            try {
                // 1. Verificar si hay un error en la URL
                const hash = window.location.hash;
                if (hash && hash.includes('error=')) {
                    const params = new URLSearchParams(hash.substring(1));
                    const errorDesc = params.get('error_description') || 'Enlace inválido o expirado';
                    setFatalError(errorDesc.replace(/\+/g, ' '));
                    setVerifying(false);
                    return;
                }

                // 2. Extraer tokens si existen
                if (hash && hash.includes('access_token=')) {
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    
                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        
                        if (error) throw error;
                    }
                }

                // 3. Confirmar que realmente tenemos una sesión activa
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError || !session) {
                    setFatalError("No se pudo iniciar la sesión temporal de registro. Verifica que el enlace sea nuevo.");
                } else {
                    setSessionReady(true);
                }
            } catch (err: any) {
                console.error("Error al inicializar sesión:", err);
                setFatalError(err.message || "Error al validar la invitación");
            } finally {
                setVerifying(false);
            }
        };

        initializeSession();
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!fullName.trim()) {
            toast.error("Por favor, ingresa tu nombre completo");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            toast.error(passwordError);
            return;
        }

        if (!sessionReady) {
            toast.error("Falta sesión temporal. Intenta recargar con el enlace original.");
            return;
        }

        setLoading(true);
        try {
            // Actualizamos la información del usuario (metadatos para auth) y su nueva contraseña
            const { data: userData, error } = await supabase.auth.updateUser({ 
                password: password,
                data: {
                    first_name: fullName.trim(), // Esto lo leerá el AuthContext para asignarlo al negocio
                }
            });
            if (error) throw error;

            // Al establecer la sesión inicialmente en esta pantalla, AuthContext podría haber 
            // inscrito al usuario sin nombre. Forzamos la actualización de su registro.
            if (userData.user?.id) {
                await supabase
                    .from('business_members')
                    .update({ display_name: fullName.trim() })
                    .eq('user_id', userData.user.id);
            }

            toast.success("Cuenta registrada correctamente. ¡Bienvenido!");
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.message || "Error al crear la cuenta");
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Verificando invitación...</p>
            </div>
        );
    }

    if (fatalError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md border-red-200">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-2">
                            <AlertCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <CardTitle className="text-xl text-red-700">Invitación Inválida</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                        <p className="mb-4">{fatalError}</p>
                        <p>Por favor, pide a tu administrador que genere un nuevo enlace de invitación.</p>
                        <Button 
                            variant="outline" 
                            className="mt-6 w-full"
                            onClick={() => router.push('/login')}
                        >
                            Ir a Iniciar Sesión
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
             <Card className="w-full max-w-md shadow-lg border-primary/10">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <UserPlus className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
                    <CardDescription>
                        Falta el último paso. Establece una contraseña segura para tu nueva cuenta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nombre Completo</Label>
                            <Input 
                                id="fullName" 
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required 
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                    placeholder="••••••••"
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
                            <div className="space-y-2 pt-2 bg-slate-50 p-3 rounded-md border text-sm">
                                <p className="font-medium text-slate-700">Tu contraseña debe tener:</p>
                                <ul className="space-y-1">
                                    {requirements.map((req, index) => {
                                        const isMet = req.regex.test(password);
                                        return (
                                            <li key={index} className={`flex items-center gap-2 ${isMet ? "text-green-600 font-medium" : "text-slate-500"}`}>
                                                {isMet ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <div className="h-3 w-3 ml-0.5 rounded-full border opacity-40" />
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
                                    placeholder="••••••••"
                                    className={confirmPassword && password !== confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                                        <X className="h-3 w-3" /> Las contraseñas no coinciden
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                            {loading ? 'Creando cuenta...' : 'Finalizar Registro'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}