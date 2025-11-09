-- Inventory Management Migration Script
-- Run this script on your PostgreSQL database

-- 1. Add item_type and source_type columns to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id UUID,
ADD COLUMN IF NOT EXISTS expense_id UUID;

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON inventory_items(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_source ON inventory_items(source_type, source_id);

-- 3. Function to auto-add stock from Prize Purchase expenses
CREATE OR REPLACE FUNCTION auto_add_prize_stock()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
  prize_item_name TEXT;
  existing_item_id UUID;
BEGIN
  -- Get category name
  SELECT ec.category_name INTO category_name
  FROM expense_categories ec
  WHERE ec.id = NEW.category_id;

  -- Only process Prize Purchase
  IF category_name = 'Prize Purchase' THEN
    prize_item_name := 'Prize/Doll';
    
    -- Check if item exists
    SELECT ii.id INTO existing_item_id
    FROM inventory_items ii
    WHERE ii.item_name = prize_item_name AND ii.item_type = 'prize'
    LIMIT 1;

    IF existing_item_id IS NULL THEN
      -- Create new item
      INSERT INTO inventory_items (
        item_name, category, quantity, unit, purchase_price, 
        item_type, source_type, expense_id, date_of_entry
      ) VALUES (
        prize_item_name, 'Prize Purchase', NEW.quantity, 'pcs', 
        NEW.item_price, 'prize', 'expense', NEW.id, NEW.expense_date
      )
      RETURNING id INTO existing_item_id;
    ELSE
      -- Update existing item
      UPDATE inventory_items ii
      SET quantity = ii.quantity + NEW.quantity,
          purchase_price = NEW.item_price,
          updated_at = NOW()
      WHERE ii.id = existing_item_id;
    END IF;

    -- Log the transaction
    INSERT INTO inventory_logs (
      item_id, type, quantity, 
      remaining_stock, handled_by, remarks
    )
    SELECT 
      existing_item_id, 'add', NEW.quantity,
      (SELECT ii.quantity FROM inventory_items ii WHERE ii.id = existing_item_id),
      'System (Auto from Expense)', 
      'Auto-added from expense #' || NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for Prize Purchase
DROP TRIGGER IF EXISTS trigger_auto_add_prize_stock ON machine_expenses;
CREATE TRIGGER trigger_auto_add_prize_stock
AFTER INSERT ON machine_expenses
FOR EACH ROW
EXECUTE FUNCTION auto_add_prize_stock();

-- 5. Function to auto-deduct stock from sales
CREATE OR REPLACE FUNCTION auto_deduct_prize_stock()
RETURNS TRIGGER AS $$
DECLARE
  item_id UUID;
  current_stock INTEGER;
BEGIN
  -- Find prize item
  SELECT id, quantity INTO item_id, current_stock
  FROM inventory_items
  WHERE item_type = 'prize'
  LIMIT 1;

  IF item_id IS NOT NULL AND NEW.prize_out_quantity > 0 THEN
    -- Check if enough stock
    IF current_stock >= NEW.prize_out_quantity THEN
      -- Deduct stock
      UPDATE inventory_items
      SET quantity = quantity - NEW.prize_out_quantity,
          updated_at = NOW()
      WHERE id = item_id;

      -- Log the transaction
      INSERT INTO inventory_logs (
        item_id, type, quantity,
        remaining_stock, handled_by, remarks
      )
      VALUES (
        item_id, 'deduct', NEW.prize_out_quantity,
        current_stock - NEW.prize_out_quantity,
        'System (Auto from Sales)',
        'Auto-deducted from sales #' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for sales
DROP TRIGGER IF EXISTS trigger_auto_deduct_prize_stock ON sales;
CREATE TRIGGER trigger_auto_deduct_prize_stock
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION auto_deduct_prize_stock();

-- 7. Function to handle accessories from expenses
CREATE OR REPLACE FUNCTION auto_add_accessory_stock()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
BEGIN
  -- Get category name
  SELECT ec.category_name INTO category_name
  FROM expense_categories ec
  WHERE ec.id = NEW.category_id;

  -- Process Import/Local Accessories
  IF category_name IN ('Import Accessories', 'Local Accessories') THEN
    -- This will be handled manually from frontend
    -- Just ensure the expense is recorded
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add comment for documentation
COMMENT ON COLUMN inventory_items.item_type IS 'Type: prize, accessory, manual';
COMMENT ON COLUMN inventory_items.source_type IS 'Source: expense, sales, manual';
COMMENT ON COLUMN inventory_items.expense_id IS 'Reference to machine_expenses.id if auto-created';

-- 9. Create view for inventory summary
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
  ii.id,
  ii.item_name,
  ii.category,
  ii.item_type,
  ii.quantity,
  ii.unit,
  ii.purchase_price,
  ii.selling_price,
  ii.quantity * COALESCE(ii.purchase_price, 0) as stock_value,
  CASE 
    WHEN ii.quantity = 0 THEN 'Out of Stock'
    WHEN ii.quantity <= COALESCE(ii.low_stock_threshold, 10) THEN 'Low Stock'
    ELSE 'In Stock'
  END as status,
  ii.created_at,
  ii.updated_at
FROM inventory_items ii;

COMMENT ON VIEW inventory_summary IS 'Summary view of inventory with calculated fields';
