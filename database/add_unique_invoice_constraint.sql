-- Add unique constraint to invoice_number to prevent duplicates
ALTER TABLE public.sales ADD CONSTRAINT unique_invoice_number UNIQUE (invoice_number);