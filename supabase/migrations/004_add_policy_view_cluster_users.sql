-- Allow all members of a cluster (not only admins or cluster managers) to view other users in their cluster
-- This resolves the issue where non-manager users only see themselves due to RLS restrictions

-- Policy: Members can view users in their cluster
CREATE POLICY "Members can view users in their cluster" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
              AND u.cluster_id IS NOT NULL
              AND u.cluster_id = users.cluster_id
        )
    );