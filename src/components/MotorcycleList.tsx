import React, { useEffect, useState } from 'react';
import { DataService } from '../services/DataService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentManager } from './PaymentManager';
import { calculateOverdueInfo } from '@/lib/paymentUtils';
import { useAuth } from '@/contexts/AuthContext';

export const MotorcycleList: React.FC = () => {
    const { business } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("recent");

    useEffect(() => {
        if (business?.id) {
            loadData();
        }
    }, [business?.id, selectedVehicleId]); // Reload when modal closes/changes

    const loadData = async () => {
        try {
            const data = await DataService.getActiveVehicles(business?.id);
            setVehicles(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePaymentComplete = (newProgress?: number) => {
        if (newProgress !== undefined && selectedVehicleId) {
            setVehicles(prev => prev.map(v => {
                if (v.id === selectedVehicleId) {
                    const cloned = { ...v };
                    let plans = Array.isArray(cloned.installment_plans) 
                        ? [...cloned.installment_plans] 
                        : (cloned.installment_plans ? [{...cloned.installment_plans}] : []);
                        
                    if (plans.length > 0) {
                        plans.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
                        plans[0] = { ...plans[0], installments_paid: newProgress };
                        cloned.installment_plans = plans;
                    }
                    return cloned;
                }
                return v;
            }));
        } else {
            loadData();
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.customers?.first_name + ' ' + v.customers?.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        const getPlan = (vehicle: any) => {
            let plans = Array.isArray(vehicle.installment_plans) ? vehicle.installment_plans : (vehicle.installment_plans ? [vehicle.installment_plans] : []);
            plans = plans.sort((p1: any, p2: any) => (p2.id || 0) - (p1.id || 0));
            return plans.length > 0 ? plans[0] : null;
        };

        const getPending = (vehicle: any) => {
            const plan = getPlan(vehicle) || {};
            return (Number(plan.total_installments) || 0) - (Number(plan.installments_paid) || 0);
        };
        
        const getStatusScore = (vehicle: any) => {
            const plan = getPlan(vehicle);
            if (!plan) return 3; // Unknown
            
            const total = Number(plan.total_installments) || 0;
            const paid = Number(plan.installments_paid) || 0;
            
            if (paid >= total && total > 0) return 2; // Paid
            
            const overdueInfo = calculateOverdueInfo(plan);
            if (overdueInfo.overdueInstallments > 0) return 0; // Overdue
            
            return 1; // Up to date
        };

        if (sortBy === 'status') {
            const scoreA = getStatusScore(a);
            const scoreB = getStatusScore(b);
            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }
            // If same status, sort by pending desc
            return getPending(b) - getPending(a);
        }
        if (sortBy === 'client_asc') {
            const nameA = (a.customers?.first_name || '') + ' ' + (a.customers?.last_name || '');
            const nameB = (b.customers?.first_name || '') + ' ' + (b.customers?.last_name || '');
            return nameA.localeCompare(nameB);
        }
        if (sortBy === 'client_desc') {
            const nameA = (a.customers?.first_name || '') + ' ' + (a.customers?.last_name || '');
            const nameB = (b.customers?.first_name || '') + ' ' + (b.customers?.last_name || '');
            return nameB.localeCompare(nameA);
        }
        if (sortBy === 'plate_asc') {
            return (a.plate || '').localeCompare(b.plate || '');
        }
        if (sortBy === 'pending_asc') {
            return getPending(a) - getPending(b);
        }
        if (sortBy === 'pending_desc') {
            return getPending(b) - getPending(a);
        }
        // default recent
        return (b.id || 0) - (a.id || 0);
    });

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Vehículos Entregados</h2>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="w-full sm:w-[220px]">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full bg-background">
                                <SelectValue placeholder="Ordenar por" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Estado (Atrasados primero)</SelectItem>
                                <SelectItem value="recent">Más recientes</SelectItem>
                                <SelectItem value="client_asc">Cliente (A-Z)</SelectItem>
                                <SelectItem value="client_desc">Cliente (Z-A)</SelectItem>
                                <SelectItem value="plate_asc">Placa (A-Z)</SelectItem>
                                <SelectItem value="pending_asc">Menos cuotas pendientes</SelectItem>
                                <SelectItem value="pending_desc">Más cuotas pendientes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Input
                        placeholder="Buscar por placa o cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-[250px]"
                    />
                </div>
            </div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVehicles.map((v) => {
                    let plans = Array.isArray(v.installment_plans) ? v.installment_plans : (v.installment_plans ? [v.installment_plans] : []);
                    // Sort plans by ID descending to ensure we get the latest active plan
                    plans = plans.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
                    
                    const plan = plans.length > 0 ? plans[0] : {};
                    const customer = v.customers;
                    const totalInstallments = Number(plan.total_installments) || 0;
                    const installmentsPaid = Number(plan.installments_paid) || 0;
                    
                    const overdueInfo = calculateOverdueInfo(plan);
                    const isOverdue = overdueInfo.overdueInstallments > 0;

                    const progress = totalInstallments > 0 
                        ? (installmentsPaid / totalInstallments) * 100 
                        : 0;

                    return (
                        <Card key={v.id} className="overflow-hidden flex flex-col">
                            <CardHeader className="bg-muted/50 pb-4">
                                <div className="flex justify-between items-center">
                                    <span className="bg-yellow-400 text-black px-2 py-1 rounded font-bold border-2 border-black text-sm">{v.plate}</span>
                                    <span className="font-medium text-sm text-muted-foreground">{v.model} ({v.year})</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="text-sm">
                                            <p className="text-muted-foreground">Cliente</p>
                                            <p className="font-medium text-lg">{customer?.first_name} {customer?.last_name}</p>
                                            <p className="text-xs text-muted-foreground">Color: {v.color}</p>
                                        </div>
                                        
                                        {(() => {
                                            const count = Number(overdueInfo.overdueInstallments.toFixed(2));
                                            let label = "Estado";
                                            let value = "Al Día";
                                            let colorClass = "text-gray-500";

                                            if (count > 0) {
                                                value = `${count} Pendientes`;
                                                if (count <= 3) {
                                                    colorClass = "text-yellow-600";
                                                } else {
                                                    colorClass = "text-red-600";
                                                }
                                            }

                                            return (
                                                <div className="text-sm text-right">
                                                    <p className="text-muted-foreground">{label}</p>
                                                    <p className={`font-medium text-lg ${colorClass}`}>{value}</p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Progreso de Pago</span>
                                            <span className="font-medium">
                                                {installmentsPaid % 1 === 0 ? installmentsPaid : installmentsPaid.toFixed(2)} / {totalInstallments}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500" style={{width: `${progress}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 pt-4">
                                <Button className="w-full" variant="outline" onClick={() => setSelectedVehicleId(v.id)}>
                                    Gestionar Pagos
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {filteredVehicles.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed mt-4">
                    <p className="text-lg font-medium">Aún no existen vehículos entregados</p>
                    {searchQuery ? 
                        <p className="text-sm mt-1">No se encontraron vehículos que coincidan con tu búsqueda.</p> :
                        <p className="text-sm mt-1">Registra una nueva entrega para comenzar.</p>
                    }
                </div>
            )}

            {selectedVehicleId && (
                <PaymentManager 
                    vehicleId={selectedVehicleId} 
                    isOpen={true} 
                    onClose={() => setSelectedVehicleId(null)} 
                    onPaymentComplete={handlePaymentComplete}
                />
            )}
        </div>
    );
};



export default MotorcycleList;