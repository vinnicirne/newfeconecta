import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export interface BibleInteraction {
  id?: string;
  user_id?: string | null;
  profile_id?: string | null;
  book_abbrev: string;
  chapter: number;
  verse_number: number;
  verse_text?: string;
  is_favorite?: boolean;
  highlight_color?: string | null;
  comment?: string | null;
  created_at?: string;
}

const LOCAL_STORAGE_PREFIX = 'bible_interactions_v2:';

function getLocalKey(book: string, chapter: number, userId?: string | null): string {
  return `${LOCAL_STORAGE_PREFIX}${userId || 'guest'}:${book}:${chapter}`;
}

function readLocalInteractions(book: string, chapter: number, userId?: string | null): BibleInteraction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getLocalKey(book, chapter, userId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Error reading local bible interactions:", e);
    return [];
  }
}

function saveLocalInteractions(book: string, chapter: number, data: BibleInteraction[], userId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLocalKey(book, chapter, userId), JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving local bible interactions:", e);
  }
}

export function useBibleInteractions(userId: string | null, book: string, chapter: number) {
  const swrKey = `bible_interactions:${userId || 'guest'}:${book}:${chapter}`;

  const { data, mutate, error } = useSWR(
    swrKey,
    async () => {
      const local = readLocalInteractions(book, chapter, userId);

      if (!userId) {
        return local;
      }

      try {
        const { data: dbData, error: dbError } = await supabase
          .from("bible_interactions")
          .select("*")
          .eq("book_abbrev", book)
          .eq("chapter", chapter)
          .or(`user_id.eq.${userId},profile_id.eq.${userId}`);

        if (dbError) {
          console.warn("Supabase bible_interactions fetch error, using local:", dbError);
          return local;
        }

        // Merge DB data with local data
        const mergedMap = new Map<number, BibleInteraction>();
        local.forEach(item => mergedMap.set(item.verse_number, item));
        (dbData || []).forEach(item => mergedMap.set(item.verse_number, item));

        const result = Array.from(mergedMap.values());
        saveLocalInteractions(book, chapter, result, userId);
        return result;
      } catch (err) {
        console.warn("Failed to fetch bible interactions from remote:", err);
        return local;
      }
    },
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 5000, 
      fallbackData: readLocalInteractions(book, chapter, userId) 
    }
  );

  const interactions: BibleInteraction[] = data || [];

  // Mapeamentos rápidos para a UI
  const favoritesMap = interactions.reduce((acc: Record<number, boolean>, i) => {
    if (i.is_favorite) acc[i.verse_number] = true;
    return acc;
  }, {});

  const highlightsMap = interactions.reduce((acc: Record<number, string>, i) => {
    if (i.highlight_color) acc[i.verse_number] = i.highlight_color;
    return acc;
  }, {});

  const commentsMap = interactions.reduce((acc: Record<number, any[]>, i) => {
    if (i.comment) {
      if (!acc[i.verse_number]) acc[i.verse_number] = [];
      acc[i.verse_number].push(i);
    }
    return acc;
  }, {});

  const updateInteraction = async (verse: any, updates: Partial<BibleInteraction>) => {
    const verseNum = typeof verse === 'number' ? verse : (verse?.number ?? 0);
    const verseText = typeof verse === 'object' ? (verse?.text || '') : '';

    // 1. Calcular nova lista otimista
    const currentList = data || readLocalInteractions(book, chapter, userId);
    let nextList: BibleInteraction[];
    const existingIndex = currentList.findIndex(i => i.verse_number === verseNum);

    if (existingIndex >= 0) {
      nextList = [...currentList];
      nextList[existingIndex] = {
        ...nextList[existingIndex],
        ...updates,
        verse_text: verseText || nextList[existingIndex].verse_text || '',
        book_abbrev: book,
        chapter,
        verse_number: verseNum
      };
    } else {
      nextList = [
        ...currentList,
        {
          book_abbrev: book,
          chapter,
          verse_number: verseNum,
          verse_text: verseText,
          user_id: userId,
          profile_id: userId,
          ...updates
        }
      ];
    }

    // 2. Persistência local imediata
    saveLocalInteractions(book, chapter, nextList, userId);

    // 3. Atualizar cache SWR otimista instantaneamente
    mutate(nextList, false);

    // 4. Se o usuário estiver autenticado, persistir no Supabase em background
    if (userId) {
      try {
        const payload: any = {
          user_id: userId,
          profile_id: userId,
          book_abbrev: book,
          chapter: chapter,
          verse_number: verseNum,
          verse_text: verseText,
          ...updates
        };

        const { error: upsertError } = await supabase
          .from("bible_interactions")
          .upsert(payload, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });

        if (upsertError) {
          console.warn("Supabase upsert warning:", upsertError.message);
        }
      } catch (err: any) {
        console.warn("Supabase upsert exception:", err.message);
      }
    }
  };

  const updateMultipleInteractions = async (versesList: any[], updates: Partial<BibleInteraction>) => {
    const currentList = [...(data || readLocalInteractions(book, chapter, userId))];
    const newItemsToUpsert: any[] = [];

    for (const verse of versesList) {
      const verseNum = typeof verse === 'number' ? verse : (verse?.number ?? 0);
      const verseText = typeof verse === 'object' ? (verse?.text || '') : '';
      const existingIndex = currentList.findIndex(i => i.verse_number === verseNum);

      if (existingIndex >= 0) {
        currentList[existingIndex] = {
          ...currentList[existingIndex],
          ...updates,
          verse_text: verseText || currentList[existingIndex].verse_text || '',
          book_abbrev: book,
          chapter,
          verse_number: verseNum
        };
        newItemsToUpsert.push({
          user_id: userId,
          profile_id: userId,
          book_abbrev: book,
          chapter: chapter,
          verse_number: verseNum,
          verse_text: verseText || currentList[existingIndex].verse_text || '',
          ...updates
        });
      } else {
        const newItem: BibleInteraction = {
          book_abbrev: book,
          chapter,
          verse_number: verseNum,
          verse_text: verseText,
          user_id: userId,
          profile_id: userId,
          ...updates
        };
        currentList.push(newItem);
        newItemsToUpsert.push(newItem);
      }
    }

    saveLocalInteractions(book, chapter, currentList, userId);
    mutate(currentList, false);

    if (userId && newItemsToUpsert.length > 0) {
      try {
        const { error: upsertError } = await supabase
          .from("bible_interactions")
          .upsert(newItemsToUpsert, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });
        if (upsertError) {
          console.warn("Supabase multi upsert error:", upsertError.message);
        }
      } catch (err: any) {
        console.warn("Supabase multi upsert exception:", err.message);
      }
    }
  };

  const isChapterRead = interactions.some(i => i.verse_number === 0 && i.comment === 'CHAPTER_READ');

  const markChapterAsRead = async () => {
    const willRead = !isChapterRead;
    await updateInteraction({ number: 0, text: 'Capítulo Concluído' }, { comment: willRead ? 'CHAPTER_READ' : null });
  };

  return {
    favoritesMap,
    highlightsMap,
    commentsMap,
    isChapterRead,
    isLoading: !data && !error,
    updateInteraction,
    updateMultipleInteractions,
    markChapterAsRead,
    refresh: mutate
  };
}
