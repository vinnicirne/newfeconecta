import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export function useBibleInteractions(userId: string | null, book: string, chapter: number) {
  const { data, mutate, error } = useSWR(
    userId ? `bible_int:${userId}:${book}:${chapter}` : null,
    async () => {
      const { data, error } = await supabase
        .from("bible_interactions")
        .select("*")
        .eq("user_id", userId)
        .eq("book_abbrev", book)
        .eq("chapter", chapter);
      
      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const interactions = data || [];
  
  // Mapeamentos rápidos para a UI
  const favoritesMap = interactions.reduce((acc: any, i: any) => {
    if (i.is_favorite) acc[i.verse_number] = true;
    return acc;
  }, {});

  const highlightsMap = interactions.reduce((acc: any, i: any) => {
    if (i.highlight_color) acc[i.verse_number] = i.highlight_color;
    return acc;
  }, {});

  const commentsMap = interactions.reduce((acc: any, i: any) => {
    if (i.comment) {
      if (!acc[i.verse_number]) acc[i.verse_number] = [];
      acc[i.verse_number].push(i);
    }
    return acc;
  }, {});

  const updateInteraction = async (verse: any, updates: any) => {
    // UI Otimista
    mutate((current: any) => {
      const existing = current?.find((i: any) => i.verse_number === verse.number);
      if (existing) {
        return current.map((i: any) => i.verse_number === verse.number ? { ...i, ...updates } : i);
      }
      return [...(current || []), { verse_number: verse.number, ...updates }];
    }, false);

    try {
      await supabase.from("bible_interactions").upsert({
        user_id: userId,
        book_abbrev: book,
        chapter: chapter,
        verse_number: verse.number,
        verse_text: verse.text,
        ...updates
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });
      mutate();
    } catch (err) {
      mutate();
      throw err;
    }
  };

  return {
    favoritesMap,
    highlightsMap,
    commentsMap,
    isLoading: !data && !error,
    updateInteraction,
    refresh: mutate
  };
}
