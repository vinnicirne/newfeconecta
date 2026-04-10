"use client";

import { useRef, useState, useEffect } from 'react';
import { X, Check, FlipHorizontal, Image, Circle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoryCreator({ open, onClose, user, onCreated }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
    } catch (e) {
      console.error('Camera error', e);
    }
  };

  useEffect(() => {
    if (open) startCamera();
    return () => { 
      stopCamera(); 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [open, facingMode]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
    }
    canvas.toBlob(blob => {
      if (blob) {
        setPreview({ url: URL.createObjectURL(blob), type: 'image', blob, mimeType: 'image/jpeg' });
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const mimeType = isIOS ? 'video/mp4' : 'video/webm;codecs=vp9,opus';
    
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 4000000 });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setPreview({ url: URL.createObjectURL(blob), type: 'video', blob, mimeType });
        stopCamera();
      };
      recorderRef.current = recorder;
      recorder.start(100);
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration(d => {
          if (d + 1 >= 15) stopRecording();
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Story record error:", err);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleAction = () => {
    if (mode === 'photo') capturePhoto();
    else if (!recording) startRecording();
    else stopRecording();
  };

  const handlePublish = async () => {
    setUploading(true);
    console.log("Story published locally:", preview.url);
    setUploading(false);
    onCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="flex-1 relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={cn("absolute inset-0 w-full h-full object-cover", preview && "hidden", facingMode === 'user' && "-scale-x-100")} 
        />
        
        {preview?.type === 'image' && <img src={preview.url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
        {preview?.type === 'video' && <video src={preview.url} autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover" />}

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/50 to-transparent">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md">
            <X />
          </button>
          {recording && (
            <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-pulse">
              {recordDuration}s / 15s
            </div>
          )}
          <button 
            onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')} 
            className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md"
          >
            <FlipHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="p-10 pb-16 bg-black flex items-center justify-center gap-12 border-t border-white/5">
        {!preview ? (
          <>
            <button onClick={() => setMode('photo')} className={cn("text-xs font-bold tracking-widest", mode === 'photo' ? "text-white" : "text-white/40")}>FOTO</button>
            <button 
              onPointerDown={handleAction}
              className={cn(
                "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-90",
                recording ? "border-red-500 scale-110" : "border-white"
              )}
            >
              {recording ? (
                <div className="w-8 h-8 rounded-sm bg-red-500" />
              ) : (
                <div className={cn("w-14 h-14 rounded-full", mode === 'video' ? "bg-red-500" : "bg-white")} />
              )}
            </button>
            <button onClick={() => setMode('video')} className={cn("text-xs font-bold tracking-widest", mode === 'video' ? "text-white" : "text-white/40")}>VÍDEO</button>
          </>
        ) : (
          <div className="flex items-center gap-10">
            <button onClick={() => setPreview(null)} className="flex flex-col items-center gap-2 text-white/60">
              <RotateCcw />
              <span className="text-[10px] font-bold tracking-widest uppercase">Refazer</span>
            </button>
            <button 
              onClick={handlePublish}
              disabled={uploading}
              className="w-20 h-20 rounded-full bg-whatsapp-green flex items-center justify-center active:scale-90 transition-all shadow-xl shadow-whatsapp-green/20"
            >
              {uploading ? <div className="w-8 h-8 rounded-full border-4 border-whatsapp-dark border-t-transparent animate-spin" /> : <Check className="text-whatsapp-dark w-10 h-10" />}
            </button>
            <div className="w-10" />
          </div>
        )}
      </div>
    </div>
  );
}
