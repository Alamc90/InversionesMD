export interface Business {
    id?: string;
    name: string;
    nit?: string;
    address?: string;
    phone?: string;
    logo_url?: string;
    status?: number;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BusinessMember {
    id?: string;
    business_id: string;
    user_id: string;
    role: 'admin' | 'employee';
    display_name?: string;
    permissions: UserPermissions;
    created_at?: string;
    // Joined fields
    email?: string;
}

export interface UserPermissions {
    can_view_dashboard: boolean;
    can_create_deliveries: boolean;
    can_process_payments: boolean;
    can_approve_payments: boolean;
    can_view_balance: boolean;
    can_manage_records: boolean;
    can_manage_config: boolean;
    can_manage_users: boolean;
}

export interface BusinessInvitation {
    id?: string;
    business_id: string;
    email: string;
    role: 'admin' | 'employee';
    permissions: UserPermissions;
    accepted: boolean;
    created_by?: string;
    created_at?: string;
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
    can_view_dashboard: true,
    can_create_deliveries: true,
    can_process_payments: true,
    can_approve_payments: true,
    can_view_balance: true,
    can_manage_records: true,
    can_manage_config: true,
    can_manage_users: true,
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermissions = {
    can_view_dashboard: true,
    can_create_deliveries: false,
    can_process_payments: true,
    can_approve_payments: false,
    can_view_balance: false,
    can_manage_records: false,
    can_manage_config: false,
    can_manage_users: false,
};

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
    can_view_dashboard: 'Ver Dashboard de Vehículos',
    can_create_deliveries: 'Crear Entregas de Vehículos',
    can_process_payments: 'Registrar Pagos',
    can_approve_payments: 'Aprobar/Denegar Pagos',
    can_view_balance: 'Ver Balance Financiero',
    can_manage_records: 'Gestionar Registros (Clientes/Vehículos)',
    can_manage_config: 'Configuración del Negocio',
    can_manage_users: 'Gestión de Usuarios',
};
