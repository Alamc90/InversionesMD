-- Añadir nuevos campos financieros a las plantillas de planes
ALTER TABLE payment_plan_templates 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS months NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS excluded_days TEXT[] DEFAULT '{}';
