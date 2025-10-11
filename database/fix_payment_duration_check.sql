-- Fix the payment duration check in invoice generation

DROP FUNCTION IF EXISTS generate_unique_invoice_number(DATE, UUID, UUID);

CREATE OR REPLACE FUNCTION generate_unique_invoice_number(p_sales_date DATE DEFAULT NULL, p_franchise_id UUID DEFAULT NULL, p_machine_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    current_day INTEGER;
    invoice_num TEXT;
    payment_duration TEXT;
    machine_number TEXT;
    clean_machine_number TEXT;
BEGIN
    IF p_sales_date IS NULL THEN
        p_sales_date := CURRENT_DATE;
    END IF;
    
    current_year := EXTRACT(YEAR FROM p_sales_date);
    current_month := EXTRACT(MONTH FROM p_sales_date);
    current_day := EXTRACT(DAY FROM p_sales_date);
    
    -- Get machine number
    IF p_machine_id IS NOT NULL THEN
        SELECT m.machine_number INTO machine_number
        FROM machines m
        WHERE m.id = p_machine_id;
        
        -- Clean machine number: remove 'M' prefix and pad to 2 digits
        clean_machine_number := LPAD(REGEXP_REPLACE(COALESCE(machine_number, '0'), '^M', '', 'i'), 2, '0');
    ELSE
        clean_machine_number := '00';
    END IF;
    
    -- Get franchise payment duration - check both direct franchise_id and via machine
    IF p_franchise_id IS NOT NULL THEN
        SELECT f.payment_duration INTO payment_duration
        FROM franchises f
        WHERE f.id = p_franchise_id;
    ELSIF p_machine_id IS NOT NULL THEN
        SELECT f.payment_duration INTO payment_duration
        FROM franchises f
        JOIN machines m ON m.franchise_id = f.id
        WHERE m.id = p_machine_id;
    END IF;
    
    -- Debug log
    RAISE NOTICE 'Payment Duration: %, Machine: %, Date: %', payment_duration, clean_machine_number, p_sales_date;
    
    -- Generate invoice based on payment duration
    IF payment_duration = 'Half Monthly' THEN
        -- Half monthly: clw/01/2025/01H1 or clw/01/2025/01H2
        IF current_day <= 15 THEN
            invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0') || 'H1';
        ELSE
            invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0') || 'H2';
        END IF;
    ELSE
        -- Monthly: clw/01/2025/01 (month number)
        invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0');
    END IF;
    
    RAISE NOTICE 'Generated Invoice: %', invoice_num;
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;