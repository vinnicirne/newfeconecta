# Como corrigir o erro 500 no cadastro (Supabase)

## Sintomas
- `GET /rest/v1/profiles?select=id&username=eq...` retorna 500
- `POST /auth/v1/signup` retorna 500
- UI mostra "Database error saving new user"

## Causa mais comum
- Tabela `profiles` com RLS habilitado mas sem policies, ou policies com SQL quebrado
- Trigger em `auth.users` tentando criar profile, mas falhando por constraint/coluna/policy

## Passo 1: Execute o SQL de correção
1. Abra **Supabase Dashboard** > **SQL Editor**
2. Cole e execute todo o conteúdo do arquivo `fix_profiles_rls.sql`

O que esse SQL faz:
- Garante que a tabela `profiles` tenha todas as colunas necessárias
- Remove triggers/policies antigas quebradas
- Habilita RLS com policies simples e funcionais
- Cria trigger seguro para criar profile automaticamente ao cadastrar usuário

## Passo 2: Ajuste no código (já aplicado)
No arquivo `apps/admin/app/register/page.tsx` foi corrigido:
- Trocado `.single()` por `.maybeSingle()` para evitar erro quando username não existe
- Melhorado tratamento de erro na verificação de username

## Passo 3: Teste
1. Limpe o cache do navegador
2. Tente criar uma nova conta
3. O cadastro deve funcionar sem erros 500

## Se ainda falhar
Verifique no Supabase Dashboard > Logs > API/Postgres se há mensagens de erro específicas.
