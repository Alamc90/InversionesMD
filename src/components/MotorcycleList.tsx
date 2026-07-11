import React, { useEffect, useState } from 'react';
import { DataService } from '../services/DataService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PaymentManager } from './PaymentManager';
import { calculateOverdueInfo } from '@/lib/paymentUtils';
import { useAuth } from '@/contexts/AuthContext';

export const MotorcycleList: React.FC = () => {
    const { business } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'recent', direction: 'desc' });
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const sortDropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortOptions = [
        { key: 'status', label: 'Estado de cuenta', defaultDir: 'asc' },
        { key: 'recent', label: 'Fecha de registro', defaultDir: 'desc' },
        { key: 'client', label: 'Cliente', defaultDir: 'asc' },
        { key: 'plate', label: 'Placa', defaultDir: 'asc' },
        { key: 'pending', label: 'Cuotas atrasadas', defaultDir: 'desc' },
        { key: 'progress', label: 'Progreso de pago', defaultDir: 'asc' }
    ];

    const handleSortOptionClick = (key: string, defaultDir: 'asc' | 'desc') => {
        if (sortConfig.key === key) {
            setSortConfig({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            setSortConfig({ key, direction: defaultDir });
        }
        setIsSortDropdownOpen(false);
    };

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

        const getOverdue = (vehicle: any) => {
            const plan = getPlan(vehicle);
            if (!plan) return 0;
            return calculateOverdueInfo(plan).overdueInstallments;
        };

        const getProgressPercent = (vehicle: any) => {
            const plan = getPlan(vehicle);
            if (!plan || !plan.total_installments) return 0;
            return (Number(plan.installments_paid) || 0) / Number(plan.total_installments);
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

        let comparison = 0;
        
        switch (sortConfig.key) {
            case 'status':
                const scoreA = getStatusScore(a);
                const scoreB = getStatusScore(b);
                if (scoreA !== scoreB) {
                    comparison = scoreA - scoreB;
                } else {
                    comparison = getPending(b) - getPending(a);
                }
                break;
            case 'client':
                const nameA = (a.customers?.first_name || '') + ' ' + (a.customers?.last_name || '');
                const nameB = (b.customers?.first_name || '') + ' ' + (b.customers?.last_name || '');
                comparison = nameA.localeCompare(nameB);
                break;
            case 'plate':
                comparison = (a.plate || '').localeCompare(b.plate || '');
                break;
            case 'pending':
                comparison = getOverdue(a) - getOverdue(b);
                break;
            case 'progress':
                comparison = getProgressPercent(a) - getProgressPercent(b);
                break;
            case 'recent':
            default:
                comparison = (a.id || 0) - (b.id || 0); // ascending by id
                break;
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Vehículos Entregados</h2>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="w-full sm:w-[220px] relative" ref={sortDropdownRef}>
                        <Button 
                            variant="outline" 
                            className="w-full justify-between bg-background text-sm font-normal"
                            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        >
                            <span className="truncate flex-1 text-left">
                                {sortOptions.find(opt => opt.key === sortConfig.key)?.label || 'Ordenar por'}
                            </span>
                            {sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 shrink-0 opacity-50" /> : <ArrowDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                        </Button>
                        {isSortDropdownOpen && (
                            <div className="absolute top-full mt-1 w-full bg-popover text-popover-foreground border rounded-md shadow-md z-50 overflow-hidden">
                                <div className="p-1">
                                    {sortOptions.map((option) => {
                                        const isSelected = sortConfig.key === option.key;
                                        return (
                                            <div
                                                key={option.key}
                                                className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors ${isSelected ? 'bg-accent/50 text-accent-foreground' : ''}`}
                                                onClick={() => handleSortOptionClick(option.key, option.defaultDir as 'asc' | 'desc')}
                                            >
                                                <span className="flex-1">{option.label}</span>
                                                {isSelected && (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 opacity-70" /> : <ArrowDown className="h-4 w-4 opacity-70" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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