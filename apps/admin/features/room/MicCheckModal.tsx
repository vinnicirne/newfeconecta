"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MicCheckModalProps {
  show: boolean;
  onClose: () => void;
}

export function MicCheckModal({ show, onClose }: MicCheckModalProps) {
  const [level, setLevel] = useState(0);
  const [isLoopback, setIsLoopback] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!show) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      streamRef.current = s;
      const ctx = new AudioContext();
      const ana = ctx.createAnalyser();
      ctx.createMediaStreamSource(s).connect(ana);
      const arr = new Uint8Array(ana.frequencyBinCount);

      const up = () => {
        if (show && ana && streamRef.current?.active) {
          ana.getByteFrequencyData(arr);
          setLevel(arr.reduce((a, b) => a + b) / arr.length);
          requestAnimationFrame(up);
        }
      };
      up();
    }).catch(err => {
      console.error("Erro ao acessar microfone para teste:", err);
    });

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [show]);

  useEffect(() => {
    if (audioRef.current && streamRef.current) {
      audioRef.current.srcObject = isLoopback ? streamRef.current : null;
    }
  }, [isLoopback]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#131313] rounded-[3rem] p-10 flex flex-col items-center gap-6 border border-white/5">
        <div className="w-20 h-20 rounded-full bg-[#3fff8b]/10 flex items-center justify-center border border-[#3fff8b]/20 shadow-[0_0_20px_#3fff8b33]">
          <Mic size={32} className="text-[#3fff8b]" />
        </div>
        <h3 className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Calibrando Voz</h3>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${level * 3}%` }} 
            className="h-full bg-[#3fff8b] shadow-[0_0_10px_#3fff8b]" 
          />
        </div>
        <button 
          onClick={() => setIsLoopback(!isLoopback)} 
          className={cn(
            "w-full py-4 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
            isLoopback ? "bg-[#3fff8b] border-[#3fff8b] text-black" : "bg-white/5 border-white/10 text-white/50"
          )}
        >
          {isLoopback ? "Escutando Retorno" : "Testar Retorno"} <Headphones size={14} />
        </button>
        <button 
          onClick={onClose} 
          className="w-full py-4.5 bg-[#3fff8b] text-black rounded-full font-black text-[10px] uppercase shadow-2xl"
        >
          Está ok!
        </button>
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}
