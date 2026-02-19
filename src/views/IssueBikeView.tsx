import React, { useState } from 'react';
import { CustomerForm } from '../components/CustomerForm';
import { DataService } from '../services/DataService';
import { Customer } from '../models/Customer';
import { Vehicle } from '../models/Vehicle';
import { InstallmentPlan } from '../models/Payment';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export const IssueBikeView: React.FC = () => {
    const [step, setStep] = useState(1);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);

    const handleCustomerSubmit = (data: Customer) => {
        setCustomer(data);
        setStep(2);
    };

    const handleVehicleSubmit = (data: Vehicle) => {
        setVehicle(data);
        setStep(3);
    };

    const handlePlanSubmit = async (plan: InstallmentPlan) => {
        if (customer && vehicle) {
            const result = await DataService.createFullRecord(customer, vehicle, plan);
            if (result.success) {
                alert('Moto entregada exitosamente!');
                setStep(1); // Reset or redirect
            } else {
                alert('Error al guardar datos');
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Entrega de Vehículo</h1>
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
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            handleVehicleSubmit({
                                model: fd.get('model') as string,
                                year: Number(fd.get('year')),
                                color: fd.get('color') as string,
                                plate: fd.get('plate') as string
                            });
                        }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="model">Modelo</Label>
                                    <Input id="model" name="model" placeholder="Modelo" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="year">Año</Label>
                                    <Input id="year" name="year" type="number" placeholder="Año" required />
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
                            <Button type="submit">Siguiente: Plan de Pagos</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Plan de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            handlePlanSubmit({
                                total_installments: Number(fd.get('total')),
                                installment_value: Number(fd.get('value')),
                                installments_paid: 0
                            });
                        }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="total">Cantidad Total de Cuotas</Label>
                                    <Input id="total" name="total" type="number" placeholder="Ej: 24" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="value">Valor de Cada Cuota</Label>
                                    <Input id="value" name="value" type="number" placeholder="$ Valor" required />
                                </div>
                            </div>
                            <Button type="submit">Finalizar y Guardar</Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

