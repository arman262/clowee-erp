-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES public.franchises(id),
    machine_id UUID REFERENCES public.machines(id),
    sales_date DATE NOT NULL,
    coin_sales INTEGER NOT NULL DEFAULT 0,
    sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    prize_out_quantity INTEGER NOT NULL DEFAULT 0,
    prize_out_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    coin_adjustment INTEGER DEFAULT 0,
    prize_adjustment INTEGER DEFAULT 0,
    adjustment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_franchise_id ON public.sales(franchise_id);
CREATE INDEX IF NOT EXISTS idx_sales_machine_id ON public.sales(machine_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sales_date);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication requirements)
CREATE POLICY "Enable read access for all users" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.sales FOR DELETE USING (true);