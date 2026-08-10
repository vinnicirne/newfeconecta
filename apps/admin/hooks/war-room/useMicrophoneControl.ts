import { useEffect } from 'react';

export function useMicrophoneControl(
  localParticipant: any,
  myRole: 'creator' | 'admin' | 'listener' | 'speaker' | 'none'
) {
  useEffect(() => {
    if (!localParticipant) return;
    const canSpeak = myRole === 'creator' || myRole === 'admin' || myRole === 'speaker';

    const enableMic = async () => {
      try {
        if (canSpeak) {
          // Handshake Robusto usando LiveKit sem while infinito
          await localParticipant.setMicrophoneEnabled(true);
        } else {
          await localParticipant.setMicrophoneEnabled(false);
        }
      } catch (err: any) {
        console.error("❌ Erro ao controlar microfone:", err);
      }
    };
    
    enableMic();
  }, [myRole, localParticipant]);
}
