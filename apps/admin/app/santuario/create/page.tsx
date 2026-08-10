"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowLeft, Save, Globe, EyeOff, Plus, Trash2, Image as ImageIcon, Loader2, Bold, Italic, Underline, Highlighter, Type, BookOpen } from "lucide-react";
import useSWR from "swr";
import { getRandomThemeImage } from "@/app/actions/unsplash";
import { UnsplashGalleryModal } from "@/components/santuario/UnsplashGalleryModal";
import { BibleVersePicker } from "@/components/santuario/BibleVersePicker";

const THEMES = [
  { id: 'Perdão', name: 'Perdão' },
  { id: 'Liderança', name: 'Liderança' },
  { id: 'Gratidão', name: 'Gratidão' },
  { id: 'Família', name: 'Família & Casamento' },
  { id: 'Sabedoria', name: 'Sabedoria' },
  { id: 'Identidade', name: 'Identidade em Cristo' },
  { id: 'Cura', name: 'Cura Interior' }
];

const FONTS = [
  { id: 'font-santuario', name: 'Lugar Secreto (Serifada)' },
  { id: 'font-headline', name: 'Plus Jakarta (Moderna)' },
  { id: 'font-body', name: 'Manrope (Limpa)' },
  { id: 'font-sans', name: 'Padrão (Inter)' },
  { id: 'font-mono', name: 'Monoespaçada' },
];

export default function CreateSantuarioPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0].id);
  const [typography, setTypography] = useState(FONTS[0].id);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isBiblePickerOpen, setIsBiblePickerOpen] = useState<{ isOpen: boolean; chapterId: string | null }>({ isOpen: false, chapterId: null });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const edit = urlParams.get('edit');
      if (edit) {
        setEditId(edit);
        loadJourneyForEdit(edit);
      } else {
        loadThemeImage(THEMES[0].id);
      }
    }
  }, []);

  const loadJourneyForEdit = async (id: string) => {
    setIsImageLoading(true);
    try {
      const { data: journey, error } = await supabase.from('sanctuary_journeys').select('*').eq('id', id).single();
      if (error) throw error;
      
      setTitle(journey.title);
      setDescription(journey.description);
      const theme = THEMES.find(t => t.name === journey.theme);
      if (theme) setSelectedTheme(theme.id);
      setTypography(journey.typography || FONTS[0].id);
      setCurrentImage(journey.cover_url);
      
      const { data: chaptersData } = await supabase.from('sanctuary_chapters').select('*').eq('journey_id', id).order('order_index', { ascending: true });
      if (chaptersData && chaptersData.length > 0) {
        setChapters(chaptersData.map(c => ({
          id: c.id,
          title: c.title,
          content: c.content_blocks[0]?.text || ''
        })));
      }
    } catch (e) {
      toast.error("Erro ao carregar jornada para edição.");
    } finally {
      setIsImageLoading(false);
    }
  };

  const loadThemeImage = async (themeId: string) => {
    setIsImageLoading(true);
    try {
      const url = await getRandomThemeImage(themeId);
      setCurrentImage(url);
    } catch (e) {
      console.error("Erro ao carregar imagem do tema", e);
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    loadThemeImage(themeId);
  };
  
  // Estado dos capítulos
  const [chapters, setChapters] = useState([{ id: Date.now().toString(), title: "", content: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormat = (chapterId: string, before: string, after: string) => {
    const el = document.getElementById(`chapter-content-${chapterId}`) as HTMLTextAreaElement;
    if (!el) return;
    
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    updateChapter(chapterId, 'content', newText);
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleInsertVerse = (formattedText: string) => {
    if (!isBiblePickerOpen.chapterId) return;
    
    const chapterId = isBiblePickerOpen.chapterId;
    const el = document.getElementById(`chapter-content-${chapterId}`) as HTMLTextAreaElement;
    
    let newContent = formattedText;
    
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;
      newContent = text.substring(0, start) + `\n\n${formattedText}\n\n` + text.substring(end);
      
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + formattedText.length + 4, start + formattedText.length + 4);
      }, 0);
    } else {
      const chapter = chapters.find(c => c.id === chapterId);
      newContent = chapter ? chapter.content + `\n\n${formattedText}\n\n` : formattedText;
    }
    
    updateChapter(chapterId, 'content', newContent);
  };

  const loadExample = () => {
    setTitle("A Jornada do Perdão Verdadeiro");
    handleThemeChange("Perdão");
    setDescription("Nesta jornada de 3 dias, vamos mergulhar na profundidade do perdão bíblico. Aprenda a liberar as amarras do passado e viver a verdadeira liberdade que Cristo nos comprou na cruz.");
    setChapters([
      {
        id: "1",
        title: "Dia 1 - A Dívida Impagável",
        content: "Mateus 18:23-27 nos conta sobre um servo que devia dez mil talentos — uma dívida impossível de ser paga em uma vida inteira.\n\nDa mesma forma, nossa dívida com Deus era impagável. Antes de conseguirmos perdoar o próximo, precisamos contemplar a magnitude do perdão que recebemos.\n\nReflita hoje: Você tem consciência do tamanho da dívida que Cristo perdoou na sua vida?"
      },
      {
        id: "2",
        title: "Dia 2 - O Veneno da Mágoa",
        content: "Hebreus 12:15 nos alerta sobre a 'raiz de amargura'. A falta de perdão não prende aquele que nos feriu, mas aprisiona a nós mesmos.\n\nGuardar ressentimento é como beber veneno esperando que a outra pessoa morra. Hoje, o Espírito Santo te convida a identificar quem você prendeu na prisão do seu coração."
      },
      {
        id: "3",
        title: "Dia 3 - A Chave da Prisão",
        content: "Efésios 4:32 diz: 'Sejam bondosos e compassivos uns para com os outros, perdoando-se mutuamente, assim como Deus os perdoou em Cristo.'\n\nO perdão não é um sentimento, é uma decisão. Você não precisa sentir vontade de perdoar, você precisa decidir obedecer.\n\nOração: Senhor, eu decido hoje liberar [Nome da pessoa] da dívida que tem comigo. Assim como o Senhor me perdoou, eu os perdôo. Em nome de Jesus."
      }
    ]);
    toast.success("Exemplo celestial carregado!");
  };

  // Check if user is verified
  const { data: profile } = useSWR("/api/profile", async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return data;
  });

  const addChapter = () => {
    setChapters([...chapters, { id: Date.now().toString(), title: "", content: "" }]);
  };

  const removeChapter = (id: string) => {
    if (chapters.length === 1) return;
    setChapters(chapters.filter(c => c.id !== id));
  };

  const updateChapter = (id: string, field: 'title' | 'content', value: string) => {
    setChapters(chapters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      toast.error("Dê um título à sua jornada celestial.");
      return;
    }

    // Validação básica dos capítulos
    const invalidChapters = chapters.filter(c => (chapters.length > 1 && !c.title.trim()) || !c.content.trim());
    if (invalidChapters.length > 0) {
      toast.error(chapters.length > 1 ? "Preencha o título e o conteúdo de todos os módulos." : "Preencha o conteúdo do módulo.");
      return;
    }

    if (!profile?.is_verified) {
      toast.error("Apenas líderes verificados podem criar no Lugar Secreto.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const themeData = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

      let journeyId = editId;

      if (editId) {
        // Atualizar Jornada Existente
        const { error: updateError } = await supabase.from("sanctuary_journeys").update({
          title,
          description,
          theme: themeData.name,
          cover_url: currentImage,
          is_published: publish,
          typography: typography
        }).eq('id', editId);
        if (updateError) throw updateError;
        
        // Deletar capítulos antigos para reinserir
        await supabase.from("sanctuary_chapters").delete().eq('journey_id', editId);
      } else {
        // Criar Nova Jornada
        const { data: journeyData, error: journeyError } = await supabase.from("sanctuary_journeys").insert({
          author_id: session.session?.user.id,
          title,
          description,
          theme: themeData.name,
          cover_url: currentImage,
          is_published: publish,
          typography: typography
        }).select().single();
  
        if (journeyError) throw journeyError;
        journeyId = journeyData.id;
      }

      // 2. Inserir os Capítulos
      const chaptersToInsert = chapters.map((c, index) => ({
        journey_id: journeyId,
        title: c.title,
        content_blocks: [{ type: "text", text: c.content }], // Usando JSONB estruturado
        order_index: index + 1
      }));

      const { error: chaptersError } = await supabase.from("sanctuary_chapters").insert(chaptersToInsert);
      if (chaptersError) throw chaptersError;

      // Se publicou e NÃO é edição, lança no Feed Global
      if (publish && !editId && journeyId) {
        await supabase.from("posts").insert({
          author_id: session.session?.user.id,
          user_id: session.session?.user.id,
          content: `🕊️ Acabei de revelar uma nova jornada no Lugar Secreto: **${title}**\n\n_"${description.substring(0, 100)}..."_`,
          post_type: 'journey',
          media_url: journeyId
        });
        
        import("@/lib/notifications").then(({ NotificationService }) => {
          if (session.session?.user.id && journeyId) {
            const u = session.session.user;
            const authorName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Um membro';
            NotificationService.notifyNetwork(
              u.id,
              'new_post',
              journeyId,
              `${authorName} revelou uma nova jornada no Lugar Secreto: ${title}`,
              true
            ).catch(console.error);
          }
        });
      }

      toast.success(publish ? "Jornada salva e publicada!" : "Rascunho salvo em secreto.");
      router.push("/santuario");
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profile && !profile.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center px-4">
        <div>
          <h2 className="text-2xl font-santuario font-bold text-zinc-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-zinc-600 dark:text-zinc-400">O altar do Lugar Secreto é exclusivo para líderes verificados.<br/>Use a aba de Notas para seu devocional pessoal.</p>
          <button onClick={() => router.push("/notes")} className="mt-6 px-6 py-2 bg-amber-500 text-white font-bold rounded-full hover:bg-amber-600">
            Ir para Minhas Notas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 transition-colors duration-300">
      <div className="pt-12 px-4 max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar ao Lugar Secreto</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold font-santuario text-zinc-900 dark:text-white">
            {editId ? "Editar Jornada" : "Forjar Jornada"}
          </h1>
          <button 
            onClick={loadExample}
            className="text-sm font-bold text-amber-500 border border-amber-500/30 hover:bg-amber-500/10 px-4 py-2 rounded-full transition-colors"
          >
            Carregar Estudo de Exemplo
          </button>
        </div>

        <div className="bg-card shadow-2xl rounded-[32px] overflow-hidden border border-border">
          {/* Capa Celestial Dinâmica */}
          <div className="relative w-full h-48 sm:h-64 bg-muted flex items-center justify-center">
            {isImageLoading && (
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin absolute z-10" />
            )}
            {currentImage && (
              <img 
                src={currentImage} 
                alt="Capa" 
                className={`w-full h-full object-cover transition-opacity duration-700 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`} 
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 border border-border/50">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tema:</span>
              <select 
                value={selectedTheme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-sm text-foreground cursor-pointer truncate max-w-[100px] sm:max-w-none"
              >
                {THEMES.map(t => (
                  <option key={t.id} value={t.id} className="bg-background text-foreground">{t.name}</option>
                ))}
              </select>
              <div className="w-px h-4 bg-border mx-1"></div>
              <Type className="w-4 h-4 text-zinc-500" />
              <select 
                value={typography}
                onChange={(e) => setTypography(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-sm text-foreground cursor-pointer truncate max-w-[100px] sm:max-w-none"
              >
                {FONTS.map(f => (
                  <option key={f.id} value={f.id} className="bg-background text-foreground">{f.name}</option>
                ))}
              </select>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button 
                onClick={() => setShowGallery(true)}
                title="Mudar Imagem"
                className="text-amber-500 hover:text-amber-600 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da Jornada..."
              className="w-full text-3xl font-bold font-santuario bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
            />
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste estudo e o que a igreja aprenderá..."
              rows={2}
              className="w-full text-lg bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 text-muted-foreground"
            />

            {/* Módulos em estilo Keep */}
            <div className="space-y-4 pt-6 mt-6 border-t border-border/50">
              {chapters.map((chapter, index) => (
                <div key={chapter.id} className="relative group bg-muted/30 p-4 rounded-2xl border border-border/30 hover:border-border transition-colors">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-amber-500 text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {chapters.length > 1 && (
                        <input 
                          type="text" 
                          value={chapter.title}
                          onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                          placeholder="Título do Capítulo (Ex: Dia 1 - O Deserto)"
                          className="w-full font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleFormat(chapter.id, '**', '**')} className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Negrito"><Bold className="w-4 h-4" /></button>
                          <button onClick={() => handleFormat(chapter.id, '*', '*')} className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Itálico"><Italic className="w-4 h-4" /></button>
                          <button onClick={() => handleFormat(chapter.id, '__', '__')} className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Sublinhado"><Underline className="w-4 h-4" /></button>
                          <button onClick={() => handleFormat(chapter.id, '==', '==')} className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Marca Texto"><Highlighter className="w-4 h-4" /></button>
                        </div>
                        <div className="w-px h-6 bg-border mx-2"></div>
                        <button onClick={() => setIsBiblePickerOpen({ isOpen: true, chapterId: chapter.id })} className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors" title="Inserir Versículo Bíblico">
                          <BookOpen className="w-4 h-4" /> Bíblia
                        </button>
                      </div>
                      <textarea 
                        id={`chapter-content-${chapter.id}`}
                        value={chapter.content}
                        onChange={(e) => updateChapter(chapter.id, 'content', e.target.value)}
                        placeholder="Escreva a palavra ou devocional deste dia..."
                        rows={3}
                        className={`w-full text-sm ${typography} bg-transparent border-none outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/40 leading-relaxed`}
                      />
                    </div>
                    {chapters.length > 1 && (
                      <button onClick={() => removeChapter(chapter.id)} className="text-zinc-400 hover:text-red-500 transition-all p-2 h-fit shrink-0" title="Remover Módulo">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar Inferior */}
            <div className="pt-6 mt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <button 
                onClick={addChapter}
                className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 font-bold transition-colors"
              >
                <Plus className="w-5 h-5" /> Adicionar Módulo
              </button>
              
              <div className="flex w-full sm:w-auto gap-3">
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 font-bold hover:bg-muted transition-colors border border-border"
                >
                  <EyeOff className="w-4 h-4" />
                  Rascunho
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                >
                  <Globe className="w-4 h-4" />
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Galeria Unsplash Modal */}
      {showGallery && (
        <UnsplashGalleryModal
          isOpen={true}
          onSelect={(url: string) => {
            setCurrentImage(url);
            setShowGallery(false);
          }}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* Seletor de Versículos Modal */}
      {isBiblePickerOpen.isOpen && (
        <BibleVersePicker 
          onInsert={handleInsertVerse} 
          onClose={() => setIsBiblePickerOpen({ isOpen: false, chapterId: null })} 
        />
      )}
    </div>
  );
}
