-- Recreate users table with password_hash column
-- Run this in Supabase SQL Editor

-- Drop existing table
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table with password_hash column
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

-- Create policy
CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL USING (true);

-- Create indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Insert test users with plain text passwords
INSERT INTO public.users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@clowee.com', 'admin123', 'admin'),
('Regular User', 'user@clowee.com', 'user123', 'user');