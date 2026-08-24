import { supabase } from './supabase';

export type NotificationType = 'like' | 'comment' | 'follow' | 'repost' | 'story_reaction' | 'mention' | 'verse_day' | 'hashtag' | 'room_invite' | 'message' | 'new_post' | 'new_room';

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
        'verse_day': 'notify_reposts',
        'new_post': 'notify_follows', // Quem segue pode querer saber
        'new_room': 'notify_follows'
      };

      const settingField = settingMap[type];
      if (settingField) {
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select(settingField)
            .eq('id', recipientId)
            .maybeSingle();
          
          if (!profileErr && profile && (profile as any)[settingField] === false) {
            return { success: false, reason: 'user-disabled' };
          }
        } catch (err) {
          console.warn('[NotificationService] Failed to check settings, proceeding with notification:', err);
        }
      }

      const { data, error } = await supabase.from('notifications').insert({
        recipient_id: recipientId,
        sender_id: senderId,
        profile_id: recipientId,
        user_id: senderId,
        type,
        post_id: postId,
        story_id: storyId,
        content,
        is_read: false,
        priority: 'high',
        metadata: {
          push_banner: true,
          sound: 'default'
        }
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

    // Limite de segurança: no máximo 5 menções únicas por vez para evitar sobrecarga no cliente
    const usernames = Array.from(new Set(matches.map(m => m.substring(1)))).slice(0, 5);
    
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
    const hashtagRegex = /#([\wǭǽǜǸǦǧ-]+)/g;
    const matches = text.match(hashtagRegex);
    if (!matches) return;

    // Limite de segurança: processar no máximo 5 hashtags únicas
    const tags = Array.from(new Set(matches.map(m => m.substring(1).toLowerCase()))).slice(0, 5);

    for (const tag of tags) {
      // Busca usuários que seguem esta hashtag (tabela hashtag_follows)
      const { data: followers } = await supabase
        .from('hashtag_follows')
        .select('user_id')
        .eq('hashtag', tag);

      if (followers && followers.length > 0) {
        // Limita a 50 notificações por hashtag para não derrubar o cliente com Promise.all
        const limitedFollowers = followers.slice(0, 50);
        const notifications = limitedFollowers.map(f => 
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
  },

  /**
   * Notifica a rede sobre um novo Post ou Sala de Guerra.
   * Regra: Se <= 200 usuários na rede, notifica TODOS (menos quem criou).
   * Se > 200 usuários, notifica APENAS quem segue o senderId (a menos que forceBroadcast seja true).
   */
  async notifyNetwork(senderId: string, type: 'new_post' | 'new_room', referenceId: string, contentStr: string, forceBroadcast: boolean = false) {
    try {
      // 0. Enriquecer o texto da notificação com o nome do usuário caso esteja genérico
      let formattedContent = contentStr;
      if (senderId && (!contentStr || contentStr === 'fez uma nova publicação' || contentStr === 'fez uma nova publicação.' || contentStr === 'abriu uma nova Sala de Guerra.' || contentStr === 'abriu uma nova Sala de Guerra')) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', senderId)
          .maybeSingle();

        const authorName = senderProfile?.full_name?.trim() || senderProfile?.username || 'Um membro';
        if (type === 'new_post') {
          formattedContent = `${authorName} fez uma nova publicação.`;
        } else if (type === 'new_room') {
          formattedContent = `${authorName} abriu uma nova Sala de Guerra.`;
        }
      }

      // 1. Conta o total de usuários na rede
      const { count, error: countErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (countErr || count === null) return;

      let recipients: string[] = [];

      if (count <= 200 || forceBroadcast) {
        // Notifica TODOS (broadcast)
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .neq('id', senderId);
        
        if (allUsers) recipients = allUsers.map(u => u.id);
      } else {
        // Notifica apenas SEGUIDORES
        const { data: followers } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', senderId);
          
        if (followers) recipients = followers.map(f => f.follower_id);
      }

      if (recipients.length === 0) return;

      // 2. Dispara as notificações em lotes (para não travar o cliente)
      const batchSize = 50;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const notifications = batch.map(recipientId => 
          this.notify({
            recipientId,
            senderId,
            type: type,
            postId: type === 'new_post' ? referenceId : undefined,
            content: formattedContent
          })
        );
        await Promise.all(notifications);
      }
    } catch (err) {
      console.error('[NotificationService] notifyNetwork Error:', err);
    }
  }
};

