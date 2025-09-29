-- Reset users with plain text passwords for testing
-- Run this in Supabase SQL Editor

-- Update existing users to plain text passwords
UPDATE public.users SET password_hash = 'admin123' WHERE email = 'admin@clowee.com';
UPDATE public.users SET password_hash = 'user123' WHERE email = 'user@clowee.com';