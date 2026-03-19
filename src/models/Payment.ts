export interface InstallmentPlan {
    id?: number;
    vehicle_id?: number;
    business_id?: string;
    
    // Configuración Financiera
    capital_amount?: number;    // Monto financiado (Precio - Inicial)
    interest_rate?: number;     // % de Interés Mensual
    excluded_days?: string[];   // Días de la semana excluidos (ej: ['Domingo'])

    total_installments: number; // "cantidad X de cuotas"
    installment_value: number;  // "valor de la cuota"
    installments_paid: number;  // "X cuotas de X total"
    total_amount?: number;
    payment_frequency: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    start_date?: string;
    down_payment?: number;      // "cuota inicial"
}

export type PaymentStatus = 'PENDIENTE' | 'APROBADO' | 'DENEGADO';

export interface PaymentRecord {
    id?: number;
    plan_id: number;
    amount: number;
    payment_date?: string;
    note?: string;
    status: PaymentStatus;
    approved_by?: string;
    approved_at?: string;
    created_by_name?: string;
    business_id?: string;
    user_id?: string;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    PENDIENTE: 'Pendiente',
    APROBADO: 'Aprobado',
    DENEGADO: 'Denegado',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
    PENDIENTE: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    APROBADO: 'text-green-600 bg-green-50 border-green-200',
    DENEGADO: 'text-red-600 bg-red-50 border-red-200',
};
