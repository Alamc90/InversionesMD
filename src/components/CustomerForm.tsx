import React, { useState } from 'react';
import { Customer } from '../models/Customer';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Props {
    onSubmit: (data: Customer) => void;
}

export const CustomerForm: React.FC<Props> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<Customer>({
        first_name: '', last_name: '', cedula: '', address: '', phone: '',
        guarantor_first_name: '', guarantor_last_name: '', guarantor_cedula: '', guarantor_address: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">Nombre</Label>
                            <Input id="first_name" name="first_name" placeholder="Nombre" onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Apellido</Label>
                            <Input id="last_name" name="last_name" placeholder="Apellido" onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cedula">Cédula</Label>
                            <Input id="cedula" name="cedula" placeholder="Número de Cédula" onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" name="phone" placeholder="Teléfono" onChange={handleChange} />
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input id="address" name="address" placeholder="Dirección" onChange={handleChange} />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-6">
                        <h4 className="text-lg font-semibold mb-4">Datos del Fiador</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guarantor_first_name">Nombre Fiador</Label>
                                <Input id="guarantor_first_name" name="guarantor_first_name" placeholder="Nombre" onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guarantor_last_name">Apellido Fiador</Label>
                                <Input id="guarantor_last_name" name="guarantor_last_name" placeholder="Apellido" onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guarantor_cedula">Cédula Fiador</Label>
                                <Input id="guarantor_cedula" name="guarantor_cedula" placeholder="Cédula" onChange={handleChange} required />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label htmlFor="guarantor_address">Dirección Fiador</Label>
                                <Input id="guarantor_address" name="guarantor_address" placeholder="Dirección" onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    
                    <Button type="submit" className="w-full md:w-auto">Siguiente: Vehículo</Button>
                </form>
            </CardContent>
        </Card>
    );
};


export default CustomerForm;