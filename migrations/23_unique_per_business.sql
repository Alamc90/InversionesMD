-- Migration: Make cedula and plate unique per business instead of globally.
-- This allows different businesses to independently manage clients/vehicles
-- with the same government ID (cedula) or license plate.

-- 1. Drop the global unique constraints
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_cedula_key;
DROP INDEX IF EXISTS customers_cedula_key;

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_plate_key;
DROP INDEX IF EXISTS vehicles_plate_key;

-- 2. Create composite unique indexes (per business)
CREATE UNIQUE INDEX IF NOT EXISTS customers_cedula_business_unique 
    ON customers (cedula, business_id) WHERE cedula IS NOT NULL AND business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_business_unique 
    ON vehicles (plate, business_id) WHERE plate IS NOT NULL AND business_id IS NOT NULL;
