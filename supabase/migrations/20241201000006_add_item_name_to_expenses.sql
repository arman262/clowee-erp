-- Add item_name column to machine_expenses table
ALTER TABLE machine_expenses 
ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);

-- Create index for item_name
CREATE INDEX IF NOT EXISTS idx_machine_expenses_item_name ON machine_expenses(item_name);