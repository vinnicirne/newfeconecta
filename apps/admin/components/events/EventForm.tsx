"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image-compression";
import { Globe, Lock, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CreateEventDto } from "@/domain/events/types";

interface EventFormProps {
  initialData?: Partial<CreateEventDto>;
  onSubmit: (dto: CreateEventDto) => void;
  isSaving: boolean;
}

export default function EventForm({ initialData, onSubmit, isSaving }: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startsAt, setStartsAt] = useState(initialData?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(initialData?.ends_at ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [onlineLink, setOnlineLink] = useState(initialData?.online_link ?? "");
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? true);
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_url ?? "");
  const [coverPreview, setCoverPreview] = useState(initialData?.cover_url ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const compressed = await compressImage(file, 1280, 0.75);
      const ext = "webp";
      const path = `events/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("posts").upload(path, compressed, {
        contentType: "image/webp",
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
      setCoverUrl(urlData.publicUrl);
      setCoverPreview(urlData.publicUrl);
    } catch (err) {
      toast.error("Falha no upload da imagem");
    } finally {
      setUploadingCover(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Informe o titulo do evento"); return; }
    if (!startsAt) { toast.error("Informe a data de inicio"); return; }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      cover_url: coverUrl || undefined,
      location: location.trim() || undefined,
      online_link: onlineLink.trim() || undefined,
      starts_at: startsAt,
      ends_at: endsAt || undefined,
      is_public: isPublic,
    });
  }

  const inputClass =
    "w-full bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-whatsapp-teal/30 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cover upload */}
      <div className="relative">
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            "w-full aspect-video rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center bg-gray-50 dark:bg-white/5 transition hover:border-whatsapp-teal/50 group",
            coverPreview && "border-none"
          )}
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-whatsapp-teal transition">
              {uploadingCover ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-xs font-semibold">Adicionar foto de capa</span>
                </>
              )}
            </div>
          )}
          {coverPreview && uploadingCover && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>

      {/* Visibilidade */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 w-fit border border-gray-200/50 dark:border-white/5">
        <button
          type="button"
          onClick={() => setIsPublic(true)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all",
            isPublic
              ? "bg-white dark:bg-whatsapp-darkLighter shadow-sm text-whatsapp-teal"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <Globe className="w-4 h-4" /> Público
        </button>
        <button
          type="button"
          onClick={() => setIsPublic(false)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all",
            !isPublic
              ? "bg-white dark:bg-whatsapp-darkLighter shadow-sm text-amber-500"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <Lock className="w-4 h-4" /> Privado
        </button>
      </div>

      {/* Titulo */}
      <input
        placeholder="Titulo do evento *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputClass}
        required
      />

      {/* Descricao */}
      <textarea
        placeholder="Descricao (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        className={cn(inputClass, "resize-none")}
      />

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Inicio *
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Termino
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Local e Link */}
      <input
        placeholder="Local fisico (ex: Igreja Central, Av. Brasil 100)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Link online (ex: https://meet.google.com/...)"
        value={onlineLink}
        onChange={(e) => setOnlineLink(e.target.value)}
        className={inputClass}
        type="url"
      />

      {/* Botao salvar */}
      <button
        type="submit"
        disabled={isSaving || uploadingCover}
        className="w-full py-3 rounded-xl bg-whatsapp-teal text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-whatsapp-tealLight transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isSaving ? "Salvando..." : "Salvar Evento"}
      </button>
    </form>
  );
}