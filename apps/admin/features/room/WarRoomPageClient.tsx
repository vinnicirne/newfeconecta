"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WarRoom } from "@/features/room/WarRoom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface WarRoomPageClientProps {
  roomId: string;
}

export default function WarRoomPageClient({ roomId }: WarRoomPageClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authUser) {
          toast.error("Entre na sua conta para participar da sala.");
          router.push("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (profileError) throw profileError;

        setUser({ ...authUser, ...profile });
      } catch (error) {
        console.error("Erro ao carregar perfil para a sala:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 text-white" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-[#3fff8b] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Preparando a sala…</span>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <h1 className="text-lg font-bold">Não foi possível preparar a sala</h1>
        <p className="max-w-sm text-sm text-white/60">Confira sua conexão e tente novamente.</p>
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-[#3fff8b] px-5 py-3 text-sm font-bold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Tentar novamente</button>
        <button type="button" onClick={() => router.push('/room')} className="text-sm text-white/70 underline underline-offset-4">Voltar às salas</button>
      </main>
    );
  }

  return (
    <WarRoom 
      roomId={roomId} 
      user={user} 
      onExit={() => router.push("/")} 
    />
  );
}
