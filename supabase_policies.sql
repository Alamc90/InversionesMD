-- Enable RLS (just in case, though it seems enabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS POLICIES
-- Allow anonymous users to insert new customers
CREATE POLICY "Allow public insert on customers" 
ON customers 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anonymous users to read customers (optional, if needed for dashboard)
CREATE POLICY "Allow public select on customers" 
ON customers 
FOR SELECT 
TO anon 
USING (true);


-- VEHICLES POLICIES
-- Allow anonymous users to insert new vehicles
CREATE POLICY "Allow public insert on vehicles" 
ON vehicles 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anonymous users to read vehicles
CREATE POLICY "Allow public select on vehicles" 
ON vehicles 
FOR SELECT 
TO anon 
USING (true);


-- INSTALLMENT PLANS POLICIES
-- Allow anonymous users to insert new plans
CREATE POLICY "Allow public insert on installment_plans" 
ON installment_plans 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anonymous users to read plans
CREATE POLICY "Allow public select on installment_plans" 
ON installment_plans 
FOR SELECT 
TO anon 
USING (true);
