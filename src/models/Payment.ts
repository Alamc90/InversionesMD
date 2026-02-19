export interface InstallmentPlan {
    id?: number;
    vehicle_id?: number;
    total_installments: number; // "cantidad X de cuotas"
    installment_value: number;  // "valor de la cuota"
    installments_paid: number;  // "X cuotas de X total"
    total_amount?: number;
}
