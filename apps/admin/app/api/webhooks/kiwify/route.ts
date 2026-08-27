import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Conexão com privilégio administrativo (Service Role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ 
      error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. O Webhook precisa dessa chave para ter permissão de administrador.' 
    }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token') || url.searchParams.get('signature');
    const signature = request.headers.get('x-kiwify-signature') || request.headers.get('signature') || queryToken;
    const token = process.env.KIWIFY_WEBHOOK_TOKEN;

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 🔒 Validação de Assinatura Kiwify (quando configurado o token no ambiente)
    if (token) {
      const calculatedSignature = crypto
        .createHmac('sha1', token)
        .update(rawBody)
        .digest('hex');

      const isDirectTokenMatch = signature === token || payload.signature === token || queryToken === token;
      const isHmacMatch = calculatedSignature === signature;

      if (!isDirectTokenMatch && !isHmacMatch) {
        console.error('[KIWIFY SECURITY] Assinatura ou token inválido. Tentativa não autorizada.');
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[KIWIFY] Aviso: KIWIFY_WEBHOOK_TOKEN não definido. Operando em modo de desenvolvimento.');
    }

    // Identificação flexível dos campos do webhook da Kiwify
    const status = (
      payload.order_status || 
      payload.order?.status || 
      payload.status || 
      payload.Order?.status ||
      ''
    ).toLowerCase();

    // Rastreio de SRC (User ID e Cargo Ministerial)
    const src = (
      payload.TrackingParameters?.src ||
      payload.trackingParameters?.src ||
      payload.tracking_parameters?.src ||
      payload.Subscription?.customer?.tracking_parameters?.src ||
      payload.src ||
      payload.custom_fields?.src ||
      ''
    );

    // Se for teste sem SRC (Kiwify manda ping de teste ao cadastrar URL), retorna 200 OK
    if (!src && (!payload.custom_fields?.user_id || payload.order_id?.startsWith('test-'))) {
      console.log('[KIWIFY] Webhook Teste / Ping Recebido com Sucesso!');
      return NextResponse.json({ 
        message: 'Webhook received successfully. Test OK.',
        status: status || 'test',
        received_at: new Date().toISOString()
      }, { status: 200 });
    }

    // Extração do user_id e role do SRC ou dos custom_fields
    let userId = payload.custom_fields?.user_id || '';
    let role = payload.custom_fields?.role || '';

    if (src && !userId) {
      // SRC formato padrão: {uuid}_{Cargo} (Ex: 123e4567-e89b-12d3-a456-426614174000_Pastor)
      if (src.length >= 36) {
        userId = src.substring(0, 36);
        role = src.substring(37);
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!userId || !uuidRegex.test(userId)) {
      console.warn(`[KIWIFY] Requisição sem UUID de usuário válido. SRC recebido: ${src}`);
      return NextResponse.json({ 
        message: 'Webhook processado, mas nenhum user_id válido foi identificado.',
        src 
      }, { status: 200 });
    }

    const targetRole = role || 'Membro';

    // 1. COMPRA APROVADA / PAGA
    if (status === 'approved' || status === 'paid') {
      console.log(`[KIWIFY] ✅ Aprovando verificação: Usuário ${userId} | Cargo: ${targetRole}`);

      // Atualiza Perfil do usuário com selo verificado e cargo
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: true,
          role: targetRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Registra/Atualiza a solicitação no histórico
      await supabaseAdmin.from('verification_requests').upsert({
        user_id: userId,
        requested_role: targetRole,
        status: 'approved',
        payment_status: 'paid',
        payment_receipt_url: `Kiwify Order: ${payload.order_id || 'Automated'}`,
        document_url: 'Automatizado via Kiwify Webhook',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Registro de Auditoria / Telemetria
      await supabaseAdmin.from('system_errors').insert({
        module: 'webhook_kiwify',
        error_message: `[KIWIFY] Verificação aprovada com sucesso para ${targetRole} (${userId})`,
        metadata: {
          user_id: userId,
          role: targetRole,
          order_id: payload.order_id,
          customer: payload.Customer || payload.customer,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `Verificação aprovada para o usuário ${userId} com o cargo ${targetRole}`,
        user_id: userId,
        role: targetRole,
        status 
      });
    }

    // 2. REEMBOLSO OU CHARGEBACK
    if (status === 'refunded' || status === 'chargedback') {
      console.log(`[KIWIFY] ⚠️ Removendo verificação de ${userId} devido a estorno/reembolso.`);

      await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: false,
          role: 'Membro',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      await supabaseAdmin.from('verification_requests').update({
        status: 'refunded',
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);

      await supabaseAdmin.from('system_errors').insert({
        module: 'webhook_kiwify',
        error_message: `[KIWIFY] Selo revogado por estorno/reembolso (${userId})`,
        metadata: { user_id: userId, status },
      });

      return NextResponse.json({ 
        success: true, 
        message: `Selo revogado devido a ${status}`,
        user_id: userId 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Status ${status} registrado sem alteração de permissão.` 
    });

  } catch (error: any) {
    console.error('[KIWIFY] Erro interno no processamento do webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
