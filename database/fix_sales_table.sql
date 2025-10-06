-- Fix sales table by adding missing columns
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Due';

-- Create index for invoice number
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);