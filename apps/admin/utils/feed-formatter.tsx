import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const isJustLink = (content: string | undefined): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
  return urlRegex.test(trimmed);
};

export const renderContent = (
  content: string,
  isVerseRepost: boolean,
  isExpanded: boolean,
  setIsExpanded: (val: boolean) => void,
  activeBackground: any
) => {
  if (!content) return null;

  const rawContent = isVerseRepost
    ? content
      .replace(/📖\s*Recomendo a\s*Palavra do Dia:\s*/i, "")
      .replace(/""/g, '"')
      .replace(/"/g, "")
      .trim()
    : content;

  const MAX_CHAR = 240;
  const shouldTruncate = rawContent.length > MAX_CHAR && !isExpanded;
  const displayContent = shouldTruncate
    ? rawContent.substring(0, MAX_CHAR) + "..."
    : rawContent;

  const parts = displayContent.split(
    /(\*\*.*?\*\*|\*.*?\*|__.*?__|==.*?==|#[\wáàâãéèêíïóôõöúç-]+|@[\w.-]+|https?:\/\/[^\s]+|www\.[^\s]+|\n)/g,
  );

  const urlMatch = displayContent.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
  const previewUrl = urlMatch ? urlMatch[0] : null;

  const accentLinkClass = activeBackground
    ? "text-white/90 hover:text-white underline font-medium"
    : "text-whatsapp-teal dark:text-whatsapp-green hover:underline font-medium";
  const accentMentionClass = activeBackground
    ? "text-white/90 hover:text-white underline font-bold"
    : "text-whatsapp-teal dark:text-whatsapp-green hover:underline font-bold";

  return (
    <>
      {parts.map((part: string, i: number) => {
        if (!part) return null;
        const trimmed = part.trim();
        if (part === "\n" || part === "\r\n") return <br key={i} />;

        // Oculta o link se ele já estiver sendo exibido no Card/Vídeo abaixo
        if (trimmed === previewUrl) return null;

        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("__") && part.endsWith("__") && part.length >= 4) {
          return <u key={i} className="underline underline-offset-2 decoration-whatsapp-teal/50 decoration-2">{part.slice(2, -2)}</u>;
        }
        if (part.startsWith("==") && part.endsWith("==") && part.length >= 4) {
          return <mark key={i} className="bg-yellow-200 dark:bg-whatsapp-teal/40 dark:text-white px-1.5 py-0.5 rounded-md text-inherit">{part.slice(2, -2)}</mark>;
        }

        if (trimmed.startsWith("#")) {
          const tag = trimmed.substring(1);
          return (
            <Link
              key={i}
              href={`/explore/${tag}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={cn("cursor-pointer", accentLinkClass)}
            >
              {part}
            </Link>
          );
        }

        if (
          trimmed.startsWith("https://") ||
          trimmed.startsWith("http://") ||
          trimmed.startsWith("www.")
        ) {
          const url = trimmed.startsWith("www.")
            ? `https://${trimmed}`
            : trimmed;
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={cn("break-all", accentLinkClass)}
            >
              {part}
            </a>
          );
        }

        if (trimmed.startsWith("@")) {
          const username = trimmed.substring(1);
          return (
            <Link
              key={i}
              href={`/profile/${username}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={accentMentionClass}
            >
              {part}
            </Link>
          );
        }

        return part;
      })}

      {content.length > MAX_CHAR && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-whatsapp-teal dark:text-whatsapp-green font-bold ml-1 hover:underline text-xs uppercase"
        >
          {isExpanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </>
  );
};
