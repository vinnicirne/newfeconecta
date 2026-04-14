import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'https://esm.sh/google-auth-library@8.7.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Carrega o JSON mestre configurado no Supabase Secrets
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY') || '{}')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Notificação recebida:', payload)

    const { record } = payload
    const recipientId = record.recipient_id

    // 1. Inicializa o cliente Supabase Administrador
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Verificação de Segurança (Nuclear)
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('ERRO: FIREBASE_SERVICE_ACCOUNT_KEY incompleta ou mal formatada!');
      return new Response(JSON.stringify({ error: 'Configuração do Firebase ausente no servidor' }), { status: 500 })
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

    // 4. Montar a mensagem Push - DATA-ONLY (controle total no Service Worker)
    const targetUrl = `https://feconecta.vercel.app/feed?post=${record.post_id || ''}`;

    const pushBody = {
      message: {
        token: profile.fcm_token,
        notification: {
          title: 'FéConecta 📢',
          body: record.content || 'Você tem uma nova notificação!',
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
            channel_id: 'fcm_church_alerts',
            sound: 'default',
            visibility: 'public'
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
        body: JSON.stringify(pushBody)
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
