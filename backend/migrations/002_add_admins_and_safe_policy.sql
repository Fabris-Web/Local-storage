-- Migration: Add admins helper table and replace recursive RLS policies
-- Safe to run after the initial schema (does not DROP tables, only adds/updates policies)

-- 1) Create a simple admins helper table (managed server-side via service_role)
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  added_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- 2) Seed the admins helper with the seeded super admin user (if present)
-- This inserts the super@system.com user id into admins; if the user doesn't
-- exist yet, this statement does nothing.
INSERT INTO admins (user_id, added_by)
SELECT id, id FROM users WHERE email = 'super@system.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3) Drop the problematic recursive policy on `users` if it exists
DROP POLICY IF EXISTS "Super admins can view all users" ON users;

-- 4) Create a safe policy that grants admins (from `admins` table)
-- permission to select all users. This checks `admins` table only and
-- therefore avoids recursion into the `users` policy evaluation.
DROP POLICY IF EXISTS "Admins can view users" ON users;
CREATE POLICY "Admins can view users" ON users
  FOR SELECT USING (
    auth.uid() = id OR auth.uid() IN (SELECT user_id FROM admins)
  );

-- 5) Replace the sessions policy to reference `admins` instead of querying `users`
DROP POLICY IF EXISTS "Managers can view their sessions" ON sessions;
CREATE POLICY "Managers can view their sessions" ON sessions
  FOR SELECT USING (
    manager_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM admins)
  );

-- Notes:
-- - Manage the `admins` table using server-side calls with the service_role key.
-- - This migration is additive and safe; it does not remove your existing tables
--   or seeded users. It only adds the helper table and safe policies.
-- - After applying, use the service_role key to insert/remove rows in `admins`.

-- Example to add another admin (run with service_role):
-- INSERT INTO admins (user_id, added_by)
-- SELECT id, '00000000-0000-0000-0000-000000000000' FROM users WHERE email = 'manager@system.com';
