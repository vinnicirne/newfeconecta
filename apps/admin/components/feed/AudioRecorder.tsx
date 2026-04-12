"use client";

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause } from 'lucide-react';

export default function AudioRecorder({ open, onClose, onSubmit }: any) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      mediaRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const togglePlay = () => {
    if (!audioElRef.current) return;
    if (playing) { audioElRef.current.pause(); setPlaying(false); }
    else { audioElRef.current.play(); setPlaying(true); }
  };

  const [caption, setCaption] = useState("");

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
      const fileUrl = URL.createObjectURL(file);
      
      await onSubmit({ media_url: fileUrl, post_type: 'audio', caption });
      
      setAudioUrl(null);
      setSeconds(0);
      setCaption("");
    } catch (err) {
      console.error('Audio submit error:', err);
    } finally {
      setUploading(false);
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={() => { setAudioUrl(null); setRecording(false); onClose(); }}>
      <DialogContent className="sm:max-w-sm z-[200] max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader><DialogTitle>Gravar áudio</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${recording ? 'bg-red-100 animate-pulse' : 'bg-muted'}`}>
            <Mic className={`w-10 h-10 ${recording ? 'text-red-500' : 'text-muted-foreground'}`} />
          </div>
          <span className="text-2xl font-mono font-bold dark:text-white">{fmt(seconds)}</span>
          {audioUrl && (
            <div className="w-full animate-in fade-in slide-in-from-top-2">
              <textarea 
                placeholder="Legenda para o áudio (opcional)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-gray-50 dark:bg-whatsapp-dark border border-gray-100 dark:border-white/5 rounded-xl p-3 text-sm resize-none focus:ring-1 focus:ring-whatsapp-green outline-none min-h-[80px]"
              />
            </div>
          )}
          {audioUrl && <audio ref={audioElRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />}
          <div className="flex gap-3 w-full">
            {!audioUrl ? (
              recording ? (
                <Button variant="destructive" className="flex-1" onClick={stopRec}>
                  <Square className="w-4 h-4 mr-2" /> Parar
                </Button>
              ) : (
                <Button className="flex-1" onClick={startRec}>
                  <Mic className="w-4 h-4 mr-2" /> Gravar
                </Button>
              )
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={togglePlay}>
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setAudioUrl(null); setSeconds(0); }}>Regravar</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={uploading}>
                  {uploading ? 'Enviando...' : 'Publicar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
