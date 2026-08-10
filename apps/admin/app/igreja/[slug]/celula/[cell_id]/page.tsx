"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users, HeartHandshake, BookOpen, MessageCircle, Plus, CheckCircle2, UserCircle2, Image as ImageIcon, Mic, X, Video } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import Link from "next/link";
import { toast } from "sonner";
import moment from "moment";
import 'moment/locale/pt-br';
import { MasterScaleModal } from "@/features/church/components/MasterScaleModal";
import { DashboardAggregator, DashboardContext } from "@/shared/dashboard/application/DashboardAggregator";
import { SupabaseGroupRepository } from "@/domains/groups/infrastructure/SupabaseGroupRepository";
import { SupabaseMeetingRepository } from "@/domains/meetings/infrastructure/SupabaseMeetingRepository";
import { HealthSummary } from "@/shared/dashboard/ui/HealthSummary";
import { CellFeedContainer } from "@/shared/dashboard/ui/feed/CellFeedContainer";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { MembersManagerModal } from "@/features/church/components/MembersManagerModal";

moment.locale('pt-br');

export default function CellDashboard() {
  const { slug, cell_id } = useParams();
  const router = useRouter();
  
  const [cell, setCell] = useState<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);
  const [isCreatePrayerOpen, setIsCreatePrayerOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isMasterScaleOpen, setIsMasterScaleOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  
  // Create Event Wizard State
  const [draftRoles, setDraftRoles] = useState<{ roleName: string, assignedTo: string }[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleAssigned, setNewRoleAssigned] = useState("");
  
  const [draftSongs, setDraftSongs] = useState<{ title: string, artist: string, url: string }[]>([]);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  const [newSongUrl, setNewSongUrl] = useState("");
  
  const [cellMembers, setCellMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  
  // Dashboard Framework State
  const [dashboardContext, setDashboardContext] = useState<DashboardContext | null>(null);

  // Media Post State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'audio' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [draftMeetLink, setDraftMeetLink] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { uploadMedia } = useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const loadingToast = toast.loading("Gerando link do Meet...");
      try {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: "Reunião de Célula",
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
          setDraftMeetLink(meetLink);
          toast.success("Reunião online gerada com sucesso!", { id: loadingToast });
        } else {
          throw new Error("Não foi possível gerar o link");
        }
      } catch (err) {
        toast.error("Erro ao salvar link", { id: loadingToast });
      }
    },
    scope: "https://www.googleapis.com/auth/calendar.events"
  });

  useEffect(() => {
    loadData();
  }, [cell_id]);

  async function loadData() {
    setIsLoading(true);
    try {
      // ✅ Rodada 1: aggregator + auth em paralelo — nenhum depende do outro
      const [context, { data: { user } }] = await Promise.all([
        (async () => {
          const groupRepo = new SupabaseGroupRepository();
          const meetingRepo = new SupabaseMeetingRepository();
          const aggregator = new DashboardAggregator(groupRepo, meetingRepo);
          return aggregator.build(cell_id as string);
        })(),
        supabase.auth.getUser()
      ]);

      if (!context.group) {
        toast.error("Célula não encontrada");
        router.push(`/igreja/${slug}/ministerios`);
        return;
      }

      if (!user) {
        toast.error("Faça login para acessar o ministério.");
        router.push(`/login`);
        return;
      }

      const isUserLeader = context.group.leader_id === user.id;

      // ✅ Rodada 2: membros da igreja + membro do grupo + perfil do user + requests (se líder)
      const [
        { data: membersData },
        { data: churchMember },
        { data: isGroupMember },
        { data: profile },
        { data: requestsData }
      ] = await Promise.all([
        supabase.from('church_members')
          .select('user_id, profiles:user_id(id, full_name)')
          .eq('church_id', context.group.church_id)
          .eq('approved', true),
        supabase.from('church_members')
          .select('role')
          .eq('church_id', context.group.church_id)
          .eq('user_id', user.id)
          .eq('approved', true)
          .maybeSingle(),
        supabase.from('church_group_members')
          .select('user_id')
          .eq('group_id', context.group.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('profiles')
          .select('id, full_name, avatar_url, username')
          .eq('id', user.id)
          .single(),
        isUserLeader 
          ? supabase.from('church_group_requests').select('*, profiles(id, full_name, avatar_url, username)').eq('group_id', context.group.id).eq('status', 'pending') 
          : Promise.resolve({ data: [] })
      ]);

      if (requestsData) setPendingRequests(requestsData);

      if (!churchMember) {
        toast.error("Você precisa ser membro desta igreja para acessar seus grupos.");
        router.push(`/igreja/${slug}`);
        return;
      }
      if (context.group.privacy === 'private' && !isGroupMember && !isUserLeader) {
        toast.error("Este grupo é privado. Somente membros podem acessar.");
        router.push(`/igreja/${slug}/ministerios`);
        return;
      }

      if (membersData) setCellMembers(membersData);
      setCurrentUser(profile || user);
      if (isUserLeader) setIsLeader(true);

      const upcomingMeetings = (context.dashboard as any).upcomingMeetings || [];
      setDashboardContext(context);
      setCell(context.group);
      setEvents(upcomingMeetings);

      // Handle invite parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('invite') === 'true') {
        handleInviteJoin(user, context.group);
      }

    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados do grupo");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInviteJoin(user: any, group: any) {
    // Verifies if user is not already a member
    const { data: existingMember } = await supabase
      .from('church_group_members')
      .select('*')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (existingMember) return;
    
    toast.success("Aceitando convite...");
    
    // Check if user is a member of the church
    const { data: churchMember } = await supabase
      .from('church_members')
      .select('*')
      .eq('church_id', group.church_id)
      .eq('user_id', user.id)
      .eq('approved', true)
      .maybeSingle();
      
    if (!churchMember) {
      toast.error("Você precisa ser membro da igreja para entrar no ministério.");
      return;
    }
    
    const { error } = await supabase
      .from('church_group_members')
      .insert({ group_id: group.id, user_id: user.id });
      
    if (!error) {
      await supabase.from('church_events').insert({
        church_id: group.church_id,
        reference_type: 'group_notice',
        reference_id: group.id,
        title: `👋 ${user.user_metadata?.full_name || 'Alguém'} entrou no ministério através do convite! Dêem as boas-vindas!`,
        event_date: new Date().toISOString(),
        metadata: { isSystem: true },
        created_by: user.id
      });
      toast.success("Você entrou no ministério!");
      
      // Remove invite from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement)?.value;
    const dateStr = (form.elements.namedItem('date') as HTMLInputElement)?.value;
    const timeStr = (form.elements.namedItem('time') as HTMLInputElement)?.value;
    const isSocial = (form.elements.namedItem('isSocial') as HTMLInputElement)?.checked;
    
    if (!title || !dateStr || !timeStr) return toast.error("Preencha os campos obrigatórios");

    setIsLoading(true);

    const event_date = new Date(`${dateStr}T${timeStr}:00`).toISOString();
    let savedEventId;

    if (editingEvent) {
      const { data, error } = await supabase
        .from('church_events')
        .update({
          title,
          event_date,
          metadata: { isSocial, meetLink: draftMeetLink },
        })
        .eq('id', editingEvent.id)
        .select()
        .single();
      
      if (error) { setIsLoading(false); return toast.error("Erro ao atualizar encontro"); }
      savedEventId = data.id;

      await supabase.from('church_event_roles').delete().eq('event_id', savedEventId);
      await supabase.from('church_event_songs').delete().eq('event_id', savedEventId);
    } else {
      const { data, error } = await supabase
        .from('church_events')
        .insert({
          church_id: cell.church_id,
          reference_type: cell.type,
          reference_id: cell_id,
          title,
          event_date,
          metadata: { isSocial, meetLink: draftMeetLink },
          created_by: currentUser?.id
        })
        .select()
        .single();
        
      if (error) { setIsLoading(false); return toast.error("Erro ao agendar encontro"); }
      savedEventId = data.id;
    }

    for (const role of draftRoles) {
      await supabase.from('church_event_roles').insert({
        event_id: savedEventId,
        role_name: role.roleName,
        assigned_to: role.assignedTo || null
      });
    }
    
    for (let i = 0; i < draftSongs.length; i++) {
      const song = draftSongs[i];
      await supabase.from('church_event_songs').insert({
        event_id: savedEventId,
        title: song.title,
        artist: song.artist,
        url: song.url || null,
        order: i
      });
    }

    toast.success(editingEvent ? "Encontro atualizado!" : "Encontro agendado completo!");
    
    setDraftRoles([]);
    setDraftSongs([]);
    setNewRoleName("");
    setNewRoleAssigned("");
    setNewSongTitle("");
    setNewSongArtist("");
    setNewSongUrl("");
    setDraftMeetLink(null);
    setEditingEvent(null);
    setIsCreateEventOpen(false);
    loadData();
  }

  async function handleEditEventRequest(eventId: string) {
    setIsLoading(true);
    const { data: event } = await supabase.from('church_events').select('*').eq('id', eventId).single();
    if (!event) { setIsLoading(false); return toast.error("Encontro não encontrado"); }
    
    const { data: roles } = await supabase.from('church_event_roles').select('*').eq('event_id', eventId);
    if (roles) {
      setDraftRoles(roles.map(r => ({ roleName: r.role_name, assignedTo: r.assigned_to || "" })));
    } else setDraftRoles([]);
    
    const { data: songs } = await supabase.from('church_event_songs').select('*').eq('event_id', eventId).order('order');
    if (songs) {
      setDraftSongs(songs.map(s => ({ title: s.title, artist: s.artist, url: s.url || "" })));
    } else setDraftSongs([]);
    
    setEditingEvent(event);
    setDraftMeetLink(event.metadata?.meetLink || null);
    
    setIsLoading(false);
    setIsCreateEventOpen(true);
  }

  async function handleApproveRequest(groupId: string, userId: string, userName?: string) {
    const loadingToast = toast.loading("Aprovando...");
    try {
      const { error: insertError } = await supabase
        .from('church_group_members')
        .insert({ group_id: groupId, user_id: userId });
        
      if (insertError) throw insertError;
      
      const { error: deleteError } = await supabase
        .from('church_group_requests')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
        
      if (deleteError) throw deleteError;
      
      await supabase.from('church_events').insert({
        church_id: cell.church_id,
        reference_type: 'group_notice',
        reference_id: groupId,
        title: `👋 ${userName || 'Novo membro'} entrou na célula! Dêem as boas-vindas!`,
        event_date: new Date().toISOString(),
        metadata: { isSystem: true },
        created_by: userId
      });
      
      setPendingRequests(prev => prev.filter(req => req.user_id !== userId));
      toast.success("Membro aprovado com sucesso!", { id: loadingToast });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar membro.", { id: loadingToast });
    }
  }

  async function handleRejectRequest(groupId: string, userId: string) {
    if (!window.confirm("Deseja realmente rejeitar este pedido?")) return;
    const loadingToast = toast.loading("Rejeitando...");
    try {
      const { error } = await supabase
        .from('church_group_requests')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      setPendingRequests(prev => prev.filter(req => req.user_id !== userId));
      toast.success("Pedido rejeitado.", { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao rejeitar pedido.", { id: loadingToast });
    }
  }

  async function handleCreateNotice(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    
    if (!title && !mediaFile) return toast.error("Preencha a mensagem ou grave um áudio.");

    const uploadToast = toast.loading("Publicando no mural...");
    try {
      let finalMediaUrl = null;
      if (mediaFile) {
        const uploadedUrl = await uploadMedia(mediaFile, { bucket: 'posts', folder: `cells/${cell_id}` });
        if (!uploadedUrl) throw new Error("Falha no upload da mídia");
        finalMediaUrl = uploadedUrl;
      }

      const { data, error } = await supabase
        .from('church_events')
        .insert({
          church_id: cell.church_id,
          reference_type: `${cell.type}_notice`,
          reference_id: cell_id,
          title,
          event_date: new Date().toISOString(),
          metadata: finalMediaUrl ? { mediaUrl: finalMediaUrl, mediaType } : {},
          created_by: currentUser?.id
        });

      if (error) throw error;
      
      toast.success("Publicado no Mural!", { id: uploadToast });
      setIsCreateNoticeOpen(false);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      loadData(); // Reload context to show the new notice
    } catch (err) {
      toast.error("Erro ao publicar aviso", { id: uploadToast });
    }
  }

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Microfone bloqueado: A gravação exige conexão segura (HTTPS ou localhost).");
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], "audio.webm", { type: 'audio/webm' });
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(blob));
        setMediaType('audio');
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      toast.info("Gravando áudio... Clique novamente para parar.");
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setMediaType('image');
      setIsCreateNoticeOpen(true);
    }
  };

  async function handleCreatePrayer(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const reason = (form.elements.namedItem('reason') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    
    if (!reason || !description) return toast.error("Preencha o motivo e a descrição do pedido.");

    const { data, error } = await supabase
      .from('church_events')
      .insert({
        church_id: cell.church_id,
        reference_type: `${cell.type}_prayer`,
        reference_id: cell_id,
        title: `Pedido: ${reason}`,
        event_date: new Date().toISOString(),
        metadata: { requests: [{ reason, description }] },
        created_by: currentUser?.id
      });

    if (error) {
      toast.error("Erro ao publicar pedido de oração");
    } else {
      toast.success("Pedido de oração publicado!");
      setIsCreatePrayerOpen(false);
      loadData();
    }
  }

  if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center">Carregando...</div>;
  if (!cell) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] pb-40 text-gray-900 dark:text-white transition-colors relative">
      
      {/* HEADER / BANNER */}
      <div className="relative h-48 md:h-64 bg-gray-200 dark:bg-[#111B21]">
        {cell.logo_url ? (
          <img src={cell.logo_url} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-[#0A0A0A] via-transparent to-black/30" />
        
        <button 
          onClick={() => router.back()}
          className="absolute top-6 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10">
        
        {/* INFO PRINCIPAL */}
        <div className="mb-6">
          <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white mb-2 uppercase tracking-wider">
            {cell.type === 'cell' ? 'Pequeno Grupo' : 'Ministério'}
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{cell.name}</h1>
          
          <div className="flex flex-col gap-2 mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {cell.meeting_day && cell.meeting_time && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" /> 
                {cell.meeting_day} • {cell.meeting_time}
              </div>
            )}
          </div>

              <div className="flex items-center justify-between mt-8 mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Visão Geral</h3>
                <button 
                  onClick={() => setIsMasterScaleOpen(true)}
                  className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" /> Todas as escalas
                </button>
              </div>
            </div>

        {/* Pedidos Pendentes */}
        {pendingRequests.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 mb-6">
            <h3 className="text-red-600 dark:text-red-400 font-bold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" /> Pedidos de Entrada ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-xl border border-red-50 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <img src={req.profiles?.avatar_url || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{req.profiles?.full_name}</p>
                      <p className="text-xs text-gray-500">@{req.profiles?.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRejectRequest(req.group_id, req.user_id)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 rounded-lg"
                    >
                      Rejeitar
                    </button>
                    <button 
                      onClick={() => handleApproveRequest(req.group_id, req.user_id, req.profiles?.full_name)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-green-500 rounded-lg"
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Framework UI (Main Zones) */}
        {dashboardContext && (
          <div className="mt-6">
            <HealthSummary summary={dashboardContext.dashboard.summary} />
            
            {/* Create Post Box */}
            <div className="bg-white dark:bg-[#1A2429] rounded-2xl p-4 shadow-sm border border-black/5 dark:border-white/5 mb-6 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden shrink-0">
                  {currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url ? (
                    <img src={currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-full h-full text-gray-400" />
                  )}
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-[#111B21] flex items-center pr-2 rounded-full overflow-hidden transition-colors hover:bg-gray-200 dark:hover:bg-black/40">
                  <button 
                    onClick={() => setIsCreateNoticeOpen(true)}
                    className="flex-1 text-gray-500 text-left px-4 py-3 text-sm focus:outline-none"
                  >
                    Compartilhar
                  </button>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      if (isRecording) {
                        stopRecording();
                        setIsCreateNoticeOpen(true);
                      } else {
                        startRecording();
                      }
                    }}
                    className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse bg-red-100 dark:bg-red-900/30 rounded-full' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-between border-t border-black/5 dark:border-white/5 pt-3">
                <button 
                  onClick={() => setIsCreateEventOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black/20 py-2 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4 text-indigo-500" /> Evento
                </button>
                <button 
                  onClick={() => setIsCreateNoticeOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black/20 py-2 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> Aviso
                </button>
                <button 
                  onClick={() => setIsCreatePrayerOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black/20 py-2 rounded-lg transition-colors"
                >
                  <HeartHandshake className="w-4 h-4 text-rose-500" /> Oração
                </button>
              </div>
            </div>
            
            <CellFeedContainer 
              feed={dashboardContext.dashboard.feed} 
              onOpenMeeting={handleEditEventRequest}
              isLeader={isLeader}
              currentUser={currentUser}
              onReload={loadData}
            />
          </div>
        )}
      </div>

      {/* Menu Inferior Fixo Específico da Célula */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#111B21] border-t border-black/5 dark:border-white/5 px-6 flex items-center justify-between pb-safe z-[110] max-w-md mx-auto rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col items-center text-indigo-500">
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Início</span>
        </div>
        <div onClick={() => setIsMembersModalOpen(true)} className="flex flex-col items-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Membros</span>
        </div>
        <div onClick={() => toast.info("Agenda")} className="flex flex-col items-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Agenda</span>
        </div>
      </div>

      {/* Modal Criar Encontro - Formulário Completo */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111B21] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#111B21]/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{editingEvent ? "Editar Encontro" : "Agendar Encontro"}</h2>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 no-scrollbar flex-1">
              <form id="create-event-form" onSubmit={handleSaveEvent} className="space-y-4">
                <div className="mb-2">
                  <h3 className="font-bold text-lg text-[#25D366] flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                    <Calendar size={18} /> Detalhes Básicos
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                  <input required type="text" name="title" defaultValue={editingEvent ? editingEvent.title : "Culto da Célula"} className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                    <input required type="date" name="date" defaultValue={editingEvent ? editingEvent.event_date.split('T')[0] : ""} className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Horário *</label>
                    <input required type="time" name="time" defaultValue={editingEvent ? new Date(editingEvent.event_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : cell.meeting_time || "20:00"} className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                  </div>
                </div>
                
                <div className="mt-4 bg-gray-100 dark:bg-[#1A2429] border border-black/5 dark:border-white/5 p-4 rounded-xl">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="isSocial" 
                      defaultChecked={editingEvent?.metadata?.isSocial}
                      className="w-5 h-5 rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white">Evento Social / Festa</span>
                      <span className="text-xs text-gray-500 mt-1">Desativa o aviso de "Palavra não definida" e dispensa a escala de pregação.</span>
                    </div>
                  </label>
                </div>
                <div className="mt-4 bg-gray-100 dark:bg-[#1A2429] border border-black/5 dark:border-white/5 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Video size={16} className="text-blue-500" /> Reunião Online (Meet)
                    </span>
                    <span className="text-xs text-gray-500 mt-1 max-w-[200px]">Gere um link para os membros entrarem na célula online.</span>
                  </div>
                  {draftMeetLink ? (
                    <a href={draftMeetLink} target="_blank" className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors shrink-0">
                      Entrar na Célula
                    </a>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => googleLogin()}
                      className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-white/20 transition-colors shrink-0"
                    >
                      Gerar Reunião
                    </button>
                  )}
                </div>
              </form>

              {/* Seção de Escala (Draft) */}
              <div className="space-y-4">
                <div className="mb-2">
                  <h3 className="font-bold text-lg text-[#25D366] flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                    <HeartHandshake size={18} /> Escala de Voluntários
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <input 
                    type="text" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Função (ex: Lanche)" 
                    className="md:col-span-5 bg-gray-100 dark:bg-[#1A2429] border border-transparent focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white text-sm" 
                  />
                  <select 
                    value={newRoleAssigned}
                    onChange={(e) => setNewRoleAssigned(e.target.value)}
                    className="md:col-span-5 bg-gray-100 dark:bg-[#1A2429] border border-transparent focus:border-[#25D366] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">-- Atribuir a (opcional) --</option>
                    {cellMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || 'Usuário'}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!newRoleName) return toast.error("Digite o nome da função");
                      setDraftRoles([...draftRoles, { roleName: newRoleName, assignedTo: newRoleAssigned }]);
                      setNewRoleName("");
                      setNewRoleAssigned("");
                    }}
                    className="md:col-span-2 bg-[#25D366]/20 text-[#25D366] px-4 py-3 rounded-xl font-bold hover:bg-[#25D366]/30 transition-all flex items-center justify-center gap-2 text-sm border border-[#25D366]/30"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                <div className="space-y-2 mt-3">
                  {draftRoles.length === 0 && <div className="text-center py-4 text-gray-500 text-sm">Nenhuma função definida.</div>}
                  {draftRoles.map((role, i) => (
                    <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{role.roleName}</div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="flex-1 bg-white dark:bg-[#111B21] border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 outline-none text-xs text-gray-500 line-clamp-1">
                          {role.assignedTo ? (cellMembers.find(m => m.user_id === role.assignedTo)?.profiles?.full_name || 'Usuário') : 'Aberto'}
                        </span>
                        <button type="button" onClick={() => setDraftRoles(draftRoles.filter((_, idx) => idx !== i))} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção de Louvor (Draft) */}
              <div className="space-y-4">
                <div className="mb-2">
                  <h3 className="font-bold text-lg text-[#25D366] flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Louvor
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newSongTitle}
                      onChange={(e) => setNewSongTitle(e.target.value)}
                      placeholder="Nome da música" 
                      className="bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white text-sm" 
                    />
                    <input 
                      type="text" 
                      value={newSongArtist}
                      onChange={(e) => setNewSongArtist(e.target.value)}
                      placeholder="Cantor / Banda" 
                      className="bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white text-sm" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newSongUrl}
                      onChange={(e) => setNewSongUrl(e.target.value)}
                      placeholder="Link (Opcional)" 
                      className="flex-1 bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-sm text-gray-900 dark:text-white" 
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        if (!newSongTitle || !newSongArtist) return toast.error("Preencha o nome e cantor da música");
                        setDraftSongs([...draftSongs, { title: newSongTitle, artist: newSongArtist, url: newSongUrl }]);
                        setNewSongTitle("");
                        setNewSongArtist("");
                        setNewSongUrl("");
                      }}
                      className="bg-[#25D366]/20 text-[#25D366] px-4 py-3 rounded-xl font-bold hover:bg-[#25D366]/30 transition-all flex items-center justify-center border border-[#25D366]/30"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {draftSongs.length === 0 && <div className="text-center py-4 text-gray-500 text-sm">Nenhuma música adicionada.</div>}
                  {draftSongs.map((song, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                      <div className="flex-1 overflow-hidden">
                        <div className="font-bold text-sm leading-tight text-gray-900 dark:text-white truncate">{song.title}</div>
                        <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                      </div>
                      <button type="button" onClick={() => setDraftSongs(draftSongs.filter((_, idx) => idx !== i))} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#111B21] flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreateEventOpen(false);
                  setEditingEvent(null);
                  setDraftRoles([]);
                  setDraftSongs([]);
                  setDraftMeetLink(null);
                }} 
                className="flex-1 py-3.5 bg-gray-200 dark:bg-[#1A2429] text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" form="create-event-form" className="flex-1 py-3.5 bg-[#25D366] text-black rounded-xl font-bold hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20">
                {editingEvent ? "Salvar Alterações" : "Agendar Evento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR PEDIDO DE ORAÇÃO */}
      {isCreatePrayerOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111B21] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#111B21]/90 backdrop-blur-md z-10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-500" />
                Novo Pedido de Oração
              </h3>
              <button onClick={() => setIsCreatePrayerOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <form id="createPrayerForm" onSubmit={handleCreatePrayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Motivo</label>
                  <input 
                    name="reason"
                    required
                    placeholder="Ex: Saúde, Família, Vida Financeira..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Detalhes</label>
                  <textarea 
                    name="description"
                    required
                    rows={4}
                    placeholder="Descreva pelo que devemos interceder..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-[#111B21] sticky bottom-0 z-10">
              <div className="flex gap-3 max-w-sm mx-auto">
                <button 
                  onClick={() => setIsCreatePrayerOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="createPrayerForm"
                  className="flex-1 py-3 px-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Aviso */}
      {isCreateNoticeOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateNotice} className="bg-white dark:bg-[#111B21] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-emerald-500" /> Publicar
            </h2>
            
            {/* PREVIEW MEDIA */}
            {mediaPreview && mediaType === 'image' && (
              <div className="relative mb-4">
                <img src={mediaPreview} className="w-full h-auto max-h-64 object-cover rounded-xl" />
                <button type="button" onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}
            
            {mediaPreview && mediaType === 'audio' && (
              <div className="relative mb-4 flex items-center gap-4 bg-gray-100 dark:bg-[#1A2429] p-4 rounded-xl border border-black/5 dark:border-white/5">
                <audio src={mediaPreview} controls className="w-full" />
                <button type="button" onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }} className="bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full p-2 hover:bg-red-200 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <textarea 
                  name="title" 
                  rows={4}
                  placeholder="Escreva algo (opcional)..."
                  className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white resize-none" 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreateNoticeOpen(false);
                  setMediaFile(null);
                  setMediaPreview(null);
                  setMediaType(null);
                }} 
                className="flex-1 py-3 bg-gray-200 dark:bg-[#1A2429] text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors">
                Publicar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Master Scale Modal */}
      {isMasterScaleOpen && (
        <MasterScaleModal 
          groupId={cell_id as string}
          onClose={() => setIsMasterScaleOpen(false)}
        />
      )}

      {isMembersModalOpen && (
        <MembersManagerModal 
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          groupId={cell_id as string}
          churchId={cell.church_id}
          churchSlug={slug as string}
          isLeader={isLeader}
          onMemberAdded={loadData}
        />
      )}
    </div>
  );
}
