-- Migration: Add unique constraint and auto-increment for invoice_number in sales table

-- First, ensure the invoice_number column exists
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Add unique constraint to invoice_number
ALTER TABLE public.sales ADD CONSTRAINT unique_invoice_number UNIQUE (invoice_number);

-- Create or replace function to generate unique sequential invoice numbers
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
    -- Use provided date or current date
    IF p_sales_date IS NULL THEN
        p_sales_date := CURRENT_DATE;
    END IF;
    
    current_year := EXTRACT(YEAR FROM p_sales_date);
    current_month := EXTRACT(MONTH FROM p_sales_date);
    current_day := EXTRACT(DAY FROM p_sales_date);
    
    -- Get machine number if machine_id provided
    IF p_machine_id IS NOT NULL THEN
        SELECT m.machine_number INTO machine_number
        FROM machines m
        WHERE m.id = p_machine_id;
        
        -- Remove 'M' prefix if exists and pad to 2 digits
        clean_machine_number := LPAD(REGEXP_REPLACE(COALESCE(machine_number, '0'), '^M', '', 'i'), 2, '0');
    ELSE
        clean_machine_number := '00';
    END IF;
    
    -- Get franchise payment duration if franchise_id provided
    IF p_franchise_id IS NOT NULL THEN
        SELECT f.payment_duration INTO payment_duration
        FROM franchises f
        WHERE f.id = p_franchise_id;
    END IF;
    
    -- Generate invoice number based on payment duration
    IF payment_duration = 'Half Monthly' THEN
        -- First half: 1-15, Second half: 16-end of month
        IF current_day <= 15 THEN
            period_suffix := 'H1'; -- First half
        ELSE
            period_suffix := 'H2'; -- Second half
        END IF;
        
        -- Format: clw/XX/YYYY/MMHX (e.g., clw/01/2025/01H1)
        invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0') || period_suffix;
    ELSE
        -- Monthly format: clw/XX/YYYY/MM (e.g., clw/01/2025/01)
        invoice_num := 'clw/' || clean_machine_number || '/' || current_year || '/' || LPAD(current_month::TEXT, 2, '0');
    END IF;
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate invoice number on insert
CREATE OR REPLACE FUNCTION auto_generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    franchise_id_val UUID;
    generated_invoice TEXT;
    invoice_exists BOOLEAN;
BEGIN
    -- Only generate if invoice_number is not provided
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        -- Get franchise_id from machine if not directly available
        IF NEW.franchise_id IS NOT NULL THEN
            franchise_id_val := NEW.franchise_id;
        ELSIF NEW.machine_id IS NOT NULL THEN
            SELECT m.franchise_id INTO franchise_id_val
            FROM machines m
            WHERE m.id = NEW.machine_id;
        END IF;
        
        -- Generate invoice number
        generated_invoice := generate_unique_invoice_number(NEW.sales_date, franchise_id_val, NEW.machine_id);
        
        -- Check if invoice already exists
        SELECT EXISTS(
            SELECT 1 FROM sales 
            WHERE invoice_number = generated_invoice 
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) INTO invoice_exists;
        
        -- If invoice exists, raise an error
        IF invoice_exists THEN
            RAISE EXCEPTION 'Invoice number % already exists for this period', generated_invoice;
        END IF;
        
        NEW.invoice_number := generated_invoice;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate invoice number before insert
DROP TRIGGER IF EXISTS trigger_auto_invoice_number ON public.sales;
CREATE TRIGGER trigger_auto_invoice_number
    BEFORE INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_invoice_number();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);