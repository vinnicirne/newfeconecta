"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WarRoom } from "@/features/room/WarRoom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
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
        <div className="w-8 h-8 border-4 border-whatsapp-teal border-t-transparent rounded-full animate-spin" />
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
