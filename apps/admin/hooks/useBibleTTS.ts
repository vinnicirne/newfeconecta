import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface Verse {
  number: number;
  text: string;
}

export function useBibleTTS(verses: Verse[], selectedBookName: string, selectedChapter: number) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [useNativeTTS, setUseNativeTTS] = useState(false);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    stopSpeaking();
  }, [selectedChapter, selectedBookName]);

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const playNativeTTS = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (verses.length === 0) return;

    setIsSpeaking(true);
    const fullText = `${selectedBookName}, capítulo ${selectedChapter}. ` + verses.map(v => v.text).join(" ");
    
    playNativeTTS(fullText);
  };

  return {
    isSpeaking,
    toggleTTS
  };
}
