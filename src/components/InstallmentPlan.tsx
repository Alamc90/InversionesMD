import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { formatCurrency, parseCurrency } from "@/lib/utils";
import { InstallmentPlan as InstallmentPlanType } from '../models/Payment';
import { DataService } from '../services/DataService';
import { PaymentPlanTemplate } from '../models/PaymentPlanTemplate';

interface Props {
    onSubmit: (plan: InstallmentPlanType) => void;
    onBack?: () => void;
}

const InstallmentPlan: React.FC<Props> = ({ onSubmit, onBack }) => {
    const [totalAmount, setTotalAmount] = useState(0);
    const [installments, setInstallments] = useState(1);
    const [installmentValue, setInstallmentValue] = useState(0);
    const [downPayment, setDownPayment] = useState(0);
    const [frequency, setFrequency] = useState<'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('SEMANAL');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [templates, setTemplates] = useState<PaymentPlanTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');

    useEffect(() => {
        async function loadTemplates() {
            try {
                const temps = await DataService.getPaymentPlanTemplates();
                setTemplates(temps);
            } catch (error) {
                console.error("Error loading templates", error);
            }
        }
        loadTemplates();
    }, []);

    const calculateTotal = () => {
        if (installments > 0) {
            const val = (installmentValue * installments) + downPayment;
            setTotalAmount(val);
            return val;
        }
        return downPayment;
    };

    const handleTemplateChange = (val: string) => {
        setSelectedTemplateId(val);
        if (val === 'custom') return;
        
        const template = templates.find(t => t.id === val);
        if (template) {
            setInstallments(template.total_installments);
            setInstallmentValue(template.installment_value);
            setFrequency(template.payment_frequency as any);
            setDownPayment(template.down_payment || 0);
        }
    };

    const handleSubmit = () => {
        const total = calculateTotal();
        onSubmit({
            total_installments: installments,
            installment_value: installmentValue,
            installments_paid: 0,
            total_amount: total, // now includes down payment
            payment_frequency: frequency,
            start_date: startDate,
            down_payment: downPayment
        });
    };

    const handleInstallmentValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseCurrency(e.target.value);
        setInstallmentValue(val);
        setSelectedTemplateId('custom'); // revert to custom on manual edit
    };

    const handleDownPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseCurrency(e.target.value);
        setDownPayment(val);
        setSelectedTemplateId('custom'); // revert to custom on manual edit
    };

    const handleInstallmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInstallments(Number(e.target.value));
        setSelectedTemplateId('custom'); // revert to custom on manual edit
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-8">
            <CardHeader>
                <CardTitle>Plan de Pagos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {templates.length > 0 && (
                    <div className="space-y-2 pb-4 border-b">
                        <Label htmlFor="template">Plantilla de Plan (Opcional)</Label>
                        <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione una plantilla" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="custom">-- Personalizado --</SelectItem>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id as string}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2 mt-4">
                    <Label htmlFor="frequency">Frecuencia de Pago</Label>
                    <Select value={frequency} onValueChange={(val: any) => { setFrequency(val); setSelectedTemplateId('custom'); }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione frecuencia" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DIARIO">Diario</SelectItem>
                            <SelectItem value="SEMANAL">Semanal</SelectItem>
                            <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                            <SelectItem value="MENSUAL">Mensual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha de Inicio</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="downPayment">Cuota Inicial (Opcional)</Label>
                    <Input
                        id="downPayment"
                        type="text"
                        placeholder="Ej: 15000"
                        value={downPayment ? formatCurrency(downPayment) : ''}
                        onChange={handleDownPaymentChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="installmentValue">Valor de Cuota</Label>
                    <Input
                        id="installmentValue"
                        type="text"
                        placeholder="Ej: 5000"
                        value={installmentValue ? formatCurrency(installmentValue) : ''}
                        onChange={handleInstallmentValueChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="installments">Cantidad de Cuotas</Label>
                    <Input
                        id="installments"
                        type="number"
                        placeholder="Ej: 12"
                        value={installments || ''}
                        onChange={handleInstallmentsChange}
                    />
                </div>

                <div className="pt-4 bg-secondary/20 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold flex justify-between">
                        Monto Total a Financiar:
                        <span className="text-primary">${totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </h3>
                </div>
            </CardContent>
            <CardFooter className="flex gap-4">
                {onBack && <Button onClick={onBack} variant="outline" className="flex-1">Atrás</Button>}
                <Button onClick={() => calculateTotal()} variant="secondary" className="flex-1">Calcular</Button>
                <Button onClick={handleSubmit} className="flex-1">Confirmar Plan</Button>
            </CardFooter>
        </Card>
    );
};

export default InstallmentPlan;