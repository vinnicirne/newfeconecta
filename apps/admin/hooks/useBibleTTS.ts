import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Verse {
  number: number;
  text: string;
}

export function useBibleTTS(verses: Verse[], selectedBookName: string, selectedChapter: number) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(-1);
  const currentChunkIndexRef = useRef<number>(0);
  const chunksRef = useRef<string[]>([]);
  const isCancelledRef = useRef<boolean>(false);

  // Parar fala ao desmontar ou trocar de capítulo/livro
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    stopSpeaking();
  }, [selectedChapter, selectedBookName]);

  const stopSpeaking = useCallback(() => {
    isCancelledRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsSpeaking(false);
    setCurrentVerseIndex(-1);
    currentChunkIndexRef.current = 0;
    chunksRef.current = [];
  }, []);

  // Obter a melhor voz em Português disponível no dispositivo
  const getPortugueseVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    
    // 1. Procura por voz pt-BR do Google / Microsoft / Apple de alta qualidade
    const ptBrVoices = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
    if (ptBrVoices.length > 0) {
      const preferred = ptBrVoices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Luciana') || 
        v.name.includes('Maria') || 
        v.name.includes('Francisca') ||
        v.name.includes('Natural')
      );
      return preferred || ptBrVoices[0];
    }

    // 2. Fallback para qualquer voz em português
    const anyPtVoice = voices.find(v => v.lang.toLowerCase().startsWith('pt'));
    return anyPtVoice || null;
  };

  const speakNextChunk = useCallback(() => {
    if (isCancelledRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    const index = currentChunkIndexRef.current;
    if (index >= chunksRef.current.length) {
      // Fim da leitura do capítulo
      setIsSpeaking(false);
      setCurrentVerseIndex(-1);
      toast.success("Leitura do capítulo concluída! 📖✨");
      return;
    }

    const textToSpeak = chunksRef.current[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Velocidade natural
    utterance.pitch = 1.0;

    const voice = getPortugueseVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      if (!isCancelledRef.current) {
        currentChunkIndexRef.current += 1;
        speakNextChunk();
      }
    };

    utterance.onerror = (e) => {
      console.warn("[BibleTTS] Aviso na síntese de voz:", e);
      if (!isCancelledRef.current) {
        currentChunkIndexRef.current += 1;
        speakNextChunk();
      }
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("[BibleTTS] Falha ao acionar speak:", err);
      setIsSpeaking(false);
    }
  }, []);

  const toggleTTS = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error("Seu navegador não suporta reprodução de áudio/voz.");
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      toast.info("Leitura em áudio pausada.");
      return;
    }

    if (!verses || verses.length === 0) {
      toast.warning("Aguarde o carregamento do capítulo para ouvir.");
      return;
    }

    // Garante que a síntese anterior seja limpa e desmutada
    window.speechSynthesis.cancel();
    isCancelledRef.current = false;

    // Monta a lista sequencial de versículos para evitar o bug de timeout de textos longos do Chrome
    const intro = `${selectedBookName}, capítulo ${selectedChapter}.`;
    const verseChunks = verses.map(v => `Versículo ${v.number}. ${v.text}`);
    
    chunksRef.current = [intro, ...verseChunks];
    currentChunkIndexRef.current = 0;

    setIsSpeaking(true);
    toast.success(`Iniciando leitura: ${selectedBookName} ${selectedChapter} 🔊`);

    // Inicia a cadeia sequencial de áudio
    setTimeout(() => {
      speakNextChunk();
    }, 100);
  }, [isSpeaking, verses, selectedBookName, selectedChapter, speakNextChunk, stopSpeaking]);

  return {
    isSpeaking,
    toggleTTS,
    stopSpeaking
  };
}
