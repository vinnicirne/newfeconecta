import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@8.7.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// O Service Account agora é obtido do Vault de forma segura

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Notificação recebida:', payload)

    const { record } = payload
    const recipientId = record.recipient_id

    // 1. Inicializa o cliente Supabase Administrador
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Busca a chave do Firebase no Vault do Supabase
    const { data: secretData, error: secretError } = await supabase.rpc('get_firebase_secret')
    
    if (secretError || !secretData) {
      console.error('ERRO: Não foi possível ler a chave do Vault:', secretError);
      return new Response(JSON.stringify({ error: 'Configuração do Firebase ausente no Vault' }), { status: 500 })
    }

    const serviceAccount = JSON.parse(secretData)

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('ERRO: FIREBASE_SERVICE_ACCOUNT_KEY incompleta ou mal formatada no Vault!');
      return new Response(JSON.stringify({ error: 'Chave do Firebase inválida no Vault' }), { status: 500 })
    }

    console.log('Autenticando como:', serviceAccount.client_email);

    // 2.5 Busca o fcm_token do destinatário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token, full_name')
      .eq('id', recipientId)
      .single()

    if (profileError || !profile?.fcm_token) {
      console.log('Usuário sem FCM Token ou erro:', profileError)
      return new Response(JSON.stringify({ message: 'No token found' }), { status: 200 })
    }

    // 2.5.1 Busca preferências do FéNamoro se for uma notificação de namoro
    if (record.type?.startsWith('dating_')) {
      const { data: datingProfile } = await supabase
        .from('dating_profiles')
        .select('notify_new_matches, notify_new_messages, notify_profile_views')
        .eq('id', recipientId)
        .single();
        
      if (datingProfile) {
        if (record.type === 'dating_match' && datingProfile.notify_new_matches === false) {
          console.log('Push ignorado: Usuário desativou notify_new_matches');
          return new Response(JSON.stringify({ message: 'User disabled match push' }), { status: 200 });
        }
        if (record.type === 'dating_message' && datingProfile.notify_new_messages === false) {
          console.log('Push ignorado: Usuário desativou notify_new_messages');
          return new Response(JSON.stringify({ message: 'User disabled message push' }), { status: 200 });
        }
        if (record.type === 'dating_view' && datingProfile.notify_profile_views === false) {
          console.log('Push ignorado: Usuário desativou notify_profile_views');
          return new Response(JSON.stringify({ message: 'User disabled profile view push' }), { status: 200 });
        }
      }
    }

    // 2.6 Busca o nome de quem gerou a notificação
    let senderName = 'Um membro';
    if (record.sender_id) {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', record.sender_id)
        .single();
      
      senderName = senderProfile?.full_name?.trim() || senderProfile?.username || 'Um membro';
    }

    // 3. Obter Access Token do Firebase via JWT
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n')
    
    const jwtClient = new JWT(
      serviceAccount.client_email,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/cloud-platform']
    )
    
    const tokenResponse = await jwtClient.getAccessToken()
    const accessToken = tokenResponse.token

    // 4. Montar a mensagem Push - Inteligência de Links e Mensagem
    let targetUrl = `https://newfeconecta.vercel.app/feed`;
    let pushTitle = record.title;
    let pushBody = record.content;
    
    // ✅ Fonte primária: record.link (definido pelo caller da notificação)
    if (record.link) {
      targetUrl = record.link.startsWith('http') ? record.link : `https://newfeconecta.vercel.app${record.link}`;
    } else if (record.type === 'verse_day' || record.type === 'bible') {
      const bibleRef = record.metadata?.bible_ref || '';
      targetUrl = `https://newfeconecta.vercel.app/bible${bibleRef ? `?verse=${bibleRef}` : ''}`;
    } else if (record.post_id) {
      targetUrl = `https://newfeconecta.vercel.app/post/${record.post_id}`;
    } else if (record.type === 'room_invite') {
      const roomId = record.metadata?.room_id || '';
      targetUrl = `https://newfeconecta.vercel.app/room/${roomId}`;
    } else if (record.type === 'church_join_request') {
      // Leva o pastor/admin direto para a página de aprovação de membros
      const churchSlug = record.metadata?.church_slug || '';
      targetUrl = churchSlug
        ? `https://newfeconecta.vercel.app/igreja/${churchSlug}/admin/membros`
        : `https://newfeconecta.vercel.app/notificacoes`;
    } else if (record.type === 'church_approved') {
      const churchSlug = record.metadata?.church_slug || '';
      targetUrl = churchSlug
        ? `https://newfeconecta.vercel.app/igreja/${churchSlug}`
        : `https://newfeconecta.vercel.app/igreja`;
    } else if (record.type === 'church_rejected') {
      targetUrl = `https://newfeconecta.vercel.app/igreja`;
    } else if (record.type === 'church_group_request') {
      const churchSlug = record.metadata?.church_slug || '';
      const groupId = record.metadata?.group_id || '';
      targetUrl = churchSlug
        ? `https://newfeconecta.vercel.app/igreja/${churchSlug}/celula/${groupId}`
        : `https://newfeconecta.vercel.app/igreja`;
    } else if (record.metadata?.url) {
      targetUrl = record.metadata.url;
    }


    const isGenericTitle = !pushTitle || 
                           pushTitle === 'FéConecta 📢' || 
                           pushTitle === 'FéConecta' || 
                           pushTitle === 'Nova Notificação' || 
                           pushTitle.includes('FéConecta');
                           
    const socialTypes = [
      'like', 'comment', 'follow', 'repost', 'story_reaction', 'mention', 
      'message', 'new_post', 'new_room', 'room_invite', 'hashtag',
      'dating_match', 'dating_message', 'dating_view'
    ];

    if (isGenericTitle || socialTypes.includes(record.type)) {
       if (record.type === 'like') {
         pushTitle = `${senderName} ❤️`;
         pushBody = `${senderName} curtiu sua publicação.`;
       } else if (record.type === 'comment') {
         pushTitle = `${senderName} 💬`;
         pushBody = pushBody && !pushBody.includes('comentou') ? `${senderName}: "${pushBody}"` : `${senderName} comentou na sua postagem.`;
       } else if (record.type === 'follow') {
         pushTitle = 'Novo Seguidor 👤';
         pushBody = `${senderName} começou a seguir você.`;
       } else if (record.type === 'repost') {
         pushTitle = `${senderName} 🔄`;
         pushBody = `${senderName} republicou seu post.`;
       } else if (record.type === 'story_reaction') {
         pushTitle = `${senderName} ⚡`;
         pushBody = `${senderName} reagiu ao seu status.`;
       } else if (record.type === 'message') {
         pushTitle = `${senderName} 💬`;
         if (pushBody && pushBody.startsWith('http')) {
            pushBody = '📷 Enviou uma mídia';
         } else {
            pushBody = pushBody || 'enviou uma mensagem para você.';
            if (!pushBody.includes(senderName) && !pushBody.includes('Enviou')) {
               pushBody = `${senderName}: "${pushBody}"`;
            }
         }
         targetUrl = `https://newfeconecta.vercel.app/messages?userId=${record.sender_id}`;
       } else if (record.type === 'mention') {
         pushTitle = `${senderName} 🔔`;
         pushBody = `${senderName} mencionou você em uma publicação.`;
       } else if (record.type === 'room_invite') {
         pushTitle = 'Sala de Guerra ⚔️';
         pushBody = `${senderName} convidou você para interceder em uma Sala de Guerra.`;
       } else if (record.type === 'dating_match') {
         pushTitle = "It's a Match! 💚";
         pushBody = `Você e ${senderName} estão conectados com propósito!`;
         targetUrl = `https://newfeconecta.vercel.app/fenamoro/matches`;
       } else if (record.type === 'dating_message') {
         pushTitle = `${senderName} (FéChat) 💬`;
         pushBody = pushBody ? `${senderName}: "${pushBody}"` : `${senderName} enviou uma nova mensagem para você.`;
         targetUrl = `https://newfeconecta.vercel.app/fenamoro/matches`;
       } else if (record.type === 'dating_view') {
         pushTitle = 'Nova Visita 👀';
         pushBody = `${senderName} visualizou seu perfil no FéNamoro.`;
         targetUrl = `https://newfeconecta.vercel.app/fenamoro/profile`;
       } else if (record.type === 'dating_cart_abandoned') {
         pushTitle = 'Seu Match Perfeito está te esperando! 💚';
         pushBody = `Você esqueceu de finalizar seu plano Premium. Clique aqui e libere suas orações ilimitadas agora!`;
         targetUrl = `https://newfeconecta.vercel.app/fenamoro/profile/premium`;
       } else if (record.type === 'new_post') {
         if (pushBody && pushBody.includes('Lugar Secreto')) {
            pushTitle = `${senderName} 🔥`;
         } else {
            pushTitle = `${senderName} ✍️`;
         }
         if (!pushBody || pushBody === 'fez uma nova publicação.' || pushBody === 'fez uma nova publicação') {
            pushBody = `${senderName} fez uma nova publicação.`;
         } else if (!pushBody.includes(senderName)) {
            pushBody = `${senderName}: ${pushBody}`;
         }
       } else if (record.type === 'new_room') {
         pushTitle = `${senderName} 🎙️`;
         pushBody = `${senderName} abriu uma nova Sala de Guerra.`;
       } else if (record.type === 'hashtag') {
         pushTitle = `Hashtag em alta 🏷️`;
         pushBody = `${senderName} postou algo novo em uma hashtag que você segue.`;
       } else {
         pushTitle = senderName !== 'Um membro' ? `${senderName} 🔔` : (pushTitle || 'FéConecta 📢');
         pushBody = pushBody || 'Você tem uma nova atividade!';
       }
    }


    const pushBodyPayload = {
      message: {
        token: profile.fcm_token,
        notification: {
          title: pushTitle || 'FéConecta 📢',
          body: pushBody || 'Você tem uma nova notificação!',
        },
        data: {
          post_id: record.post_id || '',
          type: record.type || '',
          link: targetUrl,
          url: targetUrl
        },
        android: {
          priority: 'high',
          notification: {
            title: pushTitle || 'FéConecta 📢',
            body: pushBody || 'Você tem uma nova notificação!',
            channel_id: 'default',
            icon: 'notification_icon',
            color: '#00A884',
            sound: 'default',
            visibility: 'public'
          }
        },
        webpush: {
          fcm_options: {
            link: targetUrl
          }
        }
      }
    }

    // 5. Enviar para a API do Firebase (Usando o ID dinâmico do novo projeto)
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(pushBodyPayload)
      }
    )

    const result = await fcmResponse.json()
    console.log('Firebase Response:', result)

    // LÓGICA DE AUTO-LIMPEZA:
    if (fcmResponse.status === 404 || (result.error && result.error.status === 'NOT_FOUND')) {
      console.log(`Limpando token expirado do usuário: ${profile.id}`)
      await supabase
        .from('profiles')
        .update({ fcm_token: null, push_notifications_enabled: false })
        .eq('id', profile.id)
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
