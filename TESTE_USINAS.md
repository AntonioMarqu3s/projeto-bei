# Teste de Carregamento de Usinas - Instruções

## Problema Identificado
As usinas não estavam aparecendo no formulário porque o usuário admin@test.com não tinha um `cluster_id` válido.

## Solução Aplicada
✅ Atualizado o usuário admin@test.com para ter o cluster_id correto: `08752080-7a5f-4b2d-9f1b-a9aeebdebac6`
✅ Adicionado componente de debug temporário para mostrar informações na tela

## Como Testar

1. **Acesse a aplicação**: http://localhost:5177/

2. **Faça login com**:
   - Email: `admin@test.com`
   - Senha: `123456`

3. **Navegue para**: http://localhost:5177/diaries/new

4. **Verifique**:
   - O componente de debug amarelo deve mostrar:
     - User: admin@test.com
     - Cluster ID: 08752080-7a5f-4b2d-9f1b-a9aeebdebac6
     - Plants Count: 1
     - Plants: PORANGATU I
   - O select de usinas deve mostrar "PORANGATU I" como opção

## Dados no Banco

### Usina Cadastrada:
- **Nome**: PORANGATU I
- **Localização**: PORANGATU GO
- **Cluster ID**: 08752080-7a5f-4b2d-9f1b-a9aeebdebac6

### Usuário Atualizado:
- **Email**: admin@test.com
- **Nome**: Administrador
- **Role**: admin
- **Cluster ID**: 08752080-7a5f-4b2d-9f1b-a9aeebdebac6 ✅

## Próximos Passos

Após confirmar que as usinas estão aparecendo:
1. Remover o componente UserDebug
2. Remover os logs de debug do console
3. Continuar com a implementação das múltiplas atividades

---

**Status**: 🔧 Aguardando teste do usuário
**Data**: $(date)