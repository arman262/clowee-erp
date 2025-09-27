-- Create banks table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_banks_name ON public.banks(bank_name);
CREATE INDEX IF NOT EXISTS idx_banks_active ON public.banks(is_active);

-- Enable RLS
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all for authenticated users" ON public.banks FOR ALL USING (true);