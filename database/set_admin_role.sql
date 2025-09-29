-- Set admin role for the admin user
-- Run this AFTER creating the admin@clowee.com user in Supabase Auth

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@clowee.com';