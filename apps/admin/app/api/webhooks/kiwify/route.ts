import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Pega as chaves
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Tenta usar a service role, ou avisa se não tiver
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ 
      error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local. O Webhook precisa dessa chave (secret) para ter permissão de administrador.' 
    }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-kiwify-signature');
    const token = process.env.KIWIFY_WEBHOOK_TOKEN;

    // SECURITY: Validação de Segurança Estrita. Impede fraudes de Bypass (Falsificação de cargos).
    if (!token) {
      console.error('[KIWIFY SECURITY] ATENÇÃO: KIWIFY_WEBHOOK_TOKEN não configurado no .env.local.');
      return NextResponse.json({ error: 'Configuração de Segurança Ausente (Webhook Token)' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    
    const calculatedSignature = crypto
      .createHmac('sha1', token)
      .update(rawBody)
      .digest('hex');
      
    if (calculatedSignature !== signature) {
      console.error('[KIWIFY SECURITY] Tentativa de fraude bloqueada. Assinatura inválida.');
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    
    // Payload oficial do Kiwify Webhook
    // status possíveis: 'approved', 'refunded', 'chargedback', etc.
    const status = payload.order?.status; 
    const src = payload.trackingParameters?.src;

    // Se não tiver o SRC (Kiwify manda teste sem SRC), retornamos 200 OK para a Kiwify validar o webhook
    if (!src) {
      console.log('[KIWIFY] Webhook Teste Recebido (Sem SRC). Tudo OK!');
      return NextResponse.json({ message: 'Webhook received. Test OK.', payload }, { status: 200 });
    }

    // SRC foi montado como: user_id_cargo (Ex: 123e4567-e89b-12d3-a456-426614174000_Bispo)
    // Extraindo o UUID fixo de 36 caracteres e o resto como cargo, para suportar cargos com sublinhados
    const userId = src.substring(0, 36);
    const role = src.substring(37); // Pula o underscore na posição 36

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!userId || !role || !uuidRegex.test(userId)) {
      console.error(`[KIWIFY] Formato SRC inválido ou UUID malformado: ${src}`);
      return NextResponse.json({ message: 'Invalid src format' }, { status: 400 });
    }

    // Lógica para COMPRA APROVADA
    if (status === 'approved' || status === 'paid') {
      console.log(`[KIWIFY] Aprovando verificação para ${userId} - Cargo: ${role}`);
      
      // 1. Atualizar o Perfil do usuário (dando o selo azul e o cargo)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: true,
          role: role
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Registrar a solicitação no histórico como aprovada
      await supabaseAdmin.from('verification_requests').upsert({
        user_id: userId,
        requested_role: role,
        status: 'approved',
        payment_status: 'paid',
        payment_receipt_url: 'Kiwify Automated',
        document_url: 'Automatizado via Kiwify',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      // 3. Registrar o sucesso no painel de Monitoramento/Erros (Telemetria)
      await supabaseAdmin.from('system_errors').insert({
        module: 'webhook_kiwify',
        severity: 'info',
        error_message: `Verificação automática aprovada via Kiwify: ${role}`,
        resolved: true,
        metadata: { user_id: userId, role, kiwify_payload: payload }
      });

    } 
    // Lógica para REEMBOLSO OU CHARGEBACK
    else if (status === 'refunded' || status === 'chargedback') {
      console.log(`[KIWIFY] Removendo verificação de ${userId} devido a estorno.`);
      
      await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: false,
          role: 'Membro'
        })
        .eq('id', userId);

      await supabaseAdmin.from('verification_requests').update({
        status: 'refunded',
        payment_status: 'refunded',
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    }

    return NextResponse.json({ success: true, user: userId, role: role, status });
    
  } catch (error: any) {
    console.error('Kiwify Webhook Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
