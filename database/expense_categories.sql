-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_categories
CREATE POLICY "Users can view expense categories" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Users can insert expense categories" ON expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update expense categories" ON expense_categories FOR UPDATE USING (true);
CREATE POLICY "Users can delete expense categories" ON expense_categories FOR DELETE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expense_categories_updated_at 
    BEFORE UPDATE ON expense_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add category_id column to machine_expenses table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'machine_expenses' AND column_name = 'category_id') THEN
        ALTER TABLE machine_expenses ADD COLUMN category_id UUID REFERENCES expense_categories(id);
    END IF;
END $$;

-- Insert some default categories
INSERT INTO expense_categories (category_name, description, is_active) VALUES
('Maintenance', 'Machine maintenance and repairs', true),
('Supplies', 'Office and operational supplies', true),
('Utilities', 'Electricity, water, and other utilities', true),
('Transportation', 'Travel and transportation costs', true),
('Marketing', 'Advertising and promotional expenses', true),
('Miscellaneous', 'Other general expenses', true)
ON CONFLICT (category_name) DO NOTHING;