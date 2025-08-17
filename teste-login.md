# Teste de Login - Instruções para Debug

## Problema Identificado e Solucionado

Antonio, identifiquei o problema com o login! O usuário `admin@sistema.com` não existia na tabela de autenticação do Supabase (`auth.users`), apenas na tabela de dados (`public.users`).

## O que foi corrigido:

1. **Criado usuário na tabela de autenticação**: Adicionei o usuário `admin@sistema.com` na tabela `auth.users` do Supabase
2. **Adicionados logs de debug**: Incluí logs detalhados para rastrear o processo de login

## Credenciais de Teste:

### Usuário Admin:
- **Email**: `admin@sistema.com`
- **Senha**: `admin123` (senha atualizada no Supabase)

### Usuário Antonio:
- **Email**: `antonio.neves@bei.eng.br`
- **Senha**: (use a senha que você configurou originalmente)

**IMPORTANTE**: Se você não lembrar da sua senha, posso resetá-la para uma nova senha temporária.

## Como testar:

1. **Abra o navegador** e acesse: http://localhost:5175/
2. **Abra o Console do Navegador** (F12 → Console)
3. **Tente fazer login** com as credenciais acima
4. **Observe os logs** no console para ver o processo de autenticação

## Logs que você deve ver:

```
useAuth: Verificando sessão atual...
useAuth: Sessão obtida: { session: null, error: null }
useAuth: Nenhuma sessão ativa encontrada
Tentando fazer login com: { email: 'admin@sistema.com', password: '***' }
useAuth: Iniciando processo de login para: admin@sistema.com
useAuth: Resposta do Supabase: { data: 'admin@sistema.com', error: null }
useAuth: Login bem-sucedido, usuário: admin@sistema.com
Resultado do login: { success: true, user: {...} }
Login realizado com sucesso!
```

## Se ainda houver problemas:

1. **Verifique a conexão com o Supabase**: Os logs mostrarão se há erro de rede
2. **Confirme as variáveis de ambiente**: Verifique se o arquivo `.env` está correto
3. **Teste com ambos os usuários**: Tanto admin@sistema.com quanto antonio.neves@bei.eng.br

## Próximos passos:

Após confirmar que o login está funcionando, podemos:
1. Remover os logs de debug
2. Adicionar mais usuários se necessário
3. Testar outras funcionalidades do sistema

---

**Status**: ✅ Problema identificado e corrigido
**Teste**: Pendente confirmação do usuário