# Manual de Skills e Habilidades - Antigravity AI

Este manual contém as instruções de uso e os prompts de acionamento para todas as habilidades avançadas integradas no seu ambiente de trabalho da **FéConecta**.

---

## 1. Web Asset Generator (Gerador de Ícones e Imagens) : https://github.com/alonw0/web-asset-generator
Esta skill gera automaticamente ícones para a web, aplicativos e redes sociais a partir de emojis ou da sua própria logo.

**O que faz:**
- Cria favicons (16x16, 32x32, 96x96, .ico).
- Cria ícones para aplicativos (PWA, Apple, Android).
- Tudo já redimensionado e otimizado.

**Prompts de Acionamento (Exemplos):**
- *"Antigravity, gere os favicons e ícones de app usando o emoji de foguete [🚀] e coloque na pasta public."*
- *"Use a skill de web-assets para criar os ícones a partir do arquivo logo.png."*

---

## 2. Marketing Skills (Especialista em Marketing Digital): https://github.com/coreyhaines31/marketingskills
Uma biblioteca com **45 Manuais de Procedimentos (SOPs)** ensinando o Antigravity a atuar como um Diretor de Marketing experiente.

**O que faz:**
Abrange áreas como Auditoria de SEO, Copywriting, Estratégia de Redes Sociais, Testes A/B, E-mail Marketing, Lançamentos, Precificação e muito mais.

**Prompts de Acionamento (Exemplos):**
- *"Rode a skill de **seo-audit** e analise o código da nossa página de doações."*
- *"Use a skill de **copywriting** para escrever a legenda de um post no Instagram divulgando a FéConecta."*
- *"Abra a skill **social** e crie um calendário de conteúdo para os próximos 7 dias."*

---

## 3. Product Manager Skills (Gestão de Produtos): https://github.com/coreyhaines31/marketingskills
Uma biblioteca com **54 Frameworks e Habilidades de Produto** para ajudar no design, escopo e estratégia da plataforma FéConecta.

**O que faz:**
Ajuda a quebrar funcionalidades em histórias de usuários (User Stories), desenhar mapas de jornada, rodar a metodologia Jobs-to-be-Done (JTBD), escrever Documentos de Requisitos (PRD) e planejar o Roadmap.

**Prompts de Acionamento (Exemplos):**
- *"Rode a skill de **jobs-to-be-done** para mapearmos o motivo real pelo qual os pastores interagem com posts."*
- *"Use a skill de **prd-development** e crie os requisitos técnicos para a nova funcionalidade de Chat."*
- *"Ative a skill de **user-story** para fatiar o módulo de Tribos em pequenas tarefas de desenvolvimento."*

---

## 4. Deep Research (Pesquisador Autônomo com IA): https://github.com/dzhng/deep-research
Um motor de pesquisa super aprofundado que varre a internet lendo sites inteiros para responder a questões complexas com fontes precisas.

**O que faz:**
Faz buscas no Google de forma autônoma, navega pelas páginas, lê os conteúdos, conecta informações e compila um relatório em Markdown (report.md) mastigado para você.

> **Importante:** Esta skill exige que você tenha inserido as chaves da OpenAI (`OPENAI_KEY`) e do Firecrawl (`FIRECRAWL_KEY`) no arquivo `.env` localizado na pasta `scratch/deep-research/.env`.

**Prompts de Acionamento (Exemplos):**
- *"Inicie o **deep-research** para fazer um estudo profundo sobre os maiores sistemas de gestão de igrejas no Brasil."*
- *"Use o **deep-research** com profundidade 3 para descobrir como as grandes redes sociais evitam spam em postagens."*

---

## 5. Security Review (Auditoria de Segurança) : https://github.com/felvieira/claude-skills-fv/tree/main
Uma habilidade especializada em revisar códigos e arquiteturas focado em segurança, identificando vulnerabilidades e garantindo as melhores práticas.

**O que faz:**
Verifica o gerenciamento de senhas (secrets), prevenção de SQL Injection, tratamento de envio de arquivos, e valida as permissões (Row Level Security) e tokens JWT.

**Prompts de Acionamento (Exemplos):**
- *"Rode a skill de **security-review** neste arquivo `useChat.ts` e procure por falhas de segurança."*
- *"Acione o **security-review** para analisar se a nossa configuração do Supabase e as regras RLS estão blindadas contra acessos indevidos."*

---

*Manual gerado por Antigravity AI para uso exclusivo no ecossistema FéConecta.*
