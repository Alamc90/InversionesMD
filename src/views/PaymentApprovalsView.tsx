"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataService } from '@/services/DataService';
import { FinancialService } from '@/services/FinancialService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/models/Payment';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export const PaymentApprovalsView = () => {
    const { business, hasPermission } = useAuth();
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        loadPendingPayments();
    }, []);

    const loadPendingPayments = async () => {
        setLoading(true);
        try {
            const data = await DataService.getPendingPayments();
            setPendingPayments(data);
        } catch (error) {
            console.error('Error loading pending payments:', error);
            toast.error('Error al cargar pagos pendientes');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (paymentId: number, amount: number) => {
        setProcessingId(paymentId);
        try {
            await DataService.approvePayment(paymentId);
            
            // Record as financial income
            if (business?.id) {
                try {
                    await FinancialService.recordPaymentIncome(
                        business.id, 
                        amount, 
                        paymentId.toString()
                    );
                } catch (e) {
                    console.error('Error recording income:', e);
                }
            }
            
            toast.success('Pago aprobado exitosamente');
            loadPendingPayments();
        } catch (error) {
            toast.error('Error al aprobar el pago');
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeny = async (paymentId: number) => {
        if (!confirm('¿Está seguro de denegar este pago? Esta acción no se puede deshacer.')) return;
        
        setProcessingId(paymentId);
        try {
            await DataService.denyPayment(paymentId);
            toast.success('Pago denegado');
            loadPendingPayments();
        } catch (error) {
            toast.error('Error al denegar el pago');
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    if (!hasPermission('can_approve_payments')) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    No tienes permisos para aprobar pagos.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Aprobación de Pagos</h2>
                    <p className="text-muted-foreground">
                        {pendingPayments.length} pago(s) pendiente(s) de aprobación
                    </p>
                </div>
                <Button variant="outline" onClick={loadPendingPayments} disabled={loading}>
                    Actualizar
                </Button>
            </div>

            {loading ? (
                <LoadingScreen message="Cargando pagos pendientes..." inline />
            ) : pendingPayments.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">
                            No hay pagos pendientes de aprobación
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Todos los pagos han sido procesados.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {pendingPayments.map((payment) => {
                        const plan = payment.installment_plans;
                        const vehicle = plan?.vehicles;
                        const customer = vehicle?.customers;
                        const isProcessing = processingId === payment.id;

                        return (
                            <Card key={payment.id} className="border-yellow-200">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-5 w-5 text-yellow-500" />
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${PAYMENT_STATUS_COLORS['PENDIENTE']}`}>
                                                    {PAYMENT_STATUS_LABELS['PENDIENTE']}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(payment.payment_date).toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Cliente</p>
                                                    <p className="font-medium">
                                                        {customer?.first_name} {customer?.last_name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Vehículo</p>
                                                    <p className="font-medium">
                                                        {vehicle?.plate} - {vehicle?.model}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Monto</p>
                                                    <p className="font-bold text-lg">${formatCurrency(payment.amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Registrado por</p>
                                                    <p className="font-medium">{payment.created_by_name || 'N/A'}</p>
                                                </div>
                                            </div>
                                            
                                            {payment.note && (
                                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                                    <span className="text-muted-foreground">Nota: </span>
                                                    {payment.note}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex md:flex-col gap-2 items-center md:items-end justify-end">
                                            <Button 
                                                onClick={() => handleApprove(payment.id, payment.amount)}
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Aprobar
                                            </Button>
                                            <Button 
                                                variant="destructive"
                                                onClick={() => handleDeny(payment.id)}
                                                disabled={isProcessing}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Denegar
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
