"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  ArrowLeft, Save, Globe, EyeOff, Plus, Trash2, 
  Image as ImageIcon, Loader2, Bold, Italic, Underline, 
  Highlighter, Type, BookOpen, Sparkles 
} from "lucide-react";
import { getRandomThemeImage } from "@/app/actions/unsplash";
import { UnsplashGalleryModal } from "@/components/santuario/UnsplashGalleryModal";
import { BibleVersePicker } from "@/components/santuario/BibleVersePicker";
import { getStoredProfile, setStoredProfile } from "@/lib/profile-cache";

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
  const [profile, setProfile] = useState<any>(() => getStoredProfile());
  const [chapters, setChapters] = useState([{ id: Date.now().toString(), title: "", content: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initProfileAndJourney = async () => {
      // 1. Carrega Perfil do Usuário
      const cached = getStoredProfile();
      let activeUser = cached;
      if (!activeUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          if (p) activeUser = setStoredProfile(p);
        }
      }
      if (isMounted && activeUser) {
        setProfile(activeUser);
      }

      // 2. Parâmetros de Edição
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
    };

    initProfileAndJourney();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadJourneyForEdit = async (id: string) => {
    setIsImageLoading(true);
    try {
      const { data: journey, error } = await supabase.from('sanctuary_journeys').select('*').eq('id', id).single();
      if (error) throw error;
      
      setTitle(journey.title || "");
      setDescription(journey.description || "");
      const theme = THEMES.find(t => t.name === journey.theme);
      if (theme) setSelectedTheme(theme.id);
      setTypography(journey.typography || FONTS[0].id);
      setCurrentImage(journey.cover_url || "");
      
      const { data: chaptersData } = await supabase.from('sanctuary_chapters').select('*').eq('journey_id', id).order('order_index', { ascending: true });
      if (chaptersData && chaptersData.length > 0) {
        setChapters(chaptersData.map(c => ({
          id: c.id,
          title: c.title || "",
          content: c.content_blocks?.[0]?.text || ''
        })));
      }
    } catch (e) {
      console.error("Erro ao carregar jornada para edição:", e);
      toast.error("Erro ao carregar jornada para edição.");
    } finally {
      setIsImageLoading(false);
    }
  };

  const loadThemeImage = async (themeId: string) => {
    setIsImageLoading(true);
    try {
      const url = await getRandomThemeImage(themeId);
      if (url) setCurrentImage(url);
    } catch (e) {
      console.error("Erro ao carregar imagem do tema:", e);
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    loadThemeImage(themeId);
  };

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
    toast.success("Exemplo celestial carregado com sucesso!");
  };

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

    const invalidChapters = chapters.filter(c => (chapters.length > 1 && !c.title.trim()) || !c.content.trim());
    if (invalidChapters.length > 0) {
      toast.error(chapters.length > 1 ? "Preencha o título e o conteúdo de todos os módulos." : "Preencha o conteúdo do módulo.");
      return;
    }

    if (!profile?.is_verified && profile?.role !== 'admin') {
      toast.error("Apenas líderes verificados ou administradores podem forjar jornadas no Lugar Secreto.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session?.session?.user?.id || profile?.id;
      
      if (!currentUserId) {
        throw new Error("Sessão de usuário não identificada.");
      }

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
        
        // Deletar capítulos antigos para reinserir com ordem correta
        await supabase.from("sanctuary_chapters").delete().eq('journey_id', editId);
      } else {
        // Criar Nova Jornada
        const { data: journeyData, error: journeyError } = await supabase.from("sanctuary_journeys").insert({
          author_id: currentUserId,
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
        title: c.title || `Capítulo ${index + 1}`,
        content_blocks: [{ type: "text", text: c.content }],
        order_index: index + 1
      }));

      const { error: chaptersError } = await supabase.from("sanctuary_chapters").insert(chaptersToInsert);
      if (chaptersError) throw chaptersError;

      // 3. Se publicou e NÃO é edição, divulga no Feed Global
      if (publish && !editId && journeyId) {
        await supabase.from("posts").insert({
          author_id: currentUserId,
          user_id: currentUserId,
          content: `🕊️ Acabei de revelar uma nova jornada no Lugar Secreto: **${title}**\n\n_"${description.substring(0, 100)}..."_`,
          post_type: 'journey',
          media_url: journeyId
        });
        
        import("@/lib/notifications").then(({ NotificationService }) => {
          const authorName = profile?.full_name || profile?.username || 'Um líder ministerial';
          NotificationService.notifyNetwork(
            currentUserId,
            'new_post',
            journeyId,
            `${authorName} revelou uma nova jornada no Lugar Secreto: ${title}`,
            true
          ).catch(console.error);
        });
      }

      toast.success(publish ? "Jornada salva e revelada com sucesso!" : "Rascunho salvo em secreto.");
      router.push("/santuario");
    } catch (err: any) {
      console.error("Erro ao salvar jornada:", err);
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profile && !profile.is_verified && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center px-4">
        <div className="bg-card p-8 rounded-3xl border border-border max-w-md shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <BookOpen className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-2xl font-santuario font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            O forjamento de jornadas no Lugar Secreto é exclusivo para líderes verificados.<br/>
            Para suas anotações pessoais diárias, utilize o seu caderno espiritual.
          </p>
          <button 
            onClick={() => router.push("/notes")} 
            className="w-full py-3 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors shadow-lg active:scale-95"
          >
            Ir para Minhas Notas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36 transition-colors duration-300">
      <div className="pt-8 px-4 max-w-3xl mx-auto">
        
        {/* VOLTAR */}
        <button 
          onClick={() => router.push("/santuario")} 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber-500 mb-6 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Lugar Secreto</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-santuario text-foreground">
              {editId ? "Editar Jornada Celestial" : "Forjar Jornada Celestial"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Crie uma trilha guiada de estudo, oração e edificação espiritual.
            </p>
          </div>
          <button 
            onClick={loadExample}
            className="text-xs sm:text-sm font-bold text-amber-500 border border-amber-500/30 hover:bg-amber-500/10 px-4 py-2 rounded-2xl transition-colors shrink-0 active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Carregar Estudo Modelo
          </button>
        </div>

        <div className="bg-card shadow-2xl rounded-3xl overflow-hidden border border-border mb-8">
          
          {/* Capa Celestial Dinâmica */}
          <div className="relative w-full h-48 sm:h-64 bg-muted flex items-center justify-center overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <button 
              onClick={() => setShowGallery(true)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs sm:text-sm font-bold backdrop-blur-md border border-white/20 transition-all active:scale-95 shadow-lg"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" /> Alterar Capa
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* TEMA E TIPOGRAFIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Tema Espiritual
                </label>
                <select 
                  value={selectedTheme} 
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-2xl font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none text-foreground"
                >
                  {THEMES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Estilo Tipográfico
                </label>
                <select 
                  value={typography} 
                  onChange={(e) => setTypography(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-2xl font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none text-foreground"
                >
                  {FONTS.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TÍTULO */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Título da Jornada
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: O Poder do Perdão no Casamento"
                className="w-full p-4 bg-background border border-border rounded-2xl font-bold text-lg sm:text-xl focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            {/* DESCRIÇÃO */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Sinopse / Revelação da Jornada
              </label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Descreva brevemente o propósito deste estudo devocional..."
                className="w-full p-4 bg-background border border-border rounded-2xl font-medium text-sm sm:text-base focus:ring-2 focus:ring-amber-500 outline-none resize-none text-foreground placeholder:text-muted-foreground/50 leading-relaxed"
              />
            </div>

          </div>
        </div>

        {/* CAPÍTULOS / MÓDULOS */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg sm:text-xl font-black font-santuario text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" /> Módulos da Trilha ({chapters.length})
            </h2>
            <button 
              onClick={addChapter}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-2xl text-xs sm:text-sm font-bold border border-amber-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Adicionar Dia
            </button>
          </div>

          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-4 relative group">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Módulo {index + 1}
                </span>
                {chapters.length > 1 && (
                  <button 
                    onClick={() => removeChapter(chapter.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
                    title="Remover módulo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Título do Capítulo */}
              <input 
                type="text" 
                value={chapter.title} 
                onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                placeholder={`Ex: Dia ${index + 1} - A Raiz do Problema`}
                className="w-full p-3.5 bg-background border border-border rounded-2xl font-bold text-base focus:ring-2 focus:ring-amber-500 outline-none text-foreground"
              />

              {/* BARRA DE FORMATAÇÃO */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/50 rounded-2xl border border-border">
                <button 
                  onClick={() => handleFormat(chapter.id, '**', '**')} 
                  className="p-2 hover:bg-background rounded-xl text-muted-foreground hover:text-foreground transition-colors font-bold"
                  title="Negrito (**texto**)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleFormat(chapter.id, '*', '*')} 
                  className="p-2 hover:bg-background rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  title="Itálico (*texto*)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleFormat(chapter.id, '__', '__')} 
                  className="p-2 hover:bg-background rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  title="Sublinhado (__texto__)"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleFormat(chapter.id, '==', '==')} 
                  className="p-2 hover:bg-background rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  title="Destacar (==texto==)"
                >
                  <Highlighter className="w-4 h-4 text-amber-500" />
                </button>

                <div className="h-4 w-px bg-border mx-1" />

                <button 
                  onClick={() => setIsBiblePickerOpen({ isOpen: true, chapterId: chapter.id })} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold border border-amber-500/20 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Inserir Versículo NVI
                </button>
              </div>

              {/* Conteúdo do Capítulo */}
              <textarea 
                id={`chapter-content-${chapter.id}`}
                value={chapter.content} 
                onChange={(e) => updateChapter(chapter.id, 'content', e.target.value)}
                rows={8}
                placeholder="Escreva aqui a meditação diária, contexto bíblico e oração final..."
                className="w-full p-4 bg-background border border-border rounded-2xl font-medium text-sm sm:text-base focus:ring-2 focus:ring-amber-500 outline-none resize-y text-foreground placeholder:text-muted-foreground/50 leading-relaxed"
              />
            </div>
          ))}

          <button 
            onClick={addChapter}
            className="w-full py-4 border-2 border-dashed border-border hover:border-amber-500/50 rounded-3xl text-muted-foreground hover:text-amber-500 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-amber-500/5"
          >
            <Plus className="w-5 h-5" /> Adicionar Próximo Módulo
          </button>
        </div>

        {/* BARRA DE AÇÃO FIXA */}
        <div className="sticky bottom-6 z-40 bg-card/90 backdrop-blur-xl border border-border p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 max-w-3xl mx-auto">
          <button 
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-2xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <EyeOff className="w-4 h-4 text-muted-foreground" /> Salvar Rascunho
          </button>

          <button 
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            Publicar no Santuário
          </button>
        </div>

      </div>

      {/* MODAL UNSPLASH */}
      {showGallery && (
        <UnsplashGalleryModal 
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onSelect={(url: string) => {
            setCurrentImage(url);
            setShowGallery(false);
          }}
          initialQuery={selectedTheme}
        />
      )}

      {/* PICKER BÍBLICO */}
      {isBiblePickerOpen.isOpen && (
        <BibleVersePicker 
          onInsert={handleInsertVerse}
          onClose={() => setIsBiblePickerOpen({ isOpen: false, chapterId: null })}
        />
      )}
    </div>
  );
}
