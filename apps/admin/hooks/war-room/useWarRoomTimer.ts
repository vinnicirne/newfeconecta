import { useState, useEffect } from 'react';
import moment from 'moment';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useWarRoomTimer(roomData: any, userId: string, onExit: () => void) {
  const [remainingTime, setRemainingTime] = useState("");

  useEffect(() => {
    if (!roomData?.created_at) return;

    const tInterval = setInterval(async () => {
      const end = moment(roomData.created_at).add(roomData.duration_minutes || 60, 'minutes');
      const diff = end.diff(moment());

      if (diff <= 0) {
        setRemainingTime("00:00");
        clearInterval(tInterval);

        // Atualiza a sala como finalizada se ainda não foi (qualquer um pode engatilhar se a sala expirou)
        if (roomData.status !== 'ended') {
          try {
            fetch('/api/livekit/end-room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId: roomData.id })
            });
          } catch (e) {}

          await supabase.from('rooms').update({
            status: 'ended',
            ended_at: new Date().toISOString()
          }).eq('id', roomData.id);
        }
        
        toast.error("O tempo do clamor acabou! 🙏");
        setTimeout(() => onExit(), 1500);
        
        return;
      }

      const dur = moment.duration(diff);
      setRemainingTime(`${Math.floor(dur.asMinutes())}:${dur.seconds() < 10 ? '0' : ''}${dur.seconds()}`);
    }, 1000);

    return () => clearInterval(tInterval);
  }, [roomData?.id, roomData?.creator_id, roomData?.created_at, roomData?.duration_minutes, roomData?.status, userId, onExit]);

  return remainingTime;
}
