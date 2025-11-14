-- Add adjustment_type column to stock_out_history table
ALTER TABLE stock_out_history ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(50);

-- Make item_id nullable for doll adjustments
ALTER TABLE stock_out_history ALTER COLUMN item_id DROP NOT NULL;
