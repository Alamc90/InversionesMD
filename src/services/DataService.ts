import { supabase } from '../config/supabaseClient';
import { Customer } from '../models/Customer';
import { Vehicle } from '../models/Vehicle';
import { InstallmentPlan } from '../models/Payment';

export const DataService = {
  /**
   * Creates a full record: Customer -> Vehicle -> Plan
   */
  async createFullRecord(
    customer: Customer, 
    vehicle: Vehicle, 
    plan: InstallmentPlan
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      // 1. Create Customer (and Guarantor info)
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert([{
            user_id: user.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            cedula: customer.cedula,
            address: customer.address,
            phone: customer.phone,
            guarantor_first_name: customer.guarantor_first_name,
            guarantor_last_name: customer.guarantor_last_name,
            guarantor_cedula: customer.guarantor_cedula,
            guarantor_address: customer.guarantor_address
        }], { onConflict: 'cedula' })
        .select()
        .single();

      if (customerError) throw customerError;
      if (!customerData) throw new Error("Failed to create customer");

      // 2. Create Vehicle linked to Customer
      // Changed to upsert to handle retries gracefully if the previous attempt failed at the plan stage
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .upsert([{
            user_id: user.id,
            customer_id: customerData.id,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plate: vehicle.plate
        }], { onConflict: 'plate' })
        .select()
        .single();


      if (vehicleError) throw vehicleError;
      if (!vehicleData) throw new Error("Failed to create vehicle");

      // 3. Create Installment Plan linked to Vehicle
      const { error: planError } = await supabase
        .from('installment_plans')
        .insert([{
            user_id: user.id,
            vehicle_id: vehicleData.id,
            total_installments: plan.total_installments,
            installment_value: plan.installment_value,
            installments_paid: 0,
            payment_frequency: plan.payment_frequency,
            start_date: plan.start_date
            // total_amount is likely a generated column, so we don't insert it explicitly
        }]);

      if (planError) throw planError;

      return { success: true, customerId: customerData.id };

    } catch (error) {
      console.error("Transaction failed:", error);
      return { success: false, error };
    }
  },

  async getActiveVehicles() {
    // Fetches vehicles with their plan and owner
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        customers ( first_name, last_name ),
        installment_plans ( total_installments, installments_paid, installment_value )
      `);
      
    if (error) throw error;
    return data;
  },

  async registerPayment(planId: number, amount: number, note?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    // 1. Insert payment record and return it to ensure we have it
    const { data: insertedPayment, error: paymentError } = await supabase
        .from('payment_records')
        .insert([{
            plan_id: planId,
            user_id: user.id,
            amount: amount,
            payment_date: new Date().toISOString(),
            note: note
        }])
        .select()
        .single();

    if (paymentError) throw paymentError;

    // 2. Fetch current plan to update installments_paid
    const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .select('installment_value')
        .eq('id', planId)
        .single();
    
    if (planError) throw planError;
    
    const instValue = Number(plan.installment_value);

    // Force retrieval of fresh data by not using cache if possible (supabase-js usually doesn't cache by default unless configured)
    const { data: allPayments, error: historyError } = await supabase
        .from('payment_records')
        .select('amount, id') // Select ID to verify specific payment inclusion
        .eq('plan_id', planId);

    if (historyError) throw historyError;
    
    // Ensure we include the current payment in total
    let totalPaid = 0;
    if (allPayments) {
        totalPaid = allPayments.reduce((sum, record) => sum + Number(record.amount), 0);
    }

    // Safety check: if allPayments query missed the new insert (rare but possible with replication lag), add it manually
    if (insertedPayment && allPayments && !allPayments.some(p => p.id === insertedPayment.id)) {
        totalPaid += Number(insertedPayment.amount);
    }
    
    // Calculate new installments count. Use toFixed(2) to avoid floating point weirdness during division like 0.999999
    const rawPaid = instValue > 0 ? (totalPaid / instValue) : 0;
    
    // Round to 2 decimals to match standard currency/float precision
    const newInstallmentsPaid = Number(rawPaid.toFixed(2));

    console.log(`Recalculating payment: TotalPaid ${totalPaid}, Value ${instValue}, NewPaid ${newInstallmentsPaid}`);

    // Update the plan
    const { error: updateError } = await supabase
        .from('installment_plans')
        .update({ installments_paid: newInstallmentsPaid })
        .eq('id', planId);

    if (updateError) {
        console.error("Failed to update installments_paid:", updateError);
        throw updateError;
    }

    return { success: true, newProgress: newInstallmentsPaid };
  },

  async getPaymentHistory(planId: number) {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('plan_id', planId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
  },

  async getVehicleDetails(vehicleId: number) {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            customers (*),
            installment_plans (*)
        `)
        .eq('id', vehicleId)
        .single();
      
      if (error) throw error;
      
      // Ensure specific consistent ordering for installment_plans: Newest first
      if (data && data.installment_plans && Array.isArray(data.installment_plans)) {
          data.installment_plans.sort((a: any, b: any) => b.id - a.id);
      }
      
      return data;
  },

  async getInstallmentPlan(planId: number) {
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (error) throw error;
      return data;
  }
};
