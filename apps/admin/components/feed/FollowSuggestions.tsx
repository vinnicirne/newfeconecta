"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function FollowSuggestions({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .neq('id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (isMounted) setUsers(data || []);
      });

    return () => { isMounted = false; };
  }, [currentUser?.id]);

  if (!users.length) return null;

  return (
    <div className="bg-white dark:bg-whatsapp-darkLighter border-y sm:border border-gray-100 dark:border-white/5 sm:rounded-2xl py-4 mb-4 mt-2">
      <h3 className="px-4 font-bold text-sm text-gray-900 dark:text-gray-100 mb-4">Sugestões para você</h3>
      
      <div className="flex overflow-x-auto gap-3 px-4 pb-2 snap-x custom-scrollbar">
        {users.map(u => (
          <div key={u.id} className="min-w-[140px] max-w-[140px] flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 dark:border-white/5 snap-center shrink-0">
            <Link href={`/profile/${u.username}`} className="w-16 h-16 rounded-full overflow-hidden border border-gray-50 dark:border-white/5 mb-2 hover:opacity-80">
              {u.avatar_url ? (
                <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal font-bold text-xl">
                  {u.full_name?.[0] || 'U'}
                </div>
              )}
            </Link>
            
            <Link href={`/profile/${u.username}`} className="font-bold text-[13px] truncate w-full text-center hover:underline dark:text-white">
              {u.full_name}
            </Link>
            <p className="text-[10px] text-gray-400 mb-3 truncate w-full text-center">@{u.username}</p>
            
            {/* O botão "Seguir" visual. */}
            <Link href={`/profile/${u.username}`} className="w-full py-1.5 bg-whatsapp-teal hover:bg-whatsapp-green text-white rounded-full text-[11px] font-bold text-center transition-colors">
              Ver perfil
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
