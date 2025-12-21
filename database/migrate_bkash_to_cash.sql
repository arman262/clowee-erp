-- Migrate all Bkash(Personal) bank data to Cash bank in machine_expenses table
-- This script updates all machine_expenses records that use Bkash(Personal) to use Cash instead

-- First, let's see what we're about to change
SELECT 
    me.id,
    me.expense_date,
    me.expense_details,
    me.total_amount,
    b.bank_name as current_bank
FROM machine_expenses me 
JOIN banks b ON me.bank_id = b.id 
WHERE b.bank_name = 'Bkash(Personal)';

-- Update all machine_expenses from Bkash(Personal) to Cash
UPDATE machine_expenses 
SET bank_id = (SELECT id FROM banks WHERE bank_name = 'Cash')
WHERE bank_id = (SELECT id FROM banks WHERE bank_name = 'Bkash(Personal)');

-- Verify the migration
SELECT 
    COUNT(*) as updated_records
FROM machine_expenses me 
JOIN banks b ON me.bank_id = b.id 
WHERE b.bank_name = 'Cash';

-- Check that no records remain with Bkash(Personal)
SELECT 
    COUNT(*) as remaining_bkash_records
FROM machine_expenses me 
JOIN banks b ON me.bank_id = b.id 
WHERE b.bank_name = 'Bkash(Personal)';

-- Optional: Deactivate Bkash(Personal) bank account
-- UPDATE banks SET is_active = false WHERE bank_name = 'Bkash(Personal)';