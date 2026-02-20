-- GRANT ACCESS TO AUTHENTICATED USERS (Logged in)
-- Currently only 'anon' has access. modifying to 'public' or adding 'authenticated' is needed.

-- CUSTOMERS
CREATE POLICY "Allow authenticated insert on customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on customers" ON customers FOR UPDATE TO authenticated USING (true);

-- VEHICLES
CREATE POLICY "Allow authenticated insert on vehicles" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on vehicles" ON vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on vehicles" ON vehicles FOR UPDATE TO authenticated USING (true);

-- PLANS
CREATE POLICY "Allow authenticated insert on installment_plans" ON installment_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on installment_plans" ON installment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on installment_plans" ON installment_plans FOR UPDATE TO authenticated USING (true);

-- PAYMENTS
CREATE POLICY "Allow authenticated insert on payment_records" ON payment_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on payment_records" ON payment_records FOR SELECT TO authenticated USING (true);
