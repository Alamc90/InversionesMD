-- 1. Add down_payment to installment_plans
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS down_payment NUMERIC DEFAULT 0;

-- 2. Create payment_plan_templates table
CREATE TABLE IF NOT EXISTS payment_plan_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    total_installments INTEGER NOT NULL,
    installment_value NUMERIC NOT NULL,
    payment_frequency TEXT NOT NULL,
    down_payment NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE payment_plan_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can view own plan templates" ON payment_plan_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plan templates" ON payment_plan_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plan templates" ON payment_plan_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plan templates" ON payment_plan_templates FOR DELETE USING (auth.uid() = user_id);
