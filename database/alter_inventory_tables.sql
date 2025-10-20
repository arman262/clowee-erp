-- Alter inventory_items table to match our requirements
ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_of_entry DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records
UPDATE inventory_items SET 
  purchase_price = COALESCE(unit_cost, 0),
  updated_at = CURRENT_TIMESTAMP
WHERE purchase_price IS NULL;
