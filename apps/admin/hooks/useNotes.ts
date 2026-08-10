import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export function useNotes(userId: string | null) {
  const { data, mutate, error } = useSWR(
    userId ? `notes:${userId}` : null,
    async () => {
      let query = supabase
        .from("user_notes")
        .select("*")
        .order("created_at", { ascending: false })
        .eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    { revalidateOnFocus: true }
  );

  const saveNote = async (noteData: any, editingId: string | null) => {
    // UI Otimista: Adiciona ou atualiza na hora no cache
    const tempId = editingId || `temp-${Date.now()}`;
    const optimisticNote = { id: tempId, ...noteData, created_at: new Date().toISOString() };

    mutate((currentNotes: any) => {
      if (editingId) {
        return currentNotes?.map((n: any) => n.id === editingId ? optimisticNote : n) || [];
      }
      return [optimisticNote, ...(currentNotes || [])];
    }, false);

    try {
      if (editingId) {
        const { data } = await supabase.from("user_notes").update(noteData).eq("id", editingId).select().single();
        mutate(); // Revalida para garantir ID real
        return data;
      } else {
        const { data } = await supabase.from("user_notes").insert(noteData).select().single();
        mutate(); // Revalida para garantir ID real
        return data;
      }
    } catch (err) {
      mutate(); // Reverte em caso de erro
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    mutate((currentNotes: any) => currentNotes?.filter((n: any) => n.id !== id) || [], false);
    await supabase.from("user_notes").delete().eq("id", id);
  };

  const toggleFavorite = async (id: string, currentState: boolean) => {
    mutate((currentNotes: any) => {
      return currentNotes?.map((n: any) => n.id === id ? { ...n, is_favorite: !currentState } : n) || [];
    }, false);
    await supabase.from("user_notes").update({ is_favorite: !currentState }).eq("id", id);
  };

  return {
    notes: data || [],
    isLoading: !data && !error,
    saveNote,
    deleteNote,
    toggleFavorite,
    refresh: mutate
  };
}
