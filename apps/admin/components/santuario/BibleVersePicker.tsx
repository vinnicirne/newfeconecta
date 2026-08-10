"use client";

import React, { useState, useEffect } from 'react';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { X, Book, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BibleVersePickerProps {
  onInsert: (text: string) => void;
  onClose: () => void;
}

export function BibleVersePicker({ onInsert, onClose }: BibleVersePickerProps) {
  const [step, setStep] = useState<'book' | 'chapter' | 'verse'>('book');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  
  const [bibleData, setBibleData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadBible() {
      setIsLoading(true);
      try {
        const res = await fetch('/bible/nvi.json');
        if (!res.ok) throw new Error('Falha ao carregar bíblia');
        const data = await res.json();
        setBibleData(data);
      } catch (err) {
        toast.error('Erro ao carregar a base de dados bíblica.');
        onClose();
      } finally {
        setIsLoading(false);
      }
    }
    loadBible();
  }, [onClose]);

  const handleSelectBook = (book: any) => {
    setSelectedBook(book);
    setStep('chapter');
  };

  const handleSelectChapter = (chapter: number) => {
    setSelectedChapter(chapter);
    setStep('verse');
  };

  const handleSelectVerse = (verseIndex: number) => {
    if (!bibleData || !selectedBook || !selectedChapter) return;
    const bookData = bibleData.find(b => b.abbrev === selectedBook.abbrev);
    if (!bookData || !bookData.chapters[selectedChapter - 1]) return;
    
    const verseText = bookData.chapters[selectedChapter - 1][verseIndex];
    const reference = `${selectedBook.name} ${selectedChapter}:${verseIndex + 1}`;
    
    // Formata o texto para ser inserido de forma bela e com a referência para o Parser
    const formattedText = `"${verseText}" - ${reference}`;
    onInsert(formattedText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <Book className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-santuario text-foreground">Escrituras (NVI)</h3>
            <p className="text-sm text-muted-foreground">
              {step === 'book' && 'Escolha um livro'}
              {step === 'chapter' && `${selectedBook?.name} - Escolha o capítulo`}
              {step === 'verse' && `${selectedBook?.name} ${selectedChapter} - Escolha o versículo`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
            <p className="text-muted-foreground text-sm font-medium animate-pulse">Carregando manuscritos sagrados...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {step === 'book' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BIBLE_BOOKS.map(book => (
                  <button
                    key={book.id}
                    onClick={() => handleSelectBook(book)}
                    className="p-3 text-sm font-medium bg-muted/50 hover:bg-amber-500/10 hover:text-amber-500 rounded-xl transition-colors text-left truncate border border-transparent hover:border-amber-500/30"
                  >
                    {book.name}
                  </button>
                ))}
              </div>
            )}

            {step === 'chapter' && selectedBook && (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {Array.from({ length: selectedBook.chapters }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectChapter(idx + 1)}
                    className="aspect-square flex items-center justify-center font-bold bg-muted/50 hover:bg-amber-500/10 hover:text-amber-500 rounded-xl transition-colors border border-transparent hover:border-amber-500/30"
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {step === 'verse' && selectedBook && selectedChapter && bibleData && (
              <div className="space-y-2">
                {(() => {
                  const bookData = bibleData.find(b => b.abbrev === selectedBook.abbrev);
                  const verses = bookData?.chapters[selectedChapter - 1] || [];
                  return verses.map((text: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectVerse(idx)}
                      className="w-full text-left p-4 rounded-2xl bg-muted/30 hover:bg-amber-500/5 hover:border-amber-500/30 border border-transparent transition-colors group"
                    >
                      <div className="flex gap-3">
                        <span className="font-bold text-amber-500 shrink-0 text-sm">{idx + 1}</span>
                        <span className="text-foreground/90 group-hover:text-foreground text-sm leading-relaxed">{text}</span>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {step !== 'book' && !isLoading && (
          <div className="mt-4 pt-4 border-t border-border">
            <button 
              onClick={() => step === 'verse' ? setStep('chapter') : setStep('book')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
