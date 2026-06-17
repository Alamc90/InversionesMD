-- 1. Add customer_id and status to installment_plans
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVO' CONSTRAINT check_plan_status CHECK (status IN ('ACTIVO', 'FINALIZADO', 'CERRADO'));

-- 2. Migrate existing records: copy customer_id from vehicles
UPDATE installment_plans ip
SET customer_id = v.customer_id
FROM vehicles v
WHERE ip.vehicle_id = v.id AND ip.customer_id IS NULL;

-- 3. Migrate existing records: set status to 'FINALIZADO' if installments are paid in full
UPDATE installment_plans
SET status = 'FINALIZADO'
WHERE installments_paid >= total_installments AND status = 'ACTIVO';
