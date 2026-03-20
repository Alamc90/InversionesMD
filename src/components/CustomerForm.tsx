import React, { useState, useEffect } from 'react';
import { Customer } from '../models/Customer';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { DataService } from '../services/DataService';

interface Props {
    onSubmit: (data: Customer) => void;
}

export const CustomerForm: React.FC<Props> = ({ onSubmit }) => {
    const [hasGuarantor, setHasGuarantor] = useState(false);
    const [searchCedula, setSearchCedula] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMessage, setSearchMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState<Customer>({
        first_name: '', last_name: '', cedula: '', address: '', phone: '',
        guarantor_first_name: '', guarantor_last_name: '', guarantor_cedula: '', guarantor_address: ''
    });

    useEffect(() => {
        // Cargar clientes existentes al montar el componente
        const loadCustomers = async () => {
            try {
                const data = await DataService.getCustomers();
                setCustomers(data);
            } catch (error) {
                console.error("Error cargando clientes:", error);
            }
        };
        loadCustomers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSearchClick = () => {
        setIsSearching(true);
        const foundCustomer = customers.find(c => c.cedula === searchCedula);
        if (foundCustomer) {
            setFormData({
                ...foundCustomer,
                guarantor_first_name: foundCustomer.guarantor_first_name || '',
                guarantor_last_name: foundCustomer.guarantor_last_name || '',
                guarantor_cedula: foundCustomer.guarantor_cedula || '',
                guarantor_address: foundCustomer.guarantor_address || ''
            });
            setHasGuarantor(!!foundCustomer.guarantor_cedula);
            setSearchMessage({ type: 'success', text: 'Cliente encontrado y cargado con éxito' });
        } else {
            setSearchMessage({ type: 'error', text: 'Cliente no encontrado, por favor llene los datos manualmente' });
        }
        setIsSearching(false);
    };

    // Auto-hide the message after 3 seconds
    useEffect(() => {
        if (searchMessage) {
            const timer = setTimeout(() => {
                setSearchMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [searchMessage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasGuarantor) {
            onSubmit({
                ...formData,
                guarantor_first_name: '',
                guarantor_last_name: '',
                guarantor_cedula: '',
                guarantor_address: ''
            });
        } else {
            onSubmit(formData);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6 flex flex-col gap-2 border-b pb-4">
                    <div className="flex gap-2 items-end">
                        <div className="space-y-2 flex-grow">
                            <Label htmlFor="searchCedula">Buscar cliente existente por Cédula</Label>
                            <Input 
                                id="searchCedula" 
                                name="searchCedula" 
                                placeholder="Ingrese cédula para buscar" 
                                value={searchCedula}
                                onChange={(e) => setSearchCedula(e.target.value)} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearchClick();
                                    }
                                }}
                            />
                        </div>
                        <Button type="button" onClick={handleSearchClick} disabled={!searchCedula || isSearching}>
                            Buscar
                        </Button>
                    </div>
                    {searchMessage && (
                        <div className={`p-3 rounded-md text-sm font-medium transition-all ${
                            searchMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}>
                            {searchMessage.text}
                        </div>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">Nombre</Label>
                            <Input id="first_name" name="first_name" placeholder="Nombre" value={formData.first_name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Apellido</Label>
                            <Input id="last_name" name="last_name" placeholder="Apellido" value={formData.last_name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cedula">Cédula</Label>
                            <Input id="cedula" name="cedula" placeholder="Número de Cédula" value={formData.cedula} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" name="phone" placeholder="Teléfono" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input id="address" name="address" placeholder="Dirección" value={formData.address} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">Datos del Fiador</h4>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    id="has_guarantor" 
                                    checked={hasGuarantor} 
                                    onChange={(e) => setHasGuarantor(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="has_guarantor" className="cursor-pointer">Añadir Fiador</Label>
                            </div>
                        </div>

                        {hasGuarantor && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="guarantor_first_name">Nombre Fiador</Label>
                                    <Input id="guarantor_first_name" name="guarantor_first_name" placeholder="Nombre" value={formData.guarantor_first_name} onChange={handleChange} required={hasGuarantor} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guarantor_last_name">Apellido Fiador</Label>
                                    <Input id="guarantor_last_name" name="guarantor_last_name" placeholder="Apellido" value={formData.guarantor_last_name} onChange={handleChange} required={hasGuarantor} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guarantor_cedula">Cédula Fiador</Label>
                                    <Input id="guarantor_cedula" name="guarantor_cedula" placeholder="Cédula" value={formData.guarantor_cedula} onChange={handleChange} required={hasGuarantor} />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="guarantor_address">Dirección Fiador</Label>
                                    <Input id="guarantor_address" name="guarantor_address" placeholder="Dirección" value={formData.guarantor_address} onChange={handleChange} />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <Button type="submit" className="w-full md:w-auto">Siguiente</Button>
                </form>
            </CardContent>
        </Card>
    );
};


export default CustomerForm;