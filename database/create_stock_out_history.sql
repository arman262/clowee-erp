-- Create stock_out_history table
CREATE TABLE IF NOT EXISTS stock_out_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  out_date DATE NOT NULL,
  machine_id UUID REFERENCES machines(id),
  item_id UUID REFERENCES machine_expenses(id) NOT NULL,
  quantity INTEGER NOT NULL,
  remarks TEXT,
  handled_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_out_item_id ON stock_out_history(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_machine_id ON stock_out_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_date ON stock_out_history(out_date);

-- Drop product_use table if exists
DROP TABLE IF EXISTS product_use CASCADE;
