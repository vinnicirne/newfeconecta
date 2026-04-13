"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Repeat, 
  Zap, 
  CheckCheck,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'story_reaction' | 'mention';
  content?: string;
  is_read: boolean;
  created_at: string;
  sender: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

export default function NotificationCenter({ open, onClose, userId }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      loadNotifications();
      markAllAsRead();
    }
  }, [open, userId]);

  const loadNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:sender_id(full_name, avatar_url, username)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error) setNotifications(data as any);
    setLoading(false);
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />;
      case 'comment': return <MessageCircle className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />;
      case 'follow': return <UserPlus className="w-3.5 h-3.5 text-whatsapp-teal" />;
      case 'repost': return <Repeat className="w-3.5 h-3.5 text-green-500" />;
      case 'story_reaction': return <Zap className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />;
      default: return <Bell className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  // Removi o return null para garantir que o componente responda ao estado instantaneamente
  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex justify-end transition-all duration-300",
      open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-whatsapp-dark h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black dark:text-white">Atividade</h2>
            <div className="bg-whatsapp-teal/10 text-whatsapp-teal px-2 py-0.5 rounded-lg text-xs font-bold">
              {notifications.filter(n => !n.is_read).length} Novas
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 dark:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-whatsapp-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 px-10 text-center">
              <Bell className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">Nenhuma atividade no momento</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={cn(
                    "p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer",
                    !notif.is_read && "bg-whatsapp-teal/5 dark:bg-whatsapp-teal/5"
                  )}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={notif.sender?.avatar_url || 'https://via.placeholder.com/150'} 
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-whatsapp-dark shadow-sm"
                      alt=""
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl bg-white dark:bg-whatsapp-dark shadow-md flex items-center justify-center border border-gray-100 dark:border-white/5">
                      {getIcon(notif.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm dark:text-white leading-snug">
                      <span className="font-black text-whatsapp-teal hover:underline">
                        @{notif.sender?.username || 'usuario'}
                      </span>
                      {' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {notif.type === 'like' && 'curtiu sua publicação.'}
                        {notif.type === 'comment' && 'comentou na sua postagem.'}
                        {notif.type === 'follow' && 'começou a seguir você.'}
                        {notif.type === 'repost' && 'republicou seu post.'}
                        {notif.type === 'story_reaction' && 'reagiu ao seu status.'}
                        {notif.type === 'mention' && 'mencionou você.'}
                      </span>
                    </p>
                    {notif.content && (
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500 italic bg-gray-100 dark:bg-white/5 p-2 rounded-lg border-l-2 border-whatsapp-teal">
                        "{notif.content}"
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-whatsapp-dark/50">
           <button className="w-full py-3 rounded-2xl bg-whatsapp-teal/10 text-whatsapp-teal text-xs font-black uppercase tracking-widest hover:bg-whatsapp-teal/20 transition-all">
              Ver histórico completo
           </button>
        </div>
      </div>
    </div>
  );
}
