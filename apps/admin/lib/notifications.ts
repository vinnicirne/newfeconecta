import { supabase } from './supabase';

export type NotificationType = 'like' | 'comment' | 'follow' | 'repost' | 'story_reaction' | 'mention' | 'verse_day' | 'hashtag';

interface NotifyParams {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  postId?: string;
  storyId?: string;
  content?: string;
}

export const NotificationService = {
  /**
   * Envia uma notificação centralizada com validação de segurança e regras de negócio.
   */
  async notify({ recipientId, senderId, type, postId, storyId, content }: NotifyParams) {
    // 1. Regra de Ouro: Não notificar a si mesmo
    if (recipientId === senderId) return { success: false, reason: 'self-notification' };

    try {
      // 2. Verifica se o destinatário aceita esse tipo de notificação
      const settingMap: Record<string, string> = {
        'like': 'notify_likes',
        'comment': 'notify_comments',
        'follow': 'notify_follows',
        'repost': 'notify_reposts',
        'mention': 'notify_mentions',
        'story_reaction': 'notify_likes',
        'hashtag': 'notify_hashtags',
        'verse_day': 'notify_reposts'
      };

      const settingField = settingMap[type];
      if (settingField) {
        const { data: profile } = await supabase
          .from('profiles')
          .select(settingField)
          .eq('id', recipientId)
          .single();
        
        // Se a preferência estiver explicitamente como false, cancela o envio
        if (profile && profile[settingField] === false) {
          return { success: false, reason: 'user-disabled' };
        }
      }

      const { data, error } = await supabase.from('notifications').insert({
        recipient_id: recipientId,
        sender_id: senderId,
        type,
        post_id: postId,
        story_id: storyId,
        content,
        is_read: false
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[NotificationService] Error:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Varre o texto em busca de menções (@username) e envia notificações para os usuários encontrados.
   */
  async parseMentions(text: string, senderId: string, postId?: string, storyId?: string) {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);

    if (!matches) return [];

    const usernames = matches.map(m => m.substring(1)); // Remove o '@'
    
    // Buscar perfis correspondentes
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', usernames);

    if (!profiles) return [];

    const notifications = profiles.map(profile => 
      this.notify({
        recipientId: profile.id,
        senderId,
        type: 'mention',
        postId,
        storyId,
        content: `mencionou você: "${text.substring(0, 50)}..."`
      })
    );

    return Promise.all(notifications);
  },

  /**
   * Notifica sobre comentários, identificando se é uma resposta direta.
   */
  async notifyComment(recipientId: string, senderId: string, postId: string, commentText: string) {
    // Notifica dono do post
    await this.notify({
      recipientId,
      senderId,
      type: 'comment',
      postId,
      content: commentText
    });

    // Parseia menções dentro do comentário
    await this.parseMentions(commentText, senderId, postId);
  },

  /**
   * Identifica hashtags no texto e notifica os seguidores de cada hashtag encontrada.
   */
  async notifyHashtagFollowers(text: string, senderId: string, postId: string) {
    const hashtagRegex = /#([\wáàâãéèêíïóôõöúç-]+)/g;
    const matches = text.match(hashtagRegex);
    if (!matches) return;

    const tags = matches.map(m => m.substring(1).toLowerCase());

    for (const tag of tags) {
      // Busca usuários que seguem esta hashtag (tabela hashtag_follows)
      const { data: followers } = await supabase
        .from('hashtag_follows')
        .select('user_id')
        .eq('hashtag', tag);

      if (followers && followers.length > 0) {
        const notifications = followers.map(f => 
          this.notify({
            recipientId: f.user_id,
            senderId,
            type: 'hashtag',
            postId,
            content: `postou algo novo com a hashtag #${tag}`
          })
        );
        await Promise.all(notifications);
      }
    }
  }
};

