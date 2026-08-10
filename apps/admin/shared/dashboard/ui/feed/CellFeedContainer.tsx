import React, { useState, useEffect } from 'react';
import { FeedEventPost } from './FeedEventPost';
import { FeedNoticePost } from './FeedNoticePost';
import { FeedPrayerPost } from './FeedPrayerPost';
import { FeedStudyPost } from './FeedStudyPost';
import { FeedItem } from '../../application/DashboardAggregator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CellFeedContainerProps {
  feed: FeedItem[];
  onOpenMeeting: (id: string) => void;
  isLeader: boolean;
  currentUser: any;
  onReload?: () => void;
}

export function CellFeedContainer({ feed, onOpenMeeting, isLeader, currentUser, onReload }: CellFeedContainerProps) {
  const [feedState, setFeedState] = useState<FeedItem[]>(feed);

  useEffect(() => {
    setFeedState(feed);
  }, [feed]);

  const handleDelete = async (item: FeedItem) => {
    if (item.type === 'EVENT' || item.type === 'NOTICE' || item.type === 'PRAYER') {
      const { error } = await supabase.from('church_events').delete().eq('id', item.id);
      if (error) {
        toast.error('Erro ao excluir item do banco de dados.');
        return;
      }
    }
    
    setFeedState(prev => prev.filter(i => i.id !== item.id));
    toast.success('Publicação excluída com sucesso!');
    
    if (onReload) {
      onReload();
    }
  };

  if (!feedState || feedState.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Nenhuma publicação encontrada no mural.
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {feedState.map((item) => {
        switch (item.type) {
          case 'EVENT':
            return (
              <FeedEventPost 
                key={item.id} 
                item={item} 
                onOpenMeeting={onOpenMeeting} 
                isLeader={isLeader} 
                currentUser={currentUser} 
                onDelete={() => handleDelete(item)}
                onReload={onReload}
              />
            );
          case 'NOTICE':
            return <FeedNoticePost key={item.id} item={item} currentUser={currentUser} onDelete={() => handleDelete(item)} onReload={onReload} />;
          case 'PRAYER':
            return <FeedPrayerPost key={item.id} item={item} currentUser={currentUser} onDelete={() => handleDelete(item)} onReload={onReload} />;
          case 'STUDY':
            return <FeedStudyPost key={item.id} item={item} onDelete={() => handleDelete(item)} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
