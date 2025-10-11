-- Create function to generate sequential invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    invoice_num TEXT;
BEGIN
    -- Get the next sequence number for the year
    SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '/', 3) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM sales 
    WHERE invoice_number LIKE 'clw/' || p_year || '/%';
    
    -- Format the invoice number
    invoice_num := 'clw/' || p_year || '/' || LPAD(next_seq::TEXT, 3, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;