"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FinancialService } from '@/services/FinancialService';
import { useAuth } from '@/contexts/AuthContext';
import { FinancialSummary, FinancialTransaction, ReportPeriod, CATEGORY_LABELS, EXPENSE_CATEGORIES, TransactionCategory } from '@/models/FinancialTransaction';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { 
    TrendingUp, TrendingDown, DollarSign, Plus, Trash2,
    ArrowUpCircle, ArrowDownCircle, Calendar
} from 'lucide-react';

export const FinancialDashboardView = () => {
    const { business } = useAuth();
    const [period, setPeriod] = useState<ReportPeriod>('mensual');
    const [summary, setSummary] = useState<FinancialSummary>({
        totalIncome: 0,
        totalExpenses: 0,
        profit: 0,
        transactions: [],
    });
    const [loading, setLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);
    
    // New expense form
    const [expenseCategory, setExpenseCategory] = useState<TransactionCategory>('COMPRA_VEHICULO');
    const [expenseAmount, setExpenseAmount] = useState(0);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (business?.id) {
            loadSummary();
        }
    }, [business?.id, period]);

    const loadSummary = async () => {
        if (!business?.id) return;
        setLoading(true);
        try {
            const data = await FinancialService.getFinancialSummary(business.id, period);
            setSummary(data);
        } catch (error) {
            console.error('Error loading summary:', error);
            toast.error('Error al cargar el balance');
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id || expenseAmount <= 0) return;

        try {
            await FinancialService.createTransaction({
                business_id: business.id,
                type: 'EGRESO',
                category: expenseCategory,
                amount: expenseAmount,
                description: expenseDescription,
                transaction_date: new Date(expenseDate + 'T12:00:00').toISOString(),
            });
            toast.success('Egreso registrado');
            setShowAddExpense(false);
            setExpenseAmount(0);
            setExpenseDescription('');
            setExpenseCategory('COMPRA_VEHICULO');
            loadSummary();
        } catch (error) {
            toast.error('Error al registrar egreso');
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('¿Eliminar esta transacción?')) return;
        try {
            await FinancialService.deleteTransaction(id);
            toast.success('Transacción eliminada');
            loadSummary();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const periodLabel = (p: ReportPeriod) => {
        switch (p) {
            case 'diario': return 'Hoy';
            case 'semanal': return 'Esta Semana';
            case 'mensual': return 'Este Mes';
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Balance Financiero</h2>
                    <p className="text-muted-foreground">Resumen de ingresos, egresos y ganancias</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Select value={period} onValueChange={(v: ReportPeriod) => setPeriod(v)}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="diario">Diario</SelectItem>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="mensual">Mensual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
                <Card className="border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${loading ? '...' : formatCurrency(summary.totalIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{periodLabel(period)}</p>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Egresos</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ${loading ? '...' : formatCurrency(summary.totalExpenses)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{periodLabel(period)}</p>
                    </CardContent>
                </Card>

                <Card className={summary.profit >= 0 ? "border-blue-200" : "border-orange-200"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
                        {summary.profit >= 0 
                            ? <TrendingUp className="h-5 w-5 text-blue-500" />
                            : <TrendingDown className="h-5 w-5 text-orange-500" />
                        }
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            ${loading ? '...' : formatCurrency(Math.abs(summary.profit))}
                            {summary.profit < 0 && <span className="text-sm font-normal ml-1">(pérdida)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{periodLabel(period)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button onClick={() => setShowAddExpense(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Egreso
                </Button>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transacciones - {periodLabel(period)}</CardTitle>
                    <CardDescription>
                        {summary.transactions.length} transacción(es) encontrada(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md max-h-[500px] overflow-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="text-xs sm:text-sm">Fecha</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Categoría</TableHead>
                                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Descripción</TableHead>
                                    <TableHead className="text-xs sm:text-sm text-right">Monto</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.transactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="text-sm">
                                            {new Date(t.transaction_date!).toLocaleDateString('es-CO')}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                                                t.type === 'INGRESO' 
                                                    ? 'bg-green-50 text-green-700' 
                                                    : 'bg-red-50 text-red-700'
                                            }`}>
                                                {t.type === 'INGRESO' 
                                                    ? <ArrowUpCircle className="h-3 w-3" /> 
                                                    : <ArrowDownCircle className="h-3 w-3" />
                                                }
                                                {t.type === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {CATEGORY_LABELS[t.category as TransactionCategory] || t.category}
                                        </TableCell>
                                        <TableCell className="text-sm max-w-[200px] truncate hidden sm:table-cell">
                                            {t.description || '-'}
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${
                                            t.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {t.type === 'INGRESO' ? '+' : '-'}${formatCurrency(t.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {t.type === 'EGRESO' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleDeleteTransaction(t.id!)}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {summary.transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No hay transacciones en este período
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Expense Dialog */}
            <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar Egreso</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select value={expenseCategory} onValueChange={(v: any) => setExpenseCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPENSE_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {CATEGORY_LABELS[cat]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Monto</Label>
                            <Input 
                                type="text"
                                value={expenseAmount ? formatCurrency(expenseAmount) : ''}
                                onChange={(e) => setExpenseAmount(parseCurrency(e.target.value))}
                                placeholder="$0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Input 
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                                placeholder="Ej. Compra de moto Honda Wave 2025"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input 
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>Cancelar</Button>
                            <Button type="submit">Registrar</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
