# Inventory Management Setup Instructions

## Overview
This inventory system automatically tracks stock from expenses and sales:
- **Prize Purchase**: Auto-adds stock when expense is created
- **Sales**: Auto-deducts prize stock when sales are recorded
- **Import/Local Accessories**: Manual entry with category selection

## Setup Steps

### 1. Run the Migration Script
Execute the SQL migration script on your PostgreSQL database:

```bash
psql -U your_username -d your_database -f database/inventory_migration.sql
```

Or using a database client, run the contents of `inventory_migration.sql`

### 2. Verify Tables
Check that the following columns were added to `inventory_items`:
- `item_type` (VARCHAR)
- `source_type` (VARCHAR)
- `source_id` (UUID)
- `expense_id` (UUID)

### 3. Test the Triggers

#### Test Prize Purchase Auto-Add:
1. Go to Expenses page
2. Add a new expense with category "Prize Purchase"
3. Enter quantity and unit price
4. Save the expense
5. Go to Inventory page
6. You should see "Prize/Doll" item with the quantity added automatically

#### Test Sales Auto-Deduct:
1. Go to Sales page
2. Create a new sale with "Prize Out" quantity
3. Save the sale
4. Go to Inventory page
5. The "Prize/Doll" quantity should be reduced automatically

#### Test Accessories Manual Entry:
1. Go to Inventory page
2. Click "Add Item"
3. Select "Accessory (Import/Local)" as Item Type
4. Choose either "Import Accessories" or "Local Accessories"
5. Fill in item name, quantity, unit price, etc.
6. Save the item

## How It Works

### Automatic Stock Tracking

**Prize Purchase Flow:**
```
Expense Created (Prize Purchase) 
  → Trigger: auto_add_prize_stock()
  → Inventory Item Created/Updated
  → Inventory Log Created
```

**Sales Flow:**
```
Sales Created (with Prize Out)
  → Trigger: auto_deduct_prize_stock()
  → Inventory Item Updated (quantity reduced)
  → Inventory Log Created
```

### Manual Entry
- Import Accessories: Manually add items with category "Import Accessories"
- Local Accessories: Manually add items with category "Local Accessories"
- Regular Items: Any other manual inventory items

## Database Schema

### inventory_items
- `item_type`: 'prize' | 'accessory' | 'manual'
- `source_type`: 'expense' | 'sales' | 'manual'
- `expense_id`: Reference to machine_expenses.id (if auto-created)

### Triggers
1. `trigger_auto_add_prize_stock`: Fires on INSERT to machine_expenses
2. `trigger_auto_deduct_prize_stock`: Fires on INSERT to sales

## Troubleshooting

### Stock not updating automatically?
1. Check if triggers are enabled:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%prize_stock%';
```

2. Check inventory_logs for error messages:
```sql
SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 10;
```

### Negative stock?
The system prevents negative stock. If sales exceed available stock, the deduction won't happen. Check inventory_logs for details.

## Notes
- Prize items are automatically created with item_type='prize'
- Accessories must be manually entered through the UI
- All stock changes are logged in inventory_logs table
- The system uses the latest unit_price from expenses for prize items
