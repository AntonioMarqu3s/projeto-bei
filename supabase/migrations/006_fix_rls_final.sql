-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view cluster members" ON users;

-- Create a simple policy that avoids recursion by using a direct cluster_id comparison
-- This policy allows users to see other users in the same cluster without causing recursion
CREATE POLICY "Users can view same cluster" ON users
    FOR SELECT USING (
        -- Users can see themselves
        auth.uid()::text = id::text
        OR
        -- Users can see others in the same cluster (direct comparison to avoid recursion)
        (
            cluster_id IS NOT NULL 
            AND cluster_id = (
                SELECT cluster_id 
                FROM auth.users au
                JOIN users u ON au.id::text = u.id::text
                WHERE au.id = auth.uid()
                LIMIT 1
            )
        )
        OR
        -- Admins can see everyone (direct role check to avoid recursion)
        (
            SELECT u.role 
            FROM auth.users au
            JOIN users u ON au.id::text = u.id::text
            WHERE au.id = auth.uid()
            LIMIT 1
        ) = 'admin'
    );