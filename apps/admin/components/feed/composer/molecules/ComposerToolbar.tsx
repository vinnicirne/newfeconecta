"use client";

import { Type, Camera, Mic, Image as ImageIcon, Smile, Video, Users, ListTodo, Film } from 'lucide-react';
import { ComposerMode } from '../../UnifiedComposer';
import { cn } from '@/lib/utils';

interface ComposerToolbarProps {
  mode: ComposerMode;
  onSetMode: (mode: ComposerMode) => void;
  onShowEmoji?: () => void;
  onShowGif?: () => void;
  disabled?: boolean;
  allowedModes?: ComposerMode[];
}

export function ComposerToolbar({ mode, onSetMode, onShowEmoji, onShowGif, disabled, allowedModes }: ComposerToolbarProps) {
  const isAllowed = (m: ComposerMode) => !allowedModes || allowedModes.includes(m);

  const primaryActions = [
    { id: 'gallery', icon: ImageIcon, label: 'Foto/vídeo', color: 'text-green-500', action: () => onSetMode('gallery'), active: mode === 'gallery', allowed: isAllowed('gallery') },
    { id: 'photo', icon: Camera, label: 'Câmera', color: 'text-blue-500', action: () => onSetMode('photo'), active: mode === 'photo', allowed: isAllowed('photo') },
    { id: 'audio', icon: Mic, label: 'Áudio', color: 'text-orange-500', action: () => onSetMode('audio'), active: mode === 'audio', allowed: isAllowed('audio') },
  ].filter(a => a.allowed);

  const secondaryActions = [
    { id: 'sticker', icon: Smile, label: 'Figurinha', color: 'text-yellow-500', action: onShowEmoji, enabled: !!onShowEmoji },
  ].filter(a => a.enabled);

  return (
    <div className="flex flex-col w-full bg-white dark:bg-whatsapp-dark border-t border-gray-100 dark:border-white/5">
      <div className="flex items-center overflow-x-auto no-scrollbar px-4 py-3 gap-6">
        {primaryActions.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center justify-center min-w-[72px] gap-2 transition-all opacity-80 hover:opacity-100 disabled:opacity-30",
              item.active && "opacity-100 scale-105"
            )}
          >
            <div className={cn("p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5", item.active && "border-current shadow-sm", item.color)}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.label}</span>
          </button>
        ))}

        {/* Divider */}
        {secondaryActions.length > 0 && (
          <div className="w-[1px] h-12 bg-gray-200 dark:bg-white/10 shrink-0" />
        )}

        {secondaryActions.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            disabled={disabled || !item.enabled}
            className={cn(
              "flex flex-col items-center justify-center min-w-[72px] gap-2 transition-all",
              item.enabled ? "opacity-80 hover:opacity-100" : "opacity-40 grayscale"
            )}
          >
            <div className={cn("p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5", item.color)}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
