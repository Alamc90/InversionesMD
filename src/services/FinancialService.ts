import { supabase } from '@/config/supabaseClient';
import { FinancialTransaction, FinancialSummary, ReportPeriod, TransactionCategory } from '@/models/FinancialTransaction';

export const FinancialService = {
    /**
     * Create a financial transaction
     */
    async createTransaction(transaction: Omit<FinancialTransaction, 'id' | 'created_at'>): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert({
                business_id: transaction.business_id,
                user_id: user.id,
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                description: transaction.description,
                reference_id: transaction.reference_id,
                transaction_date: transaction.transaction_date || new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get financial summary for a business filtered by period
     */
    async getFinancialSummary(businessId: string, period: ReportPeriod, customDate?: Date): Promise<FinancialSummary> {
        const { startDate, endDate } = this.getDateRange(period, customDate);

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('business_id', businessId)
            .gte('transaction_date', startDate.toISOString())
            .lte('transaction_date', endDate.toISOString())
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        const transactions = data || [];
        const totalIncome = transactions
            .filter(t => t.type === 'INGRESO')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpenses = transactions
            .filter(t => t.type === 'EGRESO')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
            totalIncome,
            totalExpenses,
            profit: totalIncome - totalExpenses,
            transactions,
        };
    },

    /**
     * Get all transactions for a business, optionally filtered
     */
    async getTransactions(
        businessId: string, 
        options?: { 
            type?: 'INGRESO' | 'EGRESO'; 
            category?: TransactionCategory;
            startDate?: string;
            endDate?: string;
            limit?: number;
        }
    ): Promise<FinancialTransaction[]> {
        let query = supabase
            .from('financial_transactions')
            .select('*')
            .eq('business_id', businessId)
            .order('transaction_date', { ascending: false });

        if (options?.type) {
            query = query.eq('type', options.type);
        }
        if (options?.category) {
            query = query.eq('category', options.category);
        }
        if (options?.startDate) {
            query = query.gte('transaction_date', options.startDate);
        }
        if (options?.endDate) {
            query = query.lte('transaction_date', options.endDate);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /**
     * Delete a transaction
     */
    async deleteTransaction(transactionId: string) {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (error) throw error;
    },

    /**
     * Calculate date range for a given period
     */
    getDateRange(period: ReportPeriod, referenceDate?: Date): { startDate: Date; endDate: Date } {
        const now = referenceDate || new Date();
        let startDate: Date;
        let endDate: Date;

        switch (period) {
            case 'diario':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'semanal':
                // Start from Monday of current week
                const dayOfWeek = now.getDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'mensual':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }

        return { startDate, endDate };
    },

    /**
     * Record an income from an approved payment automatically
     */
    async recordPaymentIncome(businessId: string, paymentAmount: number, paymentId: string, description?: string) {
        return this.createTransaction({
            business_id: businessId,
            type: 'INGRESO',
            category: 'PAGO_CUOTA',
            amount: paymentAmount,
            description: description || 'Pago de cuota aprobado',
            reference_id: paymentId,
            transaction_date: new Date().toISOString(),
        });
    },

    /**
     * Record a down payment income
     */
    async recordDownPaymentIncome(businessId: string, amount: number, vehiclePlate: string) {
        return this.createTransaction({
            business_id: businessId,
            type: 'INGRESO',
            category: 'CUOTA_INICIAL',
            amount,
            description: `Cuota inicial - Vehículo ${vehiclePlate}`,
            transaction_date: new Date().toISOString(),
        });
    },
};
