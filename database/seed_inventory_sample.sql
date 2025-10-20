-- Sample inventory items
INSERT INTO inventory_items (item_name, category, quantity, unit, purchase_price, selling_price, supplier, low_stock_threshold, remarks)
VALUES 
  ('Coin Token - Gold', 'Tokens', 500, 'pcs', 2.50, 5.00, 'Token Supplier Ltd', 100, 'Standard gold tokens for machines'),
  ('Prize Doll - Small', 'Prizes', 45, 'pcs', 150.00, 300.00, 'Toy World', 20, 'Small size plush dolls'),
  ('Prize Doll - Medium', 'Prizes', 25, 'pcs', 250.00, 500.00, 'Toy World', 15, 'Medium size plush dolls'),
  ('Prize Doll - Large', 'Prizes', 8, 'pcs', 400.00, 800.00, 'Toy World', 5, 'Large premium dolls'),
  ('Machine Cleaning Kit', 'Maintenance', 12, 'box', 500.00, 0, 'Clean Pro', 5, 'Complete cleaning supplies'),
  ('LED Light Strip', 'Parts', 30, 'pcs', 350.00, 0, 'Electronics Hub', 10, 'RGB LED strips for machines'),
  ('Coin Mechanism', 'Parts', 6, 'pcs', 2500.00, 0, 'Machine Parts Co', 3, 'Replacement coin acceptors'),
  ('Claw Gripper', 'Parts', 15, 'pcs', 800.00, 0, 'Machine Parts Co', 5, 'Standard claw grippers'),
  ('Power Supply Unit', 'Parts', 4, 'pcs', 3500.00, 0, 'Electronics Hub', 2, '12V power supply units'),
  ('Prize Box - Cardboard', 'Packaging', 200, 'pcs', 15.00, 0, 'Pack Solutions', 50, 'Standard prize packaging boxes')
ON CONFLICT DO NOTHING;

-- Sample inventory logs
INSERT INTO inventory_logs (item_id, type, quantity, remaining_stock, handled_by, remarks)
SELECT 
  id,
  'add',
  100,
  quantity,
  'System Admin',
  'Initial stock entry'
FROM inventory_items
LIMIT 3
ON CONFLICT DO NOTHING;
