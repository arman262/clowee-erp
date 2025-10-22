-- Add electricity_cost column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS electricity_cost DECIMAL(10,2) DEFAULT 0;
