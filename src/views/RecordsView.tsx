"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataService } from '@/services/DataService';
import { Customer } from '@/models/Customer';
import { Vehicle } from '@/models/Vehicle';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export const RecordsView = () => {
    const [activeTab, setActiveTab] = useState<'clientes' | 'vehiculos' | 'entregas_terminadas'>('clientes');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [closedDeliveries, setClosedDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
    const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<any | null>(null);
    const [deletingVehicle, setDeletingVehicle] = useState(false);
    
    // New state for customer deletion
    const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);
    const [deletingCustomer, setDeletingCustomer] = useState(false);

    // New state for payment history of closed deliveries
    const [selectedPlanForHistory, setSelectedPlanForHistory] = useState<any | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'clientes') {
                const data = await DataService.getCustomers();
                setCustomers(data);
            } else if (activeTab === 'vehiculos') {
                const data = await DataService.getVehicles();
                setVehicles(data);
            } else if (activeTab === 'entregas_terminadas') {
                const data = await DataService.getClosedDeliveries();
                setClosedDeliveries(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openHistoryModal = async (plan: any) => {
        setSelectedPlanForHistory(plan);
        setLoadingHistory(true);
        try {
            const data = await DataService.getPaymentHistory(plan.id);
            setPaymentHistory(data || []);
        } catch (error) {
            console.error("Error loading payment history:", error);
            toast.error("Error al cargar el historial de pagos");
        } finally {
            setLoadingHistory(false);
        }
    };

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

    const handleDeleteCustomer = async (id: number) => {
        setDeletingCustomer(true);
        try {
            await DataService.deleteCustomer(id);
            toast.success('Cliente eliminado');
            setDeleteCustomerTarget(null);
            loadData();
        } catch (error) {
            toast.error('Error al eliminar cliente');
        } finally {
            setDeletingCustomer(false);
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

    const handleDeleteVehicle = async (vehicle: any) => {
        setDeletingVehicle(true);
        try {
            await DataService.deleteVehicle(vehicle.id);
            toast.success('Vehículo eliminado');
            setDeleteVehicleTarget(null);
            loadData();
        } catch (error) {
            toast.error('Error al eliminar vehículo');
        } finally {
            setDeletingVehicle(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-6xl mx-auto">
            <Card className="w-full md:w-64 h-fit shrink-0">
                <CardHeader className="pb-2 md:pb-6">
                    <CardTitle className="text-lg">Directorios</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-row md:flex-col gap-2">
                    <Button 
                        variant={activeTab === 'clientes' ? 'default' : 'ghost'} 
                        className="justify-start flex-1 md:flex-none"
                        onClick={() => setActiveTab('clientes')}
                    >
                        Clientes
                    </Button>
                    <Button 
                        variant={activeTab === 'vehiculos' ? 'default' : 'ghost'} 
                        className="justify-start flex-1 md:flex-none"
                        onClick={() => setActiveTab('vehiculos')}
                    >
                        Vehículos
                    </Button>
                    <Button 
                        variant={activeTab === 'entregas_terminadas' ? 'default' : 'ghost'} 
                        className="justify-start flex-1 md:flex-none"
                        onClick={() => setActiveTab('entregas_terminadas')}
                    >
                        Entregas Terminadas
                    </Button>
                </CardContent>
            </Card>

            <div className="flex-1">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {activeTab === 'clientes' 
                                ? 'Gestión de Clientes' 
                                : activeTab === 'vehiculos' 
                                ? 'Gestión de Vehículos' 
                                : 'Entregas Terminadas'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <LoadingScreen message="Cargando registros..." inline />
                        ) : activeTab === 'clientes' ? (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <Table className="min-w-[500px]">
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
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setEditingCustomer(c)}>Editar</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => setDeleteCustomerTarget(c)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
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
                            </div>
                        ) : activeTab === 'vehiculos' ? (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Marca/Línea</TableHead>
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
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setEditingVehicle(v)}>Editar</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => setDeleteVehicleTarget(v)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
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
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <Table className="min-w-[700px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Vehículo</TableHead>
                                        <TableHead>Financiamiento</TableHead>
                                        <TableHead>Progreso</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {closedDeliveries.map((plan) => {
                                        const totalAmt = Number(plan.total_installments) * Number(plan.installment_value);
                                        const paidAmt = Number(plan.installments_paid) * Number(plan.installment_value);
                                        return (
                                        <TableRow key={plan.id}>
                                            <TableCell>
                                                <p className="font-medium">{plan.customers?.first_name} {plan.customers?.last_name}</p>
                                                <p className="text-xs text-muted-foreground">Cédula: {plan.customers?.cedula || 'N/A'}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{plan.vehicles?.model} ({plan.vehicles?.year})</p>
                                                <p className="text-xs text-muted-foreground">Placa: <span className="bg-yellow-100 text-yellow-800 px-1 rounded font-semibold text-xs">{plan.vehicles?.plate}</span></p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">Total: ${totalAmt.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">Cuota: ${plan.installment_value?.toLocaleString()} ({plan.payment_frequency})</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{plan.installments_paid} / {plan.total_installments}</p>
                                                <p className="text-xs text-muted-foreground">Pagado: ${paidAmt.toLocaleString()}</p>
                                            </TableCell>
                                            <TableCell>
                                                {plan.status === 'FINALIZADO' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                        Finalizada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                        Cerrada
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => openHistoryModal(plan)}
                                                >
                                                    Ver Pagos
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                    {closedDeliveries.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-4">No hay entregas terminadas registradas.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                <DialogContent className="max-w-lg w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                    </DialogHeader>
                    {editingCustomer && (
                        <form onSubmit={handleSaveCustomer} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input value={editingCustomer.first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, first_name: e.target.value})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Apellido</Label>
                                    <Input value={editingCustomer.last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, last_name: e.target.value})} required/>
    <div className="space-y-2">
                                        <Label>Dirección</Label>
                                        <Input value={editingCustomer.address || ''} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} />
                                    </div>
                                    
                                    <div className="col-span-1 sm:col-span-2 pt-2 border-t mt-2">
                                        <h4 className="font-semibold mb-2">Datos del Fiador</h4>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Fiador - Nombre</Label>
                                        <Input value={editingCustomer.guarantor_first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, guarantor_first_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fiador - Apellido</Label>
                                        <Input value={editingCustomer.guarantor_last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, guarantor_last_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fiador - Cédula</Label>
                                        <Input value={editingCustomer.guarantor_cedula || ''} onChange={e => setEditingCustomer({...editingCustomer, guarantor_cedula: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fiador - Dirección</Label>
                                        <Input value={editingCustomer.guarantor_address || ''} onChange={e => setEditingCustomer({...editingCustomer, guarantor_address: e.target.value})} />
                                    </div>
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
                <DialogContent className="max-w-lg w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Editar Vehículo</DialogTitle>
                    </DialogHeader>
                    {editingVehicle && (
                        <form onSubmit={handleSaveVehicle} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Marca/Línea</Label>
                                    <Input value={editingVehicle.model || ''} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Modelo</Label>
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

            <ConfirmDialog
                open={deleteCustomerTarget !== null}
                onOpenChange={(open) => !open && setDeleteCustomerTarget(null)}
                title="Eliminar Cliente"
                description={`¿Está seguro de eliminar al cliente ${deleteCustomerTarget?.first_name || ''} ${deleteCustomerTarget?.last_name || ''}? Se eliminarán AUTOMÁTICAMENTE todos sus vehículos y planes de pago asociados. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar Cliente"
                variant="danger"
                onConfirm={() => { if (deleteCustomerTarget && deleteCustomerTarget.id) handleDeleteCustomer(deleteCustomerTarget.id); }}
                loading={deletingCustomer}
            />

            <ConfirmDialog
                open={deleteVehicleTarget !== null}
                onOpenChange={(open) => !open && setDeleteVehicleTarget(null)}
                title="Eliminar Vehículo"
                description={`¿Está seguro de eliminar el vehículo ${deleteVehicleTarget?.model || ''} (${deleteVehicleTarget?.plate || ''})? Se eliminarán también los planes de pago e historial de pagos asociados. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar Vehículo"
                variant="danger"
                onConfirm={() => { if (deleteVehicleTarget) handleDeleteVehicle(deleteVehicleTarget); }}
                loading={deletingVehicle}
            />

            <Dialog open={selectedPlanForHistory !== null} onOpenChange={(open) => !open && setSelectedPlanForHistory(null)}>
                <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Historial de Pagos - Plan #{selectedPlanForHistory?.id}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                        <div className="bg-muted p-4 rounded-lg text-sm grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-muted-foreground block text-xs">Cliente</span>
                                <span className="font-semibold">{selectedPlanForHistory?.customers?.first_name} {selectedPlanForHistory?.customers?.last_name}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs">Vehículo</span>
                                <span className="font-semibold">{selectedPlanForHistory?.vehicles?.model} - {selectedPlanForHistory?.vehicles?.plate}</span>
                            </div>
                        </div>

                        {loadingHistory ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Cargando pagos...
                            </div>
                        ) : (
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Monto</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Nota</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paymentHistory.map((rec: any) => (
                                            <TableRow key={rec.id}>
                                                <TableCell className="whitespace-nowrap">{new Date(rec.payment_date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-semibold">${rec.amount?.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                        rec.status === 'APROBADO' ? 'text-green-600 bg-green-50 border-green-200' :
                                                        rec.status === 'PENDIENTE' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                                        'text-red-600 bg-red-50 border-red-200'
                                                    }`}>
                                                        {rec.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs">{rec.note || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {paymentHistory.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-4">No hay pagos aprobados/pendientes registrados para esta entrega.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};
