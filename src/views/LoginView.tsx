import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { Check, X, Eye, EyeOff } from "lucide-react"

interface LoginViewProps {
    onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');

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

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Inicio de sesión exitoso');
                onLoginSuccess();
            } else {
                if (password !== confirmPassword) {
                    toast.error("Las contraseñas no coinciden");
                    setLoading(false);
                    return;
                }

                const passwordError = validatePassword(password);
                if (passwordError) {
                    toast.error(passwordError);
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            phone: phone
                        },
                        // Autodetect current URL for redirection after email confirmation
                        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined
                    }
                });
                if (error) throw error;
                toast.success('Cuenta creada. Revisa tu correo o inicia sesión.');
                
                // Check if session was established immediately
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    onLoginSuccess();
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Error en la autenticación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</CardTitle>
                    <CardDescription>
                        Ingrese sus credenciales para acceder al sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="nombre@ejemplo.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        {!isLogin && (
                           <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fname">Nombre</Label>
                                        <Input 
                                            id="fname" 
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lname">Apellido</Label>
                                        <Input 
                                            id="lname" 
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Celular</Label>
                                    <Input 
                                        id="phone" 
                                        type="tel"
                                        placeholder="09..."
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                           </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
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
                            
                            {!isLogin && (
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
                            )}
                        </div>

                        {!isLogin && (
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
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Procesando...' : (isLogin ? 'Ingresar' : 'Registrarse')}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};
