import { Bold, Italic, Underline, Highlighter, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const BACKGROUNDS = [
  '#25D366',
  '#34B7F1',
  'linear-gradient(135deg, #075E54, #25D366)',
  'linear-gradient(135deg, #111B21, #075E54)',
  '#111B21',
  '#202C33',
  'linear-gradient(135deg, #34B7F1, #25D366)',
];

interface TextFormattingBarProps {
  currentBg: string | null;
  onBgChange: (bg: string | null) => void;
  onFormat: (prefix: string, suffix: string) => void;
}

export function TextFormattingBar({ currentBg, onBgChange, onFormat }: TextFormattingBarProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <div className="flex flex-col gap-3 my-4">
      {/* Format Tools */}
      <div className="flex items-center gap-2">
        <button onClick={() => onFormat('*', '*')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors">
          <Bold className="w-4 h-4" />
        </button>
        <button onClick={() => onFormat('_', '_')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors">
          <Italic className="w-4 h-4" />
        </button>
        <button onClick={() => onFormat('~', '~')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors">
          <Underline className="w-4 h-4" />
        </button>
        <button onClick={() => onFormat('`', '`')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors">
          <Highlighter className="w-4 h-4" />
        </button>
      </div>

      {/* Background Colors */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            if (showColors && currentBg) {
              onBgChange(null);
            }
            setShowColors(!showColors);
          }}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 transition-all text-xs font-bold font-serif",
            showColors && "bg-gray-100 dark:bg-white/10 border-solid"
          )}
        >
          Aa
        </button>
        
        <AnimatePresence>
          {showColors && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar"
            >
              {BACKGROUNDS.map((bg, idx) => (
                <button
                  key={idx}
                  onClick={() => onBgChange(bg)}
                  className={cn(
                    "w-8 h-8 rounded-lg shrink-0 border-2 transition-transform active:scale-95",
                    currentBg === bg ? "border-gray-900 dark:border-white shadow-lg scale-110" : "border-transparent"
                  )}
                  style={{ background: bg }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
