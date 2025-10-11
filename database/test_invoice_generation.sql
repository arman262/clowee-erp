-- Test script to verify invoice number generation

-- Test 1: Insert a sale for monthly franchise
INSERT INTO sales (machine_id, sales_date, coin_sales, sales_amount, prize_out_quantity, prize_out_cost)
SELECT 
    m.id as machine_id,
    '2025-01-15'::date as sales_date,
    100 as coin_sales,
    500.00 as sales_amount,
    10 as prize_out_quantity,
    250.00 as prize_out_cost
FROM machines m 
JOIN franchises f ON m.franchise_id = f.id 
WHERE f.payment_duration = 'Monthly'
LIMIT 1;

-- Test 2: Insert a sale for half-monthly franchise (first half)
INSERT INTO sales (machine_id, sales_date, coin_sales, sales_amount, prize_out_quantity, prize_out_cost)
SELECT 
    m.id as machine_id,
    '2025-01-10'::date as sales_date,
    150 as coin_sales,
    750.00 as sales_amount,
    15 as prize_out_quantity,
    375.00 as prize_out_cost
FROM machines m 
JOIN franchises f ON m.franchise_id = f.id 
WHERE f.payment_duration = 'Half Monthly'
LIMIT 1;

-- Test 3: Insert a sale for half-monthly franchise (second half)
INSERT INTO sales (machine_id, sales_date, coin_sales, sales_amount, prize_out_quantity, prize_out_cost)
SELECT 
    m.id as machine_id,
    '2025-01-20'::date as sales_date,
    120 as coin_sales,
    600.00 as sales_amount,
    12 as prize_out_quantity,
    300.00 as prize_out_cost
FROM machines m 
JOIN franchises f ON m.franchise_id = f.id 
WHERE f.payment_duration = 'Half Monthly'
LIMIT 1;

-- Check the generated invoice numbers
SELECT 
    s.id,
    s.invoice_number,
    s.sales_date,
    m.machine_number,
    f.payment_duration
FROM sales s
JOIN machines m ON s.machine_id = m.id
JOIN franchises f ON m.franchise_id = f.id
WHERE s.sales_date >= '2025-01-01'
ORDER BY s.created_at DESC
LIMIT 10;