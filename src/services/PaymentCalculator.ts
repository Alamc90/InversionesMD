import { addMonths, eachDayOfInterval, getDay, startOfDay } from 'date-fns';

export interface PlanCalculationParams {
    price?: number;
    downPayment?: number;
    paymentFrequency: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    excludedDays?: string[]; 
    
    // Al menos 2 de estos 3 deberían estar presentes para calcular el plano.
    months?: number; // Opcional, si no se da se infiere de totalInstallments
    interestRate?: number;    // % Mensual
    installmentValue?: number;
    totalInstallments?: number; // Opcional, si no se da se infiere de months
}

export class PaymentCalculator {
    
    static calculatePlanDetails(params: PlanCalculationParams) {
        const price = params.price || 0;
        const downPayment = params.downPayment || 0;
        const frequency = params.paymentFrequency;
        const excludedDays = params.excludedDays || [];
        
        let rate = params.interestRate;
        let installmentValue = params.installmentValue;
        let installments = params.totalInstallments;
        let months = params.months;

        // Si tenemos installments pero no meses, calcular meses aproximados
        if (!months && installments && installments > 0) {
           if (frequency === 'MENSUAL') months = installments;
           else if (frequency === 'QUINCENAL') months = installments / 2;
           else if (frequency === 'SEMANAL') months = installments / 4;
           else if (frequency === 'DIARIO') {
               // roughly 30 days per month. If excluded days = 1/week (Sundays), roughly 26 days/month
               const daysPerMonth = 30 - excludedDays.length * 4.3;
               months = installments / Math.max(1, daysPerMonth);
           }
        }
        
        // Si no hay ninguno de los dos, asumimos 12 meses por defecto
        if (!months && !installments) {
            months = 12;
        }

        // 1. Calcular número de cuotas reales (si no fue manual) o ajustar meses
        const numberOfInstallments = installments || this.calculatePaymentCount(frequency, months || 12, excludedDays);
        if (!months) months = numberOfInstallments; // fallback fallback
        
        // 2. Capital a Financiar
        const financedAmount = Math.max(0, price - downPayment);

        // FLuJo 1: Tenemos Rate -> Predecir Installment Value
        if (rate !== undefined && (installmentValue === undefined || installmentValue === 0)) {
            const totalInterest = price * (rate / 100) * months;
            const amountToSpread = financedAmount + totalInterest;
            
            installmentValue = numberOfInstallments > 0 ? amountToSpread / numberOfInstallments : 0;
            
            return {
                capitalAmount: financedAmount,
                interestRate: rate,
                months: Number(months.toFixed(1)),
                totalInterest: Number(totalInterest.toFixed(2)),
                totalToPay: Number(amountToSpread.toFixed(2)),
                numberOfInstallments: Math.floor(numberOfInstallments),
                installmentValue: Number(installmentValue.toFixed(2))
            };
        } 
        
        // FLuJo 2: Tenemos Installment Value pero no Rate -> Predecir Rate
        else if (installmentValue !== undefined && installmentValue > 0 && (rate === undefined || rate === 0)) {
            const totalToPayInInstallments = installmentValue * numberOfInstallments;
            const totalInterest = totalToPayInInstallments - financedAmount;
            
            if (price > 0 && months > 0) {
                rate = (totalInterest / (price * months)) * 100;
            } else {
                rate = 0;
            }
            
            return {
                capitalAmount: financedAmount,
                interestRate: Number(rate.toFixed(2)),
                months: Number(months.toFixed(1)),
                totalInterest: Number(totalInterest.toFixed(2)),
                totalToPay: Number(totalToPayInInstallments.toFixed(2)),
                numberOfInstallments: Math.floor(numberOfInstallments),
                installmentValue: Number(installmentValue.toFixed(2))
            };
        }
        
        // FLuJo 3: Tenemos Installment Value y Rate, pero queremos predecir Cuotas (Installments / Meses)
        else if (installmentValue !== undefined && installmentValue > 0 && rate !== undefined && rate > 0) {
             // Total to pay = Financed + (Price * Rate * Months)
             // Total to pay = InstallmentValue * Installments
             // Sabemos que Installments depende de Months y Frecuencia.
             // Esto es más complejo. Una aproximación: asumimos Frecuencia Mensual para el despeje directo
             // InstallmentValue * (Months * factor) = Financed + Price * Rate * Months
             // Months * (InstallmentValue * factor - Price * Rate) = Financed
             // Months = Financed / (InstallmentValue * factor - Price * Rate)
             
             let factor = 1;
             if (frequency === 'QUINCENAL') factor = 2;
             if (frequency === 'SEMANAL') factor = 4;
             if (frequency === 'DIARIO') factor = 26; // approx

             const denom = (installmentValue * factor) - (price * (rate / 100));
             if (denom > 0) {
                 months = financedAmount / denom;
                 installments = Math.ceil(months * factor);
             } else {
                 months = 12;
                 installments = Math.ceil(months * factor);
             }

             const totalInterest = price * (rate / 100) * months;
             const amountToSpread = financedAmount + totalInterest;

             return {
                capitalAmount: financedAmount,
                interestRate: rate,
                months: Number(months.toFixed(1)),
                totalInterest: Number(totalInterest.toFixed(2)),
                totalToPay: Number(amountToSpread.toFixed(2)),
                numberOfInstallments: installments,
                installmentValue: Number(installmentValue.toFixed(2))
            };
        }
        
        // Fallback genérico
        return {
                capitalAmount: financedAmount,
                interestRate: rate || 0,
                months: 12,
                totalInterest: 0,
                totalToPay: financedAmount,
                numberOfInstallments: numberOfInstallments,
                installmentValue: numberOfInstallments > 0 ? financedAmount/numberOfInstallments : 0
        };
    }

    static calculatePaymentCount(
        frequency: string, 
        months: number, 
        excludedDays: string[] = []
    ): number {
        if (months <= 0) return 0;
        
        if (frequency === 'MENSUAL') return months;
        if (frequency === 'QUINCENAL') return months * 2;
        if (frequency === 'SEMANAL') return months * 4;

        if (frequency === 'DIARIO') {
            const startDate = startOfDay(new Date());
            const endDate = addMonths(startDate, months);
            
            const dayMap: Record<string, number> = {
                'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 
                'jueves': 4, 'viernes': 5, 'sabado': 6
            };
            
            const excludedIndexes = excludedDays.map(d => dayMap[d.toLowerCase()] ?? -1);

            const allDays = eachDayOfInterval({ start: startDate, end: endDate });
            
            const validDays = allDays.filter(date => {
                const dayIndex = getDay(date);
                return !excludedIndexes.includes(dayIndex);
            });
            
            return Math.max(1, validDays.length - 1); 
        }
        return months;
    }

    /**
     * Calculates Early Payoff Amount.
     * Returns ONLY the remaining Capital (forgiving future interest).
     */
    static calculatePayoffAmount(
        financedAmount: number, // (Price - DownPayment)
        totalInstallments: number,
        installmentsPaid: number
    ): number {
        if (totalInstallments === 0) return 0;
        
        const capitalPerInstallment = financedAmount / totalInstallments;
        const capitalPaid = capitalPerInstallment * installmentsPaid;
        const remaining = financedAmount - capitalPaid;
        
        return Math.max(0, Number(remaining.toFixed(0)));
    }
}