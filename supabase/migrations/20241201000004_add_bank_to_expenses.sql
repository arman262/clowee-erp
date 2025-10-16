-- Add bank_id column to machine_expenses table
ALTER TABLE public.machine_expenses 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id);

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_machine_expenses_bank_id ON public.machine_expenses(bank_id);