import { supabase } from './supabase';

export type NotificationType = 'like' | 'comment' | 'follow' | 'repost' | 'story_reaction' | 'mention';

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
  }
};
