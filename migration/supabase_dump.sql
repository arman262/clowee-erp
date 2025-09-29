-- Create Clowee ERP Database
CREATE DATABASE clowee_erp;

-- Connect to the database
\c clowee_erp;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    franchise_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Franchises table
CREATE TABLE franchises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    coin_price DECIMAL(10,2) NOT NULL,
    doll_price DECIMAL(10,2) NOT NULL,
    electricity_cost DECIMAL(10,2) NOT NULL,
    vat_percentage DECIMAL(5,2),
    franchise_share DECIMAL(5,2) NOT NULL,
    clowee_share DECIMAL(5,2) NOT NULL,
    payment_duration VARCHAR(50) NOT NULL,
    maintenance_percentage DECIMAL(5,2),
    security_deposit_type VARCHAR(100),
    security_deposit_notes TEXT,
    agreement_copy TEXT,
    trade_nid_copy TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machines table
CREATE TABLE machines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_name VARCHAR(255) NOT NULL,
    machine_number VARCHAR(100) NOT NULL,
    esp_id VARCHAR(100) NOT NULL,
    franchise_id UUID REFERENCES franchises(id),
    branch_location VARCHAR(255) NOT NULL,
    installation_date DATE NOT NULL,
    initial_coin_counter INTEGER NOT NULL DEFAULT 0,
    initial_prize_counter INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banks table
CREATE TABLE banks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    account_holder_name VARCHAR(255),
    branch_name VARCHAR(255),
    routing_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machine counters table
CREATE TABLE machine_counters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id UUID REFERENCES machines(id),
    reading_date DATE NOT NULL,
    coin_counter INTEGER NOT NULL,
    prize_counter INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id UUID REFERENCES machines(id),
    franchise_id UUID REFERENCES franchises(id),
    sales_date DATE NOT NULL,
    coin_sales INTEGER NOT NULL,
    sales_amount DECIMAL(10,2) NOT NULL,
    prize_out_quantity INTEGER NOT NULL,
    prize_out_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    machine_id UUID REFERENCES machines(id),
    invoice_date DATE NOT NULL,
    total_sales DECIMAL(10,2) NOT NULL,
    total_prize_cost DECIMAL(10,2) NOT NULL,
    electricity_cost DECIMAL(10,2),
    vat_amount DECIMAL(10,2),
    net_profit DECIMAL(10,2) NOT NULL,
    franchise_share_amount DECIMAL(10,2) NOT NULL,
    clowee_share_amount DECIMAL(10,2) NOT NULL,
    pay_to_clowee DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machine expenses table
CREATE TABLE machine_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id UUID REFERENCES machines(id),
    expense_date DATE NOT NULL,
    expense_details TEXT NOT NULL,
    unique_id VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    item_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machine payments table
CREATE TABLE machine_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id UUID REFERENCES machines(id),
    bank_id UUID REFERENCES banks(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory items table
CREATE TABLE inventory_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    total_value DECIMAL(10,2),
    supplier VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory transactions table
CREATE TABLE inventory_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES inventory_items(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    transaction_date DATE NOT NULL,
    related_invoice UUID REFERENCES invoices(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ledger entries table
CREATE TABLE ledger_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entry_date DATE NOT NULL,
    type VARCHAR(100) NOT NULL,
    debit DECIMAL(10,2) DEFAULT 0,
    credit DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2),
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price history table
CREATE TABLE price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    effective_date DATE NOT NULL,
    coin_price DECIMAL(10,2),
    doll_price DECIMAL(10,2),
    electricity_cost DECIMAL(10,2),
    vat_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for users
ALTER TABLE users ADD CONSTRAINT fk_users_franchise FOREIGN KEY (franchise_id) REFERENCES franchises(id);

-- Create indexes
CREATE INDEX idx_machines_franchise_id ON machines(franchise_id);
CREATE INDEX idx_machine_counters_machine_id ON machine_counters(machine_id);
CREATE INDEX idx_sales_machine_id ON sales(machine_id);
CREATE INDEX idx_sales_franchise_id ON sales(franchise_id);
CREATE INDEX idx_invoices_franchise_id ON invoices(franchise_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_machine_expenses_machine_id ON machine_expenses(machine_id);
CREATE INDEX idx_machine_payments_machine_id ON machine_payments(machine_id);
CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);