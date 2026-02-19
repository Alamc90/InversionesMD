import React, { useEffect, useState } from 'react';
import { DataService } from '../services/DataService';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export const MotorcycleList: React.FC = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await DataService.getActiveVehicles();
            setVehicles(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Vehículos Entregados</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v) => {
                    const plan = v.installment_plans?.[0] || {}; // Handle array or object based on Supabase return
                    const customer = v.customers; // Joined data
                    const progress = plan.total_installments > 0 
                        ? (plan.installments_paid / plan.total_installments) * 100 
                        : 0;

                    return (
                        <Card key={v.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/50 pb-4">
                                <div className="flex justify-between items-center">
                                    <span className="bg-yellow-400 text-black px-2 py-1 rounded font-bold border-2 border-black text-sm">{v.plate}</span>
                                    <span className="font-medium text-sm text-muted-foreground">{v.model} ({v.year})</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="text-sm">
                                        <p className="text-muted-foreground">Cliente</p>
                                        <p className="font-medium text-lg">{customer?.first_name} {customer?.last_name}</p>
                                        <p className="text-xs text-muted-foreground">Color: {v.color}</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Progreso de Pago</span>
                                            <span className="font-medium">{plan.installments_paid} / {plan.total_installments}</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500" style={{width: `${progress}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};



export default MotorcycleList;