-- Debug script to check franchise payment durations and invoice generation

-- Check franchise payment durations
SELECT 
    f.id,
    f.name,
    f.payment_duration,
    m.machine_number,
    m.id as machine_id
FROM franchises f
LEFT JOIN machines m ON m.franchise_id = f.id
ORDER BY f.name;

-- Test the function with different scenarios
SELECT 
    'Monthly Test' as test_type,
    generate_unique_invoice_number(
        '2025-01-15'::date,
        f.id,
        m.id
    ) as generated_invoice
FROM franchises f
JOIN machines m ON m.franchise_id = f.id
WHERE f.payment_duration = 'Monthly'
LIMIT 1;

SELECT 
    'Half Monthly H1 Test' as test_type,
    generate_unique_invoice_number(
        '2025-01-10'::date,
        f.id,
        m.id
    ) as generated_invoice
FROM franchises f
JOIN machines m ON m.franchise_id = f.id
WHERE f.payment_duration = 'Half Monthly'
LIMIT 1;

SELECT 
    'Half Monthly H2 Test' as test_type,
    generate_unique_invoice_number(
        '2025-01-20'::date,
        f.id,
        m.id
    ) as generated_invoice
FROM franchises f
JOIN machines m ON m.franchise_id = f.id
WHERE f.payment_duration = 'Half Monthly'
LIMIT 1;