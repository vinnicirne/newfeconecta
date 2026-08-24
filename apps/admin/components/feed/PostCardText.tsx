import React from "react";
import { Flame, Gamepad2, Trophy, Sparkles, ChevronRight, Play, BrainCircuit, Boxes, Layers } from "lucide-react";
import { usePostCardContext } from "./PostCardContext";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { cn } from "@/lib/utils";

export default function PostCardText() {
  const {
    post,
    activeBackground,
    isVerseRepost,
    isMediaPost,
    isDFCH,
    isDevotional,
    isShortText,
    mediaUrl,
    renderContent,
    showLikeAnim,
    handleDoubleClickLike,
    router
  } = usePostCardContext();

  if (!post.content) return null;

  // Detecção Inteligente de Postagem de Jogo / Passatempo
  const isGamePost = (() => {
    const text = post.content || "";
    return (
      text.includes("/jogos") ||
      text.includes("Jogo da Memória") ||
      text.includes("Quiz Bíblico") ||
      text.includes("Quiz da Bíblia") ||
      text.includes("Block Blast") ||
      text.includes("Google Snake") ||
      text.includes("Cobrinha")
    );
  })();

  const gameInfo = (() => {
    if (!isGamePost) return null;
    const text = post.content || "";

    if (text.includes("Quiz") || text.includes("/jogos/quiz")) {
      return {
        title: "Quiz da Bíblia",
        category: "Conhecimento Bíblico",
        icon: "📖",
        iconComponent: BrainCircuit,
        route: "/jogos/quiz",
        btnText: "Jogar Quiz Agora",
        color: "from-amber-500/10 via-orange-500/5 to-transparent",
        borderColor: "border-amber-500/30",
        btnClass: "bg-amber-500 hover:bg-amber-400 text-slate-950",
        badge: "🧠 Desafio Bíblico"
      };
    }
    if (text.includes("Block Blast") || text.includes("/jogos/blocos")) {
      return {
        title: "Block Blast",
        category: "Quebra-Cabeça de Blocos",
        icon: "🧱",
        iconComponent: Boxes,
        route: "/jogos/blocos",
        btnText: "Jogar Block Blast",
        color: "from-purple-500/10 via-indigo-500/5 to-transparent",
        borderColor: "border-purple-500/30",
        btnClass: "bg-purple-500 hover:bg-purple-400 text-white",
        badge: "🧱 Desafio dos Blocos"
      };
    }
    if (text.includes("Snake") || text.includes("Cobrinha") || text.includes("/jogos/snake")) {
      return {
        title: "Jogo da Cobrinha",
        category: "Arcade Clássico do Google",
        icon: "🐍",
        iconComponent: Sparkles,
        route: "/jogos/snake",
        btnText: "Jogar Cobrinha",
        color: "from-emerald-500/10 via-teal-500/5 to-transparent",
        borderColor: "border-emerald-500/30",
        btnClass: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
        badge: "🐍 Clássico Arcade"
      };
    }
    return {
      title: "Jogo da Memória",
      category: "Símbolos da Fé",
      icon: "🕊️",
      iconComponent: Layers,
      route: "/jogos/memoria",
      btnText: "Jogar Memória",
      color: "from-sky-500/10 via-blue-500/5 to-transparent",
      borderColor: "border-sky-500/30",
      btnClass: "bg-sky-500 hover:bg-sky-400 text-slate-950",
      badge: "✨ Jogo da Memória"
    };
  })();

  return (
    <div
      className={cn(
        activeBackground || isVerseRepost ? "px-0" : "px-4",
        ((!isMediaPost || isDFCH) && !mediaUrl) && !activeBackground && !isVerseRepost
          ? "py-4"
          : (activeBackground || isVerseRepost ? "py-0" : "pb-3 pt-0 -mt-1.5"),
      )}
    >
      <div
        className={cn(
          activeBackground || isVerseRepost
            ? cn(
                (post.content?.length || 0) < 60 ? "text-[32px] md:text-[40px] font-black leading-tight tracking-tight" :
                (post.content?.length || 0) < 120 ? "text-[24px] md:text-[32px] font-bold leading-snug tracking-tight" :
                (post.content?.length || 0) < 200 ? "text-[20px] md:text-[24px] font-semibold leading-relaxed" :
                "text-[16px] md:text-[18px] font-medium leading-relaxed"
              )
            : isShortText || isDFCH
              ? "text-[20px] font-bold leading-snug tracking-tight"
              : "text-[16px] font-normal leading-relaxed",
          "whitespace-pre-wrap break-words transition-all mb-1",
          isMediaPost && !isDFCH 
            ? "text-left px-6 py-2" 
            : ((post.content?.length || 0) > 130 && !isVerseRepost
                ? "text-left pt-2 pb-4 px-2" 
                : "text-left py-2 px-2"),
          (activeBackground || (isDFCH && !mediaUrl)) &&
          cn(
            "w-full min-h-[250px] shadow-whatsapp overflow-hidden",
            ((post.content?.length || 0) > 130 && !isVerseRepost)
              ? "py-10 px-6 md:px-10 flex flex-col items-start justify-start text-left"
              : "py-16 px-8 md:px-12 flex flex-col items-center justify-center text-center",
            activeBackground
              ? "text-white"
              : "bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-zinc-950 dark:via-whatsapp-dark dark:to-zinc-900 text-gray-900 dark:text-white",
          ),
          isVerseRepost &&
          "w-full min-h-[250px] py-16 bg-gradient-to-br from-whatsapp-green/5 via-white to-gray-50 dark:from-zinc-950 dark:via-whatsapp-green/5 dark:to-zinc-900 border-y border-whatsapp-green/10 text-gray-900 dark:text-white flex-col gap-8 font-serif relative overflow-hidden px-8 md:px-12",
        )}
        style={{ background: activeBackground || undefined }}
        onDoubleClick={handleDoubleClickLike}
      >
        {isVerseRepost && (
          <div className="flex flex-col items-center gap-2 mb-4 not-italic font-sans">
            <div className="w-10 h-10 rounded-full bg-whatsapp-green/10 flex items-center justify-center border border-whatsapp-green/20 mb-1 relative">
              <Flame className="w-5 h-5 text-whatsapp-green" />
              <div className="absolute inset-0 bg-whatsapp-green/20 rounded-full blur-xl animate-pulse" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-whatsapp-green/80">
              Palavra do Dia
            </h2>
          </div>
        )}

        <span
          className={cn(
            activeBackground
              ? "text-white drop-shadow-md relative z-10"
              : isVerseRepost
                ? "text-gray-900 dark:text-white dark:drop-shadow-md relative z-10"
                : "text-gray-900 dark:text-gray-100",
            isVerseRepost
              ? cn(
                  (post.content?.length || 0) < 80 ? "text-[28px] md:text-[36px]" :
                  (post.content?.length || 0) < 150 ? "text-[22px] md:text-[28px]" :
                  (post.content?.length || 0) < 300 ? "text-[18px] md:text-[22px]" :
                  "text-[15px] md:text-[18px]",
                  "font-serif font-bold italic leading-tight tracking-tight"
                )
              : "font-sans",
          )}
        >
          {showLikeAnim && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Flame className="w-24 h-24 text-whatsapp-green fill-whatsapp-green drop-shadow-[0_0_20px_rgba(37,211,102,0.6)] animate-in zoom-in spin-in duration-300" />
            </div>
          )}

          {(() => {
            let text = post.content;

            // CARD INTERATIVO DE JOGO / CONQUISTA
            if (isGamePost && gameInfo) {
              const cleanedText = text
                .replace(/👉\s*(?:Jogue também em|Venha testar|Consegue bater|Consegue quebrar|Jogue em|Jogue grátis em)\s*\/jogos[^\s]*/gi, '')
                .trim();

              return (
                <div className="w-full my-1 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0d1424] dark:to-[#080d1a] border border-slate-200 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4">
                  {/* Header do Card de Jogo */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-white/10 flex items-center justify-center text-xl">
                        {gameInfo.icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Conquista em Jogo
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {gameInfo.title}
                        </h4>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                      {gameInfo.badge}
                    </span>
                  </div>

                  {/* Texto da Conquista */}
                  <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {renderContent(cleanedText)}
                  </div>

                  {/* Botão de Ação Direta para o Jogo */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(gameInfo.route);
                    }}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 ${gameInfo.btnClass}`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>{gameInfo.btnText}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            }

            if (isVerseRepost) {
              text = text
                .replace(/📖\s*Recomendo a\s*Palavra do Dia:\s*/i, "")
                .replace(/""/g, '"')
                .replace(/^"|"$|^“|”$/g, "")
                .replace(/^\[Versículo\]\s*/i, "")
                .trim();

              const parts = text.split(/ — | —|— | - /);
              if (parts.length > 1) {
                const verseText = parts[0].trim();
                const reference = parts[1].trim();
                return (
                  <div className="flex flex-col items-center gap-5">
                    <span>{renderContent(`"${verseText}"`)}</span>
                    <span className="text-sm md:text-lg font-sans font-black uppercase tracking-[0.3em] text-whatsapp-teal dark:text-whatsapp-blue/80 not-italic pb-2">
                      {reference}
                    </span>
                  </div>
                );
              }
            }

            if (isDevotional) {
              const lines = text.split('\n');
              const titleIndex = lines.findIndex((l: string, i: number) => i > 0 && l.trim().length > 0);
              const title = titleIndex !== -1 ? lines[titleIndex].replace(/^#+\s*/, '') : '';
              const restLines = titleIndex !== -1 ? lines.slice(titleIndex + 1).join('\n') : '';

              return (
                <div className="flex flex-col gap-1 relative group/content text-left">
                  <span className="text-amber-500 font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1 bg-amber-500/10 w-fit px-2.5 py-1 rounded-full border border-amber-500/20">
                    <Flame className="w-3.5 h-3.5" /> Devocional
                  </span>
                  {title && (
                    <h2 className="text-[20px] md:text-[24px] font-black leading-tight tracking-tight text-foreground truncate w-full mb-2">
                      {title}
                    </h2>
                  )}
                  <div className="text-[16px] font-medium leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                    {renderContent(restLines.trim())}
                  </div>
                </div>
              );
            }

            return (
              <div className="relative group/content">
                {renderContent(text)}
              </div>
            );
          })()}
        </span>

        {isVerseRepost && (
          <button
            onClick={() => {
              let refCode = post.metadata?.bible_ref;

              if (!refCode && post.content) {
                const normalizedContent = post.content.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                for (const book of BIBLE_BOOKS) {
                  const normalizedName = book.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const regex = new RegExp(`(?:^|\W)(?:${normalizedName}|${book.abbrev})\s+(\d+)(?:[:\.](\d+))?`, 'i');
                  const match = normalizedContent.match(regex);
                  if (match) {
                    refCode = `${book.abbrev}${match[1]}:${match[2] || "1"}`;
                    break;
                  }
                }
              }

              const finalRef = refCode || "mc1:1";
              router.push(`/bible?verse=${finalRef}`);
            }}
            className="mt-6 px-6 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white transition-all active:scale-95 not-italic font-sans"
          >
            Ler capítulo completo
          </button>
        )}
      </div>
    </div>
  );
}
