-- Complete migration of all Bkash(Personal) data to Cash bank
-- This includes machine_expenses, machine_payments, and bank_money_logs

-- Get bank IDs
SELECT 
    id as bank_id, 
    bank_name 
FROM banks 
WHERE bank_name IN ('Bkash(Personal)', 'Cash');

-- 1. Migrate machine_payments from Bkash(Personal) to Cash
UPDATE machine_payments 
SET bank_id = (SELECT id FROM banks WHERE bank_name = 'Cash')
WHERE bank_id = (SELECT id FROM banks WHERE bank_name = 'Bkash(Personal)');

-- 2. Migrate bank_money_logs from Bkash(Personal) to Cash
UPDATE bank_money_logs 
SET bank_id = (SELECT id FROM banks WHERE bank_name = 'Cash')
WHERE bank_id = (SELECT id FROM banks WHERE bank_name = 'Bkash(Personal)');

-- 3. Verify migration results
SELECT 
    'Payments' as transaction_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM machine_payments mp
JOIN banks b ON mp.bank_id = b.id
WHERE b.bank_name = 'Bkash(Personal)'

UNION ALL

SELECT 
    'Money Logs' as transaction_type,
    COUNT(*) as count,
    SUM(CASE WHEN action_type = 'add' THEN amount ELSE -amount END) as total_amount
FROM bank_money_logs bml
JOIN banks b ON bml.bank_id = b.id
WHERE b.bank_name = 'Bkash(Personal)'

UNION ALL

SELECT 
    'Expenses' as transaction_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM machine_expenses me
JOIN banks b ON me.bank_id = b.id
WHERE b.bank_name = 'Bkash(Personal)';

-- Check Cash bank totals after migration
SELECT 
    'Cash - Payments' as transaction_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM machine_payments mp
JOIN banks b ON mp.bank_id = b.id
WHERE b.bank_name = 'Cash'

UNION ALL

SELECT 
    'Cash - Money Logs' as transaction_type,
    COUNT(*) as count,
    SUM(CASE WHEN action_type = 'add' THEN amount ELSE -amount END) as total_amount
FROM bank_money_logs bml
JOIN banks b ON bml.bank_id = b.id
WHERE b.bank_name = 'Cash'

UNION ALL

SELECT 
    'Cash - Expenses' as transaction_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM machine_expenses me
JOIN banks b ON me.bank_id = b.id
WHERE b.bank_name = 'Cash';