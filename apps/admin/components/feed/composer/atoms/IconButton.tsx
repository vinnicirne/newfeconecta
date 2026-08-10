import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function IconButton({ icon: Icon, label, isActive, onClick, disabled }: IconButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 w-[72px] h-[72px]",
        isActive 
          ? "bg-whatsapp-teal/20 text-whatsapp-teal shadow-inner" 
          : "text-gray-400 hover:bg-gray-100/10 hover:text-white",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
    >
      <Icon className={cn("w-6 h-6 mb-1.5 transition-transform duration-300", isActive && "scale-110")} />
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider",
        isActive ? "text-whatsapp-teal" : "text-gray-500"
      )}>
        {label}
      </span>
    </motion.button>
  );
}
