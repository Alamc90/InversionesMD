export interface Customer {
    id?: number;
    first_name: string;
    last_name: string;
    cedula: string;
    address: string;
    phone: string;
    
    // Fiador
    guarantor_first_name: string;
    guarantor_last_name: string;
    guarantor_cedula: string;
    guarantor_address: string;
}

export interface Vehicle {
    id?: number;
    customer_id?: number;
    model: string;
    year: number;
    color: string;
    plate: string;
}

export interface InstallmentPlan {
    id?: number;
    vehicle_id?: number;
    customer_id?: number;
    status?: 'ACTIVO' | 'FINALIZADO' | 'CERRADO';
    total_installments: number;
    installment_value: number;
    installments_paid: number;
    payment_frequency?: string;
    start_date?: string;
    down_payment?: number;
}
