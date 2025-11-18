-- Add adjustment_type column to stock_out_history table
ALTER TABLE stock_out_history 
ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(50);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_stock_out_history_adjustment_type 
ON stock_out_history(adjustment_type);