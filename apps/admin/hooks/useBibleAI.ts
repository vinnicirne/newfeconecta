import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Verse {
  number: number;
  text: string;
}

// Cache local (memória) de estudos IA para economizar requisições e dinheiro.
// Chave: book-chapter-verseNumber-version
const aiStudyCache = new Map<string, string>();

export function useBibleAI(selectedBookName: string, selectedChapter: number, selectedVersionName: string) {
  const [isStudying, setIsStudying] = useState(false);
  const [aiStudyResult, setAiStudyResult] = useState<string | null>(null);
  const [studyVerse, setStudyVerse] = useState<Verse | null>(null);
  const [aiOperational, setAiOperational] = useState(false);

  useEffect(() => {
    checkAIStatus();
  }, []);

  async function checkAIStatus() {
    try {
      const res = await fetch('/api/ai/bible-study');
      const data = await res.json();
      setAiOperational(!!data.operational);
    } catch (err) {
      setAiOperational(false);
    }
  }

  const handleAIStudy = async (verse: Verse) => {
    setStudyVerse(verse);
    setIsStudying(true);
    setAiStudyResult(null);

    const cacheKey = `${selectedBookName}-${selectedChapter}-${verse.number}-${selectedVersionName}`;
    
    if (aiStudyCache.has(cacheKey)) {
      setAiStudyResult(aiStudyCache.get(cacheKey) || null);
      setIsStudying(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/ai/bible-study', {
        method: 'POST', 
        headers,
        body: JSON.stringify({ 
          verse: verse.text, 
          book: selectedBookName, 
          chapter: selectedChapter, 
          verseNumber: verse.number, 
          version: selectedVersionName 
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.details || data.error || "Falha na API");
      
      setAiStudyResult(data.study);
      aiStudyCache.set(cacheKey, data.study); // Salva no cache

    } catch (error: any) {
      toast.error(`Erro Teológico: ${error.message}`);
      setStudyVerse(null);
    } finally { 
      setIsStudying(false); 
    }
  };

  const closeStudy = () => {
    setStudyVerse(null);
    setAiStudyResult(null);
  };

  return {
    isStudying,
    aiStudyResult,
    studyVerse,
    aiOperational,
    handleAIStudy,
    closeStudy
  };
}
