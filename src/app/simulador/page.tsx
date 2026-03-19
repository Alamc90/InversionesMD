"use client"

import React, { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseCurrency, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentCalculator } from '@/services/PaymentCalculator';

export default function SimuladorPage() {
    const [price, setPrice] = useState(6500000);
    const [downPayment, setDownPayment] = useState(0);
    const [interestRate, setInterestRate] = useState<number | ''>(8);
    const [months, setMonths] = useState<number | ''>(24);
    const [frequency, setFrequency] = useState<'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('DIARIO');
    const [excludedDay, setExcludedDay] = useState<string>('domingo');
    
    // Resultados del plan
    const [installments, setInstallments] = useState<number>(0);
    const [installmentValue, setInstallmentValue] = useState<number>(0);
    const [totalInterest, setTotalInterest] = useState<number>(0);
    const [totalToPay, setTotalToPay] = useState<number>(0);
    
    // Liquidación
    const [installmentsPaid, setInstallmentsPaid] = useState<number>(0);
    const [liquidationPercentage, setLiquidationPercentage] = useState<number>(5);

    const handleCalculatePlan = () => {
        const result = PaymentCalculator.calculatePlanDetails({
            price: price,
            downPayment: downPayment,
            paymentFrequency: frequency,
            excludedDays: excludedDay !== 'ninguno' ? [excludedDay] : [],
            interestRate: interestRate === '' ? undefined : Number(interestRate),
            months: months === '' ? 0 : Number(months),
            installmentValue: undefined,
            totalInstallments: undefined
        });

        if (result) {
            setInstallments(result.numberOfInstallments);
            setInstallmentValue(result.installmentValue);
            setInterestRate(result.interestRate);
            setMonths(result.months);
            setTotalInterest(result.totalInterest);
            setTotalToPay(result.totalToPay);
        }
    };

    // --- Live Liquidation Calculation ---
    const remainingInst = Math.max(0, installments - installmentsPaid);
    let remainingMonths = 0;
    if (frequency === 'MENSUAL') remainingMonths = remainingInst;
    else if (frequency === 'QUINCENAL') remainingMonths = remainingInst / 2;
    else if (frequency === 'SEMANAL') remainingMonths = remainingInst / 4;
    else if (frequency === 'DIARIO') {
        const excludedCount = excludedDay !== 'ninguno' ? 1 : 0;
        const daysPerMonth = 30 - (excludedCount * 4.3);
        remainingMonths = remainingInst / Math.max(1, daysPerMonth);
    }
    remainingMonths = Math.round(remainingMonths);

    const liqInterest = remainingMonths * (Number(liquidationPercentage) / 100) * price;
    const totalGiven = installmentsPaid * installmentValue; // Removiendo downPayment del total recaudado a la fecha para este calculo
    const amountToPay = Math.max(0, price + liqInterest - totalGiven);

    return (
        <MainLayout>
            <div className="container mx-auto p-4 max-w-5xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Simulador Financiero</h1>
                    <p className="text-muted-foreground mt-2">Cree proyecciones rápidas o simule liquidaciones anticipadas antes de aplicarlas a clientes reales.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Sección: Crear Plan */}
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Definir Plan de Pagos</CardTitle>
                            <CardDescription>Parámetros iniciales de la financiación</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Precio del Vehículo</Label>
                                    <Input 
                                        type="text" 
                                        value={price ? formatCurrency(price) : ''}
                                        onChange={(e) => setPrice(parseCurrency(e.target.value))} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cuota Inicial (Abono)</Label>
                                    <Input 
                                        type="text" 
                                        value={downPayment ? formatCurrency(downPayment) : ''}
                                        onChange={(e) => setDownPayment(parseCurrency(e.target.value))} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tasa de Interés (% Mensual)</Label>
                                    <Input 
                                        type="number"
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(e.target.value ? Number(e.target.value) : '')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Frecuencia</Label>
                                    <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DIARIO">Diario</SelectItem>
                                            <SelectItem value="SEMANAL">Semanal</SelectItem>
                                            <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                                            <SelectItem value="MENSUAL">Mensual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Plazo (Meses)</Label>
                                    <Input 
                                        type="number"
                                        value={months}
                                        onChange={(e) => setMonths(e.target.value ? Number(e.target.value) : '')}
                                    />
                                </div>
                            </div>

                            <Button className="w-full mt-4" onClick={handleCalculatePlan}>Calcular Plan</Button>

                            {installments > 0 && (
                                <div className="bg-secondary/20 p-4 rounded-lg mt-4 space-y-2 text-sm border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Valor de la Cuota:</span>
                                        <span className="font-bold text-lg">{formatCurrency(installmentValue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Número de Cuotas:</span>
                                        <span className="font-medium">{installments}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-muted-foreground/20 pt-2 mt-2">
                                        <span className="text-muted-foreground">Monto Financiado:</span>
                                        <span className="font-medium">{formatCurrency(price - downPayment)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Todos los Intereses:</span>
                                        <span className="font-medium">{formatCurrency(totalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-primary border-t border-muted-foreground/20 pt-2 mt-2">
                                        <span>Sumatoria General Todas las Cuotas:</span>
                                        <span>{formatCurrency(totalToPay)}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Sección: Simular Liquidación */}
                    <Card className={installments === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <CardHeader>
                            <CardTitle>2. Escenario de Liquidación</CardTitle>
                            <CardDescription>Calcule el saldo anticipado bajo el % administrativo</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 mb-4">
                                    <Label>Cuotas que ya ha pagado</Label>
                                    <Input 
                                        type="number"
                                        value={installmentsPaid}
                                        onChange={(e) => setInstallmentsPaid(Number(e.target.value))}
                                        max={installments}
                                    />
                                    <p className="text-xs text-muted-foreground">Máx: {installments}</p>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <Label>% de Liquidación a cobrar</Label>
                                    <Input 
                                        type="number"
                                        value={liquidationPercentage}
                                        onChange={(e) => setLiquidationPercentage(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 text-sm border rounded-lg p-4 bg-muted/30">
                                <div className="flex justify-between pb-2 border-b">
                                    <span className="text-muted-foreground">Meses faltantes (Aprox):</span>
                                    <span className="font-medium">{remainingMonths}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">1. Valor Original de la Moto:</span>
                                    <span className="font-medium">{formatCurrency(price)}</span>
                                </div>
                                <div className="flex justify-between text-amber-600">
                                    <span className="text-muted-foreground">2. Interés por Liquidación:</span>
                                    <span className="font-medium">+ {formatCurrency(liqInterest)}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span className="text-muted-foreground">3. Total Ya Pagado (Sin abono inicial):</span>
                                    <span className="font-medium">- {formatCurrency(totalGiven)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-xl pt-4 border-t mt-4">
                                    <span>Monto a Cobrar para Paz y Salvo:</span>
                                    <span className="text-primary">{formatCurrency(amountToPay)}</span>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded text-sm mt-4">
                                <strong>Fórmula aplicada:</strong><br/>
                                (Valor original de moto) + (Meses faltantes × {liquidationPercentage}% × Valor Original) - (Total dinero recaudado a la fecha sin abonos iniciales)
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
