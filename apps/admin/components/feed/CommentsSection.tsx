"use client";

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CommentsSection({ postId, user }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Carregamento inicial mockado
  }, [postId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const newComment = {
      id: Math.random().toString(),
      post_id: postId,
      author_id: user.email,
      author_name: user.full_name || 'Usuário',
      author_avatar: user.avatar_url || '',
      content: text.trim(),
    };
    setComments(prev => [...prev, newComment]);
    setText('');
    setSending(false);
  };

  return (
    <div className="px-4 pb-3 space-y-3">
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {c.author_avatar
                ? <img src={c.author_avatar} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white text-[10px] font-bold">{(c.author_name || 'U')[0]}</div>
              }
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-whatsapp-dark rounded-2xl px-3 py-1.5 border border-gray-100 dark:border-white/5">
              <p className="text-[10px] font-bold text-whatsapp-teal dark:text-whatsapp-green leading-none mb-1">{c.author_name}</p>
              <p className="text-xs dark:text-gray-300 leading-tight">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center bg-gray-50 dark:bg-whatsapp-dark rounded-2xl p-1 pr-3 border border-gray-100 dark:border-white/5">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Adicionar comentário..."
          className="text-xs h-9 bg-transparent border-none focus-visible:ring-0"
        />
        <button 
          onClick={send} 
          disabled={sending || !text.trim()} 
          className="text-whatsapp-teal dark:text-whatsapp-green disabled:opacity-40 transition-all active:scale-90"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
