-- Criação do usuário administrador
-- Email: antonio.neves@bei.eng.br
-- Senha: Bei@2025
-- Role: admin

-- Primeiro, vamos inserir o usuário na tabela auth.users (sistema de autenticação do Supabase)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'antonio.neves@bei.eng.br',
  crypt('Bei@2025', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Agora vamos inserir o usuário na nossa tabela users personalizada
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  cluster_id,
  available,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'antonio.neves@bei.eng.br'),
  'antonio.neves@bei.eng.br',
  'Antonio Neves',
  'admin',
  NULL, -- Admin não precisa estar vinculado a um cluster específico
  true,
  now(),
  now()
);

-- Verificar se o usuário foi criado corretamente
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.cluster_id,
  u.available,
  u.created_at
FROM public.users u
WHERE u.email = 'antonio.neves@bei.eng.br';