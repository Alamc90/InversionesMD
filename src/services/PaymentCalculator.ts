export class PaymentCalculator {
    static calculateInstallment(totalAmount: number, numberOfInstallments: number): number {
        if (numberOfInstallments <= 0) {
            throw new Error("Number of installments must be greater than zero.");
        }
        return totalAmount / numberOfInstallments;
    }

    static calculatePaymentStatus(totalAmount: number, installmentsPaid: number, numberOfInstallments: number): string {
        const amountPerInstallment = totalAmount / numberOfInstallments;
        const totalPaid = amountPerInstallment * installmentsPaid;
        const remainingAmount = totalAmount - totalPaid;

        if (installmentsPaid === numberOfInstallments) {
            return "Paid in full";
        } else if (installmentsPaid > numberOfInstallments) {
            return "Overpaid";
        } else {
            return `Remaining amount: ${remainingAmount.toFixed(2)}`;
        }
    }
}