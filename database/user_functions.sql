-- Database functions for user management with password encryption
-- Run this in Supabase SQL Editor

-- Function to create user with encrypted password
CREATE OR REPLACE FUNCTION create_user_with_password(
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_password VARCHAR(255),
    user_role VARCHAR(50) DEFAULT 'user'
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO public.users (name, email, password_hash, role)
    VALUES (user_name, user_email, crypt(user_password, gen_salt('bf')), user_role)
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user with encrypted password
CREATE OR REPLACE FUNCTION update_user_with_password(
    user_id UUID,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_password VARCHAR(255),
    user_role VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET name = user_name,
        email = user_email,
        password_hash = crypt(user_password, gen_salt('bf')),
        role = user_role
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_user_password(
    user_email VARCHAR(255),
    user_password VARCHAR(255)
)
RETURNS TABLE(user_id UUID, user_name VARCHAR(255), user_role VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.role
    FROM public.users u
    WHERE u.email = user_email 
    AND u.password_hash = crypt(user_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;