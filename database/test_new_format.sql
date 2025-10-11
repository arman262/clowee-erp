-- Test the new invoice generation function directly

-- Test with a machine and monthly franchise
SELECT generate_unique_invoice_number(
    '2025-01-15'::date,
    (SELECT f.id FROM franchises f WHERE f.payment_duration = 'Monthly' LIMIT 1),
    (SELECT m.id FROM machines m LIMIT 1)
) AS monthly_invoice;

-- Test with a machine and half-monthly franchise (first half)
SELECT generate_unique_invoice_number(
    '2025-01-10'::date,
    (SELECT f.id FROM franchises f WHERE f.payment_duration = 'Half Monthly' LIMIT 1),
    (SELECT m.id FROM machines m LIMIT 1)
) AS half_monthly_h1;

-- Test with a machine and half-monthly franchise (second half)
SELECT generate_unique_invoice_number(
    '2025-01-20'::date,
    (SELECT f.id FROM franchises f WHERE f.payment_duration = 'Half Monthly' LIMIT 1),
    (SELECT m.id FROM machines m LIMIT 1)
) AS half_monthly_h2;

-- Check current machine numbers to see the format
SELECT machine_number, machine_name FROM machines LIMIT 5;