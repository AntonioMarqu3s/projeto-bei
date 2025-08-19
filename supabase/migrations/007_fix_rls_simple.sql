-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view cluster members" ON users;

-- Create a simple policy using a function to avoid recursion
-- First, create a function to get the current user's cluster_id
CREATE OR REPLACE FUNCTION get_current_user_cluster_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT cluster_id FROM users WHERE id::text = auth.uid()::text LIMIT 1;
$$;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin');
$$;

-- Now create the policy using these functions
CREATE POLICY "Users can view same cluster" ON users
    FOR SELECT USING (
        -- Users can see themselves
        auth.uid()::text = id::text
        OR
        -- Users can see others in the same cluster
        (
            cluster_id IS NOT NULL 
            AND cluster_id = get_current_user_cluster_id()
        )
        OR
        -- Admins can see everyone
        is_current_user_admin()
    );