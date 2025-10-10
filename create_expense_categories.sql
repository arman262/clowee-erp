CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE machine_expenses ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES expense_categories(id);

INSERT INTO expense_categories (category_name, description, is_active) VALUES
('Maintenance', 'Machine maintenance and repairs', true),
('Supplies', 'Office and operational supplies', true),
('Utilities', 'Electricity, water, and other utilities', true),
('Transportation', 'Travel and transportation costs', true),
('Marketing', 'Advertising and promotional expenses', true),
('Miscellaneous', 'Other general expenses', true)
ON CONFLICT (category_name) DO NOTHING;