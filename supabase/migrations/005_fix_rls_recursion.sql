-- Remove the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Members can view users in their cluster" ON users;

-- The existing policies should be sufficient:
-- 1. "Users can view their own profile" - allows users to see themselves
-- 2. "Admins can view all users" - allows admins to see everyone
-- 3. "Cluster managers can view users in their cluster" - allows cluster managers to see cluster users

-- For regular users to see other users in their cluster, we need a different approach
-- Let's modify the cluster manager policy to include all users in the same cluster
DROP POLICY IF EXISTS "Cluster managers can view users in their cluster" ON users;

-- Create a new policy that allows any user to view users in their cluster
CREATE POLICY "Users can view cluster members" ON users
    FOR SELECT USING (
        -- Users can see themselves
        auth.uid()::text = id::text
        OR
        -- Users can see other users in the same cluster
        (
            cluster_id IS NOT NULL 
            AND cluster_id IN (
                SELECT u.cluster_id 
                FROM users u 
                WHERE u.id::text = auth.uid()::text 
                  AND u.cluster_id IS NOT NULL
            )
        )
        OR
        -- Admins can see everyone
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'admin'
        )
    );