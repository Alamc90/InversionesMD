-- Add financial columns to installment_plans
ALTER TABLE installment_plans 
ADD COLUMN IF NOT EXISTS capital_amount DECIMAL(12,2) DEFAULT 0, -- Monto financiado (Precio - Inicial)
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 0,   -- Tasa de interés mensual
ADD COLUMN IF NOT EXISTS excluded_days TEXT DEFAULT NULL;        -- Días excluidos (ej: 'Domingo')

-- Initialize capital_amount for existing records (approximate)
-- We assume for old records that the capital was the total amount, as we don't have separate history
UPDATE installment_plans 
SET capital_amount = (total_installments * installment_value) 
WHERE capital_amount = 0 OR capital_amount IS NULL;
