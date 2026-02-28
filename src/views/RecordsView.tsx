"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataService } from '@/services/DataService';
import { Customer } from '@/models/Customer';
import { Vehicle } from '@/models/Vehicle';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const RecordsView = () => {
    const [activeTab, setActiveTab] = useState<'clientes' | 'vehiculos'>('clientes');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'clientes') {
                const data = await DataService.getCustomers();
                setCustomers(data);
            } else {
                const data = await DataService.getVehicles();
                setVehicles(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer || !editingCustomer.id) return;
        try {
            await DataService.updateCustomer(editingCustomer.id, editingCustomer);
            toast.success('Cliente actualizado');
            setEditingCustomer(null);
            loadData();
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    const handleSaveVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVehicle || !editingVehicle.id) return;
        try {
            await DataService.updateVehicle(editingVehicle.id, {
                model: editingVehicle.model,
                year: editingVehicle.year,
                color: editingVehicle.color,
                plate: editingVehicle.plate
            });
            toast.success('Vehículo actualizado');
            setEditingVehicle(null);
            loadData();
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
            <Card className="w-full md:w-64 h-fit shrink-0">
                <CardHeader>
                    <CardTitle className="text-lg">Directorios</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button 
                        variant={activeTab === 'clientes' ? 'default' : 'ghost'} 
                        className="justify-start"
                        onClick={() => setActiveTab('clientes')}
                    >
                        Clientes
                    </Button>
                    <Button 
                        variant={activeTab === 'vehiculos' ? 'default' : 'ghost'} 
                        className="justify-start"
                        onClick={() => setActiveTab('vehiculos')}
                    >
                        Vehículos
                    </Button>
                </CardContent>
            </Card>

            <div className="flex-1">
                <Card>
                    <CardHeader>
                        <CardTitle>{activeTab === 'clientes' ? 'Gestión de Clientes' : 'Gestión de Vehículos'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Cargando...</p>
                        ) : activeTab === 'clientes' ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Cédula</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.first_name} {c.last_name}</TableCell>
                                            <TableCell>{c.cedula}</TableCell>
                                            <TableCell>{c.phone}</TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm" onClick={() => setEditingCustomer(c)}>Editar</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {customers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4">No hay clientes registrados.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Color</TableHead>
                                        <TableHead>Dueño</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vehicles.map((v) => (
                                        <TableRow key={v.id}>
                                            <TableCell>{v.model} ({v.year})</TableCell>
                                            <TableCell>{v.plate}</TableCell>
                                            <TableCell>{v.color}</TableCell>
                                            <TableCell>{v.customers?.first_name} {v.customers?.last_name}</TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm" onClick={() => setEditingVehicle(v)}>Editar</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {vehicles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4">No hay vehículos registrados.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                    </DialogHeader>
                    {editingCustomer && (
                        <form onSubmit={handleSaveCustomer} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input value={editingCustomer.first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, first_name: e.target.value})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Apellido</Label>
                                    <Input value={editingCustomer.last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, last_name: e.target.value})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dirección</Label>
                                    <Input value={editingCustomer.address || ''} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Guardar Cambios</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Vehículo</DialogTitle>
                    </DialogHeader>
                    {editingVehicle && (
                        <form onSubmit={handleSaveVehicle} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Modelo</Label>
                                    <Input value={editingVehicle.model || ''} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Año</Label>
                                    <Input type="number" value={editingVehicle.year || ''} onChange={e => setEditingVehicle({...editingVehicle, year: Number(e.target.value)})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <Input value={editingVehicle.color || ''} onChange={e => setEditingVehicle({...editingVehicle, color: e.target.value})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Placa</Label>
                                    <Input value={editingVehicle.plate || ''} onChange={e => setEditingVehicle({...editingVehicle, plate: e.target.value})} required/>
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Guardar Cambios</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
};
