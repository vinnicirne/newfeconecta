"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Users, X, Info, HeartHandshake, Mic, Image as ImageIcon, CheckCircle2, ChevronRight, Share, ListTodo, LogOut, Video, Music, Plus, Trash2, Settings, Shield } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from "sonner";
import moment from "moment";
import 'moment/locale/pt-br';

moment.locale('pt-br');

export function EventDashboard({ eventId, churchId, isLeader = false, onClose }: { eventId: string, churchId: string, isLeader?: boolean, onClose: () => void }) {
  const [event, setEvent] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); // To select from
  const [activeTab, setActiveTab] = useState<'escala' | 'louvor' | 'disponibilidade' | 'configuracoes'>('escala');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [eventId]);

  async function loadAllData(showLoadingOverlay = true) {
    if (showLoadingOverlay) setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Load Event
      const { data: eventData } = await supabase
        .from('church_events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      setEvent(eventData);

      // Load Roles
      const { data: rolesData } = await supabase
        .from('church_event_roles')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      
      // Load members for assignments
      const { data: membersData } = await supabase
        .from('church_members')
        .select('user_id')
        .eq('church_id', churchId)
        .eq('approved', true);

      // Map roles correctly
      const mappedRoles = await Promise.all((rolesData || []).map(async (role) => {
        if (role.assigned_to) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', role.assigned_to).single();
          return { ...role, assigned: profile };
        }
        return role;
      }));
      setRoles(mappedRoles);

      const mappedMembers = await Promise.all((membersData || []).map(async (m) => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', m.user_id).single();
        return { ...m, profiles: profile };
      }));
      setMembers(mappedMembers);

      // Load Songs
      const { data: songsData } = await supabase
        .from('church_event_songs')
        .select('*')
        .eq('event_id', eventId)
        .order('order', { ascending: true });
      setSongs(songsData || []);

      // Load Availabilities
      const { data: avData } = await supabase
        .from('church_event_availabilities')
        .select('*')
        .eq('event_id', eventId);
      
      const mappedAvailabilities = await Promise.all((avData || []).map(async (av) => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', av.user_id).single();
        return { ...av, profiles: profile };
      }));
      setAvailabilities(mappedAvailabilities);

    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados do evento.");
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS ---

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const roleName = (form.elements.namedItem('roleName') as HTMLInputElement).value;
    const assignedTo = (form.elements.namedItem('assignedTo') as HTMLSelectElement).value;
    
    const { data, error } = await supabase
      .from('church_event_roles')
      .insert({ 
        event_id: eventId, 
        role_name: roleName,
        assigned_to: assignedTo || null
      })
      .select()
      .single();
      
    if (data) {
      // Refresh to get profiles
      await loadAllData(false);
      form.reset();
      toast.success("Função adicionada!");
    }
  }

  async function handleAssignRole(roleId: string, userId: string) {
    await supabase.from('church_event_roles').update({ assigned_to: userId || null }).eq('id', roleId);
    await loadAllData(false);
    toast.success("Escala atualizada!");
  }

  async function handleDeleteRole(roleId: string) {
    await supabase.from('church_event_roles').delete().eq('id', roleId);
    setRoles(roles.filter(r => r.id !== roleId));
  }

  async function handleAddSong(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const artist = (form.elements.namedItem('artist') as HTMLInputElement).value;
    const url = (form.elements.namedItem('url') as HTMLInputElement).value;
    
    const { data, error } = await supabase
      .from('church_event_songs')
      .insert({ event_id: eventId, title, artist, url, order: songs.length })
      .select()
      .single();
      
    if (data) {
      setSongs([...songs, data]);
      form.reset();
      toast.success("Música adicionada!");
    }
  }

  async function handleDeleteSong(songId: string) {
    await supabase.from('church_event_songs').delete().eq('id', songId);
    setSongs(songs.filter(s => s.id !== songId));
  }

  async function handleSetAvailability(status: string) {
    if (!currentUser) return;
    
    const { error } = await supabase
      .from('church_event_availabilities')
      .upsert({ event_id: eventId, user_id: currentUser.id, status });
      
    if (!error) {
      toast.success("Disponibilidade confirmada!");
      loadAllData(false);
    } else {
      toast.error("Erro ao confirmar.");
    }
  }

  async function handleEditEvent(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const dateStr = (form.elements.namedItem('date') as HTMLInputElement).value;
    const timeStr = (form.elements.namedItem('time') as HTMLInputElement).value;
    const isSocial = (form.elements.namedItem('isSocial') as HTMLInputElement).checked;
    
    if (!title || !dateStr || !timeStr) return toast.error("Preencha todos os campos");

    const event_date = new Date(`${dateStr}T${timeStr}:00`).toISOString();

    const { error } = await supabase
      .from('church_events')
      .update({ 
        title, 
        event_date,
        metadata: { ...(event.metadata || {}), isSocial }
      })
      .eq('id', eventId);
      
    if (error) {
      toast.error("Erro ao atualizar encontro");
    } else {
      toast.success("Encontro atualizado!");
      loadAllData(false);
    }
  }

  async function handleDeleteEvent() {
    if (confirm("Tem certeza que deseja excluir este encontro?")) {
      await supabase.from('church_events').delete().eq('id', eventId);
      toast.success("Encontro excluído");
      onClose();
      // Force reload to update dashboard
      window.location.reload();
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const loadingToast = toast.loading("Gerando link do Meet...");
      try {
        // Obter data do evento ou usar data atual se não definida
        const startDate = event?.event_date ? new Date(event.event_date) : new Date();
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora de duração

        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: event?.title || "Reunião de Célula",
            description: "Gerado automaticamente pelo FéConecta",
            start: { dateTime: startDate.toISOString() },
            end: { dateTime: endDate.toISOString() },
            conferenceData: {
              createRequest: {
                requestId: Math.random().toString(36).substring(7),
                conferenceSolutionKey: { type: "hangoutsMeet" }
              }
            }
          })
        });

        const data = await response.json();
        const meetLink = data.hangoutLink;

        if (meetLink) {
          const { error } = await supabase
            .from('church_events')
            .update({
              metadata: { ...event.metadata, meetLink }
            })
            .eq('id', eventId);
          
          if (error) throw error;
          
          toast.success("Reunião online gerada com sucesso!", { id: loadingToast });
          loadAllData(false); // Atualiza os dados para o botão virar "Entrar na Célula"
        } else {
          throw new Error("Não foi possível gerar o link");
        }
      } catch (err) {
        toast.error("Erro ao salvar link", { id: loadingToast });
      }
    },
    scope: "https://www.googleapis.com/auth/calendar.events"
  });

  async function handleGenerateMeet() {
    googleLogin();
  }

  if (loading || !event) return <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center text-white backdrop-blur-sm">Carregando Evento...</div>;

  const myAvailability = availabilities.find(a => a.user_id === currentUser?.id)?.status;
  const canManage = isLeader || (currentUser && currentUser.id === event.created_by);

  // Se o usuário não puder gerenciar e a aba ativa não for disponibilidade, force-a
  if (!canManage && activeTab !== 'disponibilidade') {
    setActiveTab('disponibilidade');
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111B21] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#075E54] to-[#25D366] p-6 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-all">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold opacity-80 mb-2 uppercase tracking-wider">
            <Calendar size={16} /> {moment(event.event_date).format('dddd, DD/MM [às] HH:mm')}
          </div>
          <h2 className="text-3xl font-black">{event.title}</h2>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-6 pt-4 bg-gray-50 dark:bg-[#1A2429] no-scrollbar">
          {canManage && (
            <>
              <button onClick={() => setActiveTab('escala')} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'escala' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                <Shield size={18} /> Escala
              </button>
              <button onClick={() => setActiveTab('louvor')} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'louvor' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                <Music size={18} /> Louvor
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('disponibilidade')} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'disponibilidade' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <Users size={18} /> Presença
          </button>
          {canManage && (
            <button onClick={() => setActiveTab('configuracoes')} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'configuracoes' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              <Settings size={18} /> Configurar
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111B21]">
          
          {/* TAB: CONFIGURAÇÕES */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-6">
              <form onSubmit={handleEditEvent} className="bg-gray-50 dark:bg-[#1A2429] p-6 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Editar Detalhes do Encontro</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Título do Encontro</label>
                  <input required type="text" name="title" defaultValue={event.title} className="w-full bg-white dark:bg-[#111B21] border border-gray-200 dark:border-gray-700 focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Data</label>
                    <input required type="date" name="date" defaultValue={moment(event.event_date).format('YYYY-MM-DD')} className="w-full bg-white dark:bg-[#111B21] border border-gray-200 dark:border-gray-700 focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Horário</label>
                    <input required type="time" name="time" defaultValue={moment(event.event_date).format('HH:mm')} className="w-full bg-white dark:bg-[#111B21] border border-gray-200 dark:border-gray-700 focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                  </div>
                </div>

                <div className="mt-4 bg-white dark:bg-[#111B21] border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="isSocial" 
                      defaultChecked={event.metadata?.isSocial}
                      className="w-5 h-5 rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white">Evento Social / Festa</span>
                      <span className="text-xs text-gray-500 mt-1">Desativa o aviso de "Palavra não definida" e dispensa a escala de pregação.</span>
                    </div>
                  </label>
                </div>

                <div className="mt-4 bg-white dark:bg-[#111B21] border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Video size={16} className="text-blue-500" /> Reunião Online (Meet)
                    </span>
                    <span className="text-xs text-gray-500 mt-1 max-w-[200px]">Gere um link para os membros entrarem na célula online.</span>
                  </div>
                  {event.metadata?.meetLink ? (
                    <a href={event.metadata.meetLink} target="_blank" className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors shrink-0">
                      Entrar na Célula
                    </a>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleGenerateMeet}
                      className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-white/20 transition-colors shrink-0"
                    >
                      Gerar Reunião
                    </button>
                  )}
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-[#25D366] text-black py-3 rounded-xl font-bold hover:bg-[#00A884] transition-all">
                    Salvar Alterações
                  </button>
                </div>
              </form>

              <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/20 mt-8">
                <h3 className="font-bold text-lg text-red-600 dark:text-red-400 mb-2">Zona de Perigo</h3>
                <p className="text-sm text-red-500/80 mb-4">Esta ação não pode ser desfeita. Isso excluirá o encontro e todas as escalas vinculadas a ele.</p>
                <button onClick={handleDeleteEvent} className="w-full md:w-auto px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">
                  Excluir Encontro
                </button>
              </div>
            </div>
          )}

          {/* TAB: ESCALA */}
          {activeTab === 'escala' && (
            <div className="space-y-6">
              <form onSubmit={handleAddRole} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input required type="text" name="roleName" placeholder="Função (ex: Lanche)" className="md:col-span-5 bg-gray-100 dark:bg-[#1A2429] border border-transparent focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                <select name="assignedTo" className="md:col-span-5 bg-gray-100 dark:bg-[#1A2429] border border-transparent focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white">
                  <option value="">-- Opcional: Atribuir a --</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || 'Usuário'}</option>
                  ))}
                </select>
                <button type="submit" className="md:col-span-2 bg-[#25D366] text-black px-4 py-3 rounded-xl font-bold hover:bg-[#00A884] transition-all flex items-center justify-center gap-2">
                  <Plus size={18} /> Adicionar
                </button>
              </form>

              <div className="space-y-3">
                {roles.length === 0 && <div className="text-center py-10 text-gray-500">Nenhuma função definida ainda.</div>}
                {roles.map(role => (
                  <div key={role.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-[#1A2429] rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="font-bold text-lg text-gray-900 dark:text-white">{role.role_name}</div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <select 
                        value={role.assigned_to || ""} 
                        onChange={(e) => handleAssignRole(role.id, e.target.value)}
                        className="flex-1 bg-white dark:bg-[#111B21] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none md:min-w-[200px] text-gray-900 dark:text-white"
                      >
                        <option value="">-- Ninguém designado --</option>
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || 'Usuário'}</option>
                        ))}
                      </select>
                      <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LOUVOR */}
          {activeTab === 'louvor' && (
            <div className="space-y-6">
              <form onSubmit={handleAddSong} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required type="text" name="title" placeholder="Nome da música" className="bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                <input required type="text" name="artist" placeholder="Cantor / Banda" className="bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                <div className="flex gap-2">
                  <input type="text" name="url" placeholder="Link YouTube/Spotify (Opcional)" className="flex-1 bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-sm text-gray-900 dark:text-white" />
                  <button type="submit" className="bg-[#25D366] text-black px-4 py-3 rounded-xl font-bold hover:bg-[#00A884] transition-all flex items-center justify-center">
                    <Plus size={18} />
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {songs.length === 0 && <div className="text-center py-10 text-gray-500">Nenhuma música adicionada à playlist.</div>}
                {songs.map((song, i) => (
                  <div key={song.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 dark:bg-[#1A2429] rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="hidden md:flex w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 items-center justify-center font-bold text-sm text-gray-900 dark:text-white">{i + 1}</div>
                    <div className="flex-1">
                      <div className="font-bold text-lg leading-tight text-gray-900 dark:text-white">{song.title}</div>
                      <div className="text-sm text-gray-500">{song.artist}</div>
                      {song.url && <a href={song.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">🔗 Ver Cifra/Música</a>}
                    </div>
                    <button onClick={() => handleDeleteSong(song.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all self-end md:self-auto">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PRESENÇA */}
          {activeTab === 'disponibilidade' && (
            <div className="space-y-8">
              <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Você participará deste encontro?</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <button onClick={() => handleSetAvailability('confirmed')} className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${myAvailability === 'confirmed' ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/30' : 'bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 hover:bg-[#25D366]/20 text-gray-900 dark:text-white'}`}>
                    <CheckCircle2 size={20} /> Eu Vou
                  </button>
                  <button onClick={() => handleSetAvailability('declined')} className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${myAvailability === 'declined' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 hover:bg-red-500/20 text-gray-900 dark:text-white'}`}>
                    <X size={20} /> Não poderei ir
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-4 opacity-80 border-b border-black/10 dark:border-white/10 pb-2 text-gray-900 dark:text-white">Confirmados ({availabilities.filter(a => a.status === 'confirmed').length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availabilities.filter(a => a.status === 'confirmed').map(a => (
                    <div key={a.user_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                      <img src={a.profiles?.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" />
                      <div className="font-bold text-sm line-clamp-1 text-gray-900 dark:text-white">{a.profiles?.full_name}</div>
                    </div>
                  ))}
                  {availabilities.filter(a => a.status === 'confirmed').length === 0 && <div className="text-sm text-gray-500 col-span-3">Ninguém confirmou ainda.</div>}
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-lg mb-4 opacity-80 border-b border-black/10 dark:border-white/10 pb-2 text-gray-900 dark:text-white">Ausentes ({availabilities.filter(a => a.status === 'declined').length})</h4>
                <div className="flex flex-wrap gap-2">
                  {availabilities.filter(a => a.status === 'declined').map(a => (
                    <div key={a.user_id} className="text-sm text-gray-500 px-3 py-1 bg-gray-50 dark:bg-[#1A2429] rounded-full border border-black/5 dark:border-white/5">
                      {a.profiles?.full_name}
                    </div>
                  ))}
                  {availabilities.filter(a => a.status === 'declined').length === 0 && <div className="text-sm text-gray-500">Nenhum ausente registrado.</div>}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
