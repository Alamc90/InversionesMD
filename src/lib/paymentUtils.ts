export function calculateOverdueInfo(plan: any): { overdueInstallments: number, nextDueDate: Date | null } {
    if (!plan || !plan.start_date) {
        return { overdueInstallments: 0, nextDueDate: null };
    }
    
    const startDate = new Date(plan.start_date);
    const now = new Date();
    
    // Calculate days elapsed since start
    const diffTime = now.getTime() - startDate.getTime();
    if (diffTime < 0) {
        // Start date is in the future
        return { overdueInstallments: 0, nextDueDate: startDate };
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    let daysPerPeriod = 7; // Default Semanal
    if (plan.payment_frequency === 'DIARIO') daysPerPeriod = 1;
    if (plan.payment_frequency === 'SEMANAL') daysPerPeriod = 7;
    if (plan.payment_frequency === 'QUINCENAL') daysPerPeriod = 15;
    if (plan.payment_frequency === 'MENSUAL') daysPerPeriod = 30;

    // Installments that *should* have been accumulated by now
    // If 10 days passed and period is 7, then 1 installment should have passed (technically 1.4)
    // Floor because you don't owe the 2nd one until the 14th day
    const periodsElapsed = Math.floor(diffDays / daysPerPeriod);
    
    // Installments paid so far
    const paid = Number(plan.installments_paid) || 0;
    
    // Overdue = What should have been paid - What has been paid
    // Ideally periodsElapsed includes the current one IF it's due today? 
    // Usually "Next Due" implies the upcoming one. 
    // If today is day 7 (1 period exactly), is it overdue? Yes usually.
    // Let's stick to the previous logic: 
    // periodsElapsed calculated by Math.floor(diffDays / daysPerPeriod) implies full periods passed.
    
    const overdue = Math.max(0, periodsElapsed - paid);

    // Next due date calculation
    const nextDue = new Date(startDate);
    // The next payment is the (paid + 1)th installment
    // e.g. paid 0, next is #1. paid 5, next is #6.
    const nextInstallmentNumber = Math.floor(paid) + 1;
    nextDue.setDate(startDate.getDate() + (nextInstallmentNumber * daysPerPeriod));

    return {
        overdueInstallments: overdue,
        nextDueDate: nextDue
    };
}
