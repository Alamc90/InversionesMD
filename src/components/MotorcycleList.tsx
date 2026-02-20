import React, { useEffect, useState } from 'react';
import { DataService } from '../services/DataService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaymentManager } from './PaymentManager';
import { calculateOverdueInfo } from '@/lib/paymentUtils';

export const MotorcycleList: React.FC = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadData();
    }, [selectedVehicleId]); // Reload when modal closes/changes

    const loadData = async () => {
        try {
            const data = await DataService.getActiveVehicles();
            setVehicles(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.customers?.first_name + ' ' + v.customers?.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Vehículos Entregados</h2>
                <div className="w-full max-w-sm">
                    <Input 
                        placeholder="Buscar por placa o cliente..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                            const count = Math.floor(overdueInfo.overdueInstallments);
                                            let label = "Estado";
                                            let value = "Al Día";
                                            let colorClass = "text-gray-500";

                                            if (count > 0) {
                                                label = "Pendientes";
                                                value = count.toString();
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
                                                {Math.floor(installmentsPaid)} / {totalInstallments}
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

            {selectedVehicleId && (
                <PaymentManager 
                    vehicleId={selectedVehicleId} 
                    isOpen={true} 
                    onClose={() => setSelectedVehicleId(null)} 
                />
            )}
        </div>
    );
};



export default MotorcycleList;