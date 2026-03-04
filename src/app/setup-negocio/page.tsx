"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BusinessService } from '@/services/BusinessService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/config/supabaseClient';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function SetupNegocioPage() {
    const router = useRouter();
    const { session, business, refreshMembership, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);

    const [businessName, setBusinessName] = useState('');
    const [nit, setNit] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (!authLoading) {
            if (!session) {
                router.replace('/login');
            } else if (business) {
                router.replace('/dashboard');
            }
        }
    }, [authLoading, session, business, router]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessName.trim()) {
            toast.error('El nombre del negocio es requerido');
            return;
        }

        setLoading(true);
        try {
            await BusinessService.createBusiness({
                name: businessName,
                nit,
                address,
                phone,
            });

            toast.success('¡Negocio creado exitosamente!');
            
            // Refresh membership in auth context
            await refreshMembership();
            
            // Wait a moment for state to propagate, then redirect
            setTimeout(() => {
                router.push('/dashboard');
            }, 500);
        } catch (error: any) {
            console.error('Error creating business:', error);
            toast.error(error.message || 'Error al crear el negocio');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !session || business) {
        return <LoadingScreen message={business ? 'Redirigiendo al dashboard...' : 'Cargando...'} />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Configurar Negocio</CardTitle>
                    <CardDescription>
                        Crea tu negocio para comenzar a gestionar vehículos y pagos.
                        Si fuiste invitado a un negocio existente, asegúrate de registrarte con el correo de la invitación.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Nombre del Negocio *</Label>
                            <Input 
                                id="businessName"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Ej. Inversiones MD"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nit">NIT / RUC</Label>
                            <Input 
                                id="nit"
                                value={nit}
                                onChange={(e) => setNit(e.target.value)}
                                placeholder="Ej. 1234567-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input 
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Dirección del negocio"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input 
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. +502 5555-5555"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Negocio'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
