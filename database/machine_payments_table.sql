-- Create machine_payments table
CREATE TABLE IF NOT EXISTS public.machine_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID REFERENCES public.machines(id),
    bank_id UUID REFERENCES public.banks(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_machine_payments_machine_id ON public.machine_payments(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_payments_bank_id ON public.machine_payments(bank_id);
CREATE INDEX IF NOT EXISTS idx_machine_payments_date ON public.machine_payments(payment_date);

-- Enable RLS
ALTER TABLE public.machine_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all for authenticated users" ON public.machine_payments FOR ALL USING (true);