-- Permitir que administradores vejam todos os diários
-- Remover política restritiva atual
DROP POLICY IF EXISTS "Users can view diaries from their cluster" ON diaries;

-- Criar nova política que permite admins verem todos os diários
CREATE POLICY "Users can view diaries" ON diaries
FOR SELECT
USING (
  -- Administradores podem ver todos os diários
  (auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ))
  OR
  -- Outros usuários só veem diários do seu cluster
  (cluster_id IN (
    SELECT cluster_id FROM users WHERE id = auth.uid()
  ))
);