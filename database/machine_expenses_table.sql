-- Create machine_expenses table
CREATE TABLE IF NOT EXISTS public.machine_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID REFERENCES public.machines(id),
    expense_date DATE NOT NULL,
    expense_details TEXT NOT NULL,
    unique_id VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    item_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_machine_expenses_machine_id ON public.machine_expenses(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_expenses_date ON public.machine_expenses(expense_date);

-- Enable RLS
ALTER TABLE public.machine_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all for authenticated users" ON public.machine_expenses FOR ALL USING (true);