"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Bell, ArrowLeft, MessageSquare, Megaphone, Trash2, Users, 
  Heart, UserPlus, Repeat, AtSign, BookOpen, Mic, Radio, Sparkles 
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    };
    initAuth();
  }, []);

  const { 
    notifications, 
    isLoading: loading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification 
  } = useNotifications(currentUser?.id || null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(id);
  };

  const hasUnread = notifications.some((n: any) => !n.is_read);

  const getNotificationDetails = (notification: any) => {
    let Icon = MessageSquare;
    let iconColor = "text-whatsapp-teal";
    let bgColor = "bg-whatsapp-teal/10";
    let title = "Notificação";
    let linkHref = "/";

    switch (notification.type) {
      case 'like':
      case 'story_reaction':
        Icon = Heart;
        iconColor = "text-rose-500";
        bgColor = "bg-rose-500/10";
        title = "Curtida";
        if (notification.post_id) linkHref = `/?post=${notification.post_id}`;
        break;
      case 'comment':
        Icon = MessageSquare;
        iconColor = "text-whatsapp-teal";
        bgColor = "bg-whatsapp-teal/10";
        title = "Comentário";
        if (notification.post_id) linkHref = `/?post=${notification.post_id}`;
        break;
      case 'follow':
        Icon = UserPlus;
        iconColor = "text-blue-500";
        bgColor = "bg-blue-500/10";
        title = "Novo Seguidor";
        if (notification.sender_username) {
          linkHref = `/profile/${notification.sender_username}`;
        }
        break;
      case 'repost':
      case 'verse_day':
        Icon = Repeat;
        iconColor = "text-emerald-500";
        bgColor = "bg-emerald-500/10";
        title = "Compartilhamento";
        if (notification.post_id) linkHref = `/?post=${notification.post_id}`;
        break;
      case 'mention':
        Icon = AtSign;
        iconColor = "text-amber-500";
        bgColor = "bg-amber-500/10";
        title = "Menção";
        if (notification.post_id) linkHref = `/?post=${notification.post_id}`;
        break;
      case 'room_invite':
      case 'new_room':
        Icon = Mic;
        iconColor = "text-orange-500";
        bgColor = "bg-orange-500/10";
        title = "Sala de Oração";
        if (notification.metadata?.room_id) {
          linkHref = `/room/${notification.metadata.room_id}`;
        } else {
          linkHref = "/room";
        }
        break;
      case 'new_post':
        Icon = Sparkles;
        iconColor = "text-purple-500";
        bgColor = "bg-purple-500/10";
        title = "Nova Publicação";
        if (notification.post_id) linkHref = `/?post=${notification.post_id}`;
        break;
      case 'broadcast':
        Icon = Megaphone;
        iconColor = "text-amber-500";
        bgColor = "bg-amber-500/10";
        title = "Comunicado Oficial";
        break;
      case 'church_join_request':
        Icon = Users;
        iconColor = "text-indigo-500";
        bgColor = "bg-indigo-500/10";
        title = "Novo Membro";
        if (notification.metadata?.church_slug) {
          linkHref = `/igreja/${notification.metadata.church_slug}/admin/membros`;
        }
        break;
      default:
        Icon = MessageSquare;
        iconColor = "text-whatsapp-teal";
        bgColor = "bg-whatsapp-teal/10";
        title = "Alerta";
        if (notification.post_id) linkHref = `/?post=${notification.post_id}`;
    }

    return { Icon, iconColor, bgColor, title, linkHref };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-whatsapp-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors font-outfit">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold font-outfit tracking-tight">Notificações</h1>
        </div>
        <div className="flex items-center gap-3">
          {hasUnread && (
            <button 
              onClick={markAllAsRead} 
              className="text-[11px] font-black uppercase text-whatsapp-teal hover:underline tracking-wider"
            >
              Marcar lidas
            </button>
          )}
          <Bell className="w-6 h-6 text-whatsapp-teal animate-pulse" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-whatsapp-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 font-medium font-outfit">Buscando mensagens do Reino...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-outfit mb-2">Tudo em paz por aqui</h3>
              <p className="text-gray-400 text-sm">Você não tem novas notificações no momento.</p>
            </div>
            <Link 
              href="/"
              className="px-6 py-3 bg-whatsapp-teal text-white rounded-xl font-bold hover:bg-whatsapp-teal-dark transition-colors"
            >
              Voltar para o Feed
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {notifications.map((notification: any) => {
              const { Icon, iconColor, bgColor, title, linkHref } = getNotificationDetails(notification);

              return (
                <Link 
                  key={notification.id}
                  href={linkHref}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "flex gap-4 p-4 transition-colors relative group",
                    !notification.is_read ? "bg-whatsapp-teal/[0.03] dark:bg-whatsapp-teal/[0.05]" : "hover:bg-gray-100/50 dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className="relative shrink-0">
                    {notification.sender_avatar ? (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-800 border border-black/10 dark:border-white/10">
                        <img src={notification.sender_avatar} className="w-full h-full object-cover" alt="" />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                        bgColor,
                        iconColor
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                    )}
                    {notification.sender_avatar && (
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm",
                        bgColor,
                        iconColor
                      )}>
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal/70">
                        {title}
                      </span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-whatsapp-teal animate-pulse" />
                      )}
                    </div>
                    <p className={cn(
                      "text-sm leading-relaxed line-clamp-2",
                      !notification.is_read ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {notification.content}
                    </p>
                    <span className="text-[11px] text-gray-400 mt-2 block font-medium">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all text-gray-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
