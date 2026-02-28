"use client"

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataService } from '@/services/DataService';
import { BusinessConfig } from '@/models/BusinessConfig';
import { PaymentPlanTemplate } from '@/models/PaymentPlanTemplate';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { parseCurrency, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ConfigurationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'business' | 'plans'>('business');
    
    // Config state
    const [config, setConfig] = useState<BusinessConfig>({
        business_name: '',
        nit: '',
        address: '',
        phone: ''
    });

    // Plans state
    const [templates, setTemplates] = useState<PaymentPlanTemplate[]>([]);
    const [newTemplate, setNewTemplate] = useState<Partial<PaymentPlanTemplate>>({
        name: '',
        total_installments: 0,
        installment_value: 0,
        payment_frequency: 'DIARIO',
        down_payment: 0
    });

    useEffect(() => {
        const loadAll = async () => {
            try {
                const data = await DataService.getBusinessConfig();
                if (data) {
                    setConfig({
                        business_name: data.business_name || '',
                        nit: data.nit || '',
                        address: data.address || '',
                        phone: data.phone || ''
                    });
                }
                const tp = await DataService.getPaymentPlanTemplates();
                setTemplates(tp);
            } catch (error) {
                console.error("Error loading config", error);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleConfigSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await DataService.saveBusinessConfig(config);
            toast.success("Configuración guardada exitosamente.");
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la configuración.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const saved = await DataService.savePaymentPlanTemplate(newTemplate as PaymentPlanTemplate);
            setTemplates([...templates, saved]);
            setNewTemplate({
                name: '',
                total_installments: 0,
                installment_value: 0,
                payment_frequency: 'DIARIO',
                down_payment: 0
            });
            toast.success("Plan predefinido creado.");
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar el plan.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm("¿Seguro de eliminar este plan?")) return;
        try {
            await DataService.deletePaymentPlanTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
            toast.success("Plan eliminado.");
        } catch (error) {
            toast.error("Error al eliminar.");
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex justify-center p-8">Cargando configuración...</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
                <aside className="w-full md:w-64 shrink-0">
                    <Card>
                        <ul className="flex flex-col text-sm font-medium">
                            <li>
                                <button 
                                    className={`w-full text-left px-4 py-3 border-b hover:bg-muted ${activeTab === 'business' ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                                    onClick={() => setActiveTab('business')}
                                >
                                    Datos del Negocio
                                </button>
                            </li>
                            <li>
                                <button 
                                    className={`w-full text-left px-4 py-3 hover:bg-muted ${activeTab === 'plans' ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                                    onClick={() => setActiveTab('plans')}
                                >
                                    Planes de Pago Predefinidos
                                </button>
                            </li>
                        </ul>
                    </Card>
                </aside>

                <main className="flex-1">
                    {activeTab === 'business' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuración del Negocio</CardTitle>
                                <CardDescription>
                                    Ingrese los datos de su negocio para facturación POS.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleConfigSubmit}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="business_name">Nombre del Negocio</Label>
                                        <Input 
                                            id="business_name" name="business_name" 
                                            value={config.business_name} onChange={handleConfigChange} 
                                            placeholder="Ej. Inversiones MD" required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nit">NIT / RUC</Label>
                                        <Input 
                                            id="nit" name="nit" value={config.nit} 
                                            onChange={handleConfigChange} placeholder="Ej. 1234567-8" required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Dirección</Label>
                                        <Input 
                                            id="address" name="address" value={config.address} 
                                            onChange={handleConfigChange} placeholder="Dirección completa" required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input 
                                            id="phone" name="phone" value={config.phone} 
                                            onChange={handleConfigChange} placeholder="Ej. +502 5555-5555" required
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? 'Guardando...' : 'Guardar Datos'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    )}

                    {activeTab === 'plans' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Crear Plan Predefinido</CardTitle>
                                    <CardDescription>Configure planes rápidos para aplicar al momento de crear una entrega.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleCreateTemplate}>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>Nombre del Plan</Label>
                                            <Input 
                                                value={newTemplate.name} 
                                                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} 
                                                placeholder="Ej. Plan 300 cuotas diarias" required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Cuota Inicial (Abono)</Label>
                                            <Input 
                                                type="text" 
                                                value={newTemplate.down_payment ? formatCurrency(newTemplate.down_payment) : ''}
                                                onChange={(e) => setNewTemplate({...newTemplate, down_payment: parseCurrency(e.target.value)})} 
                                                placeholder="$0.00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor de la Cuota</Label>
                                            <Input 
                                                type="text" 
                                                value={newTemplate.installment_value ? formatCurrency(newTemplate.installment_value) : ''}
                                                onChange={(e) => setNewTemplate({...newTemplate, installment_value: parseCurrency(e.target.value)})} 
                                                placeholder="$0.00" required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Cantidad de Cuotas</Label>
                                            <Input 
                                                type="number" min="1"
                                                value={newTemplate.total_installments || ''} 
                                                onChange={(e) => setNewTemplate({...newTemplate, total_installments: parseInt(e.target.value)})} 
                                                placeholder="Ej. 300" required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Frecuencia</Label>
                                            <Select 
                                                value={newTemplate.payment_frequency} 
                                                onValueChange={(val: any) => setNewTemplate({...newTemplate, payment_frequency: val})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="DIARIO">DIARIO</SelectItem>
                                                    <SelectItem value="SEMANAL">SEMANAL</SelectItem>
                                                    <SelectItem value="QUINCENAL">QUINCENAL</SelectItem>
                                                    <SelectItem value="MENSUAL">MENSUAL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-end">
                                        <Button type="submit" disabled={saving}>Agregar Plan</Button>
                                    </CardFooter>
                                </form>
                            </Card>

                            <h3 className="text-xl font-bold mt-8 mb-4">Planes Creados</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {templates.map(t => (
                                    <Card key={t.id} className="relative">
                                        <Button 
                                            variant="ghost" size="icon" 
                                            className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteTemplate(t.id!)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-md pr-8">{t.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-1">
                                            <p><span className="text-muted-foreground">Inicial:</span> {formatCurrency(t.down_payment || 0)}</p>
                                            <p><span className="text-muted-foreground">Cuota:</span> {formatCurrency(t.installment_value)} x {t.total_installments}</p>
                                            <p><span className="text-muted-foreground">Frecuencia:</span> {t.payment_frequency}</p>
                                            <p className="border-t pt-1 mt-1 font-bold">
                                                Total: {formatCurrency((t.installment_value * t.total_installments) + Number(t.down_payment || 0))}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                                {templates.length === 0 && (
                                    <div className="col-span-2 text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                                        No hay planes predefinidos creados
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </MainLayout>
    );
}
