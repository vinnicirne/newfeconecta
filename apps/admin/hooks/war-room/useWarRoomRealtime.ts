import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type WarRoomRole = 'creator' | 'admin' | 'listener' | 'speaker' | 'none';

export function useWarRoomRealtime(roomData: any, user: any, localParticipant: any, onExit: () => void) {
  const [myRole, setMyRole] = useState<WarRoomRole>(roomData?.creator_id === user?.id ? 'creator' : 'none');
  const [dbParticipants, setDbParticipants] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!roomData?.id) return;
    const isLeader = roomData.creator_id === user.id;

    const setupUserRole = async () => {
      if (!roomData?.id) return;

      if (isLeader) {
        await supabase.from('participants').upsert(
          { room_id: roomData.id, user_id: user.id, role: 'creator' },
          { onConflict: 'room_id,user_id' }
        );
        setMyRole('creator');
      } else {
        const { data: p } = await supabase.from('participants')
          .select('role')
          .eq('room_id', roomData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (p) {
          setMyRole(p.role as WarRoomRole);
        } else {
          await supabase.from('participants').insert({
            room_id: roomData.id,
            user_id: user.id,
            role: 'listener'
          });
          setMyRole('listener');
        }
      }

      if (isLeader) {
        const { data: reqs } = await supabase.from('requests')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .eq('room_id', roomData.id)
          .eq('status', 'pending');
        if (reqs) setPendingRequests(reqs);
      }
    };
    setupUserRole();

    const fetchDBMembers = async () => {
      const { data } = await supabase.from('participants').select('*, profiles(*)').eq('room_id', roomData.id);
      if (data) {
        setDbParticipants(data);
        const me = data.find(p => p.user_id === user.id);
        if (me) setMyRole(me.role as WarRoomRole);
      }
    };
    fetchDBMembers();

    const sc = supabase.channel(`war-room-control-${roomData.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomData.id}` }, (p) => {
        if (p.new.status === 'ended') {
          toast.info("A sala foi encerrada.");
          setTimeout(() => onExit(), 1000);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomData.id}` }, fetchDBMembers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `room_id=eq.${roomData.id}` }, async (p) => {
        if (isLeader) {
          if (p.eventType === 'INSERT') {
            const { data } = await supabase.from('profiles').select('*').eq('id', (p.new as any).user_id).single();
            setPendingRequests(prev => [...prev, { ...(p.new as any), profiles: data }]);
          } else {
            setPendingRequests(prev => prev.filter(r => r.id !== (p.new as any).id));
          }
        }
        if ((p.new as any).user_id === user.id && (p.new as any).status === 'approved') {
          setMyRole('speaker');
          toast.success("Seu microfone foi liberado! 🎤");

          setTimeout(async () => {
            if (localParticipant) {
              try {
                await localParticipant.setMicrophoneEnabled(true);
              } catch (e) {
                console.error("Erro na ativação pós-aprovação:", e);
              }
            }
          }, 600);
        }
      }).subscribe();

    return () => { supabase.removeChannel(sc); };
  }, [roomData?.id, roomData?.status, user.id, roomData?.creator_id, localParticipant, onExit]);

  return { myRole, setMyRole, dbParticipants, pendingRequests, setPendingRequests };
}
