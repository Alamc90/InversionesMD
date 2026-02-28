import React, { useState, useEffect } from 'react';
import { DataService } from '../services/DataService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { formatCurrency, parseCurrency } from "@/lib/utils";
import { calculateOverdueInfo } from "@/lib/paymentUtils";
import { toast } from "sonner"
import { Info, User, Car, ShieldCheck, Printer } from "lucide-react"
import { printReceipt } from "@/lib/receiptPrinter";
import { BusinessConfig } from "@/models/BusinessConfig";

interface Props {
    vehicleId: number;
    isOpen: boolean;
    onClose: () => void;
}

export const PaymentManager: React.FC<Props> = ({ vehicleId, isOpen, onClose }) => {
    const [details, setDetails] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [overdueInfo, setOverdueInfo] = useState({ overdueInstallments: 0, nextDueDate: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [paymentNote, setPaymentNote] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);

    useEffect(() => {
        if (isOpen && vehicleId) {
            loadData();
        }
    }, [isOpen, vehicleId]);

    const loadData = async () => {
        try {
            const config = await DataService.getBusinessConfig();
            setBusinessConfig(config);
            
            const data = await DataService.getVehicleDetails(vehicleId);
            
            let plans = Array.isArray(data?.installment_plans) 
                ? data.installment_plans 
                : (data?.installment_plans ? [data.installment_plans] : []);
                
            if (plans.length > 0) {
                // Force fetch history to calculate progress client-side
                // This avoids the 'stale read' from the database trigger
                let plan = plans[0];
                
                // Fetch fresh plan details first
                try {
                    const freshPlan = await DataService.getInstallmentPlan(plan.id);
                    if (freshPlan) {
                         plan = { ...plan, ...freshPlan };
                    }
                } catch (e) {
                    console.error("Failed to refresh plan details", e);
                }

                // Get absolute truth from payment history
                const records = await DataService.getPaymentHistory(plan.id);
                setHistory(records || []);

                // Calculate progress manually to avoid race conditions
                const totalPaid = (records || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
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
        }
    };

    // Kept for compatibility if used elsewhere, but loadData handles it now
    const loadHistory = async (planId: number) => {
        const records = await DataService.getPaymentHistory(planId);
        setHistory(records || []);
    };

    const calculateOverdue = (plan: any) => {
        const info = calculateOverdueInfo(plan);
        setOverdueInfo({
            overdueInstallments: Math.floor(info.overdueInstallments),
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
            const amount = (Number(plans[0].installment_value) || 0) * Math.floor(overdueInfo.overdueInstallments);
            if (amount > 0) {
                 setPaymentAmount(amount);
            } else {
                toast.info("No hay cuotas pendientes para pagar");
            }
        }
    };

    const handlePayment = async () => {
        setIsConfirmOpen(true);
    };

    const confirmPayment = async () => {
        const plans = Array.isArray(details?.installment_plans) 
            ? details.installment_plans 
            : (details?.installment_plans ? [details.installment_plans] : []);
            
        if (plans.length === 0) return;
        
        try {
            const result = await DataService.registerPayment(plans[0].id, paymentAmount, paymentNote);
            toast.success('Pago registrado correctamente');
            
            setIsConfirmOpen(false);
            setPaymentNote('');
            
            // Recalculate locally for immediate UI update on pending installments if needed
            // But DataService now returns the new progress!
            // @ts-ignore - DataService updated to return newProgress
            if (result && result.newProgress !== undefined && plans[0]) {
                const updatedPlan = { ...plans[0], installments_paid: result.newProgress };

                // Update details state correctly to reflect in UI immediately
                let newPlans = Array.isArray(details.installment_plans) ? [...details.installment_plans] : [details.installment_plans];
                if (Array.isArray(details.installment_plans)) {
                     newPlans[0] = updatedPlan;
                } else {
                     newPlans = [updatedPlan];
                }
                
                const newDetails = { ...details, installment_plans: newPlans };
                setDetails(newDetails);
                
                // Recalculate overdue based on updated plan
                calculateOverdue(updatedPlan);
                 
                // Only reload history to show the new payment, avoid reloading full details which might be stale
                await loadHistory(plans[0].id);

                // If needed, we can trigger a full reload much later, but strictly speaking it's not necessary if we trust our local update
            } else {
                 // Fallback if no specific progress returned
                 await loadData();
            }
        } catch (error) {
            toast.error('Error al registrar pago');
            console.error(error);
        }
    };

    if (!isOpen || !details) return null;

    const plans = Array.isArray(details.installment_plans) 
        ? details.installment_plans 
        : (details.installment_plans ? [details.installment_plans] : []);
        
    const plan = plans.length > 0 ? plans[0] : null;

    const installmentVal = Number(plan?.installment_value) || 0;
    const installmentsPaid = Number(plan?.installments_paid) || 0;
    const totalInstallments = Number(plan?.total_installments) || 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) setShowDetails(false);
            onClose();
        }}>
            <DialogContent className="max-w-[70rem] w-full max-h-[90vh] overflow-y-auto">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-12 top-4 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowDetails(true)}
                    title="Ver información detallada"
                >
                    <Info className="h-4 w-4" />
                </Button>

                <DialogHeader>
                    <DialogTitle>Gestión de Pagos - {details.plate}</DialogTitle>
                </DialogHeader>
                
                {showDetails ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                        <span className="text-muted-foreground block text-xs">Modelo</span>
                                        <span className="font-medium">{details.model}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Año</span>
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
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr] gap-6">
                    <div className="space-y-6">
                        <Card className="h-full">
                            <CardHeader><CardTitle>Información del Plan</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                     <div className="flex justify-between items-center py-1">
                                        <span className="text-muted-foreground text-sm">Cliente:</span>
                                        <span className="font-medium text-right">{details.customers?.first_name} {details.customers?.last_name}</span>
                                    </div>
                                     <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Teléfono:</span>
                                        <span className="font-medium text-right">{details.customers?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Vehículo:</span>
                                        <span className="font-medium text-right">{details.model} ({details.year})</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Color:</span>
                                        <span className="font-medium text-right">{details.color}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Fecha Inicio:</span>
                                        <span className="font-medium text-right">
                                            {plan?.start_date ? new Date(plan.start_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Frecuencia:</span>
                                        <span className="font-medium text-right">{plan?.payment_frequency || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Valor Cuota:</span>
                                        <span className="font-medium text-right">${installmentVal.toLocaleString()}</span>
                                    </div>
                                     <div className="flex justify-between items-center py-1 border-t">
                                        <span className="text-muted-foreground text-sm">Progreso:</span>
                                        <span className="font-medium font-bold text-right">{Math.floor(installmentsPaid)} / {totalInstallments}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className={overdueInfo.overdueInstallments > 0 ? "border-yellow-500" : "border-green-500"}>
                            <CardHeader><CardTitle>Estado de Cuenta</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                            <div className="text-center p-4 bg-secondary/10 rounded-lg">
                                <p className="text-sm text-muted-foreground">Cuotas Pendientes</p>
                                <p className={`text-4xl font-bold ${overdueInfo.overdueInstallments > 0 ? "text-yellow-500" : "text-green-500"}`}>
                                    {Math.floor(overdueInfo.overdueInstallments)}
                                </p>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Próximo Vencimiento:</span>
                                <span className="font-bold">{overdueInfo.nextDueDate}</span>
                            </div>
                            
                            
                                <div className="space-y-4">
                                    <span className="text-sm font-medium">Seleccione Opción de Pago</span>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant={Math.abs(paymentAmount - installmentVal) < 1 ? "default" : "outline"}
                                            className="flex-1"
                                            onClick={paySingleInstallment} 
                                        >
                                            1 Cuota ({formatCurrency(installmentVal)})
                                        </Button>
                                        
                                        {overdueInfo.overdueInstallments > 0 && (
                                            <Button 
                                                variant={Math.abs(paymentAmount - (installmentVal * overdueInfo.overdueInstallments)) < 1 ? "destructive" : "outline"}
                                                className="flex-1"
                                                onClick={payPendingInstallments} 
                                            >
                                                Pendientes ({formatCurrency(installmentVal * overdueInfo.overdueInstallments)})
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                                    <span className="font-semibold">Monto a Pagar:</span>
                                    <span className="text-xl font-bold">{formatCurrency(paymentAmount)}</span>
                                </div>

                                    <Button size="lg" className="w-full" onClick={handlePayment} disabled={paymentAmount <= 0}>
                                        Confirmar Pago
                                    </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col h-full">
                        <h3 className="text-lg font-bold mb-4">Historial de Pagos</h3>
                        <div className="border rounded-md flex-1 overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Nota</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((rec: any) => (
                                        <TableRow key={rec.id}>
                                            <TableCell>{new Date(rec.payment_date).toLocaleString()}</TableCell>
                                            <TableCell className="font-medium">${rec.amount?.toLocaleString()}</TableCell>
                                            <TableCell>{rec.note || '-'}</TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    title="Imprimir Recibo"
                                                    onClick={() => printReceipt({
                                                        payment: rec,
                                                        customer: details.customers,
                                                        vehicle: details,
                                                        plan: details.installment_plans[0],
                                                        businessConfig: businessConfig
                                                    })}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No hay pagos registrados</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
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
                                <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                                <Button onClick={confirmPayment}>Aceptar Pago</Button>
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