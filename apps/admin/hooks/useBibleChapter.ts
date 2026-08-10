import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BIBLE_BOOKS } from '@/lib/bible-data';

interface Verse {
  number: number;
  text: string;
}

const bibleCache: Record<string, any> = {};

// Utilitário para IndexedDB (Cache Offline de Elite)
const getDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('BibleCache', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('versions');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToOffline = async (id: string, data: any) => {
  try {
    const db = await getDB();
    const tx = db.transaction('versions', 'readwrite');
    tx.objectStore('versions').put(data, id);
  } catch (e) { console.error("DB Save Error:", e); }
};

const getFromOffline = async (id: string) => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('versions', 'readonly');
      const req = tx.objectStore('versions').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
};

export function useBibleChapter(selectedBook: string, selectedChapter: number, selectedVersion: any, selectedBookName: string) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchChapter() {
      try {
        setLoading(true);
        const book = BIBLE_BOOKS.find(b => b.abbrev === selectedBook);
        if (!book) return null;

        // 1. Verificar Cache em Memória (Rápido)
        if (!bibleCache[selectedVersion.id]) {
          // 2. Verificar Cache Offline (IndexedDB)
          const offlineData = await getFromOffline(selectedVersion.id);
          if (offlineData) {
            bibleCache[selectedVersion.id] = offlineData;
          } else {
            // 3. Download apenas se necessário
            const res = await fetch(`/bible/${selectedVersion.id}.json`);
            if (!res.ok) {
              if (!cancelled) toast.error(`Tradução ${selectedVersion.name} indisponível.`);
              return null;
            }
            const data = await res.json();
            bibleCache[selectedVersion.id] = data;
            saveToOffline(selectedVersion.id, data); // Guardar para a próxima vez
          }
        }

        const bookData = bibleCache[selectedVersion.id].find((b: any) => b.abbrev === selectedBook || b.name === selectedBookName);
        if (bookData && bookData.chapters[selectedChapter - 1]) {
          return bookData.chapters[selectedChapter - 1].map((v: string, index: number) => ({
            number: index + 1,
            text: v
          }));
        }
        return [];
      } catch (error) {
        console.error("Erro Crítico Bíblia:", error);
        if (!cancelled) toast.error("Erro ao carregar os manuscritos digitais.");
        return null;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadData() {
      const data = await fetchChapter();
      if (!cancelled && data) {
        setVerses(data);
      }
    }
    
    loadData();
    
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, selectedVersion, selectedBookName]);

  return { verses, loading };
}
