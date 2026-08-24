"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Music, 
  MessageSquare, 
  BookOpen, 
  Swords, 
  Flame, 
  UserCircle2, 
  Bell, 
  Search, 
  Layers, 
  FileText, 
  Database, 
  ChevronRight, 
  CheckCircle2, 
  Lock, 
  ExternalLink,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: any;
  summary: string;
  routes: string[];
  tables: string[];
  securityHighlights: string[];
  details: string;
}

const DOCS_DATA: DocSection[] = [
  {
    id: "tribo",
    title: "Tribos e FeSocial",
    category: "Comunidade e Midia Curta",
    icon: Flame,
    summary: "Mapeamento de comunidades temáticas, feeds exclusivos de tribos e exibição de Reels com interação comunitária.",
    routes: ["/tribo"],
    tables: ["tribos", "tribo_members", "posts", "reels"],
    securityHighlights: [
      "Políticas RLS amarradas ao auth.uid() = creator_id / profile_id",
      "Moderação descentralizada com permissão por liderança de tribo",
      "Validação de integridade relacional em comentários e curtidas de vídeos curtos"
    ],
    details: "O subsistema de Tribos permite aos membros se agruparem em torno de interesses espirituais específicos. Os reels contam com sincronização em tempo real e proteção contra adulteração de contagens."
  },
  {
    id: "music",
    title: "FeMusic",
    category: "Streaming e Louvor",
    icon: Music,
    summary: "Player universal de streaming de louvores com persistência global, controle MediaSession nativo e playlists comunitárias.",
    routes: ["/music"],
    tables: ["music_tracks", "music_playlists", "music_likes", "playlist_tracks"],
    securityHighlights: [
      "Blindagem RLS com isolamento por usuário autenticado em curtidas e playlists",
      "Validação estrita de áudio e mitigação de links corrompidos",
      "Sincronização em tempo real do estado de reprodução"
    ],
    details: "FéMusic conta com motor de busca de faixas e playlists personalizadas, além de integração com MediaSession API nativa em dispositivos móveis e desktop."
  },
  {
    id: "profile",
    title: "Perfil e Identidade",
    category: "Usuarios e Verificacao",
    icon: UserCircle2,
    summary: "Gestão unificada de perfis de membros, dados ministeriais, fotos de avatar/banner e selos de verificação.",
    routes: ["/profile", "/profile/edit"],
    tables: ["profiles", "verification_requests", "followers"],
    securityHighlights: [
      "Atualização de perfil protegida por WITH CHECK (auth.uid() = id)",
      "Compressão universal de avatar (400px) e banner (1200px) em WebP",
      "Concessão de selos de verificação restrita a administradores auditáveis"
    ],
    details: "Mecanismo de identidade centralizado do FéConecta que alimenta todos os módulos do ecossistema, incluindo conexões com ministérios e igrejas locais."
  },
  {
    id: "feed",
    title: "Feed e Palavra do Dia",
    category: "Publicacoes e Devocional",
    icon: Sparkles,
    summary: "Feed multimídia principal e card exclusivo da Palavra do Dia com versículos, reflexões e testemunhos.",
    routes: ["/", "/feed", "/palavra-semana"],
    tables: ["posts", "comments", "likes", "daily_verses"],
    securityHighlights: [
      "RPC atômica toggle_daily_verse_like para curtidas concorrentes sem conflito",
      "Inserção e alteração da Palavra do Dia restritas exclusivamente a admins",
      "Metadados completos (author_id, user_id, profile_id) em postagens e comentários"
    ],
    details: "Feed com suporte a postagens de texto, mídias comprimidas e compartilhamento direto de versículos pesquisados na Bíblia Sagrada."
  },
  {
    id: "waroom",
    title: "War Room e Salas de Oracao",
    category: "Clamor e Intercessao",
    icon: Swords,
    summary: "Salas de oração em tempo real para intercessão, chat ao vivo, silenciamento de participantes e pedidos de oração.",
    routes: ["/room", "/waroom"],
    tables: ["prayer_rooms", "prayer_room_participants", "prayer_room_messages", "prayer_room_invites"],
    securityHighlights: [
      "Controle de salas amarrado a auth.uid() = host_id / creator_id",
      "Mensagens e pedidos de oração com validação estrita de profile_id",
      "Eliminação de risco de interrupção ou tomada de salas por usuários não autorizados"
    ],
    details: "Espaço espiritual de alta frequência onde intercessores clamam juntos com áudio e chat em tempo real protegidos por WebSocket e RLS."
  },
  {
    id: "bible",
    title: "Biblia Sagrada e IA",
    category: "Escrituras e Exegese",
    icon: BookOpen,
    summary: "Leitor bíblico completo, marcações coloridas, anotações de estudo e assistente teológico alimentado por IA.",
    routes: ["/bible", "/api/ai/bible-study"],
    tables: ["bible_comments", "bible_favorites", "bible_highlights", "bible_interactions"],
    securityHighlights: [
      "RLS liberando favoritos e anotações isolados por auth.uid() = profile_id",
      "Comentários de versículos comunitários auditados com proteção anti-spoofing",
      "Rate limiting no PostgreSQL e autenticação JWT na rota /api/ai/bible-study"
    ],
    details: "Sistema exegético avançado que permite ao membro pesquisar passagens, destacar trechos e obter análises de contexto histórico e teológico."
  },
  {
    id: "notifications",
    title: "Central de Notificacoes",
    category: "Alertas e Tempo Real",
    icon: Bell,
    summary: "Notificações em tempo real com mapeamento visual para 10+ tipos de eventos espirituais e sociais.",
    routes: ["/notifications"],
    tables: ["notifications"],
    securityHighlights: [
      "RPC get_my_notifications com JOIN em profiles e dados enriquecidos",
      "RPC mark_all_notifications_as_read para limpeza em lote atômica",
      "Políticas RLS com WITH CHECK (auth.uid() = recipient_id)"
    ],
    details: "Notificações reativas via canais Postgres Changes (INSERT/DELETE) com badges de alerta, avatares dos autores e redirecionamentos diretos."
  },
  {
    id: "chat",
    title: "Chat e Mensagens Diretas",
    category: "Mensageria Privada",
    icon: MessageSquare,
    summary: "Sistema de bate-papo privado 1-a-1 com histórico em tempo real, status de leitura e envio de imagens comprimidas.",
    routes: ["/messages", "/chat"],
    tables: ["direct_messages", "messages"],
    securityHighlights: [
      "Eliminação de IDOR em get_my_conversations e get_chat_history",
      "Políticas de SELECT restritas a auth.uid() = sender_id OR auth.uid() = receiver_id",
      "Marcação atômica de mensagens lidas (markMessagesAsRead) no banco"
    ],
    details: "Comunicação interpessoal segura entre irmãos da fé com busca em tempo real, compressão de imagens em WebP e suporte ao menu inferior móvel."
  },
  {
    id: "notes",
    title: "Notas e Devocional",
    category: "Devocionais e Anotacoes",
    icon: FileText,
    summary: "Diário pessoal de reflexões espirituais, notas bíblicas e devocionais diários com salvamento automático.",
    routes: ["/notes", "/notas"],
    tables: ["user_notes"],
    securityHighlights: [
      "RLS blindando privacidade estrita com checagem dupla (user_id e profile_id)",
      "Leitura de notas privadas 100% isolada e liberação apenas de notas públicas",
      "Compartilhamento seguro de notas e devocionais no feed comunitário"
    ],
    details: "Ambiente inspirador estilo Google Keep para registrar orações, revelações e devocionais diários com filtros por data, tags e favoritos."
  },
  {
    id: "push_force",
    title: "Forçar Notificação e Push Multicanal",
    category: "Mensageria e Transmissao",
    icon: Bell,
    summary: "Console de transmissão para envio em massa e disparo forçado pontual para qualquer usuário ou ministério.",
    routes: ["/admin/push", "/forcar-notificacao", "/admin/users"],
    tables: ["notifications", "profiles", "system_errors"],
    securityHighlights: [
      "Disparo seguro via trigger PostgreSQL tr_invoke_send_push para Google Firebase Cloud Messaging",
      "Prioridade 'high' e entrega simultânea no canal Supabase Realtime in-app",
      "Templates rápidos auditáveis para Palavra do Dia, Comunicado Pastoral e Chamado de Oração"
    ],
    details: "Permite a administradores enviar notificações push e alertas in-app para qualquer membro ou grupo (roles, FéNamoro, individuais) sem dependência exclusiva de token FCM ativo."
  },
  {
    id: "stories",
    title: "Stories, Status e Destaques",
    category: "Midia Efemera e Comunidade",
    icon: Sparkles,
    summary: "Ecossistema de publicação efêmera de 24 horas (fotos, vídeos, áudios e textos) com destaques perpétuos no perfil.",
    routes: ["/stories", "/status"],
    tables: ["stories", "story_views", "story_likes"],
    securityHighlights: [
      "Anti-spoofing em story_views com WITH CHECK (auth.uid() = viewer_id)",
      "Privacidade absoluta da lista de visualizadores restrita exclusivamente ao autor do story",
      "Expurgo nuclear de 12 políticas legadas duplicadas em story_likes"
    ],
    details: "Permite aos membros compartilhar momentos do dia, pedidos de oração em áudio e testemunhos com expiração automática em 24h e curadoria para destaques perpétuos no perfil."
  },
  {
    id: "santuario",
    title: "Lugar Secreto e Santuário",
    category: "Devocional Profundo e Altar",
    icon: Flame,
    summary: "Espaço sagrado de trilhas guiadas de meditação, forjamento de jornadas por líderes verificados e Altar Digital.",
    routes: ["/santuario", "/lugarsecreto", "/santuario/create"],
    tables: ["sanctuary_journeys", "sanctuary_chapters", "sanctuary_progress"],
    securityHighlights: [
      "Criação de jornadas blindada no PostgreSQL restrita a perfis verificados (is_verified = true)",
      "Isolamento do Altar Digital e progresso de leitura amarrados a auth.uid() = user_id",
      "Expurgo de políticas RLS redundantes e suporte a rich text bíblico interativo"
    ],
    details: "Ambiente devocional imersivo onde líderes ministeriais forjam jornadas espirituais temáticas e os membros acendem chamas no seu Altar Digital pessoal a cada capítulo selado."
  }
];

export default function DocsPage() {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("tribo");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const selectedSection = DOCS_DATA.find(d => d.id === selectedSectionId) || DOCS_DATA[0];

  const filteredDocs = DOCS_DATA.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.tables.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#1e293b]/80 bg-[#090f1e]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              FéConecta <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">Docs de Engenharia</span>
            </h1>
            <p className="text-xs text-gray-400">Documentação de Arquitetura, Módulos e Segurança Nuclear</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar módulo, tabela ou rota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131d33] text-xs text-gray-200 pl-9 pr-3 py-2 rounded-xl border border-[#223150] focus:outline-none focus:border-emerald-400 placeholder-gray-500 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-80 shrink-0 border-r border-[#1e293b]/70 bg-[#090f1e] overflow-y-auto p-4 space-y-1.5 hidden md:block">
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Módulos do Sistema ({filteredDocs.length})
          </div>

          {filteredDocs.map((doc) => {
            const Icon = doc.icon;
            const isSelected = doc.id === selectedSection.id;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedSectionId(doc.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all text-xs font-semibold group",
                  isSelected 
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-white shadow-lg shadow-emerald-950/30" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                    isSelected ? "bg-emerald-500/30 text-emerald-300" : "bg-white/5 text-gray-400 group-hover:text-gray-200"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold truncate">{doc.title}</p>
                    <p className="text-[10px] opacity-60 truncate">{doc.category}</p>
                  </div>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform opacity-40 shrink-0", isSelected ? "text-emerald-400 translate-x-1 opacity-100" : "")} />
              </button>
            );
          })}

          <div className="pt-6 border-t border-[#1e293b]/60 mt-6 px-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                <Database className="w-4 h-4" /> Banco na VPS
              </p>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                PostgreSQL gerenciado no host <strong>209.50.229.10</strong> com contêiner <code>ic-supabase-db</code> e RLS 100% blindado.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Doc Viewer */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 max-w-5xl mx-auto">
          {/* Module Header Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#131d33] to-[#0f172a] border border-[#223150] shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <selectedSection.icon className="w-4 h-4" />
                {selectedSection.category}
              </div>
              <h2 className="text-3xl font-black text-white">{selectedSection.title}</h2>
              <p className="text-gray-300 text-sm leading-relaxed max-w-3xl">{selectedSection.summary}</p>
            </div>
            <selectedSection.icon className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
          </div>

          {/* Grid de Informações Técnicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rotas */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-[#1e293b] space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> Rotas no Front-End
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedSection.routes.map(r => (
                  <Link 
                    key={r} 
                    href={r.includes('[') ? '#' : r}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-xs font-mono text-emerald-300 transition-all flex items-center gap-1.5"
                  >
                    {r} <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Tabelas no PostgreSQL */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-[#1e293b] space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" /> Tabelas no PostgreSQL (VPS)
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedSection.tables.map(t => (
                  <span key={t} className="px-3 py-1.5 rounded-xl bg-[#1e293b]/70 border border-[#334155] text-xs font-mono text-gray-300">
                    public.{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Blindagens de Segurança Nuclear */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0d1527] border border-[#1e293b] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" /> Blindagem RLS & Segurança Nuclear
            </h3>
            <div className="space-y-3">
              {selectedSection.securityHighlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detalhes de Engenharia */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0f172a]/90 border border-[#1e293b] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" /> Detalhamento de Engenharia
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {selectedSection.details}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
