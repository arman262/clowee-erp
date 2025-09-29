-- Simple password update function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_user_password(user_id UUID, new_password VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET password_hash = crypt(new_password, gen_salt('bf'))
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;