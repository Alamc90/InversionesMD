import { addDays, getDay, startOfDay, isBefore, isAfter, isSameDay } from 'date-fns';

export function calculateOverdueInfo(plan: any): { overdueInstallments: number, nextDueDate: Date | null } {
    if (!plan || !plan.start_date) {
        return { overdueInstallments: 0, nextDueDate: null };
    }
    
    // Parse using local timezone logic
    const startDateStr = plan.start_date.split('T')[0];
    const [year, month, day] = startDateStr.split('-').map(Number);
    const startDate = startOfDay(new Date(year, month - 1, day));
    const now = startOfDay(new Date());
    
    if (isAfter(startDate, now)) {
        // Start date is in the future
        return { overdueInstallments: 0, nextDueDate: startDate };
    }
    
    const paid = Number(plan.installments_paid) || 0;
    
    let periodsElapsed = 0;
    let nextDue = new Date(startDate);

    if (plan.payment_frequency === 'DIARIO') {
        const dayMap: Record<string, number> = {
            'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 
            'jueves': 4, 'viernes': 5, 'sabado': 6
        };
        const excludedDays = (plan.excluded_days || []).map((d: string) => dayMap[d.toLowerCase()] ?? -1);

        // Calculate periods elapsed (valid days only)
        let currentDate = new Date(startDate);
        // Exclude start date itself? Normally start date is Day 0 (no payment due). Payments start on Day 1.
        // Wait, "usually loans don't pay on Day 0" - so start counting from startDate + 1.
        // But what if startDate is a valid payment day, and the user pays a cuota?
        // Let's assume daily payments evaluate the first installment on start_date + 1 valid day.
        
        let validDaysElapsed = 0;
        let iterDate = addDays(startDate, 1);
        while (isBefore(iterDate, now) || isSameDay(iterDate, now)) {
            if (!excludedDays.includes(getDay(iterDate))) {
                validDaysElapsed++;
            }
            iterDate = addDays(iterDate, 1);
        }
        periodsElapsed = validDaysElapsed;

        // Calculate next due date (jump forward 'paid + 1' valid days from start date)
        let targetValidDays = paid + 1;
        let currentValidDays = 0;
        let walkDate = new Date(startDate);
        while (currentValidDays < targetValidDays) {
            walkDate = addDays(walkDate, 1);
            if (!excludedDays.includes(getDay(walkDate))) {
                currentValidDays++;
            }
        }
        nextDue = walkDate;
        
    } else {
        // For other frequencies
        let daysPerPeriod = 7;
        if (plan.payment_frequency === 'SEMANAL') daysPerPeriod = 7;
        if (plan.payment_frequency === 'QUINCENAL') daysPerPeriod = 15;
        if (plan.payment_frequency === 'MENSUAL') daysPerPeriod = 30; // Approximation

        const diffTime = now.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        
        periodsElapsed = Math.floor(diffDays / daysPerPeriod);
        
        const nextInstallmentNumber = Math.floor(paid) + 1;
        // nextDue = startDate + nextInstallmentNumber * daysPerPeriod
        nextDue = addDays(startDate, nextInstallmentNumber * daysPerPeriod);
    }

    const overdue = Math.max(0, periodsElapsed - paid);

    return {
        overdueInstallments: overdue,
        nextDueDate: nextDue
    };
}
