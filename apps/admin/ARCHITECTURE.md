# FéConecta - Arquitetura de Software

Este documento define os princípios, padrões e o fluxo de dependências do projeto FéConecta. O objetivo é garantir uma evolução sustentável, escalável e coesa, tratando a aplicação não como páginas isoladas, mas como um SaaS de longo prazo suportado por um **Framework Interno**.

## 1. Objetivos da Arquitetura
Esta arquitetura foi projetada para:
- Escalar horizontalmente.
- Permitir substituição de infraestrutura sem alterar regras de negócio.
- Compartilhar regras entre Web, Mobile e APIs.
- Minimizar acoplamento entre módulos.
- Facilitar testes unitários.
- Facilitar evolução por equipes diferentes.
- Permitir desenvolvimento baseado em domínios.

## 2. Estrutura de Diretórios e Domínios
A raiz da aplicação está dividida em 3 grandes pilares organizacionais:

```text
src/
 ├── core/          # O alicerce da aplicação. Independente de qualquer domínio.
 ├── domains/       # Regras de negócio, agrupadas por contexto (Bounded Contexts).
 └── platform/      # Consumidores Universais, capacidades transversais (ex: Dashboard, Notificações).
```

### 2.1 Estrutura Padrão de Domínio
Todo domínio (ex: `meetings`, `authorization`, `groups`) deve seguir rigorosamente:
```text
domains/[nome-do-dominio]/
 ├── domain/
 │    ├── entities/
 │    ├── value-objects/
 │    ├── repositories/ (Interfaces)
 │    ├── events/
 │    └── types/
 ├── application/
 │    ├── use-cases/ (Ações diretas do sistema)
 │    ├── services/ (Cálculos e lógica transversal, ex: Calculators)
 │    └── mappers/
 ├── infrastructure/
 │    ├── repositories/ (Implementações, ex: Supabase)
 │    ├── cache/
 │    └── providers/
 └── tests/
```

## 3. Fluxo de Dependências Permitidas
A Regra de Ouro: **Uma camada nunca pode depender de outra que esteja acima dela.**

```text
       UI
       ↓
   Application
       ↓
     Domain
       ↓
      Core
 ──────────────
  Infrastructure
       ↑ (Implementa as interfaces do Domain e Core)
```

## 4. O Que É Proibido (Práticas Bloqueadas)
Para salvar o projeto do acoplamento:
- Chamar Supabase diretamente em componentes React.
- Fazer regra de negócio em Components.
- Criar Queries SQL dentro da UI.
- Compartilhar instâncias de entidades entre Domínios (comunicar via DTOs ou Eventos).
- Importar `infrastructure/` dentro do `domain/`.
- Acessar Cache diretamente pela UI.
- Criar Widgets do Dashboard fora do `WidgetRegistry`.
- Retornar uma Entity diretamente para a UI (Siga a esteira: Entity -> Mapper -> DTO -> ViewModel -> Component).

## 5. Convenções de Nomenclatura
- **Interfaces**: `IMeetingRepository`
- **Classes**: `MeetingRepository`
- **Use Cases**: `CreateMeetingUseCase` (Para comandos diretos)
- **Queries (Filtros)**: `MeetingQuery` (Query Objects)
- **Events**: `PresenceConfirmedEvent`
- **DTOs**: `MeetingDto`
- **View Models**: `MeetingHeroViewModel`

## 6. Padrões Operacionais

### Tratamento de Erros e Retornos
Utilize o **Result Pattern** para garantir previsibilidade e fugir do excesso de blocos `try/catch`. Exceções devem ser usadas apenas para bugs não previstos.

### Versionamento de Contratos
Todo contrato público (tipos globais consumidos pela Plataforma) deverá possuir versionamento explícito (ex: `DashboardContextV1`, `MeetingDtoV1`).

### Observabilidade e Logging
Toda operação crítica (Use Cases) deve registrar: `usuário`, `domínio`, `entidade`, `ação`, `duração`, e `resultado`.

### Feature Flags
Qualquer funcionalidade grande deve ser encapsulada por trás de um `FeatureFlagService` (ex: `"dashboard.timeline": true`).

### Permissões e Autorização
A autorização não fica no contexto da tela. O domínio `authorization` cuida de Roles, Claims e Policies. A UI ou o Aggregator apenas invoca `permissions.can("meeting.edit")`.

### Ciclo de Vida de Widgets (Plugin System)
O Dashboard é alimentado pelo `DashboardWidgetRegistry`, cujos plugins possuem ciclo de vida completo:
```typescript
DashboardWidgetRegistry.register({
    id: "study",
    zone: "main",
    priority: 20,
    mount(),
    unmount(),
    refresh(),
    destroy(),
    visible: (context) => context.permissions.canViewStudy,
    component: StudyWidget
});
```

## 7. Estratégia de Testes Obrigatórios
- **Todos os Domínios:** Unit Tests.
- **Todos os Repositórios:** Integration Tests (ou Mock repos).
- **Todos os Widgets:** Component Tests.
- **Todos os Casos de Uso Críticos:** Testes de Happy Path e Error Path.

## 8. Arquitetura de Decisão (ADR)
Documentaremos decisões de design impactantes na pasta `docs/adr/`.
Ex: `001-dashboard-aggregator.md`, `002-widget-registry.md`.

## 9. Roadmap Arquitetural (Evolução)
- **v1**: Dashboard Base, Groups, Meetings, Authorization.
- **v2**: Permissions Avançadas, Notifications, Timeline interativa.
- **v3**: Workflow automatizado, Integração de IA.
- **v4**: Plataforma de Plugins Customizados, Marketplace, Public API.

---

*“Um bom design de software permite que o sistema cresça sem que a complexidade destrua a produtividade da equipe.”*
