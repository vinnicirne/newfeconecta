# FéConecta - Domínios (Bounded Contexts)

Este documento define claramente as fronteiras e responsabilidades de cada domínio (Bounded Context) da aplicação. A regra de ouro é: **A coesão dentro de um domínio deve ser alta, e o acoplamento entre domínios deve ser mínimo.**

## 1. Groups (Grupos)
**Responsável por:**
- Gestão do agrupamento de pessoas (Células, Ministérios, Redes).
- Definição do Tipo do Grupo (identificando se é célula ou ministério).
- Gestão de Membros vinculados ao grupo.
- Configurações e preferências do grupo.
- Liderança e permissões específicas do grupo.

*Nota:* O Dashboard nunca pergunta se "é uma célula ou ministério", ele apenas consulta as propriedades de `Group` e aplica as estratégias.

## 2. Meetings (Encontros)
**Responsável por:**
- Agendamento de eventos e cultos.
- Listas de Presença (Confirmações, Faltas, Check-in).
- Escalas de Serviços (Recepção, Lanche, Mídia).
- Palavra (Quem vai pregar e o tema).
- Louvor (Escala de banda e repertório).
- Timeline e evolução do encontro.

## 3. Prayers (Pedidos de Oração)
**Responsável por:**
- Registro de pedidos de oração.
- Engajamento (Pessoas que estão "Orando" por aquele pedido).
- Respostas e testemunhos vinculados ao pedido.
- Acompanhamento pastoral de casos sensíveis.

## 4. Studies (Estudos)
**Responsável por:**
- Publicação de roteiros semanais.
- Anexos (PDFs, Vídeos).
- Confirmação de leitura / Visualização pelo líder.

## 5. Mural (Comunicação)
**Responsável por:**
- Avisos paroquiais/gerais.
- Feed de interações (Comentários e Curtidas).
- Anexos de mídia rápida.

## 6. Authorization (Autorização)
**Responsável por:**
- Políticas de Acesso (Policies).
- Papéis (Roles) Globais.
- Reivindicações (Claims).
- Resolução de acesso (Permite ao sistema consultar `can('meeting.edit')`).

## 7. Members (Membros/Perfis Globais)
**Responsável por:**
- Perfil Global do usuário (Nome, Avatar, Dados Pessoais).
- Histórico global da pessoa no sistema.
- Vínculo com a conta de Autenticação.

---
*“Bons domínios são como bons vizinhos: conversam educadamente por cima da cerca (via Eventos/DTOs), mas nunca invadem a casa um do outro.”*
