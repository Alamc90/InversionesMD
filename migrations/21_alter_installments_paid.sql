-- Migration to allow decimal values for installments_paid
ALTER TABLE installment_plans ALTER COLUMN installments_paid TYPE numeric(10, 2);
