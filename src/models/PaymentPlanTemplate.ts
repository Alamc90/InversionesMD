export interface PaymentPlanTemplate {
    id?: string;
    name: string;
    total_installments: number;
    installment_value: number;
    payment_frequency: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    down_payment: number;
    user_id?: string;
    price?: number;
    interest_rate?: number;
    months?: number;
    excluded_days?: string[];
}
