# Inventory Management System

## Overview
Complete inventory control system for managing stock, tracking items, and monitoring inventory levels with full audit trail.

## Features Implemented

### 1. Dashboard Summary Cards
- **Total Items**: Count of all inventory items
- **In Stock**: Items above low stock threshold
- **Low Stock**: Items at or below threshold (with alert indicator)
- **Total Categories**: Unique categories count
- **Total Stock Value**: Sum of (quantity × purchase_price) for all items

### 2. Inventory Table
Displays all items with:
- Item Name
- Category
- Quantity in Stock
- Unit (pcs, box, kg, ltr, pack)
- Purchase Price
- Selling Price
- Supplier Name
- Last Updated timestamp
- Status Badge (In Stock / Low Stock / Out of Stock)
- Actions (View | Edit | Adjust Stock | Delete)

### 3. Add/Edit Item Modal
Fields:
- Item Name (required)
- Category
- Quantity (required)
- Unit Type (dropdown: pcs, box, kg, ltr, pack)
- Purchase Price
- Selling Price
- Supplier
- Date of Entry
- Low Stock Threshold (default: 10)
- Remarks (optional)

### 4. Stock Adjustment Modal
- Select Type: Add or Deduct
- Shows current stock level
- Enter quantity to adjust
- Add remarks for audit trail
- Automatically logs adjustment with user info

### 5. View Item Modal
Complete item details including:
- All item information
- Current stock value calculation
- Full history and remarks

### 6. Inventory Logs Section
Audit trail table showing:
- Date & Time
- Item Name
- Type (Add/Deduct badge)
- Quantity Changed
- Remaining Stock after adjustment
- Handled By (user name)
- Remarks
- Delete action

### 7. Filters & Search
- Search by: Item Name, Category, Supplier
- Filter by Category (dropdown)
- Filter by Status (All / In Stock / Low Stock / Out of Stock)

### 8. Export Options
- **Excel Export**: Full data with all columns
- **PDF Export**: Formatted report with summary

### 9. Automation
- Auto-calculates stock value
- Auto-marks "Low Stock" when quantity ≤ threshold
- Auto-marks "Out of Stock" when quantity = 0
- Color-coded status badges (Green/Yellow/Red)
- Timestamps for created_at and updated_at

### 10. Pagination
- Configurable rows per page (10, 25, 50, 100)
- Page navigation
- Shows total records

## Database Schema

### inventory_items
```sql
- id (UUID, Primary Key)
- item_name (VARCHAR, required)
- category (VARCHAR)
- quantity (INTEGER, default: 0)
- unit (VARCHAR, default: 'pcs')
- purchase_price (DECIMAL)
- selling_price (DECIMAL)
- supplier (VARCHAR)
- date_of_entry (DATE)
- remarks (TEXT)
- low_stock_threshold (INTEGER, default: 10)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### inventory_logs
```sql
- id (UUID, Primary Key)
- item_id (UUID, Foreign Key → inventory_items)
- type (VARCHAR: 'add' or 'deduct')
- quantity (INTEGER)
- remaining_stock (INTEGER)
- handled_by (VARCHAR)
- remarks (TEXT)
- created_at (TIMESTAMP)
```

## API Hooks

### useInventoryItems()
Fetches all inventory items ordered by created_at DESC

### useInventoryLogs()
Fetches all logs with item and user details

### useCreateInventoryItem()
Creates new inventory item

### useUpdateInventoryItem()
Updates existing item (auto-updates updated_at)

### useDeleteInventoryItem()
Deletes item (cascades to logs)

### useStockAdjustment()
Adjusts stock (add/deduct) and creates log entry

### useDeleteInventoryLog()
Deletes a log entry

## Usage

1. **Add New Item**: Click "Add Item" button, fill form, submit
2. **Edit Item**: Click Edit icon, modify fields, update
3. **Adjust Stock**: Click Adjust icon, select add/deduct, enter quantity
4. **View Details**: Click View icon for complete item information
5. **Delete Item**: Click Delete icon (requires confirmation)
6. **Search**: Type in search box to filter by name/category/supplier
7. **Filter**: Use dropdowns to filter by category or status
8. **Export**: Click Excel or PDF button to download reports

## Integration Points

Ready for integration with:
- **Sales Module**: Deduct stock on sales
- **Purchase Module**: Add stock on purchases
- **Payment Module**: Track payment for inventory purchases
- **Analytics**: Stock aging, reorder suggestions, supplier performance

## Security

- All mutations require authentication
- User tracking on stock adjustments
- Audit trail for all changes
- Soft delete option available (can be implemented)

## Future Enhancements

- Barcode/QR code scanning
- Stock alerts via notifications
- Automatic reorder suggestions
- Supplier performance analytics
- Stock aging reports
- Multi-location inventory
- Batch/lot tracking
- Expiry date management
