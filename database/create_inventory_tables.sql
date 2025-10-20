-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'pcs',
  purchase_price DECIMAL(10, 2) DEFAULT 0,
  selling_price DECIMAL(10, 2) DEFAULT 0,
  supplier VARCHAR(255),
  date_of_entry DATE DEFAULT CURRENT_DATE,
  remarks TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory_logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('add', 'deduct')),
  quantity INTEGER NOT NULL,
  remaining_stock INTEGER NOT NULL,
  handled_by VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity ON inventory_items(quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE inventory_items IS 'Stores all inventory items with stock levels and pricing';
COMMENT ON TABLE inventory_logs IS 'Tracks all stock adjustments (add/deduct) with audit trail';
