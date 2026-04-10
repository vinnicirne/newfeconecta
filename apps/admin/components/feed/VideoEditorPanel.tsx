"use client";

import { useState } from 'react';
import { Scissors, Zap, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const SPEEDS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
];

export default function VideoEditorPanel({ videoRef, videoDuration, edits, onChange }: any) {
  const [openTab, setOpenTab] = useState<string | null>('trim');

  const applyFilters = (updates: any) => {
    const next = { ...edits, ...updates };
    onChange(next);
    if (videoRef.current) {
      videoRef.current.style.filter = `brightness(${next.brightness}%) contrast(${next.contrast}%) saturate(${next.saturation}%)`;
    }
  };

  const applySpeed = (speed: number) => {
    onChange({ ...edits, speed });
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const applyTrim = (updates: any) => {
    const next = { ...edits, ...updates };
    onChange(next);
    if (videoRef.current && videoDuration > 0) {
      if (updates.trimStart !== undefined) {
        videoRef.current.currentTime = (updates.trimStart / 100) * videoDuration;
      }
    }
  };

  const TabTrigger = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setOpenTab(openTab === id ? null : id)}
      className={cn(
        "flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all border",
        openTab === id 
          ? "bg-whatsapp-green/10 border-whatsapp-green/30 text-whatsapp-green" 
          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} />
        <span className="text-xs font-bold tracking-widest uppercase">{label}</span>
      </div>
      {openTab === id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  const SliderRow = ({ label, value, min, max, step = 1, onCh, display }: any) => (
    <div className="space-y-2 py-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-mono text-whatsapp-green">{display ?? value}</span>
      </div>
      <input
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value}
        onChange={e => onCh(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full accent-whatsapp-green appearance-none cursor-pointer"
      />
    </div>
  );

  return (
    <div className="bg-black/90 backdrop-blur-xl p-6 space-y-4 border-t border-white/10">
      <div className="space-y-3">
        {/* Trim Tab */}
        <div className="space-y-2">
          <TabTrigger id="trim" icon={Scissors} label="Recortar" />
          {openTab === 'trim' && (
            <div className="p-4 bg-white/5 rounded-2xl space-y-4 animate-in fade-in duration-300">
               <SliderRow 
                 label="Início" 
                 value={edits.trimStart} 
                 min={0} 
                 max={edits.trimEnd - 1} 
                 onCh={(v: number) => applyTrim({ trimStart: v })}
                 display={((edits.trimStart / 100) * videoDuration).toFixed(1) + 's'}
               />
               <SliderRow 
                 label="Fim" 
                 value={edits.trimEnd} 
                 min={edits.trimStart + 1} 
                 max={100} 
                 onCh={(v: number) => applyTrim({ trimEnd: v })}
                 display={((edits.trimEnd / 100) * videoDuration).toFixed(1) + 's'}
               />
            </div>
          )}
        </div>

        {/* Speed Tab */}
        <div className="space-y-2">
          <TabTrigger id="speed" icon={Zap} label="Velocidade" />
          {openTab === 'speed' && (
            <div className="p-4 bg-white/5 rounded-2xl flex justify-between animate-in fade-in duration-300">
               {SPEEDS.map(s => (
                 <button
                   key={s.value}
                   onClick={() => applySpeed(s.value)}
                   className={cn(
                     "px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                     edits.speed === s.value ? "bg-whatsapp-green text-whatsapp-dark" : "bg-white/10 text-white hover:bg-white/20"
                   )}
                 >
                   {s.label}
                 </button>
               ))}
            </div>
          )}
        </div>

        {/* Filters Tab */}
        <div className="space-y-2">
          <TabTrigger id="filters" icon={Palette} label="Filtros" />
          {openTab === 'filters' && (
            <div className="p-4 bg-white/5 rounded-2xl space-y-4 animate-in fade-in duration-300">
               <SliderRow label="Brilho" value={edits.brightness} min={50} max={150} onCh={(v: number) => applyFilters({ brightness: v })} display={edits.brightness + '%'} />
               <SliderRow label="Contraste" value={edits.contrast} min={50} max={150} onCh={(v: number) => applyFilters({ contrast: v })} display={edits.contrast + '%'} />
               <SliderRow label="Saturação" value={edits.saturation} min={0} max={200} onCh={(v: number) => applyFilters({ saturation: v })} display={edits.saturation + '%'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
