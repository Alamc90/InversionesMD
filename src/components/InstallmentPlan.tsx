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
import { PaymentCalculator } from '../services/PaymentCalculator';

interface Props {
    onSubmit: (plan: InstallmentPlanType) => void;
    onBack?: () => void;
}

const InstallmentPlan: React.FC<Props> = ({ onSubmit, onBack }) => {
    // Nuevos campos para la lógica financiera
    const [price, setPrice] = useState(0); // Precio del vehículo
    const [interestRate, setInterestRate] = useState<number | ''>(10); // 10% por defecto
    const [excludedDay, setExcludedDay] = useState<string>('ninguno');
    const [months, setMonths] = useState<number | ''>(''); // Plazo en meses
    
    // Campos existentes
    const [totalAmount, setTotalAmount] = useState(0);
    const [installments, setInstallments] = useState<number | ''>('');
    const [installmentValue, setInstallmentValue] = useState(0);
    const [downPayment, setDownPayment] = useState(0);
    const [frequency, setFrequency] = useState<'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('SEMANAL');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [templates, setTemplates] = useState<PaymentPlanTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');

    const [capitalAmount, setCapitalAmount] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);

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

    const handleCalculatePlan = () => {
        const result = PaymentCalculator.calculatePlanDetails({
            price,
            downPayment,
            paymentFrequency: frequency,
            excludedDays: excludedDay !== 'ninguno' ? [excludedDay] : [],
            interestRate: interestRate === '' ? undefined : Number(interestRate),
            installmentValue: installmentValue || undefined,
            totalInstallments: installments === '' ? undefined : Number(installments),
            months: months === '' ? 0 : Number(months)
        });

        if (result) {
            setInstallments(result.numberOfInstallments);
            setInstallmentValue(result.installmentValue);
            setInterestRate(result.interestRate);
            setMonths(result.months);
            setTotalAmount(result.totalToPay);
            setCapitalAmount(result.capitalAmount);
            setTotalInterest(result.totalInterest);
        }
    };

    const handleTemplateChange = (val: string) => {
        setSelectedTemplateId(val);
        if (val === 'custom') return;
        
        const template = templates.find(t => t.id === val);
        if (template) {
            setInstallments(template.total_installments);
            setInstallmentValue(template.installment_value);
            setFrequency(template.payment_frequency as any);
            const dp = Number(template.down_payment);
            setDownPayment(isNaN(dp) ? 0 : dp);
            if (template.price) setPrice(template.price);
            if (template.interest_rate) setInterestRate(template.interest_rate);
            if (template.months) setMonths(template.months);
            if (template.excluded_days && template.excluded_days.length > 0) {
                setExcludedDay(template.excluded_days[0]);
            } else {
                setExcludedDay('ninguno');
            }
        }
    };

    const handleSubmit = () => {
        if (!installments || !installmentValue) {
            alert('Por favor calcule el plan antes de confirmar.');
            return;
        }

        // Si no se calculó The totalAmount yet, just calculate it now seamlessly
        let finalCapital = capitalAmount;
        let finalInterestRate = interestRate === '' ? 10 : interestRate;
        let exDays = excludedDay !== 'ninguno' ? [excludedDay] : [];

        if (finalCapital === 0 && price > 0) {
            handleCalculatePlan();
            return; // force user to calculate first, or run logic inline. Best is to require calculate.
        }

        onSubmit({
            total_installments: Number(installments),
            installment_value: installmentValue,
            installments_paid: 0,
            total_amount: totalAmount,
            payment_frequency: frequency,
            start_date: startDate,
            down_payment: downPayment,
            
            // Nuevos Campos
            capital_amount: finalCapital,
            interest_rate: Number(finalInterestRate),
            excluded_days: exDays
        });
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-8">
            <CardHeader>
                <CardTitle>Plan de Pagos: Financiación</CardTitle>
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
                
                <div className="space-y-2">
                    <Label htmlFor="price">Precio de la Moto</Label>
                    <Input
                        id="price"
                        type="text"
                        placeholder="Ej: 3000000"
                        value={price ? formatCurrency(price) : ''}
                        onChange={(e) => setPrice(parseCurrency(e.target.value))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="downPayment">Cuota Inicial (Abono a Capital)</Label>
                    <Input
                        id="downPayment"
                        type="text"
                        placeholder="Ej: 500000"
                        value={downPayment ? formatCurrency(downPayment) : ''}
                        onChange={(e) => {
                            setDownPayment(parseCurrency(e.target.value));
                            setSelectedTemplateId('custom');
                        }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="interestRate">Tasa de Interés (% Mensual)</Label>
                        <Input
                            id="interestRate"
                            type="number"
                            placeholder="Ej: 10"
                            value={interestRate}
                            onChange={(e) => setInterestRate(e.target.value ? Number(e.target.value) : '')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="months">Plazo (Meses)</Label>
                        <Input
                            id="months"
                            type="number"
                            placeholder="Ej: 12"
                            value={months}
                            onChange={(e) => setMonths(e.target.value ? Number(e.target.value) : '')}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="frequency">Frecuencia</Label>
                        <Select value={frequency} onValueChange={(val: any) => { setFrequency(val); setSelectedTemplateId('custom'); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Frecuencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DIARIO">Diario</SelectItem>
                                <SelectItem value="SEMANAL">Semanal</SelectItem>
                                <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                                <SelectItem value="MENSUAL">Mensual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {frequency === 'DIARIO' && (
                        <div className="space-y-2">
                            <Label htmlFor="excludedDay">Día Libre</Label>
                            <Select value={excludedDay} onValueChange={setExcludedDay}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ninguno" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ninguno">Ninguno</SelectItem>
                                    <SelectItem value="domingo">Domingo</SelectItem>
                                    <SelectItem value="lunes">Lunes</SelectItem>
                                    <SelectItem value="martes">Martes</SelectItem>
                                    <SelectItem value="miercoles">Miércoles</SelectItem>
                                    <SelectItem value="jueves">Jueves</SelectItem>
                                    <SelectItem value="viernes">Viernes</SelectItem>
                                    <SelectItem value="sabado">Sábado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="installments">Cant. de Pagos</Label>
                        <Input
                            id="installments"
                            type="number"
                            placeholder="Ej: 12"
                            value={installments}
                            onChange={(e) => {
                                setInstallments(e.target.value ? Number(e.target.value) : '');
                                setSelectedTemplateId('custom');
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="installmentValue">Valor de la Cuota</Label>
                        <Input
                            id="installmentValue"
                            type="text"
                            placeholder="Dejar en blanco para autocalcular"
                            value={installmentValue ? formatCurrency(installmentValue) : ''}
                            onChange={(e) => {
                                setInstallmentValue(parseCurrency(e.target.value));
                                setSelectedTemplateId('custom');
                            }}
                        />
                    </div>
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

                <div className="pt-4 bg-secondary/20 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capital Financiado:</span>
                        <span>{formatCurrency(capitalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Intereses Totales:</span>
                        <span>{formatCurrency(totalInterest)}</span>
                    </div>
                    <h3 className="text-lg font-semibold flex justify-between border-t pt-2 mt-2">
                        Monto Total (Deuda):
                        <span className="text-primary">{formatCurrency(totalAmount)}</span>
                    </h3>
                </div>
            </CardContent>
            <CardFooter className="flex gap-4">
                {onBack && <Button onClick={onBack} variant="outline" className="flex-1">Atrás</Button>}
                <Button onClick={handleCalculatePlan} variant="secondary" className="flex-1">Calcular</Button>
                <Button onClick={handleSubmit} className="flex-1">Confirmar Plan</Button>
            </CardFooter>
        </Card>
    );
};

export default InstallmentPlan;