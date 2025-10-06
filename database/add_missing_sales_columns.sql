-- Add missing columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Due';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coin_adjustment INTEGER DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS prize_adjustment INTEGER DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS adjustment_notes TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS net_sales_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS clowee_profit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pay_to_clowee DECIMAL(10,2) DEFAULT 0;

-- Add invoice_id to machine_payments table
ALTER TABLE public.machine_payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.sales(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_machine_payments_invoice_id ON public.machine_payments(invoice_id);