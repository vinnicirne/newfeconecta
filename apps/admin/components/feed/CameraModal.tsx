"use client";

import { useState, useRef, useEffect } from 'react';
import { X, FlipHorizontal, Circle, RotateCcw, Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import VideoEditorPanel from './VideoEditorPanel';

export default function CameraModal({ open, onClose, onSubmit }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [captured, setCaptured] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [edits, setEdits] = useState({ trimStart: 0, trimEnd: 100, speed: 1, brightness: 100, contrast: 100, saturation: 100 });
  const timerRef = useRef<any>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    if (!open) return;
    stopCamera();
    try {
      const constraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
    } catch (err) {
      console.warn('Tentativa 1 falhou, tentando fallback...', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
        }
      } catch (e) {
        console.error('Falha crítica na câmera:', e);
        // Não trava o app, apenas deixa a tela preta permitindo fechar
      }
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
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCaptured({ type: 'photo', url, blob });
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const MAX_RECORD_SECS = 30;

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const mimeType = isIOS ? 'video/mp4' : 'video/webm;codecs=vp9,opus';
    
    try {
      const recorder = new MediaRecorder(streamRef.current, { 
        mimeType, 
        videoBitsPerSecond: 1200000, // Reduced from 2.5Mbps to 1.2Mbps for compression
        audioBitsPerSecond: 96000 
      });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setCaptured({ type: 'video', url, blob, mimeType });
        stopCamera();
      };
      recorderRef.current = recorder;
      recorder.start(100);
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration(d => {
          if (d + 1 >= MAX_RECORD_SECS) {
            stopRecording();
          }
          return d + 1;
        });
      }, 1000);
    } catch (e) {
      console.error("MediaRecorder error:", e);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleMainAction = () => {
    if (mode === 'photo') { capturePhoto(); return; }
    if (!recording) startRecording(); else stopRecording();
  };

  const togglePlay = () => {
    const v = previewRef.current;
    if (!v) return;
    if (v.paused) {
      v.currentTime = (edits.trimStart / 100) * videoDuration;
      v.playbackRate = edits.speed || 1;
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  useEffect(() => {
    if (captured?.type === 'video' && previewRef.current) {
      const v = previewRef.current;
      v.src = captured.url;
      v.load();
      v.onloadedmetadata = () => {
        if (isFinite(v.duration) && v.duration > 0) {
          setVideoDuration(v.duration);
        }
      };
    }
  }, [captured]);

  const handleVideoLoaded = () => {
    const v = previewRef.current;
    if (v && isFinite(v.duration) && v.duration > 0) {
      setVideoDuration(v.duration);
    }
  };

  const handleTimeUpdate = () => {
    const v = previewRef.current;
    if (!v || videoDuration === 0) return;
    const endTime = (edits.trimEnd / 100) * videoDuration;
    if (v.currentTime >= endTime) {
      v.pause();
      setPlaying(false);
    }
  };

  const [caption, setCaption] = useState("");

  const handlePublish = async () => {
    setUploading(true);
    if (!captured) return;
    const type = captured.type === 'photo' ? 'image' : 'video';
    await onSubmit({ media_url: captured.url, post_type: type, caption });
    setUploading(false);
  };

  const handleClose = () => {
    stopCamera(); // Força o desligamento do hardware
    setCaptured(null);
    setRecording(false);
    setRecordDuration(0);
    setPlaying(false);
    setVideoDuration(0);
    setEdits({ trimStart: 0, trimEnd: 100, speed: 1, brightness: 100, contrast: 100, saturation: 100 });
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const retake = () => {
    setCaptured(null);
    setPlaying(false);
    setVideoDuration(0);
    setEdits({ trimStart: 0, trimEnd: 100, speed: 1, brightness: 100, contrast: 100, saturation: 100 });
    startCamera();
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black flex flex-col">
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${captured ? 'hidden' : ''} ${facingMode === 'user' ? '-scale-x-100' : ''}`}
        />

        {captured?.type === 'photo' && (
          <img src={captured.url} className="absolute inset-0 w-full h-full object-cover" alt="captured" />
        )}

        {captured?.type === 'video' && (
          <video
            ref={previewRef}
            className="absolute inset-0 w-full h-full object-cover"
            onLoadedMetadata={handleVideoLoaded}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPlaying(false)}
            playsInline
            controls={false}
          />
        )}

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent z-50">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>

          {recording && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 z-[100]">
              <div 
                className="h-full bg-red-600 transition-all duration-1000 linear" 
                style={{ width: `${((MAX_RECORD_SECS - recordDuration) / MAX_RECORD_SECS) * 100}%` }}
              />
            </div>
          )}

          {recording && (
            <div className="flex items-center gap-2 bg-red-500 rounded-full px-4 py-1.5 shadow-lg shadow-red-500/20">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-sm font-bold tracking-tighter">{fmt(recordDuration)}</span>
            </div>
          )}

          {!captured ? (
            <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white border border-white/10">
              <FlipHorizontal className="w-5 h-5" />
            </button>
          ) : <div className="w-10" />}
        </div>

        {captured?.type === 'video' && (
          <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
            {!playing && (
              <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-2xl">
                <Play className="w-10 h-10 text-white ml-2 fill-white" />
              </div>
            )}
          </button>
        )}

        {captured && (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-12 bg-black/20 pointer-events-none">
             <textarea 
               autoFocus
               placeholder="Escreva uma legenda..."
               value={caption}
               onChange={(e) => setCaption(e.target.value)}
               className="w-full bg-transparent text-white text-2xl font-bold text-center placeholder:text-white/40 border-none outline-none resize-none pointer-events-auto drop-shadow-lg"
             />
          </div>
        )}
      </div>

      {captured?.type === 'video' && (
        <VideoEditorPanel
          videoRef={previewRef}
          videoDuration={videoDuration}
          edits={edits}
          onChange={setEdits}
        />
      )}

      <div className="bg-black pb-12 pt-6 border-t border-white/5">
        {!captured ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-10">
              <button 
                onClick={() => setMode('photo')} 
                className={cn(
                  "text-xs font-bold tracking-widest transition-all",
                  mode === 'photo' ? 'text-white' : 'text-white/30'
                )}
              >
                FOTO
              </button>
              <button 
                onClick={() => setMode('video')} 
                className={cn(
                  "text-xs font-bold tracking-widest transition-all",
                  mode === 'video' ? 'text-white' : 'text-white/30'
                )}
              >
                VÍDEO
              </button>
            </div>
            
            <button
              onPointerDown={handleMainAction}
              className={cn(
                "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-90 shadow-2xl",
                recording ? 'bg-red-500 border-white/40' : 'bg-transparent border-white'
              )}
            >
              {mode === 'video'
                ? recording
                  ? <div className="w-8 h-8 rounded-lg bg-white shadow-inner" />
                  : <div className="w-10 h-10 rounded-full bg-red-500 shadow-lg" />
                : <Circle className={cn("w-14 h-14 text-white fill-white", recording && "text-red-400 fill-red-400")} />
              }
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-12">
            <button onClick={retake} className="flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors">
              <RotateCcw className="w-8 h-8" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Refazer</span>
            </button>
            
            <button
              onClick={handlePublish}
              disabled={uploading}
              className="w-20 h-20 rounded-full bg-whatsapp-green flex items-center justify-center disabled:opacity-50 active:scale-90 transition-transform shadow-xl shadow-whatsapp-green/20"
            >
              {uploading
                ? <div className="w-8 h-8 border-4 border-whatsapp-dark border-t-transparent rounded-full animate-spin" />
                : <Check className="w-10 h-10 text-whatsapp-dark font-black" />
              }
            </button>
            
            <div className="w-16" />
          </div>
        )}
      </div>
    </div>
  );
}
