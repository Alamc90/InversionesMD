export interface FinancialTransaction {
    id?: string;
    business_id: string;
    user_id?: string;
    type: 'INGRESO' | 'EGRESO';
    category: TransactionCategory;
    amount: number;
    description?: string;
    reference_id?: string;
    transaction_date?: string;
    created_at?: string;
}

export type TransactionCategory = 
    | 'PAGO_CUOTA' 
    | 'CUOTA_INICIAL' 
    | 'COMPRA_VEHICULO' 
    | 'GASTOS_OPERATIVOS' 
    | 'AJUSTE_CAJA'
    | 'RETIRO'
    | 'OTRO';

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
    PAGO_CUOTA: 'Pago de Cuota',
    CUOTA_INICIAL: 'Cuota Inicial',
    COMPRA_VEHICULO: 'Compra de Vehículo',
    GASTOS_OPERATIVOS: 'Gastos Operativos',
    AJUSTE_CAJA: 'Ajuste de Caja',
    RETIRO: 'Retiro',
    OTRO: 'Otro',
};

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
    'COMPRA_VEHICULO',
    'GASTOS_OPERATIVOS',
    'RETIRO',
    'OTRO',
];

export const INCOME_CATEGORIES: TransactionCategory[] = [
    'PAGO_CUOTA',
    'CUOTA_INICIAL',
    'OTRO',
];

export type ReportPeriod = 'diario' | 'semanal' | 'mensual' | 'todo';

export interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    adjustments: number;
    profit: number;
    balance: number;
    transactions: FinancialTransaction[];
}
