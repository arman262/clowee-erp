-- Complete Accounting Module Migration
-- Run this in Supabase SQL Editor

-- 1. Create banks table
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    account_holder_name VARCHAR(255),
    branch_name VARCHAR(255),
    routing_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create machine_expenses table
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

-- 3. Create machine_payments table
CREATE TABLE IF NOT EXISTS public.machine_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID REFERENCES public.machines(id),
    bank_id UUID REFERENCES public.banks(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banks_name ON public.banks(bank_name);
CREATE INDEX IF NOT EXISTS idx_banks_active ON public.banks(is_active);

CREATE INDEX IF NOT EXISTS idx_machine_expenses_machine_id ON public.machine_expenses(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_expenses_date ON public.machine_expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_machine_payments_machine_id ON public.machine_payments(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_payments_bank_id ON public.machine_payments(bank_id);
CREATE INDEX IF NOT EXISTS idx_machine_payments_date ON public.machine_payments(payment_date);

-- 5. Enable Row Level Security
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_payments ENABLE ROW LEVEL SECURITY;

-- 6. Create policies (only if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'banks' AND policyname = 'Enable all for authenticated users') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.banks FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'machine_expenses' AND policyname = 'Enable all for authenticated users') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.machine_expenses FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'machine_payments' AND policyname = 'Enable all for authenticated users') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.machine_payments FOR ALL USING (true);
    END IF;
END $$;

-- Note: Banks will be managed through the Banks module
-- No sample data inserted - banks should be added via the UI