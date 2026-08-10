# Regras de Repositório (FéConecta & FéNamoro)

> **ATENÇÃO:** Estas regras são OBRIGATÓRIAS e PERMANENTES para todos os prompts neste workspace até que o projeto seja encerrado. Nenhuma diretriz pode ser ignorada, contornada ou desativada sem autorização explícita do usuário.

---

## 1. Separação de Código-Fonte (Git)

O projeto `FéNamoro` reside na pasta `/apps/fenamoro` localmente para usar os recursos do npm workspaces, **mas ele possui seu próprio repositório Git**.

- **FéConecta:** Qualquer alteração no ecossistema raiz, `/apps/admin`, ou bibliotecas compartilhadas deve ser versionada no repositório principal (o qual ignora a pasta `apps/fenamoro`).
- **FéNamoro:** Qualquer alteração dentro de `/apps/fenamoro` **DEVE OBRIGATORIAMENTE** ser comitada isoladamente no contexto do repositório interno (`/apps/fenamoro/.git`) e enviada via push para seu repositório dedicado (`vinnicirne/fenamoro.git`).

*Sempre que houver tarefas envolvendo deploys ou commits em ambas as plataformas, o assistente deverá realizar os commits de forma dupla e separada.*

---

## 2. Gabarito Operacional (SEMPRE ATIVO)

### Disciplina de Estilo
- **Sem preâmbulo:** Sem saudações ou repetições do pedido.
- **Palavras-tell:** Eliminar enchimentos (sinceramente, basicamente, claro, certamente, etc.).
- **Formato adequado:** Prosa para narrativa, bullets apenas para listas reais, tabelas para comparação.
- **Recomendação clara:** Sempre fechar com posição e razão em decisões técnicas.
- **Ritmo humano:** Evitar frases curtas empilhadas (staccato).
- **Zero travessão:** Nunca usar (—), substituir por vírgula, parênteses ou dois pontos.

### As 12 Diretrizes
1. **Responsabilidade Extrema:** Tratar o resultado como próprio; prever consequências de segunda ordem.
2. **Anti-Bajulação:** Lealdade ao resultado, não ao ego; discordar com clareza se necessário.
3. **Sistematize o Repetível:** Propor soluções estruturais (templates, skills) para problemas recorrentes.
4. **Pense Antes de Responder:** Clarificar ambiguidades antes de agir; não adivinhar em silêncio.
5. **Elevação de Nível:** Não espelhar pedidos preguiçosos; aplicar frameworks de análise e plano.
6. **Execução Orientada por Meta:** Declarar critérios de sucesso e verificar antes de entregar.
7. **Recuo Estratégico:** Enunciar princípios ou conceitos antes da aplicação prática.
8. **Verificação em Cadeia:** Rascunhar internamente e questionar afirmações factuais antes do envio.
9. **Confiança Calibrada:** Admitir incerteza explicitamente; usar ferramentas para resolver se disponíveis.
10. **Refinamento de Pergunta:** Sugerir versões melhores do prompt quando o delta for material.
11. **Proteção de Infraestrutura (Zero Spam):** Garantir integridade do Supabase self-hosted; implementar deduping agressivo (mínimo 60s), sanitização rigorosa de parâmetros (UUID/IDs) para evitar erros 400 e loops infinitos.
12. **Compressão no Front (Upload-First):** Toda mídia deve ser processada e comprimida no cliente antes do upload. Proibido uso de parâmetros de transformação via URL do Supabase (ex: `width/quality`) para evitar erros 400.

---

## 3. Metodologia Atômica (SEMPRE ATIVA)

Toda solução deve ser decomposta em unidades atômicas antes de ser implementada. Um "átomo" é a menor unidade funcional indivisível de um sistema.

### Princípios
- **Decomposição obrigatória:** Antes de escrever qualquer código, decompor o problema em: Átomos (funções/hooks), Moléculas (componentes), Organismos (features), Templates (páginas), Sistemas (apps).
- **Um átomo, uma responsabilidade:** Cada função, hook ou componente resolve exatamente um problema. Nenhum efeito colateral implícito.
- **Composição sobre herança:** Construir features pela composição de átomos existentes antes de criar novos.
- **Versionamento atômico:** Cada commit resolve exatamente um problema atômico. Commits misturados são proibidos.
- **Teste atômico:** Cada átomo deve ser testável de forma isolada, sem dependência de contexto externo.
- **Nomeação descritiva:** Nomes de funções/componentes devem descrever o que fazem (`useProfileAvatar`, não `useData`).

### Fluxo de Execução
1. Identificar o átomo do problema (o menor ponto de falha ou mudança).
2. Verificar se já existe um átomo equivalente no codebase antes de criar novo.
3. Implementar, testar e commitar o átomo isoladamente.
4. Compor átomos em moléculas apenas quando todos os átomos estiverem estáveis.

---

## 4. Protocolo SaaS (SEMPRE ATIVO)

### Princípios de Produto
- **Revenue-First:** Toda feature nova deve ter impacto claro em aquisição, retenção ou monetização. Features sem impacto mensurável são depriorizadas.
- **Zero Breaking Changes em Produção:** Nunca deploy de mudanças destrutivas sem feature flag ou migração reversível.
- **Dados antes de UI:** Antes de construir qualquer interface, validar que os dados existem no banco e a query funciona.
- **Mobile-First absoluto:** Todo componente novo deve ser testado em viewport 375px antes de qualquer outra resolução.

### Protocolo de Deploy
1. **Build local obrigatório** (`npm run build`) antes de qualquer push para produção.
2. **Migrations antes do código:** Alterações no schema do banco precedem o deploy do app.
3. **PostgREST reload** após qualquer `ALTER TABLE` via `NOTIFY pgrst, 'reload schema';`.
4. **Deploy FéConecta (Next.js):** `git push origin main` → Vercel deploya automaticamente. A VPS `209.50.229.10` é SOMENTE o backend Supabase.
5. **Deploy Supabase Edge Functions:** SSH na VPS e reiniciar o container `ic-supabase-edge-functions` via Docker.
6. **Rollback documentado:** Todo deploy deve ter comando de rollback identificado.

### Protocolo de Qualidade
- **Sem `any` explícito:** Tipagem TypeScript obrigatória em interfaces públicas. `any` permitido apenas em código legado existente.
- **Estados de erro obrigatórios:** Toda chamada de API deve ter handler de erro explícito com feedback ao usuário via `toast`.
- **Loading states:** Toda operação assíncrona deve ter estado de carregamento visível.
- **Sem console.log em produção:** Logs de debug devem usar flags de desenvolvimento ou ser removidos antes do commit final.

### Gatilhos Operacionais
- **"atualização":** Deploy imediato na VPS via SSH (`git pull → npm install → npm run build → pm2 restart`).
- **"gabarito":** Reafirmar e exibir as 12 diretrizes do Gabarito Operacional.
- **"protocolo saas":** Revisar checklist de deploy e qualidade antes de qualquer entrega.
- **"metodologia atômica":** Decompor o problema atual em átomos antes de continuar.

---

## 5. Protocolo de Workspace (SEMPRE ATIVO)

- O assistente deve sempre operar a partir da raiz do workspace (`c:\Users\THINKPAD\Desktop\feconecta`).
- O `Cwd` em todos os comandos de terminal deve ser validado contra o workspace root.
- Caminhos absolutos devem ser verificados antes de qualquer operação de arquivo.
- Nunca assumir que um arquivo existe sem verificar com `list_dir` ou `view_file`.


## 6. Valida��o de Skills e Seguran�a (SEMPRE ATIVO)

Antes de executar qualquer comando ou altera��o estrutural, o assistente DEVE OBRIGATORIAMENTE consultar as instru��es contidas no arquivo [Manual de Skills e Habilidades - Antigravity AI.md](file:///c:/Users/THINKPAD/Desktop/feconecta/.agents/Manual%20de%20Skills%20e%20Habilidades%20-%20Antigravity%20AI.md). Nenhuma altera��o deve ser feita sem verificar a adequa��o �s normas, principalmente utilizando a skill de **security-review** para validar regras RLS e boas pr�ticas de seguran�a.
