-- Fix users table structure and insert users
-- Run this in Supabase SQL Editor

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS public.users CASCADE;

-- Recreate users table with correct structure
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view their own data" ON public.users FOR ALL USING (auth.uid() = id);

-- Create indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Insert admin user directly
INSERT INTO public.users (id, name, email, role) VALUES 
(gen_random_uuid(), 'Admin User', 'admin@clowee.com', 'admin');

-- Insert regular user directly  
INSERT INTO public.users (id, name, email, role) VALUES 
(gen_random_uuid(), 'Regular User', 'user@clowee.com', 'user');