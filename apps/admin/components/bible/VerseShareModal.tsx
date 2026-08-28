"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, Share2, Download, Copy, Check, Instagram, 
  MessageCircle, Sparkles, Image as ImageIcon, Smartphone, Square
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VerseItem {
  number: number;
  text: string;
}

interface VerseShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookName: string;
  chapter: number;
  versionName: string;
  verses: VerseItem[];
}

const BACKGROUND_THEMES = [
  {
    id: "gold",
    name: "Pôr do Sol da Graça",
    gradient: "linear-gradient(135deg, #1f1404 0%, #452205 50%, #1a0f02 100%)",
    textColor: "#FDE68A",
    subColor: "#F59E0B",
    accentColor: "#FBBF24",
    bgStyle: { from: "#1f1404", mid: "#452205", to: "#1a0f02" },
  },
  {
    id: "emerald",
    name: "Monte Sião",
    gradient: "linear-gradient(135deg, #022018 0%, #064E3B 50%, #01140E 100%)",
    textColor: "#A7F3D0",
    subColor: "#10B981",
    accentColor: "#34D399",
    bgStyle: { from: "#022018", mid: "#064E3B", to: "#01140E" },
  },
  {
    id: "night",
    name: "Madrugada com Deus",
    gradient: "linear-gradient(135deg, #030712 0%, #1E1B4B 50%, #0B0F19 100%)",
    textColor: "#E0E7FF",
    subColor: "#818CF8",
    accentColor: "#A5B4FC",
    bgStyle: { from: "#030712", mid: "#1E1B4B", to: "#0B0F19" },
  },
  {
    id: "glory",
    name: "Reino de Glória",
    gradient: "linear-gradient(135deg, #1C0A2E 0%, #581C87 50%, #130421 100%)",
    textColor: "#F5D0FE",
    subColor: "#C084FC",
    accentColor: "#E879F9",
    bgStyle: { from: "#1C0A2E", mid: "#581C87", to: "#130421" },
  },
  {
    id: "dark",
    name: "Minimalista Escuro",
    gradient: "linear-gradient(135deg, #0A0A0A 0%, #171717 50%, #000000 100%)",
    textColor: "#F3F4F6",
    subColor: "#9CA3AF",
    accentColor: "#FFFFFF",
    bgStyle: { from: "#0A0A0A", mid: "#171717", to: "#000000" },
  },
  {
    id: "light",
    name: "Luz da Manhã",
    gradient: "linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 50%, #FFFFFF 100%)",
    textColor: "#0F172A",
    subColor: "#475569",
    accentColor: "#0284C7",
    bgStyle: { from: "#F8FAFC", mid: "#E2E8F0", to: "#FFFFFF" },
  },
];

export default function VerseShareModal({
  isOpen,
  onClose,
  bookName,
  chapter,
  versionName,
  verses,
}: VerseShareModalProps) {
  const [selectedTheme, setSelectedTheme] = useState(BACKGROUND_THEMES[0]);
  const [aspectRatio, setAspectRatio] = useState<"story" | "post">("story");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen || verses.length === 0) return null;

  // Monta a referência bíblica (ex: Joel 2:30-32 (NVI) ou Joel 2:30 (NVI))
  const verseNumbers = verses.map((v) => v.number).sort((a, b) => a - b);
  const formattedNumbers =
    verseNumbers.length === 1
      ? `${verseNumbers[0]}`
      : `${verseNumbers[0]}-${verseNumbers[verseNumbers.length - 1]}`;
  const referenceText = `${bookName} ${chapter}:${formattedNumbers} (${versionName})`;

  // Monta o texto completo dos versículos
  const combinedText = verses
    .sort((a, b) => a.number - b.number)
    .map((v) => (verses.length > 1 ? `(${v.number}) ${v.text}` : v.text))
    .join(" ");

  // Renderiza o Canvas de Alta Resolução
  const generateCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = aspectRatio === "story" ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // 1. Fundo com Gradiente
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, selectedTheme.bgStyle.from);
    grad.addColorStop(0.5, selectedTheme.bgStyle.mid);
    grad.addColorStop(1, selectedTheme.bgStyle.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Elementos decorativos (círculos de luz suaves)
    ctx.save();
    ctx.fillStyle = selectedTheme.accentColor;
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.2, 350, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.8, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Aspas Decorativas no Topo
    ctx.fillStyle = selectedTheme.accentColor;
    ctx.globalAlpha = 0.25;
    ctx.font = 'bold 160px "Georgia", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const quoteY = aspectRatio === "story" ? 420 : 200;
    ctx.fillText("“", width / 2, quoteY);
    ctx.globalAlpha = 1.0;

    // 4. Texto do Versículo com quebra de linha inteligente
    const paddingX = 120;
    const maxTextWidth = width - paddingX * 2;
    
    // Ajuste dinâmico do tamanho da fonte conforme a extensão do texto
    let fontSize = aspectRatio === "story" ? 54 : 46;
    if (combinedText.length > 250) fontSize = aspectRatio === "story" ? 44 : 38;
    if (combinedText.length > 400) fontSize = aspectRatio === "story" ? 36 : 30;

    ctx.font = `600 ${fontSize}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = selectedTheme.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = combinedText.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.5;
    const totalTextHeight = lines.length * lineHeight;
    let startY = (height - totalTextHeight) / 2;
    if (aspectRatio === "story") startY = (height - totalTextHeight) / 2 + 30;

    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight);
    });

    // 5. Linha Divisória Sutil
    const dividerY = startY + lines.length * lineHeight + 45;
    ctx.strokeStyle = selectedTheme.accentColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, dividerY);
    ctx.lineTo(width / 2 + 80, dividerY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 6. Referência Bíblica
    ctx.fillStyle = selectedTheme.subColor;
    ctx.font = 'bold 36px "Outfit", "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(referenceText, width / 2, dividerY + 50);

    // 7. Rodapé com Logotipo do FéConecta
    const footerY = height - 100;
    ctx.fillStyle = selectedTheme.textColor;
    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 26px "Outfit", "Inter", sans-serif';
    ctx.fillText("✝️ FéConecta", width / 2, footerY);

    ctx.font = '500 20px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = selectedTheme.subColor;
    ctx.globalAlpha = 0.5;
    ctx.fillText("Um lugar de adoração", width / 2, footerY + 34);
    ctx.globalAlpha = 1.0;

    return canvas;
  };

  // Compartilhar Imagem Nativa (Instagram / WhatsApp / Celular)
  const handleShareImage = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Gerando imagem para o Instagram / WhatsApp...");

    try {
      const canvas = generateCanvas();
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Falha ao gerar imagem", { id: toastId });
          setIsGenerating(false);
          return;
        }

        const fileName = `versiculo_${bookName.toLowerCase()}_${chapter}_${formattedNumbers}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        // Se suportar compartilhamento nativo com arquivo (Mobile / PWA)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: referenceText,
              text: `"${combinedText}" — ${referenceText} no FéConecta`,
            });
            toast.success("Pronto para postar no Instagram / WhatsApp! 🙌", { id: toastId });
          } catch (err: any) {
            if (err.name !== "AbortError") {
              downloadFallback(blob, fileName);
              toast.success("Imagem salva na galeria! 📸", { id: toastId });
            } else {
              toast.dismiss(toastId);
            }
          }
        } else {
          // Fallback: Baixa a imagem diretamente
          downloadFallback(blob, fileName);
          toast.success("Imagem baixada com sucesso! 📸", { id: toastId });
        }
        setIsGenerating(false);
      }, "image/png", 1.0);

    } catch (err: any) {
      toast.error("Erro ao processar imagem: " + err.message, { id: toastId });
      setIsGenerating(false);
    }
  };

  const downloadFallback = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compartilhar Texto Simples
  const handleShareText = async () => {
    const fullMessage = `📖 "${combinedText}"\n\n— ${referenceText}\n\n✝️ Compartilhado através do FéConecta\n${window.location.origin}/bible`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: referenceText,
          text: fullMessage,
        });
        toast.success("Compartilhado com sucesso!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          navigator.clipboard.writeText(fullMessage);
          toast.success("Texto copiado para a área de transferência!");
        }
      }
    } else {
      navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success("Texto copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copiar Texto
  const handleCopyText = () => {
    const fullMessage = `"${combinedText}" — ${referenceText}`;
    navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    toast.success("Versículo copiado com sucesso! 📋");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-white/10 text-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-whatsapp-teal" />
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Compartilhar Versículo
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                {referenceText}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pré-visualização do Cartão (Live Preview) */}
        <div className="flex justify-center py-2">
          <div
            className={cn(
              "w-full rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-xl transition-all duration-300 border border-white/10 relative overflow-hidden",
              aspectRatio === "story" ? "max-w-[280px] min-h-[420px]" : "max-w-[340px] min-h-[340px]"
            )}
            style={{ background: selectedTheme.gradient }}
          >
            {/* Aspas */}
            <span
              className="text-4xl sm:text-5xl font-serif leading-none opacity-40 font-bold"
              style={{ color: selectedTheme.accentColor }}
            >
              “
            </span>

            {/* Texto */}
            <p
              className="font-outfit font-semibold text-xs sm:text-sm leading-relaxed my-3 line-clamp-6"
              style={{ color: selectedTheme.textColor }}
            >
              {combinedText}
            </p>

            {/* Referência e Marca */}
            <div className="space-y-1.5 pt-2 border-t border-white/10 w-full">
              <p
                className="font-bold text-[11px] sm:text-xs tracking-wide"
                style={{ color: selectedTheme.subColor }}
              >
                {referenceText}
              </p>
              <p className="text-[9px] text-white/50 font-medium">
                ✝️ FéConecta
              </p>
            </div>
          </div>
        </div>

        {/* Seleção de Formato (Story vs Post Quadrado) */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setAspectRatio("story")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all",
              aspectRatio === "story"
                ? "bg-whatsapp-teal text-white border-whatsapp-teal shadow-md"
                : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Story 9:16 (Instagram)</span>
          </button>

          <button
            onClick={() => setAspectRatio("post")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all",
              aspectRatio === "post"
                ? "bg-whatsapp-teal text-white border-whatsapp-teal shadow-md"
                : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
            )}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Feed 1:1 (Quadrado)</span>
          </button>
        </div>

        {/* Seleção de Temas Visuais */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Escolha o Estilo do Fundo
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {BACKGROUND_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={cn(
                  "h-12 rounded-xl border flex items-center justify-center p-1 relative transition-all active:scale-95",
                  selectedTheme.id === theme.id
                    ? "border-whatsapp-teal ring-2 ring-whatsapp-teal/40 scale-105 shadow-md"
                    : "border-white/10 opacity-70 hover:opacity-100"
                )}
                style={{ background: theme.gradient }}
                title={theme.name}
              >
                {selectedTheme.id === theme.id && (
                  <Check className="w-4 h-4 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Ação de Compartilhamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
          {/* Botão 1: Imagem para Instagram / WhatsApp */}
          <button
            onClick={handleShareImage}
            disabled={isGenerating}
            className="h-11 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            <Instagram className="w-4 h-4" />
            <span>{isGenerating ? "Gerando..." : "Compartilhar Imagem (Instagram)"}</span>
          </button>

          {/* Botão 2: Compartilhar Texto */}
          <button
            onClick={handleShareText}
            className="h-11 px-4 rounded-2xl bg-whatsapp-teal text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-whatsapp-tealLight active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Compartilhar Texto</span>
          </button>

          {/* Botão 3: Copiar Texto */}
          <button
            onClick={handleCopyText}
            className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar Versículo"}</span>
          </button>

          {/* Botão 4: Baixar Imagem PNG */}
          <button
            onClick={handleShareImage}
            className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Imagem PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
