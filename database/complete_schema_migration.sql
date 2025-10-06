-- Complete database schema for Clowee ERP
-- Run this if starting fresh or to ensure all tables exist

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Banks table
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    routing_number VARCHAR(20),
    swift_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Franchises table
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    coin_price DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    doll_price DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    electricity_cost DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    vat_percentage DECIMAL(5,2),
    franchise_share DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    clowee_share DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    payment_duration VARCHAR(50) NOT NULL DEFAULT 'Monthly',
    maintenance_percentage DECIMAL(5,2),
    security_deposit_type VARCHAR(255),
    security_deposit_notes TEXT,
    payment_bank_id UUID REFERENCES banks(id),
    agreement_copy TEXT,
    trade_nid_copy JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_name VARCHAR(255) NOT NULL,
    machine_number VARCHAR(100) UNIQUE NOT NULL,
    franchise_id UUID REFERENCES franchises(id),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    installation_date DATE,
    last_maintenance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID REFERENCES machines(id),
    franchise_id UUID REFERENCES franchises(id),
    sales_date DATE NOT NULL,
    coin_sales INTEGER NOT NULL DEFAULT 0,
    sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    prize_out_quantity INTEGER NOT NULL DEFAULT 0,
    prize_out_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    coin_adjustment INTEGER DEFAULT 0,
    prize_adjustment INTEGER DEFAULT 0,
    adjustment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_franchises_payment_bank_id ON franchises(payment_bank_id);
CREATE INDEX IF NOT EXISTS idx_machines_franchise_id ON machines(franchise_id);
CREATE INDEX IF NOT EXISTS idx_sales_machine_id ON sales(machine_id);
CREATE INDEX IF NOT EXISTS idx_sales_franchise_id ON sales(franchise_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sales_date);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables
DROP TRIGGER IF EXISTS update_banks_updated_at ON banks;
CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON banks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_franchises_updated_at ON franchises;
CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_machines_updated_at ON machines;
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();