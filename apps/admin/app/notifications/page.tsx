"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, ArrowLeft, MessageSquare, Megaphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  content: string;
  type: string;
  post_id?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
    
    if (!error) {
      setNotifications(notifications.filter(n => n.id !== id));
    }
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
        <Bell className="w-6 h-6 text-whatsapp-teal animate-pulse" />
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
            {notifications.map((notification) => {
              const Icon = notification.type === 'broadcast' ? Megaphone : MessageSquare;
              
              return (
                <Link 
                  key={notification.id}
                  href={notification.post_id ? `/feed?post=${notification.post_id}` : '#'}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "flex gap-4 p-4 transition-colors relative group",
                    !notification.is_read ? "bg-whatsapp-teal/[0.03] dark:bg-whatsapp-teal/[0.05]" : "hover:bg-gray-100/50 dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    !notification.is_read ? "bg-whatsapp-teal text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal/70">
                        {notification.type === 'broadcast' ? 'Comunicado' : 'Alerta'}
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
                    onClick={(e) => deleteNotification(notification.id, e)}
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
