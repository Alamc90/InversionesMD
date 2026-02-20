-- Enable RLS (just in case, though it seems enabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS POLICIES
DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
CREATE POLICY "Allow public insert on customers" 
ON customers 
FOR INSERT 
TO anon 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on customers" ON customers;
CREATE POLICY "Allow public select on customers" 
ON customers 
FOR SELECT 
TO anon 
USING (true);

DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
CREATE POLICY "Allow public update on customers" 
ON customers 
FOR UPDATE 
TO anon 
USING (true);


-- VEHICLES POLICIES
DROP POLICY IF EXISTS "Allow public insert on vehicles" ON vehicles;
CREATE POLICY "Allow public insert on vehicles" 
ON vehicles 
FOR INSERT 
TO anon 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on vehicles" ON vehicles;
CREATE POLICY "Allow public select on vehicles" 
ON vehicles 
FOR SELECT 
TO anon 
USING (true);


-- INSTALLMENT PLANS POLICIES
DROP POLICY IF EXISTS "Allow public insert on installment_plans" ON installment_plans;
CREATE POLICY "Allow public insert on installment_plans" 
ON installment_plans 
FOR INSERT 
TO anon 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on installment_plans" ON installment_plans;
CREATE POLICY "Allow public select on installment_plans" 
ON installment_plans 
FOR SELECT 
TO anon 
USING (true);

DROP POLICY IF EXISTS "Allow public update on installment_plans" ON installment_plans;
CREATE POLICY "Allow public update on installment_plans" 
ON installment_plans 
FOR UPDATE 
TO anon 
USING (true);


-- PAYMENT RECORDS POLICIES
DROP POLICY IF EXISTS "Allow public insert on payment_records" ON payment_records;
CREATE POLICY "Allow public insert on payment_records" 
ON payment_records 
FOR INSERT 
TO anon 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on payment_records" ON payment_records;
CREATE POLICY "Allow public select on payment_records" 
ON payment_records 
FOR SELECT 
TO anon 
USING (true);
