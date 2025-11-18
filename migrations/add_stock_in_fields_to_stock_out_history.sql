-- Add fields for Stock In functionality to stock_out_history table
ALTER TABLE stock_out_history 
ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2);