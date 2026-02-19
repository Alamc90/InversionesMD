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
      // 1. Create Customer (and Guarantor info)
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{
            first_name: customer.first_name,
            last_name: customer.last_name,
            cedula: customer.cedula,
            address: customer.address,
            phone: customer.phone,
            guarantor_first_name: customer.guarantor_first_name,
            guarantor_last_name: customer.guarantor_last_name,
            guarantor_cedula: customer.guarantor_cedula,
            guarantor_address: customer.guarantor_address
        }])
        .select()
        .single();

      if (customerError) throw customerError;
      if (!customerData) throw new Error("Failed to create customer");

      // 2. Create Vehicle linked to Customer
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .insert([{
            customer_id: customerData.id,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plate: vehicle.plate
        }])
        .select()
        .single();

      if (vehicleError) throw vehicleError;
      if (!vehicleData) throw new Error("Failed to create vehicle");

      // 3. Create Installment Plan linked to Vehicle
      const { error: planError } = await supabase
        .from('installment_plans')
        .insert([{
            vehicle_id: vehicleData.id,
            total_installments: plan.total_installments,
            installment_value: plan.installment_value,
            installments_paid: 0,
            total_amount: plan.total_installments * plan.installment_value // Simple calc
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
  }
};
