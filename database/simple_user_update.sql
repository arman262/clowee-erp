-- Simple user update function
-- Run this in Supabase SQL Editor

-- Function to update user with optional password
CREATE OR REPLACE FUNCTION update_user_simple(
    user_id UUID,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    user_password VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    IF user_password IS NOT NULL AND user_password != '' THEN
        UPDATE public.users 
        SET name = user_name,
            email = user_email,
            password_hash = crypt(user_password, gen_salt('bf')),
            role = user_role
        WHERE id = user_id;
    ELSE
        UPDATE public.users 
        SET name = user_name,
            email = user_email,
            role = user_role
        WHERE id = user_id;
    END IF;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with id % not found', user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;