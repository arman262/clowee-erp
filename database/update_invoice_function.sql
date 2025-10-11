-- Drop and recreate the invoice generation function with correct format
DROP FUNCTION IF EXISTS generate_unique_invoice_number(DATE, UUID, UUID);
DROP FUNCTION IF EXISTS auto_generate_invoice_number();

-- Create the updated function
CREATE OR REPLACE FUNCTION generate_unique_invoice_number(p_sales_date DATE DEFAULT NULL, p_franchise_id UUID DEFAULT NULL, p_machine_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    current_day INTEGER;
    invoice_num TEXT;
    payment_duration TEXT;
    period_suffix TEXT;
    machine_number TEXT;
    clean_machine_number TEXT;
BEGIN
    IF p_sales_date IS NULL THEN
        p_sales_date := CURRENT_DATE;
    END IF;
    
    current_year := EXTRACT(YEAR FROM p_sales_date);
    current_month := EXTRACT(MONTH FROM p_sales_date);
    current_day := EXTRACT(DAY FROM p_sales_date);
    
    IF p_machine_id IS NOT NULL THEN
        SELECT m.machine_number INTO machine_number
        FROM machines m
        WHERE m.id = p_machine_id;
        
        clean_machine_number := LPAD(REGEXP_REPLACE(COALESCE(machine_number, '0'), '^M', '', 'i'), 2, '0');
    ELSE
        clean_machine_number := '00';
    END IF;
    
    IF p_franchise_id IS NOT NULL THEN
        SELECT f.payment_duration INTO payment_duration
        FROM franchises f
        WHERE f.id = p_franchise_id;
    END IF;
    
    IF payment_duration = 'Half Monthly' THEN
        IF current_day <= 15 THEN
            period_suffix := 'H1';
        ELSE
            period_suffix := 'H2';
        END IF;
        
        invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0') || period_suffix;
    ELSE
        invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0');
    END IF;
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create the updated trigger function
CREATE OR REPLACE FUNCTION auto_generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    franchise_id_val UUID;
    generated_invoice TEXT;
    invoice_exists BOOLEAN;
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        IF NEW.franchise_id IS NOT NULL THEN
            franchise_id_val := NEW.franchise_id;
        ELSIF NEW.machine_id IS NOT NULL THEN
            SELECT m.franchise_id INTO franchise_id_val
            FROM machines m
            WHERE m.id = NEW.machine_id;
        END IF;
        
        generated_invoice := generate_unique_invoice_number(NEW.sales_date, franchise_id_val, NEW.machine_id);
        
        SELECT EXISTS(
            SELECT 1 FROM sales 
            WHERE invoice_number = generated_invoice 
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) INTO invoice_exists;
        
        IF invoice_exists THEN
            RAISE EXCEPTION 'Invoice number % already exists for this period', generated_invoice;
        END IF;
        
        NEW.invoice_number := generated_invoice;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_invoice_number ON public.sales;
CREATE TRIGGER trigger_auto_invoice_number
    BEFORE INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_invoice_number();