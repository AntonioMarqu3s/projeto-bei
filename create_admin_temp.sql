-- Script temporário para criar usuário administrador
-- Este script deve ser executado diretamente no banco Supabase
-- IMPORTANTE: Execute como service_role ou no SQL Editor do Supabase

-- Desabilitar RLS temporariamente para inserir o usuário
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Primeiro, verificar se o usuário já existe e deletar se necessário
DELETE FROM public.users WHERE email = 'antonio.neves@bei.eng.br';
DELETE FROM auth.users WHERE email = 'antonio.neves@bei.eng.br';

-- Inserir o usuário na tabela auth.users (sistema de autenticação do Supabase)
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

-- Inserir o usuário na nossa tabela users personalizada
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
  NULL,
  true,
  now(),
  now()
);

-- Reabilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verificar se o usuário foi criado corretamente
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.cluster_id,
  u.available,
  u.created_at,
  'Usuário criado com sucesso!' as status
FROM public.users u
WHERE u.email = 'antonio.neves@bei.eng.br';

-- Verificar na tabela auth.users também
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  'Autenticação configurada!' as status
FROM auth.users 
WHERE email = 'antonio.neves@bei.eng.br';