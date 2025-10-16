-- Add amount_adjustment column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS amount_adjustment DECIMAL(10, 2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN sales.amount_adjustment IS 'Small amount adjustment to handle payment differences (e.g., client pays 12400 instead of 12404)';
