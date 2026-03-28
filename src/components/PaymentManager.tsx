import React, { useState, useEffect } from 'react';
import { DataService } from '../services/DataService';
import { FinancialService } from '../services/FinancialService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { formatCurrency, parseCurrency } from "@/lib/utils";
import { calculateOverdueInfo } from "@/lib/paymentUtils";
import { toast } from "sonner"
import { Info, User, Car, ShieldCheck, Printer, Clock, CheckCircle, XCircle, Edit3 } from "lucide-react"
import { printReceipt, printReceiptDirect } from "@/lib/receiptPrinter";
import { isPrinterConnected } from "@/lib/thermalPrinter";
import { BusinessConfig } from "@/models/BusinessConfig";
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PaymentStatus } from '@/models/Payment';
import { PaymentCalculator } from '@/services/PaymentCalculator';

interface Props {
    vehicleId: number;
    isOpen: boolean;
    onClose: () => void;
    onPaymentComplete?: (newProgress?: number) => void;
}

export const PaymentManager: React.FC<Props> = ({ vehicleId, isOpen, onClose, onPaymentComplete }) => {
    const { hasPermission, business } = useAuth();
    const canAutoApprove = hasPermission('can_approve_payments');
    
    const [details, setDetails] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [overdueInfo, setOverdueInfo] = useState({ overdueInstallments: 0, nextDueDate: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [paymentNote, setPaymentNote] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
    const [showCustomAmount, setShowCustomAmount] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentType, setPaymentType] = useState<'regular' | 'down_payment'>('regular');
    
    // Liquidation state
    const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);
    const [liquidationPercentage, setLiquidationPercentage] = useState<number | ''>(5);

    useEffect(() => {
        if (isOpen && vehicleId) {
            loadData();
        }
    }, [isOpen, vehicleId]);

    const loadData = async () => {
        setLoadingData(true);
        try {
            // Parallel fetch: config + vehicle details at the same time
            const [config, data] = await Promise.all([
                DataService.getBusinessConfig(),
                DataService.getVehicleDetails(vehicleId)
            ]);
            setBusinessConfig(config);
            
            let plans = Array.isArray(data?.installment_plans) 
                ? data.installment_plans 
                : (data?.installment_plans ? [data.installment_plans] : []);
                
            if (plans.length > 0) {
                let plan = plans[0];
                
                // Parallel fetch: fresh plan + payment history at the same time
                const [freshPlan, records] = await Promise.all([
                    DataService.getInstallmentPlan(plan.id).catch(e => {
                        console.error("Failed to refresh plan details", e);
                        return null;
                    }),
                    DataService.getPaymentHistory(plan.id)
                ]);

                if (freshPlan) {
                    plan = { ...plan, ...freshPlan };
                }

                let allRecords = records || [];

                setHistory(allRecords);

                // Calculate progress manually from APROBADO payments only
                const approvedPayments = (records || []).filter((r: any) => r.status === 'APROBADO');
                const regularPayments = approvedPayments.filter((r: any) => !r.note?.toLowerCase().includes('cuota inicial'));
                
                const totalPaid = regularPayments.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
                const instVal = Number(plan.installment_value) || 1;
                const rawPaid = instVal > 0 ? (totalPaid / instVal) : 0;
                const computedInstallmentsPaid = Number(rawPaid.toFixed(2));
                
                // Override potentially stale DB value
                plan.installments_paid = computedInstallmentsPaid;
                
                // Update local state with the corrected plan
                plans[0] = plan;
                setDetails({ ...data, installment_plans: plans });

                // Set default payment amount if needed
                if (!paymentAmount) {
                     setPaymentAmount(Number(plan.installment_value) || 0);
                }

                calculateOverdue(plan);
            } else {
                setDetails(data);
            }
        } catch (error) {
            console.error("Error loading payment data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    // Kept for compatibility if used elsewhere, but loadData handles it now
    const loadHistory = async (plan: any) => {
        const records = await DataService.getPaymentHistory(plan.id);
        let allRecords = records || [];

        setHistory(allRecords);
        return allRecords;
    };

    const calculateOverdue = (plan: any) => {
        const info = calculateOverdueInfo(plan);
        setOverdueInfo({
            overdueInstallments: Number(info.overdueInstallments.toFixed(2)),
            nextDueDate: info.nextDueDate ? info.nextDueDate.toLocaleDateString() : ''
        });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseCurrency(e.target.value);
        setPaymentAmount(val);
    };

    const paySingleInstallment = () => {
        const plans = Array.isArray(details?.installment_plans) ? details.installment_plans : (details?.installment_plans ? [details.installment_plans] : []);
        if (plans.length > 0) {
            const val = Number(plans[0].installment_value) || 0;
            // Just update input, user must confirm
            setPaymentAmount(val);
        }
    };

    const payPendingInstallments = () => {
        const plans = Array.isArray(details?.installment_plans) ? details.installment_plans : (details?.installment_plans ? [details.installment_plans] : []);
        if (plans.length > 0) {
            const amount = (Number(plans[0].installment_value) || 0) * overdueInfo.overdueInstallments;
            if (amount > 0) {
                 setPaymentAmount(amount);
            } else {
                toast.info("No hay cuotas pendientes para pagar");
            }
        }
    };

    const openLiquidationModal = () => {
        setIsLiquidationOpen(true);
    };

    const confirmLiquidation = () => {
        const plans = Array.isArray(details?.installment_plans) ? details.installment_plans : (details?.installment_plans ? [details.installment_plans] : []);
        if (plans.length > 0) {
            const p = plans[0];
            
            const remainingInst = Math.max(0, Number(p.total_installments) - Number(p.installments_paid));
            let remainingMonths = 0;
            const freq = p.payment_frequency;
            
            if (freq === 'MENSUAL') remainingMonths = remainingInst;
            else if (freq === 'QUINCENAL') remainingMonths = remainingInst / 2;
            else if (freq === 'SEMANAL') remainingMonths = remainingInst / 4;
            else if (freq === 'DIARIO') {
                const excludedCount = p.excluded_days?.length || 0;
                const daysPerMonth = 30 - (excludedCount * 4.3);
                remainingMonths = remainingInst / Math.max(1, daysPerMonth);
            }
            // Redondear meses a su valor más cercano para cálculo equitativo
            remainingMonths = Math.round(remainingMonths);
            const originalBikePrice = (Number(p.capital_amount) || 0) + (Number(p.down_payment) || 0);
            
            const liqPerc = Number(liquidationPercentage) || 0;
            const liquidationInterest = remainingMonths * (liqPerc / 100) * originalBikePrice;
            
            // Total ya pagado, sin contar abonos a la inicial
            const totalGiven = Number(p.installments_paid) * Number(p.installment_value);
            
            const amountToPay = Math.max(0, originalBikePrice + liquidationInterest - totalGiven);

            setPaymentAmount(Math.round(amountToPay));
            setPaymentType('regular');
            setPaymentNote(`Liquidación Total Anticipada (Interés: ${liqPerc}%, Meses faltantes: ${remainingMonths})`);
            
            setIsLiquidationOpen(false);
            setShowCustomAmount(true);
            toast.info("Monto de liquidación calculado y cargado.");
        }
    };

    const payoffDebt = () => {
        // Redirigir botón antiguo al nuevo flujo
        openLiquidationModal();
    };

    const handlePayment = async () => {
        setIsConfirmOpen(true);
    };

    const confirmPayment = async () => {
        if (processing) return; // Guard against double-click
        
        const plans = Array.isArray(details?.installment_plans) 
            ? details.installment_plans 
            : (details?.installment_plans ? [details.installment_plans] : []);
            
        if (plans.length === 0) return;
        
        setProcessing(true);
        
        let result: any;
        try {
            const finalNote = paymentType === 'down_payment' 
                ? 'Abono a Cuota Inicial' + (paymentNote ? ` - ${paymentNote}` : '') 
                : paymentNote;

            result = await DataService.registerPayment(plans[0].id, paymentAmount, finalNote, canAutoApprove);
        } catch (error: any) {
            toast.error(`Error al registrar pago: ${error.message || 'Error de servidor'}`);
            console.error(error);
            setProcessing(false);
            return; // Detener flujo si falla el registro principal
        }

        // Si llegamos aquí, el registro principal fue exitoso
        try {
            if (canAutoApprove) {
                toast.success('Pago registrado y aprobado correctamente');
                
                // Record income in financial transactions
                if (business?.id && result.payment) {
                    try {
                        console.log("Recording income in financial_transactions...", result.payment);
                        if (paymentType === 'down_payment') {
                            await FinancialService.recordDownPaymentIncome(
                                business.id,
                                paymentAmount,
                                details.plate
                            );
                        } else {
                            await FinancialService.recordPaymentIncome(
                                business.id,
                                paymentAmount,
                                result.payment.id?.toString() || '',
                                `Pago cuota - ${details.plate}`
                            );
                        }
                        console.log("Income recorded successfully in financial_transactions.");
                    } catch (e: any) {
                        console.error('Error recording income:', e);
                        toast.error('Error guardando en balance: ' + e.message);
                    }
                } else {
                    console.warn("Could not record income", business?.id, result.payment);
                }
            } else {
                toast.success('Pago registrado como PENDIENTE. Requiere aprobación de un administrador.');
            }
            
            setIsConfirmOpen(false);
            setPaymentNote('');
            
            // Recalculate locally for immediate UI update on pending installments if needed
            if (result && result.newProgress !== undefined && plans[0]) {
                const updatedPlan = { ...plans[0], installments_paid: result.newProgress };

                let newPlans = Array.isArray(details.installment_plans) ? [...details.installment_plans] : [details.installment_plans];
                if (Array.isArray(details.installment_plans)) {
                     newPlans[0] = updatedPlan;
                } else {
                     newPlans = [updatedPlan];
                }
                
                const newDetails = { ...details, installment_plans: newPlans };
                setDetails(newDetails);
                
                if (onPaymentComplete) {
                    onPaymentComplete(result.newProgress);
                }
                
                calculateOverdue(updatedPlan);
                 
                await loadHistory(plans[0]);
            } else {
                 await loadData();
            }
        } catch (error: any) {
            console.error("Error actualizando vistas después del pago:", error);
            // Ya no mostramos "Error al registrar pago" porque el registro fue exitoso
            // Opcional: toast.warning('El pago se guardó pero hubo un error recargando los datos');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    if (loadingData || !details) {
        return (
            <Dialog open={isOpen} onOpenChange={() => onClose()}>
                <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Cargando datos de pago...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const plans = Array.isArray(details.installment_plans) 
        ? details.installment_plans 
        : (details.installment_plans ? [details.installment_plans] : []);
        
    const plan = plans.length > 0 ? plans[0] : null;

    const installmentVal = Number(plan?.installment_value) || 0;
    const installmentsPaid = Number(plan?.installments_paid) || 0;
    const totalInstallments = Number(plan?.total_installments) || 0;
    
    // Down payment calculation
    const isDownPayment = (r: any) => r.note?.toLowerCase().includes('cuota inicial');
    const downPaymentRecords = history.filter(r => r.status === 'APROBADO' && isDownPayment(r));
    const totalDownPaymentPaid = downPaymentRecords.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalDownPayment = Number(plan?.down_payment) || 0;
    const remainingDownPayment = Math.max(0, totalDownPayment - totalDownPaymentPaid);

    // --- Live Liquidation Calculation ---
    const liqRemainingInst = Math.max(0, totalInstallments - installmentsPaid);
    let liqRemainingMonths = 0;
    const liqFreq = plan?.payment_frequency || 'MENSUAL';
    if (liqFreq === 'MENSUAL') liqRemainingMonths = liqRemainingInst;
    else if (liqFreq === 'QUINCENAL') liqRemainingMonths = liqRemainingInst / 2;
    else if (liqFreq === 'SEMANAL') liqRemainingMonths = liqRemainingInst / 4;
    else if (liqFreq === 'DIARIO') {
        const excludedCount = plan?.excluded_days?.length || 0;
        const daysPerMonth = 30 - (excludedCount * 4.3);
        liqRemainingMonths = liqRemainingInst / Math.max(1, daysPerMonth);
    }
    liqRemainingMonths = Math.round(liqRemainingMonths);
    const liqOriginalBikePrice = (Number(plan?.capital_amount) || 0) + totalDownPayment;
    const liqInterest = liqRemainingMonths * ((Number(liquidationPercentage) || 0) / 100) * liqOriginalBikePrice;
    const liqTotalGiven = (installmentsPaid * installmentVal) + totalDownPaymentPaid;
    const liqAmountToPay = Math.max(0, liqOriginalBikePrice + liqInterest - liqTotalGiven);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) setShowDetails(false);
            onClose();
        }}>
            <DialogContent className="max-w-[85rem] w-[95vw] max-h-[95vh] flex flex-col mobile-dialog">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-12 top-4 text-muted-foreground hover:text-foreground z-10"
                    onClick={() => setShowDetails(true)}
                    title="Ver información detallada"
                >
                    <Info className="h-4 w-4" />
                </Button>

                <DialogHeader className="shrink-0">
                    <DialogTitle>Gestión de Pagos - {details.plate}</DialogTitle>
                </DialogHeader>
                
                {showDetails ? (
                    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto flex-1">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {/* Cliente */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="h-5 w-5 text-blue-500"/> 
                                        Cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Nombre Completo</span>
                                        <span className="font-medium">{details.customers?.first_name} {details.customers?.last_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Cédula</span>
                                        <span className="font-medium">{details.customers?.cedula || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Teléfono</span>
                                        <span className="font-medium">{details.customers?.phone || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Dirección</span>
                                        <span className="font-medium">{details.customers?.address || 'N/A'}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Fiador */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-green-500"/> 
                                        Fiador
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Nombre Completo</span>
                                        <span className="font-medium">
                                            {details.customers?.guarantor_first_name} {details.customers?.guarantor_last_name}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Cédula</span>
                                        <span className="font-medium">{details.customers?.guarantor_cedula || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Dirección</span>
                                        <span className="font-medium">{details.customers?.guarantor_address || 'N/A'}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Vehículo */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Car className="h-5 w-5 text-orange-500"/> 
                                        Vehículo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Placa</span>
                                        <span className="font-bold bg-yellow-400 text-black px-1 rounded inline-block">{details.plate}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Marca/Línea</span>
                                        <span className="font-medium">{details.model}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Modelo</span>
                                        <span className="font-medium">{details.year}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Color</span>
                                        <span className="font-medium">{details.color}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setShowDetails(false)}>Volver a Pagos</Button>
                        </div>
                    </div>
                ) : (
                <>
                <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.4fr)] gap-4">
                    <div className="space-y-6">
                        <Card className="h-full">
                            <CardHeader><CardTitle>Información del Plan</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1">
                                     <div className="flex justify-between items-center py-0.5">
                                        <span className="text-muted-foreground text-sm">Cliente:</span>
                                        <span className="font-medium text-right">{details.customers?.first_name} {details.customers?.last_name}</span>
                                    </div>
                                     <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Teléfono:</span>
                                        <span className="font-medium text-right">{details.customers?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Vehículo:</span>
                                        <span className="font-medium text-right">{details.model} ({details.year})</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Color:</span>
                                        <span className="font-medium text-right">{details.color}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Fecha Inicio:</span>
                                        <span className="font-medium text-right">
                                            {plan?.start_date ? new Date(plan.start_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Frecuencia:</span>
                                        <span className="font-medium text-right">{plan?.payment_frequency || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Valor Cuota:</span>
                                        <span className="font-medium text-right">${installmentVal.toLocaleString()}</span>
                                    </div>
                                     <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Progreso:</span>
                                        <span className="font-medium font-bold text-right">{installmentsPaid % 1 === 0 ? installmentsPaid : installmentsPaid.toFixed(2)} / {totalInstallments}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Cuota Inicial Total:</span>
                                        <span className="font-medium text-right">${totalDownPayment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t">
                                        <span className="text-muted-foreground text-sm">Cuota Inicial Pagada:</span>
                                        <span className="font-medium text-green-600 text-right">${totalDownPaymentPaid.toLocaleString()}</span>
                                    </div>
                                    {remainingDownPayment > 0 && (
                                        <div className="flex justify-between items-center py-0.5 border-t">
                                            <span className="text-muted-foreground text-sm text-yellow-600 font-bold">Cuota Inicial Restante:</span>
                                            <span className="font-medium text-yellow-600 font-bold text-right">${remainingDownPayment.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {plan?.capital_amount ? (
                                        <>
                                            <div className="flex justify-between items-center py-0.5 border-t mt-2 pt-2">
                                                <span className="text-muted-foreground text-sm">Capital Financiado:</span>
                                                <span className="font-medium text-right">${plan.capital_amount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5 border-t">
                                                <span className="text-muted-foreground text-sm">Intereses Totales{plan.interest_rate ? ` (${plan.interest_rate}% mes)` : ''}:</span>
                                                <span className="font-medium text-right">${( (totalInstallments * installmentVal) - plan.capital_amount ).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 mt-1 border-t bg-secondary/20 -mx-2 px-2 rounded">
                                                <span className="text-muted-foreground text-sm font-semibold">Monto Total (Deuda):</span>
                                                <span className="font-medium text-primary font-bold text-right">${(totalInstallments * installmentVal).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className={overdueInfo.overdueInstallments > 0 ? "border-yellow-500" : "border-green-500"}>
                            <CardHeader className="pb-3"><CardTitle>Estado de Cuenta</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                            <div className="text-center p-4 bg-secondary/10 rounded-lg">
                                <p className="text-sm text-muted-foreground">Cuotas Pendientes</p>
                                <p className={`text-4xl font-bold ${overdueInfo.overdueInstallments > 0 ? "text-yellow-500" : "text-green-500"}`}>
                                    {overdueInfo.overdueInstallments}
                                </p>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Próximo Vencimiento:</span>
                                <span className="font-bold">{overdueInfo.nextDueDate}</span>
                            </div>
                            
                                <div className="space-y-4">
                                    <span className="text-sm font-medium">Tipo de Pago</span>
                                    <div className="flex gap-2">
                                        <label className={`flex-1 flex items-center justify-center p-2 rounded border cursor-pointer ${paymentType === 'regular' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
                                            <input 
                                                type="radio" 
                                                name="paymentType" 
                                                value="regular"
                                                className="hidden"
                                                checked={paymentType === 'regular'}
                                                onChange={() => setPaymentType('regular')}
                                            />
                                            Cuota Regular
                                        </label>
                                        <label className={`flex-1 flex text-center items-center justify-center p-2 rounded border cursor-pointer ${paymentType === 'down_payment' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
                                            <input 
                                                type="radio" 
                                                name="paymentType" 
                                                value="down_payment"
                                                className="hidden"
                                                checked={paymentType === 'down_payment'}
                                                onChange={() => {
                                                    setPaymentType('down_payment');
                                                    if (remainingDownPayment > 0) setPaymentAmount(remainingDownPayment);
                                                }}
                                            />
                                            Abono Cuota Inicial
                                        </label>
                                    </div>
                                </div>
                            
                                {paymentType === 'regular' && (
                                <div className="space-y-4">
                                    <span className="text-sm font-medium">Selección de Pago</span>
                                    <div className="flex gap-2 flex-wrap">
                                        <Button 
                                            variant={!showCustomAmount && Math.abs(paymentAmount - installmentVal) < 1 ? "default" : "outline"}
                                            className="flex-1"
                                            onClick={() => { paySingleInstallment(); setShowCustomAmount(false); }} 
                                        >
                                            1 Cuota ({formatCurrency(installmentVal)})
                                        </Button>
                                        
                                        {overdueInfo.overdueInstallments > 0 && (
                                            <Button 
                                                variant={!showCustomAmount && Math.abs(paymentAmount - (installmentVal * overdueInfo.overdueInstallments)) < 1 ? "destructive" : "outline"}
                                                className="flex-1"
                                                onClick={() => { payPendingInstallments(); setShowCustomAmount(false); }} 
                                            >
                                                Pendientes ({formatCurrency(installmentVal * overdueInfo.overdueInstallments)})
                                            </Button>
                                        )}

                                        <Button
                                            variant={showCustomAmount ? "secondary" : "outline"}
                                            className="flex-1"
                                            onClick={() => setShowCustomAmount(true)}
                                        >
                                            <Edit3 className="h-4 w-4 mr-1" />
                                            Personalizado
                                        </Button>
                                    </div>
                                    
                                    <div className="flex w-full pt-1">
                                        <Button
                                            variant="outline"
                                            className="w-full text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => { payoffDebt(); setShowCustomAmount(false); }}
                                        >
                                            Liquidar Totalidad (Ahorro Intereses)
                                        </Button>
                                    </div>

                                    {showCustomAmount && (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="text-sm text-muted-foreground">Monto personalizado:</label>
                                            <Input
                                                type="text"
                                                value={formatCurrency(paymentAmount)}
                                                onChange={handleAmountChange}
                                                placeholder="Ingrese el monto"
                                                className="text-lg font-bold"
                                            />
                                            {installmentVal > 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    Equivale a <span className="font-semibold text-foreground">{(paymentAmount / installmentVal).toFixed(2)}</span> cuota{(paymentAmount / installmentVal) !== 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}
                                
                                {paymentType === 'down_payment' && (
                                    <div className="space-y-2 animate-fade-in">
                                        <label className="text-sm text-muted-foreground">Monto de abono:</label>
                                        <Input
                                            type="text"
                                            value={formatCurrency(paymentAmount)}
                                            onChange={handleAmountChange}
                                            placeholder="Ingrese el abono a cuota inicial"
                                            className="text-lg font-bold"
                                        />
                                    </div>
                                )}

                                <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                                    <span className="font-semibold">Monto a Pagar:</span>
                                    <span className="text-xl font-bold">{formatCurrency(paymentAmount)}</span>
                                </div>

                                <Button size="lg" className="w-full" onClick={handlePayment} disabled={paymentAmount <= 0 || processing}>
                                    {processing ? 'Confirmando pago...' : 'Confirmar Pago'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col min-h-0">
                        <h3 className="text-lg font-bold mb-2">Historial de Pagos</h3>
                        <div className="border rounded-md overflow-auto max-h-[40vh] lg:max-h-[60vh]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                    <TableRow>
                                        <TableHead className="text-xs">Fecha</TableHead>
                                        <TableHead className="text-xs">Monto</TableHead>
                                        <TableHead className="text-xs">Estado</TableHead>
                                        <TableHead className="text-xs hidden sm:table-cell">Nota</TableHead>
                                        <TableHead className="w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((rec: any) => {
                                        const status = (rec.status || 'APROBADO') as PaymentStatus;
                                        return (
                                        <TableRow key={rec.id}>
                                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">{new Date(rec.payment_date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium text-xs sm:text-sm">${rec.amount?.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${PAYMENT_STATUS_COLORS[status]}`}>
                                                    {status === 'PENDIENTE' && <Clock className="h-3 w-3" />}
                                                    {status === 'APROBADO' && <CheckCircle className="h-3 w-3" />}
                                                    {status === 'DENEGADO' && <XCircle className="h-3 w-3" />}
                                                    {PAYMENT_STATUS_LABELS[status]}
                                                </span>
                                                {rec.created_by_name && (
                                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                                        por {rec.created_by_name}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs">{rec.note || '-'}</TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    title="Imprimir Recibo"
                                                    onClick={async () => {
                                                        const receiptProps = {
                                                            payment: rec,
                                                            customer: details.customers,
                                                            vehicle: details,
                                                            plan: details.installment_plans[0],
                                                            businessConfig: businessConfig,
                                                            logoUrl: business?.logo_url
                                                        };
                                                        if (isPrinterConnected()) {
                                                            try {
                                                                await printReceiptDirect(receiptProps);
                                                                toast.success('Recibo impreso');
                                                            } catch (e: any) {
                                                                toast.error('Error al imprimir: ' + e.message);
                                                                printReceipt(receiptProps);
                                                            }
                                                        } else {
                                                            printReceipt(receiptProps);
                                                        }
                                                    }}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No hay pagos registrados</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
                </div>

                <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Confirmar Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total a Pagar:</span>
                                <span>{formatCurrency(paymentAmount)}</span>
                            </div>
                            {installmentVal > 0 && paymentType === 'regular' && (
                                <div className="text-sm text-muted-foreground text-right">
                                    Equivale a <span className="font-semibold text-foreground">{(paymentAmount / installmentVal).toFixed(2)}</span> cuota{(paymentAmount / installmentVal) !== 1 ? 's' : ''} de {formatCurrency(installmentVal)}
                                </div>
                            )}
                            {!canAutoApprove && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-center gap-2">
                                    <Clock className="h-4 w-4 shrink-0" />
                                    Este pago quedará como <strong>PENDIENTE</strong> hasta que un administrador lo apruebe.
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nota (Opcional):</label>
                                <textarea 
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                                    placeholder="Ingrese una nota para este pago..."
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={processing}>Cancelar</Button>
                                <Button onClick={confirmPayment} disabled={processing}>
                                    {processing ? 'Confirmando pago...' : 'Confirmar Pago'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Liquidación */}
                <Dialog open={isLiquidationOpen} onOpenChange={setIsLiquidationOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Liquidación Total Anticipada</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Porcentaje de Liquidación (%)</label>
                                <Input 
                                    type="number" 
                                    value={liquidationPercentage} 
                                    onChange={(e) => setLiquidationPercentage(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="Ej: 5"
                                />
                            </div>
                            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Meses Faltantes (Aprox):</span>
                                    <span className="font-medium">{liqRemainingMonths}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valor Original de la Moto:</span>
                                    <span className="font-medium">${liqOriginalBikePrice.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Intereses por Liquidación:</span>
                                    <span className="font-medium text-amber-600">+ ${liqInterest.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Ya Pagado (Sin abonos):</span>
                                    <span className="font-medium text-green-600">- ${liqTotalGiven.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2 font-bold text-lg">
                                    <span>Monto a Pagar:</span>
                                    <span className="text-primary">${Math.round(liqAmountToPay).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setIsLiquidationOpen(false)}>Cancelar</Button>
                                <Button onClick={confirmLiquidation}>Cargar monto a pago</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                </>
                )}

            </DialogContent>
        </Dialog>
    );
};