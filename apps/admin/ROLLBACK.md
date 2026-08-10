# Documentação de Rollback (Backup do Sistema Anterior)

Este documento descreve as etapas exatas para reverter o sistema FéConecta para o estado anterior à implementação do **Novo Dashboard Baseado em Domínios (DDD)**, caso haja qualquer problema crítico em produção e seja necessário voltar à arquitetura antiga.

## 1. O Que Foi Modificado
As seguintes alterações foram feitas no projeto:
1. Criação das pastas de arquitetura na raiz do `apps/admin/`:
   - `core/`
   - `domains/`
   - `shared/`
2. Modificação de um único arquivo de UI: 
   - `apps/admin/app/igreja/[slug]/celula/[cell_id]/page.tsx`

Nenhuma tabela do banco de dados (Supabase) foi alterada. Nenhuma outra tela do sistema foi afetada. O impacto ocorreu **exclusivamente na página de detalhes da célula/ministério**.

---

## 2. Como Reverter Usando o Git (Método Recomendado)

Se você utiliza Git, basta descartar as alterações não commitadas ou reverter o commit recente.
Para descartar tudo que não foi commitado:
```bash
git checkout -- apps/admin/app/igreja/\[slug\]/celula/\[cell_id\]/page.tsx
git clean -fd apps/admin/core
git clean -fd apps/admin/domains
git clean -fd apps/admin/shared
```

---

## 3. Como Reverter Manualmente (Método Cirúrgico e Mais Rápido)

Se você preferir reverter na mão, siga estes dois passos super rápidos:

### Passo 1: Usar o Ponto de Restauração Físico
Eu acabei de criar um backup 100% idêntico ao código anterior na mesma pasta da página.
1. Vá até `apps/admin/app/igreja/[slug]/celula/[cell_id]/`
2. Delete o arquivo `page.tsx` atual.
3. Renomeie o arquivo `page.legacy.backup.tsx` para `page.tsx`.

### Passo 2: Deletar as Novas Pastas
Apague as seguintes pastas e todo o seu conteúdo dentro de `apps/admin/`:
- 🗑️ `apps/admin/core/`
- 🗑️ `apps/admin/domains/`
- 🗑️ `apps/admin/shared/`

Pronto. O sistema estará magicamente de volta ao exato estado em que se encontrava, sem deixar rastros!
```typescript
// REMOVER ISSO:
import { DashboardAggregator, DashboardContext } from "@/shared/dashboard/application/DashboardAggregator";
import { SupabaseGroupRepository } from "@/domains/groups/infrastructure/SupabaseGroupRepository";
import { SupabaseMeetingRepository } from "@/domains/meetings/infrastructure/SupabaseMeetingRepository";
import { HealthSummary } from "@/shared/dashboard/ui/HealthSummary";
import { NextMeetingHero } from "@/shared/dashboard/ui/NextMeetingHero";
import { PendingTasks } from "@/shared/dashboard/ui/PendingTasks";
```

Volte a função `loadData()` para como era antes:
```typescript
async function loadData() {
  setIsLoading(true);
  try {
    const { data: cellData, error } = await supabase
      .from('church_groups')
      .select('*')
      .eq('id', cell_id)
      .maybeSingle();
      
    if (error || !cellData) {
      toast.error("Célula não encontrada");
      router.push(`/igreja/${slug}/ministerios`);
      return;
    }

    if (cellData.leader_id) {
      const { data: leaderData } = await supabase.from('profiles').select('*').eq('id', cellData.leader_id).single();
      cellData.leader = leaderData;
    }
    
    setCell(cellData);

    const { data: eventsData } = await supabase
      .from('church_events')
      .select('*')
      .eq('reference_id', cell_id)
      .eq('reference_type', cellData.type)
      .order('event_date', { ascending: true });
    
    setEvents(eventsData || []);

    // Encontrar próxima palavra
    const upcomingEvents = (eventsData || []).filter(e => moment(e.event_date).isSameOrAfter(moment().startOf('day')));
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const { data: roleData } = await supabase
        .from('church_event_roles')
        .select('*, assigned:profiles(full_name)')
        .eq('event_id', nextEvent.id)
        .ilike('role_name', '%palavra%')
        .maybeSingle();
        
      if (roleData) {
        setNextPreacher({
          name: roleData.assigned?.full_name || 'Alguém',
          date: nextEvent.event_date
        });
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user && cellData.leader_id === user.id) {
      setIsLeader(true);
    }

  } catch (e) {
    console.error(e);
  } finally {
    setIsLoading(false);
  }
}
```

E no JSX (renderização), remova o bloco `<HealthSummary>`, `<NextMeetingHero>` e `<PendingTasks>` e devolva o Card antigo da Palavra:
```tsx
{/* Card: Próxima Palavra */}
{nextPreacher && (
  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 rounded-3xl text-white shadow-lg shadow-emerald-500/20">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
          <BookOpen className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-lg">A Palavra</h3>
      </div>
      <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-md">
        {moment(nextPreacher.date).format('DD/MM')}
      </div>
    </div>
    <div className="mt-2">
      <p className="text-emerald-100 text-sm font-medium">Quem vai trazer a palavra:</p>
      <p className="font-black text-2xl">{nextPreacher.name}</p>
    </div>
  </div>
)}
```

Pronto. A interface estará idêntica a antes de iniciarmos os trabalhos de arquitetura, sem um único rastro do código novo.
