"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

import { toast } from 'sonner';

export default function FollowSuggestions({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.id) return;

    const loadSuggestions = async () => {
      try {
        // 1. Buscamos quem eu já sigo para filtrar
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);
        
        const followingIds = (following || []).map(f => f.following_id);
        followingIds.push(currentUser.id); // Não sugerir a si mesmo

        // 2. Buscamos sugestões (não seguidos)
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .not('id', 'in', `(${followingIds.join(',')})`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setUsers(data || []);
      } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
      }
    };

    loadSuggestions();
  }, [currentUser?.id]);

  const handleFollow = async (targetId: string, username: string) => {
    if (loadingIds.has(targetId)) return;
    setLoadingIds(prev => new Set(prev).add(targetId));

    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetId });

      if (error) throw error;

      toast.success(`Agora você segue @${username}`);
      setUsers(prev => prev.filter(u => u.id !== targetId));
      
      // Disparar evento para atualizar contadores globais (opcional)
      window.dispatchEvent(new CustomEvent('user-follow-changed', { detail: { userId: targetId, isFollowing: true } }));
    } catch (err) {
      toast.error("Falha ao seguir usuário");
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  if (!users.length) return null;

  return (
    <div className="bg-white dark:bg-whatsapp-darkLighter border-y sm:border border-gray-100 dark:border-white/5 sm:rounded-2xl py-4 mb-4 mt-2 overflow-hidden">
      <h3 className="px-4 font-bold text-sm text-gray-900 dark:text-gray-100 mb-4 tracking-tight flex items-center justify-between">
         Sugestões para você
         <span className="text-[10px] text-whatsapp-teal font-black uppercase tracking-widest bg-whatsapp-teal/10 px-2 py-0.5 rounded-full">Recomendado</span>
      </h3>
      
      <div className="flex overflow-x-auto gap-3 px-4 pb-2 snap-x custom-scrollbar">
        {users.map(u => (
          <div key={u.id} className="min-w-[150px] max-w-[150px] flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-100 dark:border-white/5 snap-center shrink-0 bg-gray-50/50 dark:bg-white/5 hover:border-whatsapp-teal/30 transition-all group">
            <Link href={`/profile/${u.username}`} className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-whatsapp-dark shadow-sm mb-3 hover:scale-105 transition-transform">
              {u.avatar_url ? (
                <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal/20 to-whatsapp-green/20 flex items-center justify-center text-whatsapp-teal font-black text-xl">
                  {u.full_name?.[0] || 'U'}
                </div>
              )}
            </Link>
            
            <Link href={`/profile/${u.username}`} className="font-bold text-[13px] truncate w-full text-center hover:text-whatsapp-teal dark:text-white transition-colors">
              {u.full_name}
            </Link>
            <p className="text-[10px] text-gray-400 mb-4 truncate w-full text-center">@{u.username}</p>
            
            <button 
              onClick={() => handleFollow(u.id, u.username)}
              disabled={loadingIds.has(u.id)}
              className="w-full py-2 bg-whatsapp-teal hover:bg-whatsapp-green disabled:bg-gray-400 text-white rounded-xl text-[11px] font-black text-center transition-all shadow-md active:scale-95 flex items-center justify-center"
            >
              {loadingIds.has(u.id) ? "CARREGANDO..." : "SEGUIR"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
