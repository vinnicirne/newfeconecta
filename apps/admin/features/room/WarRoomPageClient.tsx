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

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast.error("Você precisa estar logado");
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      setUser({ ...authUser, ...profile });
      setLoading(false);
    }
    getUser();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#3fff8b] border-t-transparent rounded-full animate-spin" />
      </div>
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
