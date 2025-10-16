-- Add created_by field to track who created each record

-- Add created_by to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add created_by to machine_expenses table
ALTER TABLE public.machine_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add created_by to machine_payments table
ALTER TABLE public.machine_payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add created_by to machine_counters table
ALTER TABLE public.machine_counters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_expenses_created_by ON public.machine_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_payments_created_by ON public.machine_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_counters_created_by ON public.machine_counters(created_by);
