"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessService } from '@/services/BusinessService';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessMember, BusinessInvitation, UserPermissions, PERMISSION_LABELS, DEFAULT_EMPLOYEE_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS } from '@/models/Business';
import { toast } from 'sonner';
import { UserPlus, Shield, Trash2, Mail, Users } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export const UserManagementView = () => {
    const { business, isAdmin, user } = useAuth();
    const [members, setMembers] = useState<BusinessMember[]>([]);
    const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Invite form
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'employee'>('employee');
    const [invitePermissions, setInvitePermissions] = useState<UserPermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);
    
    // Edit permissions
    const [editingMember, setEditingMember] = useState<BusinessMember | null>(null);
    const [editPermissions, setEditPermissions] = useState<UserPermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);
    const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');

    // Confirm dialogs
    const [deleteInvitationId, setDeleteInvitationId] = useState<string | null>(null);
    const [removeMemberTarget, setRemoveMemberTarget] = useState<BusinessMember | null>(null);

    const loadData = useCallback(async () => {
        if (!business?.id) {
            console.warn('[UserManagement] No business.id available');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const membersData = await BusinessService.getBusinessMembers(business.id);
            setMembers(membersData);
        } catch (error) {
            console.error('[UserManagement] Error loading members:', error);
            toast.error('Error al cargar miembros');
        }
        try {
            const invitationsData = await BusinessService.getInvitations(business.id);
            setInvitations(invitationsData.filter(i => !i.accepted));
        } catch (error) {
            console.error('[UserManagement] Error loading invitations:', error);
            // Non-fatal — invitations may fail due to RLS
        }
        setLoading(false);
    }, [business?.id]);

    useEffect(() => {
        if (business?.id) {
            loadData();
        }
    }, [loadData, business?.id]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;

        try {
            // 1. Guardar la invitación en la base de datos
            await BusinessService.createInvitation(
                business.id,
                inviteEmail,
                inviteRole,
                invitePermissions
            );

            // 2. Disparar el correo de invitación a través de nuestra API Route
            try {
                const response = await fetch('/api/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: inviteEmail }),
                });

                if (!response.ok) {
                    console.warn("La invitación se guardó, pero hubo un error enviando el correo. ¿Falta SUPABASE_SERVICE_ROLE_KEY?");
                }
            } catch (mailError) {
                console.error("Error contactando a la API de correos:", mailError);
            }

            toast.success(`Invitación enviada a ${inviteEmail}`);
            setShowInviteDialog(false);
            setInviteEmail('');
            setInviteRole('employee');
            setInvitePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear invitación');
        }
    };

    const handleDeleteInvitation = async (id: string) => {
        try {
            await BusinessService.deleteInvitation(id);
            toast.success('Invitación eliminada');
            setDeleteInvitationId(null);
            loadData();
        } catch (error) {
            toast.error('Error al eliminar invitación');
        }
    };

    const handleRemoveMember = async (member: BusinessMember) => {
        try {
            await BusinessService.removeMember(member.id!);
            toast.success('Miembro eliminado');
            setRemoveMemberTarget(null);
            loadData();
        } catch (error) {
            toast.error('Error al eliminar miembro');
        }
    };

    const openEditPermissions = (member: BusinessMember) => {
        setEditingMember(member);
        setEditPermissions(member.permissions);
        setEditRole(member.role);
    };

    const handleSavePermissions = async () => {
        if (!editingMember?.id) return;
        try {
            await BusinessService.updateMember(editingMember.id, {
                role: editRole,
                permissions: editRole === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : editPermissions,
            });
            toast.success('Permisos actualizados');
            setEditingMember(null);
            loadData();
        } catch (error) {
            toast.error('Error al actualizar permisos');
        }
    };

    const togglePermission = (
        perms: UserPermissions, 
        key: keyof UserPermissions, 
        setter: (p: UserPermissions) => void
    ) => {
        setter({ ...perms, [key]: !perms[key] });
    };

    const handleRoleChangeForInvite = (role: 'admin' | 'employee') => {
        setInviteRole(role);
        if (role === 'admin') {
            setInvitePermissions(DEFAULT_ADMIN_PERMISSIONS);
        } else {
            setInvitePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
        }
    };

    if (!isAdmin) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No tienes permisos para gestionar usuarios.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-muted-foreground text-sm">Administra los miembros de {business?.name}</p>
                </div>
                <Button onClick={() => setShowInviteDialog(true)} size="sm" className="w-full sm:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invitar Usuario
                </Button>
            </div>

            {/* Current Members */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Miembros Actuales
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <LoadingScreen message="Cargando miembros..." inline />
                    ) : (
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table className="min-w-[550px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="hidden sm:table-cell">Permisos</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{member.display_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-muted-foreground">{member.user_id === user?.id ? '(Tú)' : ''}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                member.role === 'admin' 
                                                    ? 'bg-purple-100 text-purple-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {member.role === 'admin' ? 'Administrador' : 'Empleado'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {member.role === 'admin' ? (
                                                    <span className="text-xs text-muted-foreground">Todos los permisos</span>
                                                ) : (
                                                    Object.entries(member.permissions)
                                                        .filter(([_, v]) => v)
                                                        .slice(0, 3)
                                                        .map(([key]) => (
                                                            <span key={key} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                                {PERMISSION_LABELS[key as keyof UserPermissions]?.split(' ').slice(0, 2).join(' ')}
                                                            </span>
                                                        ))
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => openEditPermissions(member)}
                                                    disabled={member.user_id === user?.id}
                                                >
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    Permisos
                                                </Button>
                                                {member.user_id !== user?.id && (
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            if (member.user_id === user?.id) {
                                                                toast.error('No puedes eliminarte a ti mismo');
                                                                return;
                                                            }
                                                            setRemoveMemberTarget(member);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {members.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4">No hay miembros.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Invitaciones Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table className="min-w-[450px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{inv.email}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                inv.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {inv.role === 'admin' ? 'Administrador' : 'Empleado'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(inv.created_at!).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="destructive" size="sm" onClick={() => setDeleteInvitationId(inv.id!)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invite Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Correo Electrónico</Label>
                            <Input 
                                type="email" 
                                value={inviteEmail} 
                                onChange={(e) => setInviteEmail(e.target.value)} 
                                placeholder="usuario@ejemplo.com"
                                required 
                            />
                            <p className="text-xs text-muted-foreground">
                                El usuario debe registrarse con este correo para unirse automáticamente.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select value={inviteRole} onValueChange={(v: any) => handleRoleChangeForInvite(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">Empleado</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {inviteRole === 'employee' && (
                            <div className="space-y-2">
                                <Label>Permisos</Label>
                                <div className="space-y-2 border rounded-md p-3">
                                    {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>).map((key) => (
                                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={invitePermissions[key]}
                                                onChange={() => togglePermission(invitePermissions, key, setInvitePermissions)}
                                                className="rounded"
                                            />
                                            {PERMISSION_LABELS[key]}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
                            <Button type="submit">Enviar Invitación</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Permissions Dialog */}
            <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Editar Permisos - {editingMember?.display_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select value={editRole} onValueChange={(v: any) => {
                                setEditRole(v);
                                if (v === 'admin') {
                                    setEditPermissions(DEFAULT_ADMIN_PERMISSIONS);
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">Empleado</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {editRole === 'employee' && (
                            <div className="space-y-2">
                                <Label>Permisos</Label>
                                <div className="space-y-2 border rounded-md p-3">
                                    {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>).map((key) => (
                                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editPermissions[key]}
                                                onChange={() => togglePermission(editPermissions, key, setEditPermissions)}
                                                className="rounded"
                                            />
                                            {PERMISSION_LABELS[key]}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
                            <Button onClick={handleSavePermissions}>Guardar Cambios</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteInvitationId !== null}
                onOpenChange={(open) => !open && setDeleteInvitationId(null)}
                title="Eliminar Invitación"
                description="¿Está seguro de eliminar esta invitación pendiente?"
                confirmLabel="Eliminar"
                variant="warning"
                onConfirm={() => { if (deleteInvitationId) return handleDeleteInvitation(deleteInvitationId); }}
            />

            <ConfirmDialog
                open={removeMemberTarget !== null}
                onOpenChange={(open) => !open && setRemoveMemberTarget(null)}
                title="Eliminar Miembro"
                description={`¿Está seguro de eliminar a ${removeMemberTarget?.display_name || 'este usuario'} del negocio? Perderá acceso inmediatamente.`}
                confirmLabel="Eliminar Miembro"
                variant="danger"
                onConfirm={() => { if (removeMemberTarget) return handleRemoveMember(removeMemberTarget); }}
            />
        </div>
    );
};
