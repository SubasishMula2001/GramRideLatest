-- =============================================
-- FIX ADMIN ROLE FOR subasishmula@gmail.com
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Check current roles
SELECT 
  u.email,
  u.id as user_id,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'subasishmula@gmail.com';

-- Step 2: Delete ALL existing roles for this user
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'subasishmula@gmail.com');

-- Step 3: Add ONLY admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'subasishmula@gmail.com';

-- Step 4: Verify - should show ONLY 'admin'
SELECT 
  u.email,
  u.id as user_id,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'subasishmula@gmail.com';
