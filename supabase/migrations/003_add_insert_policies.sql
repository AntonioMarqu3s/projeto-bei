-- Adicionar políticas de INSERT para permitir criação de usuários
-- Necessário para resolver o problema de login

-- Política para permitir que administradores criem usuários
CREATE POLICY "Admin can insert users"
  ON users FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br'
  );

-- Política para permitir que o sistema crie usuários durante o registro
-- (usando service role key)
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Política para permitir que usuários autenticados criem seu próprio perfil
-- (para casos de auto-registro)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (
    id = auth.uid()
  );

-- Adicionar política de UPDATE para usuários
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política para admin atualizar qualquer usuário
CREATE POLICY "Admin can update all users"
  ON users FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br')
  WITH CHECK ((auth.jwt() ->> 'email') = 'antonio.neves@bei.eng.br');

-- Conceder permissões de INSERT e UPDATE na tabela users
GRANT INSERT, UPDATE ON users TO authenticated;
GRANT ALL PRIVILEGES ON users TO service_role;