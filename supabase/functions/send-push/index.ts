import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'https://esm.sh/google-auth-library@8.7.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Notificação recebida:', payload)

    const { record } = payload
    const recipientId = record.recipient_id

    // 1. Inicializa o cliente Supabase Administrador
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Busca o fcm_token do destinatário
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
    const jwtClient = new JWT(
      FIREBASE_CLIENT_EMAIL,
      undefined,
      FIREBASE_PRIVATE_KEY,
      ['https://www.googleapis.com/auth/cloud-platform']
    )
    
    const tokenResponse = await jwtClient.getAccessToken()
    const accessToken = tokenResponse.token

    // 4. Montar a mensagem Push (Formato FCM v1)
    const pushBody = {
      message: {
        token: profile.fcm_token,
        notification: {
          title: 'Nova Atividade',
          body: record.content || 'Você tem uma nova notificação no FéConecta!'
        },
        data: {
          post_id: record.post_id || '',
          type: record.type || ''
        },
        webpush: {
          fcm_options: {
            link: `https://feconecta.vercel.app/feed?post=${record.post_id || ''}`
          }
        }
      }
    }

    // 5. Enviar para a API do Firebase
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
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
