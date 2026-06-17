import { supabase } from '../config/supabaseClient';
import { Customer } from '../models/Customer';
import { Vehicle } from '../models/Vehicle';
import { InstallmentPlan } from '../models/Payment';
import { BusinessConfig } from '../models/BusinessConfig';
import { PaymentPlanTemplate } from '../models/PaymentPlanTemplate';

/**
 * Cache for schema detection — we check once if the new columns/tables exist.
 * null = not checked yet, true = new schema, false = legacy schema
 */
let _newSchemaAvailable: boolean | null = null;

async function isNewSchemaAvailable(): Promise<boolean> {
    if (_newSchemaAvailable !== null) return _newSchemaAvailable;
    try {
        // Try querying a column that only exists after the migration
        const { error } = await supabase
            .from('business_members')
            .select('id')
            .limit(0);
        
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
            _newSchemaAvailable = false;
        } else {
            _newSchemaAvailable = true;
        }
    } catch {
        _newSchemaAvailable = false;
    }
    return _newSchemaAvailable;
}

export const DataService = {
  /**
   * Get business_id for the current user
   */
  async getBusinessId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Try reading from business_members
      const { data, error } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

      if (data?.business_id) return data.business_id;

      // Fallback: Check if user created any business recently
      const { data: biz } = await supabase
          .from('businesses')
          .select('id')
          .eq('created_by', user.id)
          .limit(1)
          .maybeSingle();
      
      return biz?.id || null;
    } catch {
      return null;
    }
  },

  /**
   * Creates a full record: Customer -> Vehicle -> Plan
   */
  async createFullRecord(
    customer: Customer, 
    vehicle: Vehicle, 
    plan: InstallmentPlan,
    businessId?: string // Optional override for performance
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const resolvedBusinessId = businessId || await this.getBusinessId();
      
      // 1. Create or Update Customer (manual upsert to avoid global UNIQUE conflicts across businesses)
      const customerPayload: any = {
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
      };
      if (resolvedBusinessId) customerPayload.business_id = resolvedBusinessId;

      // Check if customer already exists in THIS business by cedula
      let customerData: any = null;
      if (customer.cedula && resolvedBusinessId) {
          const { data: existing } = await supabase
              .from('customers')
              .select('*')
              .eq('cedula', customer.cedula)
              .eq('business_id', resolvedBusinessId)
              .maybeSingle();
          
          if (existing) {
              // Update existing customer
              const { data: updated, error: updateErr } = await supabase
                  .from('customers')
                  .update(customerPayload)
                  .eq('id', existing.id)
                  .select()
                  .single();
              if (updateErr) throw updateErr;
              customerData = updated;
          }
      }

      if (!customerData) {
          // Insert new customer
          const { data: inserted, error: insertErr } = await supabase
              .from('customers')
              .insert([customerPayload])
              .select()
              .single();
          if (insertErr) throw insertErr;
          customerData = inserted;
      }

      if (!customerData) throw new Error("Failed to create customer");

      // 2. Create or Update Vehicle linked to Customer (same manual upsert approach)
      const vehiclePayload: any = {
            user_id: user.id,
            customer_id: customerData.id,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plate: vehicle.plate
      };
      if (resolvedBusinessId) vehiclePayload.business_id = resolvedBusinessId;

      let vehicleData: any = null;
      if (vehicle.id) {
          const { data: updated, error: updateErr } = await supabase
              .from('vehicles')
              .update(vehiclePayload)
              .eq('id', vehicle.id)
              .select()
              .single();
          if (updateErr) throw updateErr;
          vehicleData = updated;
      } else if (vehicle.plate && resolvedBusinessId) {
          const { data: existing } = await supabase
              .from('vehicles')
              .select('*')
              .eq('plate', vehicle.plate)
              .eq('business_id', resolvedBusinessId)
              .maybeSingle();
          
          if (existing) {
              const { data: updated, error: updateErr } = await supabase
                  .from('vehicles')
                  .update(vehiclePayload)
                  .eq('id', existing.id)
                  .select()
                  .single();
              if (updateErr) throw updateErr;
              vehicleData = updated;
          }
      }

      if (!vehicleData) {
          const { data: inserted, error: insertErr } = await supabase
              .from('vehicles')
              .insert([vehiclePayload])
              .select()
              .single();
          if (insertErr) throw insertErr;
          vehicleData = inserted;
      }

      if (!vehicleData) throw new Error("Failed to create vehicle");

      // 3. Create Installment Plan linked to Vehicle
      const planPayload: any = {
            user_id: user.id,
            vehicle_id: vehicleData.id,
            customer_id: customerData.id,
            status: 'ACTIVO',
            // Nuevos campos financieros
            capital_amount: plan.capital_amount,
            interest_rate: plan.interest_rate,
            excluded_days: plan.excluded_days ? plan.excluded_days.join(',') : null,
            
            total_installments: plan.total_installments,
            installment_value: plan.installment_value,
            installments_paid: 0,
            payment_frequency: plan.payment_frequency,
            start_date: plan.start_date,
            down_payment: plan.down_payment || 0
      };
      if (resolvedBusinessId) planPayload.business_id = resolvedBusinessId;

      const { error: planError } = await supabase
        .from('installment_plans')
        .insert([planPayload]);

      if (planError) throw planError;

      return { success: true, customerId: customerData.id, vehicleData };

    } catch (error) {
      console.error("Transaction failed:", error);
      return { success: false, error };
    }
  },

  async getActiveVehicles(businessId?: string) {
    const resolvedBusinessId = businessId || await this.getBusinessId();
    
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        customers ( first_name, last_name ),
        installment_plans ( id, total_installments, installments_paid, installment_value, start_date, payment_frequency, excluded_days, status )
      `);
    
    if (resolvedBusinessId) {
      query = query.eq('business_id', resolvedBusinessId);
    }
      
    const { data, error } = await query;
    if (error) throw error;
    
    // Return only vehicles that are currently active (have customer_id and have an active plan)
    return (data || []).filter((v: any) => {
        if (!v.customer_id) return false;
        const plans = Array.isArray(v.installment_plans) ? v.installment_plans : (v.installment_plans ? [v.installment_plans] : []);
        if (plans.length === 0) return false;
        
        // Sort plans by ID descending to get the latest one
        const sortedPlans = [...plans].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
        return sortedPlans[0].status === 'ACTIVO';
    });
  },

  /**
   * Register a payment. 
   * If canAutoApprove is true, status = APROBADO; otherwise PENDIENTE.
   */
  async registerPayment(planId: number, amount: number, note?: string, canAutoApprove: boolean = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const newSchema = await isNewSchemaAvailable();
    const businessId = newSchema ? await this.getBusinessId() : null;

    // Get display name
    const displayName = user.user_metadata?.first_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
        : user.email || 'Usuario';

    const status = canAutoApprove ? 'APROBADO' : 'PENDIENTE';

    // Build insert payload — only include new columns if migration was applied
    const payload: any = {
        plan_id: planId,
        user_id: user.id,
        amount: amount,
        payment_date: new Date().toISOString(),
        note: note,
    };

    if (newSchema) {
        payload.business_id = businessId;
        payload.status = status;
        payload.created_by_name = displayName;
        payload.approved_by = canAutoApprove ? user.id : null;
        payload.approved_at = canAutoApprove ? new Date().toISOString() : null;
    }

    // 1. Insert payment record
    const { data: insertedPayment, error: paymentError } = await supabase
        .from('payment_records')
        .insert([payload])
        .select()
        .single();

    if (paymentError) throw paymentError;

    // Update installments_paid
    if (!newSchema || canAutoApprove) {
        // Legacy mode: always update; New schema: only if auto-approved
        const newProgress = await this.recalculateInstallmentsPaid(planId);
        return { success: true, newProgress, payment: insertedPayment };
    }

    return { success: true, newProgress: undefined, payment: insertedPayment };
  },

  /**
   * Recalculate installments_paid based on APROBADO payments only
   */
  async recalculateInstallmentsPaid(planId: number): Promise<number> {
    const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .select('installment_value, total_installments, status')
        .eq('id', planId)
        .single();
    
    if (planError) throw planError;
    
    const instValue = Number(plan.installment_value);

    const newSchema = await isNewSchemaAvailable();

    // Only count APROBADO payments if new schema; otherwise count all
    let query = supabase
        .from('payment_records')
        .select('amount, id, note')
        .eq('plan_id', planId);
    
    if (newSchema) {
        query = query.eq('status', 'APROBADO');
    }

    const { data: allPayments, error: historyError } = await query;

    if (historyError) throw historyError;
    
    let totalPaid = 0;
    if (allPayments) {
        // Filter out down payments (notes containing "initial" or "abono inicial")
        // This ensures the progress bar only reflects regular installments
        const regularPayments = allPayments.filter((r: any) => {
             const note = (r.note || '').toLowerCase();
             return !note.includes('inicial');
        });
        totalPaid = regularPayments.reduce((sum, record) => sum + Number(record.amount), 0);
    }
    
    const rawPaid = instValue > 0 ? (totalPaid / instValue) : 0;
    const newInstallmentsPaid = Number(rawPaid.toFixed(2));

    console.log(`Recalculating payment: TotalPaid ${totalPaid}, Value ${instValue}, NewPaid ${newInstallmentsPaid}`);

    const updatePayload: any = { installments_paid: newInstallmentsPaid };

    // Automatically complete plan when paid in full
    if (newInstallmentsPaid >= Number(plan.total_installments)) {
        if (plan.status === 'ACTIVO') {
            updatePayload.status = 'FINALIZADO';
        }
    } else {
        if (plan.status === 'FINALIZADO') {
            updatePayload.status = 'ACTIVO';
        }
    }

    const { error: updateError } = await supabase
        .from('installment_plans')
        .update(updatePayload)
        .eq('id', planId);

    if (updateError) {
        console.error("Failed to update installments_paid:", updateError);
        throw updateError;
    }

    return newInstallmentsPaid;
  },

  /**
   * Approve a pending payment
   */
  async approvePayment(paymentId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { data: payment, error: fetchError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
        .from('payment_records')
        .update({ 
            status: 'APROBADO',
            approved_by: user.id,
            approved_at: new Date().toISOString()
        })
        .eq('id', paymentId);

    if (updateError) throw updateError;

    // Recalculate installments_paid
    const newProgress = await this.recalculateInstallmentsPaid(payment.plan_id);
    
    return { success: true, newProgress };
  },

  /**
   * Deny a pending payment
   */
  async denyPayment(paymentId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { error } = await supabase
        .from('payment_records')
        .update({ 
            status: 'DENEGADO',
            approved_by: user.id,
            approved_at: new Date().toISOString()
        })
        .eq('id', paymentId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Get all pending payments for the business
   */
  async getPendingPayments() {
    const businessId = await this.getBusinessId();
    if (!businessId) return [];

    const { data, error } = await supabase
        .from('payment_records')
        .select(`
            *,
            installment_plans (
                id, vehicle_id, installment_value, total_installments, installments_paid,
                vehicles (
                    plate, model, year,
                    customers ( first_name, last_name )
                )
            )
        `)
        .eq('business_id', businessId)
        .eq('status', 'PENDIENTE')
        .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
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
  },

async getBusinessConfig(businessId?: string) {
    const newSchema = await isNewSchemaAvailable();
    const resolvedBusinessId = businessId || await this.getBusinessId();

    if (newSchema && resolvedBusinessId) {
        const { data: bizData } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', resolvedBusinessId)
            .single();

        if (bizData) {
            return {
                business_name: bizData.name,
                nit: bizData.nit,
                address: bizData.address,
                phone: bizData.phone,
                logo_url: bizData.logo_url,
            };
        }
    }

      const { data, error } = await supabase
          .from('business_config')
          .select('*')
          .single();
      
      if (error && error.code !== 'PGRST116') {
          console.error("Error fetching config:", error);
          throw error;
      }
      return data;
  },

async saveBusinessConfig(config: any, businessId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const newSchema = await isNewSchemaAvailable();

    if (newSchema) {
        const resolvedBusinessId = businessId || await this.getBusinessId();
        if (resolvedBusinessId) {
            const { data, error } = await supabase
                .from('businesses')
                .update({
                    name: config.business_name,
                    nit: config.nit,
                    address: config.address,
                    phone: config.phone,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', resolvedBusinessId)
                  .select()
                  .single();

              if (error) throw error;
              return data;
          }
      }

      const { data, error } = await supabase
          .from('business_config')
          .upsert([{
              user_id: user.id,
              business_name: config.business_name,
              nit: config.nit,
              address: config.address,
              phone: config.phone
          }], { onConflict: 'user_id' })
          .select()
          .single();

      if (error) {
          console.error("Error saving config:", error);
          throw error;
      }
      return data;
  },

  async uploadBusinessLogo(file: File): Promise<string> {
      const newSchema = await isNewSchemaAvailable();
      const businessId = newSchema ? await this.getBusinessId() : null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = businessId 
          ? `${businessId}/logo.${fileExt}` 
          : `legacy/logo.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
          .from('business-logos')
          .upload(fileName, file, { 
              upsert: true,
              contentType: file.type 
          });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
          .from('business-logos')
          .getPublicUrl(fileName);

      // Add timestamp and random string to force cache busting
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}&r=${Math.random().toString(36).substring(7)}`;

      // Save URL to business record
      if (newSchema && businessId) {
          const { error: updateError } = await supabase
              .from('businesses')
              .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
              .eq('id', businessId);
          
          if (updateError) {
             console.error("Error updating business logo_url:", updateError);
             throw updateError;
          }
      }

      return logoUrl;
  },

async getPaymentPlanTemplates(businessId?: string): Promise<PaymentPlanTemplate[]> {
    const resolvedBusinessId = businessId || await this.getBusinessId();

    let query = supabase
        .from('payment_plan_templates')
        .select('*')
        .order('created_at', { ascending: true });

    if (resolvedBusinessId) {
        query = query.eq('business_id', resolvedBusinessId);
    }

      const { data, error } = await query;
      if (error) throw error;
      return data;
  },

  async getCustomers() {
      const businessId = await this.getBusinessId();
      
      let query = supabase
          .from('customers')
          .select('*')
          .order('first_name', { ascending: true });

      if (businessId) {
          query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
  },

  async updateCustomer(id: number, customerData: Partial<Customer>) {
      const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', id)
          .select()
          .single();

      if (error) throw error;
      return data;
  },

  async getVehicles() {
      const businessId = await this.getBusinessId();
      
      let query = supabase
          .from('vehicles')
          .select('*, customers(first_name, last_name, cedula)')
          .order('model', { ascending: true });

      if (businessId) {
          query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
  },

  async updateVehicle(id: number, vehicleData: Partial<Vehicle>) {
      const { data, error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', id)
          .select()
          .single();

      if (error) throw error;
      return data;
  },

  async savePaymentPlanTemplate(template: PaymentPlanTemplate) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const businessId = await this.getBusinessId();

      const payload: any = {
          user_id: user.id,
          name: template.name,
          total_installments: template.total_installments,
          installment_value: template.installment_value,
          payment_frequency: template.payment_frequency,
          down_payment: template.down_payment,
          price: template.price || 0,
          interest_rate: template.interest_rate || 0,
          months: template.months || 0,
          excluded_days: template.excluded_days || []
      };
      if (businessId) payload.business_id = businessId;

      const { data, error } = await supabase
          .from('payment_plan_templates')
          .insert([payload])
          .select()
          .single();

      if (error) throw error;
      return data;
  },

  async deletePaymentPlanTemplate(id: string) {
      const { error } = await supabase
          .from('payment_plan_templates')
          .delete()
          .eq('id', id);
      if (error) throw error;
  },

  async deleteVehicle(id: number) {
      // Delete related payment records first
      const { data: plans } = await supabase
          .from('installment_plans')
          .select('id')
          .eq('vehicle_id', id);

      if (plans && plans.length > 0) {
          const planIds = plans.map(p => p.id);
          await supabase
              .from('payment_records')
              .delete()
              .in('plan_id', planIds);
          await supabase
              .from('installment_plans')
              .delete()
              .in('id', planIds);
      }

      const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', id);
      if (error) throw error;
  },

  async deleteCustomer(id: number) {
      // 1. Get all vehicles for this customer
      const { data: vehicles } = await supabase
          .from('vehicles')
          .select('id')
          .eq('customer_id', id);

      // 2. Delete each vehicle (and its related plans/payments)
      if (vehicles && vehicles.length > 0) {
          for (const vehicle of vehicles) {
              await this.deleteVehicle(vehicle.id);
          }
      }

      // 3. Delete the customer
      const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);
          
      if (error) throw error;
  },

  async getFreeVehicles(businessId?: string) {
      const resolvedBusinessId = businessId || await this.getBusinessId();
      
      let query = supabase
          .from('vehicles')
          .select('*')
          .is('customer_id', null)
          .order('model', { ascending: true });
          
      if (resolvedBusinessId) {
          query = query.eq('business_id', resolvedBusinessId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
  },

  async closeInstallmentPlan(planId: number, vehicleId: number) {
      // 1. Update status of the installment plan to CERRADO
      const { error: planErr } = await supabase
          .from('installment_plans')
          .update({ status: 'CERRADO' })
          .eq('id', planId);
          
      if (planErr) throw planErr;

      // 2. Free up the vehicle by setting customer_id to null
      const { error: vehicleErr } = await supabase
          .from('vehicles')
          .update({ customer_id: null })
          .eq('id', vehicleId);
          
      if (vehicleErr) throw vehicleErr;

      return { success: true };
  },

  async getClosedDeliveries(businessId?: string) {
      const resolvedBusinessId = businessId || await this.getBusinessId();
      
      let query = supabase
          .from('installment_plans')
          .select(`
              *,
              customers ( first_name, last_name, cedula, phone ),
              vehicles ( model, plate, year, color )
          `)
          .in('status', ['FINALIZADO', 'CERRADO'])
          .order('id', { ascending: false });
          
      if (resolvedBusinessId) {
          query = query.eq('business_id', resolvedBusinessId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
  }
};
