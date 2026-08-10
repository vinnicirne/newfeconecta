import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ColorSwatchProps {
  color: string;
  isActive: boolean;
  onClick: () => void;
  isDefault?: boolean;
}

export function ColorSwatch({ color, isActive, onClick, isDefault }: ColorSwatchProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200 border-2",
        isActive ? "border-white scale-110 shadow-lg" : "border-transparent",
        isDefault ? "bg-[#1E1E1E] border-dashed border-gray-600 flex items-center justify-center text-xs font-bold text-gray-400" : ""
      )}
      style={!isDefault ? { background: color } : undefined}
      title={isDefault ? "Fundo Escuro (Padrão)" : "Cor Sólida"}
    >
      {isDefault && "Aa"}
    </motion.button>
  );
}
