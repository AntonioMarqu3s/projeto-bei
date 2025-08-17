-- Fix infinite recursion in RLS policies
-- Remove problematic policies and recreate without recursion
-- Using direct auth.uid() and auth.jwt() instead of helper functions

-- Drop existing problematic policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Cluster managers can view users in their cluster" ON users;

-- Drop existing policies for clusters table that might cause issues
DROP POLICY IF EXISTS "Users can view their cluster" ON clusters;
DROP POLICY IF EXISTS "Admin can view all clusters" ON clusters;

-- Recreate users policies without recursion - simplified approach
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- For admin access, use a simpler approach with auth.jwt()
CREATE POLICY "Admin can view all users"
  ON users FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Recreate clusters policies without recursion
CREATE POLICY "Users can view their cluster"
  ON clusters FOR SELECT
  USING (
    id IN (
      SELECT cluster_id FROM auth.users au 
      JOIN users u ON au.id = u.id 
      WHERE au.id = auth.uid()
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Update plants policies to avoid recursion
DROP POLICY IF EXISTS "Users can view plants in their cluster" ON plants;
CREATE POLICY "Users can view plants in their cluster"
  ON plants FOR SELECT
  USING (
    cluster_id IN (
      SELECT cluster_id FROM auth.users au 
      JOIN users u ON au.id = u.id 
      WHERE au.id = auth.uid()
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Update diaries policies to avoid recursion
DROP POLICY IF EXISTS "Users can view diaries in their cluster" ON diaries;
CREATE POLICY "Users can view diaries in their cluster"
  ON diaries FOR SELECT
  USING (
    plant_id IN (
      SELECT p.id FROM plants p
      JOIN auth.users au ON true
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() AND p.cluster_id = u.cluster_id
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

DROP POLICY IF EXISTS "Users can create diaries in their cluster" ON diaries;
CREATE POLICY "Users can create diaries in their cluster"
  ON diaries FOR INSERT
  WITH CHECK (
    plant_id IN (
      SELECT p.id FROM plants p
      JOIN auth.users au ON true
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() AND p.cluster_id = u.cluster_id
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

DROP POLICY IF EXISTS "Users can update diaries in their cluster" ON diaries;
CREATE POLICY "Users can update diaries in their cluster"
  ON diaries FOR UPDATE
  USING (
    plant_id IN (
      SELECT p.id FROM plants p
      JOIN auth.users au ON true
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() AND p.cluster_id = u.cluster_id
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Update teams policies to avoid recursion
DROP POLICY IF EXISTS "Users can view teams in their cluster" ON teams;
CREATE POLICY "Users can view teams in their cluster"
  ON teams FOR SELECT
  USING (
    cluster_id IN (
      SELECT cluster_id FROM auth.users au 
      JOIN users u ON au.id = u.id 
      WHERE au.id = auth.uid()
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Update team_members policies to avoid recursion
DROP POLICY IF EXISTS "Users can view team members in their cluster" ON team_members;
CREATE POLICY "Users can view team members in their cluster"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN auth.users au ON true
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() AND t.cluster_id = u.cluster_id
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Update maintenances policies to avoid recursion
DROP POLICY IF EXISTS "Users can view maintenances in their cluster" ON maintenances;
CREATE POLICY "Users can view maintenances in their cluster"
  ON maintenances FOR SELECT
  USING (
    plant_id IN (
      SELECT p.id FROM plants p
      JOIN auth.users au ON true
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() AND p.cluster_id = u.cluster_id
    ) OR
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );