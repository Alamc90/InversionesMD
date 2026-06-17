import React, { useState, useEffect } from 'react';
import { CustomerForm } from '../components/CustomerForm';
import { DataService } from '../services/DataService';
import { Customer } from '../models/Customer';
import { Vehicle } from '../models/Vehicle';
import { InstallmentPlan as PaymentPlanModel } from '../models/Payment';
import InstallmentPlanComponent from '../components/InstallmentPlan';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const IssueBikeView: React.FC = () => {
    const { business } = useAuth();
    const [step, setStep] = useState(1);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [freeVehicles, setFreeVehicles] = useState<Vehicle[]>([]);
    const [loadingFree, setLoadingFree] = useState(false);
    const [vehicleMode, setVehicleMode] = useState<'new' | 'existing'>('new');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

    useEffect(() => {
        if (step === 2 && business?.id) {
            setLoadingFree(true);
            DataService.getFreeVehicles(business.id)
                .then((data) => {
                    setFreeVehicles(data);
                    if (data.length > 0) {
                        setVehicleMode('existing');
                        setSelectedVehicleId(data[0].id?.toString() || '');
                    } else {
                        setVehicleMode('new');
                    }
                })
                .catch((err) => console.error("Error loading free vehicles:", err))
                .finally(() => setLoadingFree(false));
        }
    }, [step, business?.id]);

    const handleCustomerSubmit = (data: Customer) => {
        setCustomer(data);
        setStep(2);
    };

    const handleVehicleSubmit = (data: Vehicle) => {
        setVehicle(data);
        setStep(3);
    };

    const handlePlanSubmit = async (plan: PaymentPlanModel) => {
        if (customer && vehicle) {
            const result = await DataService.createFullRecord(customer, vehicle, plan, business?.id);
            if (result.success) {
                toast.success('Moto entregada exitosamente!');
                setStep(1); // Reset or redirect
            } else {
                console.error("Error saving data:", result.error);
                let errMsg = 'Unknown error';
                if (result.error instanceof Error) {
                    errMsg = result.error.message;
                } else if (result.error && typeof (result.error as any).message === 'string') {
                    errMsg = (result.error as any).message;
                }
                toast.error(`Error al guardar datos: ${errMsg}`);
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-2 md:py-8">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Entrega de Vehículo</h1>
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <span className={step >= 1 ? "text-primary font-medium" : ""}>1. Cliente</span>
                    <span>&rarr;</span>
                    <span className={step >= 2 ? "text-primary font-medium" : ""}>2. Vehículo</span>
                    <span>&rarr;</span>
                    <span className={step >= 3 ? "text-primary font-medium" : ""}>3. Plan</span>
                </div>
            </div>
            
            {step === 1 && <CustomerForm onSubmit={handleCustomerSubmit} />}
            
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Datos del Vehículo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingFree ? (
                            <div className="flex justify-center py-6 text-sm text-muted-foreground">
                                Cargando vehículos disponibles...
                            </div>
                        ) : (
                            <>
                                {freeVehicles.length > 0 && (
                                    <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6 max-w-md">
                                        <Button 
                                            type="button" 
                                            variant={vehicleMode === 'existing' ? 'default' : 'ghost'} 
                                            className="flex-1" 
                                            onClick={() => setVehicleMode('existing')}
                                        >
                                            Vehículo Disponible
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant={vehicleMode === 'new' ? 'default' : 'ghost'} 
                                            className="flex-1" 
                                            onClick={() => setVehicleMode('new')}
                                        >
                                            Registrar Nuevo
                                        </Button>
                                    </div>
                                )}

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if (vehicleMode === 'existing') {
                                        const selected = freeVehicles.find(v => v.id?.toString() === selectedVehicleId);
                                        if (!selected) {
                                            toast.error('Por favor seleccione un vehículo válido');
                                            return;
                                        }
                                        handleVehicleSubmit(selected);
                                    } else {
                                        const fd = new FormData(e.currentTarget);
                                        handleVehicleSubmit({
                                            model: fd.get('model') as string,
                                            year: Number(fd.get('year')),
                                            color: fd.get('color') as string,
                                            plate: fd.get('plate') as string
                                        });
                                    }
                                }} className="space-y-4">
                                    {vehicleMode === 'existing' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="existingVehicleSelect">Seleccionar Moto Recuperada / Libre</Label>
                                            <Select value={selectedVehicleId} onValueChange={(val) => setSelectedVehicleId(val)}>
                                                <SelectTrigger className="w-full bg-background">
                                                    <SelectValue placeholder="Seleccione un vehículo..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {freeVehicles.map((v) => (
                                                        <SelectItem key={v.id} value={v.id?.toString() || ''}>
                                                            {v.model} - {v.plate} ({v.color})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="model">Marca/Línea</Label>
                                                <Input id="model" name="model" placeholder="Marca/Línea" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="year">Modelo</Label>
                                                <Input id="year" name="year" type="number" placeholder="Modelo" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="color">Color</Label>
                                                <Input id="color" name="color" placeholder="Color" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="plate">Placa</Label>
                                                <Input id="plate" name="plate" placeholder="Placa" required />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-4 pt-4">
                                        <Button type="button" variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                                        <Button type="submit">Siguiente</Button>
                                    </div>
                                </form>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <InstallmentPlanComponent onSubmit={handlePlanSubmit} onBack={() => setStep(2)} />
            )}
        </div>
    );
};

export default IssueBikeView;
