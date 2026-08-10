"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Settings, LogOut, Bell, BellOff, Calendar, Users, Edit3, Trash2, Share2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import moment from "moment";

interface ChurchMemberProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: string;
}

export function ChurchMemberProfileModal({ open, onOpenChange, churchId }: ChurchMemberProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'posts' | 'config'>('perfil');
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (open && churchId) {
      loadMemberData();
    }
  }, [open, churchId]);

  async function loadMemberData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load Member Data and Profile Data
    const { data: member } = await supabase
      .from('church_members')
      .select('*, profiles(full_name, avatar_url, created_at)')
      .eq('church_id', churchId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (member) {
      setMemberInfo(member);
    } else {
      // If not a member, still load profile so the modal doesn't get stuck
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setMemberInfo({ profiles: profile });
      }
    }

    // Load User Posts in this church
    const { data: posts } = await supabase
      .from('church_posts')
      .select('*')
      .eq('church_id', churchId)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    setUserPosts(posts || []);

    // Load User Groups
    const { data: led } = await supabase.from('church_groups').select('id, name').eq('church_id', churchId).eq('leader_id', user.id);
    const { data: memberOf } = await supabase.from('church_group_members').select('church_groups!inner(id, name, church_id)').eq('user_id', user.id).eq('church_groups.church_id', churchId);
    
    const combinedGroups: any[] = [];
    if (led) {
      led.forEach(g => combinedGroups.push({ id: g.id, name: g.name, role: 'Líder' }));
    }
    if (memberOf) {
      memberOf.forEach((m: any) => {
        if (m.church_groups && !combinedGroups.find(cg => cg.id === m.church_groups.id)) {
          combinedGroups.push({ id: m.church_groups.id, name: m.church_groups.name, role: 'Membro' });
        }
      });
    }
    setUserGroups(combinedGroups);

    setLoading(false);
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;
    
    const { error } = await supabase
      .from('church_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast.error("Erro ao excluir post");
    } else {
      toast.success("Post excluído com sucesso");
      setUserPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  const handleSharePost = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success("Link do post copiado!");
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Você realmente deseja sair desta comunidade?")) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Remove do church_members
      const { error, count } = await supabase
        .from('church_members')
        .delete({ count: 'exact' })
        .eq('church_id', churchId)
        .eq('user_id', user.id);

      if (error) {
        toast.error("Erro ao sair da comunidade: " + error.message);
        console.error(error);
        setLoading(false);
        return;
      }

      if (count === 0) {
        console.warn("Nenhum registro encontrado para deletar em church_members.");
      }

      // Remove do church_join_requests caso exista
      await supabase
        .from('church_join_requests')
        .delete()
        .eq('church_id', churchId)
        .eq('user_id', user.id);
    }
    
    toast.success("Você saiu da comunidade.");
    onOpenChange(false);
    // redirect to home
    window.location.href = '/igreja';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 bg-card border-border rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header com Tabs */}
        <div className="pt-6 px-6 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-4 mb-6">
            <img 
              src={memberInfo?.profiles?.avatar_url || 'https://via.placeholder.com/80'} 
              className="w-16 h-16 rounded-full border-2 border-whatsapp-teal object-cover" 
            />
            <div>
              <h2 className="text-xl font-bold">{memberInfo?.profiles?.full_name || 'Carregando...'}</h2>
              <p className="text-sm text-muted-foreground">Membro da Comunidade</p>
            </div>
          </div>

          <div className="flex gap-6 border-border overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('perfil')}
              className={cn("py-3 font-semibold text-sm transition-colors relative", activeTab === 'perfil' ? "text-whatsapp-teal" : "text-muted-foreground hover:text-foreground")}
            >
              Perfil
              {activeTab === 'perfil' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-whatsapp-teal rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              className={cn("py-3 font-semibold text-sm transition-colors relative", activeTab === 'posts' ? "text-whatsapp-teal" : "text-muted-foreground hover:text-foreground")}
            >
              Publicações
              {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-whatsapp-teal rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={cn("py-3 font-semibold text-sm transition-colors relative", activeTab === 'config' ? "text-whatsapp-teal" : "text-muted-foreground hover:text-foreground")}
            >
              Configurações
              {activeTab === 'config' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-whatsapp-teal rounded-t-full" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto no-scrollbar flex-1">
          
          {activeTab === 'perfil' && (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-whatsapp-teal/10 text-whatsapp-teal flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Membro desde</h3>
                  <p className="text-muted-foreground text-sm">
                    {(memberInfo?.created_at || memberInfo?.joined_at || memberInfo?.profiles?.created_at) 
                      ? new Date(memberInfo.created_at || memberInfo.joined_at || memberInfo.profiles.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                      : '...'}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Ministérios e Células</h3>
                    <p className="text-muted-foreground text-sm">Grupos que você participa</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                   {userGroups.length === 0 ? (
                     <div className="text-sm text-muted-foreground text-center py-2">Você ainda não participa de nenhum grupo.</div>
                   ) : (
                     userGroups.map(group => (
                       <div key={group.id} className="p-3 bg-background rounded-xl border border-border text-sm font-semibold flex items-center justify-between">
                         <span>{group.name}</span>
                         <span className={cn(
                           "text-xs px-2 py-1 rounded-full",
                           group.role === 'Líder' ? "text-whatsapp-teal bg-whatsapp-teal/10" : "text-muted-foreground bg-muted"
                         )}>
                           {group.role}
                         </span>
                       </div>
                     ))
                   )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground">Carregando publicações...</div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-2xl">
                  Você ainda não fez nenhuma publicação nesta comunidade.
                </div>
              ) : (
                userPosts.map(post => (
                  <div key={post.id} className="bg-muted/30 border border-border rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-muted-foreground">{moment(post.created_at).fromNow()}</p>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-card border-border rounded-xl">
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit3 className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleSharePost(post.id)}>
                            <Share2 className="w-4 h-4" /> Compartilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {post.content && <p className="text-sm text-foreground whitespace-pre-wrap mt-2">{post.content}</p>}
                    {post.media_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-border">
                        {post.post_type === 'video' ? (
                          <video src={post.media_url} controls className="w-full h-auto max-h-[300px] bg-black" />
                        ) : (
                          <img src={post.media_url} className="w-full h-auto max-h-[300px] object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${notificationsEnabled ? 'bg-whatsapp-teal/10 text-whatsapp-teal' : 'bg-muted text-muted-foreground'}`}>
                    {notificationsEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Notificações do Grupo</h3>
                    <p className="text-muted-foreground text-xs">Receber alertas de novas publicações</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationsEnabled ? 'bg-whatsapp-teal' : 'bg-muted-foreground'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-center justify-between mt-8">
                <div>
                  <h3 className="font-bold text-sm text-red-500">Sair da Comunidade</h3>
                  <p className="text-muted-foreground text-xs">Você deixará de ver as publicações</p>
                </div>
                <button 
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
