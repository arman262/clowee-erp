-- Simple users table without foreign key constraint
-- Run this in Supabase SQL Editor

-- Drop existing table
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table without foreign key constraint
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy - allow all for now
CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL USING (true);

-- Create indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Insert test users with encrypted passwords
INSERT INTO public.users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@clowee.com', crypt('admin123', gen_salt('bf')), 'admin'),
('Regular User', 'user@clowee.com', crypt('user123', gen_salt('bf')), 'user');