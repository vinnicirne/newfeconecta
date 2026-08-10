"use client";

import React, { useState } from "react";
import ExternalMediaNative, { parseExternalMedia } from "@/components/feed/ExternalMediaNative";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TestMediaSandbox() {
  const [url, setUrl] = useState("");
  const { platform } = parseExternalMedia(url);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-whatsapp-dark p-6">
      <div className="max-w-md mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-white dark:bg-white/5 rounded-full hover:scale-105 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-black dark:text-white uppercase tracking-tight">Media Sandbox</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Teste Isolado de Iframes</p>
          </div>
        </header>

        <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl shadow-whatsapp space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
              Cole o link (Shorts, Reels, TikTok, Kwai)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/shorts/..."
              className="w-full bg-gray-50 dark:bg-whatsapp-dark border border-gray-100 dark:border-white/5 p-4 rounded-xl text-sm font-medium dark:text-white focus:ring-2 focus:ring-whatsapp-green outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-500">Status Detectado:</span>
            <span className="text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full bg-whatsapp-green/10 text-whatsapp-green">
              {platform === "unknown" ? "Aguardando link válido" : platform}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {platform !== "unknown" ? (
            <div className="w-full max-w-[320px] mx-auto animate-in zoom-in-95 duration-500">
              <ExternalMediaNative url={url} />
            </div>
          ) : (
            <div className="w-full max-w-[320px] aspect-[9/16] bg-gray-200 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-white/10 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest">Preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
