import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TextFormattingBar } from './TextFormattingBar';

interface TextEditorProps {
  content: string;
  bg?: string | null;
  onContentChange: (content: string) => void;
  onBgChange?: (bg: string | null) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function TextEditor({ content, bg, onContentChange, onBgChange, onSubmit, disabled }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      onSubmit();
    }
  };

  const applyFormat = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    onContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col flex-1 h-full"
    >
      <div 
        className={cn(
          "flex-1 flex flex-col rounded-2xl transition-all p-4",
          bg ? "text-white" : "text-gray-800 dark:text-gray-100"
        )}
        style={{ background: bg || undefined }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="No que você está pensando?"
          className={cn(
            "w-full flex-1 bg-transparent resize-none outline-none overflow-y-auto min-h-[150px]",
            bg ? "text-white placeholder:text-white/70 text-center text-2xl md:text-3xl font-bold flex items-center justify-center pt-[10%]" : "text-xl placeholder:text-gray-400 dark:placeholder:text-gray-500"
          )}
          disabled={disabled}
        />
      </div>

      {onBgChange && (
        <TextFormattingBar 
          currentBg={bg || null} 
          onBgChange={onBgChange} 
          onFormat={applyFormat} 
        />
      )}
    </motion.div>
  );
}
