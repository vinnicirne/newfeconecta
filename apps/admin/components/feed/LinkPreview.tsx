"use client";

import React, { useEffect, useState } from "react";
import { Link as LinkIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPreviewProps {
  url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchPreview() {
      try {
        setLoading(true);
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="w-full mt-2 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 animate-pulse h-24 flex">
        <div className="w-24 h-full bg-gray-200 dark:bg-white/10 shrink-0"></div>
        <div className="p-3 flex-1 flex flex-col justify-center gap-2">
          <div className="h-3 w-3/4 bg-gray-200 dark:bg-white/10 rounded"></div>
          <div className="h-2 w-1/2 bg-gray-200 dark:bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 mt-2 p-3 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0">
          <LinkIcon className="w-5 h-5 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate text-gray-900 dark:text-white">Link Compartilhado</p>
          <p className="text-[10px] text-gray-500 truncate">{url}</p>
        </div>
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row mt-2 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 overflow-hidden transition-colors group">
      {data.image ? (
        <div className="w-full sm:w-28 h-40 sm:h-auto shrink-0 relative bg-gray-200 dark:bg-[#111]">
          <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full sm:w-28 h-20 sm:h-auto shrink-0 bg-gray-200 dark:bg-[#111] flex items-center justify-center">
          <Globe className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <div className="p-3 sm:p-4 flex flex-col justify-center min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2">{data.title}</p>
        {data.description && (
          <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{data.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <LinkIcon className="w-3 h-3 text-gray-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 truncate">{data.domain || url}</span>
        </div>
      </div>
    </a>
  );
}
