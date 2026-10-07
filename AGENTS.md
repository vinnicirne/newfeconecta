# Regras Globais do Antigravity

> **ATENÇÃO:** Estas regras são OBRIGATÓRIAS e PERMANENTES em todos os workspaces do sistema.

## Protocolo SaaS (Isolamento Estrito de Projetos)

O usuário trabalha com múltiplos projetos simultaneamente e, por vezes, deixa arquivos soltos de outros projetos (ex: feconecta, fenamoro, etc.) abertos no editor. Para evitar modificações destrutivas acidentais em projetos alheios, o assistente DEVE OBRIGATORIAMENTE seguir as regras abaixo:

1. **Foco Estrito no Workspace Root:** O projeto ativo é **ÚNICA E EXCLUSIVAMENTE** aquele listado no mapeamento de "Active workspaces" fornecido pelas metainformações do sistema.
2. **Ignorar Arquivos Soltos (Cross-Project):** O assistente deve **IGNORAR ATIVAMENTE** qualquer arquivo listado em "Other open documents" se o caminho do arquivo não iniciar com o caminho exato do Workspace Root atual.
3. **Validação Rigorosa de Caminhos (Path Traversal Bloqueado):** Nenhuma ferramenta de edição (como write_to_file, replace_file_content, multi_replace_file_content) ou execução de terminal (run_command) pode ser executada fora do escopo do Workspace Root. O Cwd nos comandos de terminal deve sempre pertencer ao Workspace Root atual.
4. **Alerta de Inconsistência:** Se o assistente for solicitado a editar um arquivo de outro projeto com base nos arquivos abertos, ele deverá recusar a ação, invocar o alerta de violação de workspace e perguntar ao usuário se ele deseja alterar o diretório do workspace para o projeto alvo.

### Gatilhos Operacionais
- **"protocolo saas"**: O assistente deve reafirmar imediatamente que o foco estrito no Workspace Root está ativado, confirmar qual é o diretório raiz atual e se recusar a fazer alterações fora desse escopo.

## Trava de Segurança de Banco de Dados (FeConecta)

O assistente está ESTRITAMENTE PROIBIDO de acessar, modificar, ou enviar comandos SQL (via API REST ou scripts Node) para o banco de dados do FeConecta (hospedado na VPS IP 209.50.229.10 ou em qualquer outro lugar) se o Workspace Root atual NÃO for o do FeConecta.
Se o assistente estiver operando em projetos paralelos (ex: Diário do Céu, Sisters), ele deve usar EXCLUSIVAMENTE o banco de dados daquele projeto (ex: Supabase Cloud). Tentar injetar dados de outros projetos na VPS do FeConecta resultará em falha crítica de segurança e contaminação de dados.

**EXCEÇÃO AUTORIZADA:**
Quando o Workspace Root estiver corretamente configurado para o FeConecta (ou o projeto alvo apropriado), o assistente está plenamente autorizado pelo administrador a gerar, analisar e orientar sobre scripts SQL, auditorias de segurança, aplicação de RLS e validações de esquema. A trava destina-se apenas a prevenir modificações *cross-project*, e não a impedir tarefas legitimas de administração de banco de dados solicitadas pelo usuário.
