import { NextResponse } from 'next/server';

// Rate limiting simples em memória (por IP)
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;          // máximo de 5 tickets por IP
const RATE_WINDOW_MS = 300_000; // janela de 5 minutos

export async function POST(request: Request) {
  // Rate limiting por IP para evitar flood de tickets de suporte
  const forwarded = (request as any).headers?.get?.('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const record = ipRateMap.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Aguarde alguns minutos antes de enviar outro relato.' },
        { status: 429 }
      );
    }
    record.count++;
  } else {
    ipRateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  }

  try {
    const { subject, message, userEmail, userName } = await request.json();

    if (!message || !subject) {
      return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios' }, { status: 400 });
    }

    // Validação básica de tamanho para evitar payloads gigantes
    if (message.length > 5000 || subject.length > 200) {
      return NextResponse.json({ error: 'Conteúdo muito longo' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.shop>';

    if (!resendApiKey) {
      console.error('[Support API] RESEND_API_KEY não configurada.');
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #25D366; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🆘 Novo Relato de Problema</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">FéConecta — Suporte Técnico</p>
        </div>

        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-size: 13px; color: #6b7280; width: 130px;">👤 Nome:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${userName || 'Não identificado'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 13px; color: #6b7280;">📧 E-mail:</td>
              <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${userEmail}" style="color: #25D366;">${userEmail || 'Não informado'}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 13px; color: #6b7280;">🏷️ Categoria:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${subject}</td>
            </tr>
          </table>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

          <h3 style="font-size: 14px; color: #374151; margin: 0 0 10px;">📝 Descrição do problema:</h3>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${message}</div>

          <p style="font-size: 11px; color: #9ca3af; margin: 20px 0 0; text-align: center;">
            Este e-mail foi gerado automaticamente pelo sistema de suporte do FéConecta.<br/>
            Para responder ao usuário, use Reply-To deste e-mail.
          </p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: ['agenciaiconedigital@gmail.com'],
        subject: `[Suporte FéConecta] ${subject} — ${userName || userEmail || 'Usuário desconhecido'}`,
        html: htmlContent,
        reply_to: userEmail || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Support API] Erro do Resend:', data);
      return NextResponse.json({ error: data.message || 'Erro ao enviar email' }, { status: response.status });
    }

    console.log(`[Support API] Relato enviado com sucesso — assunto: ${subject}`);
    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error: any) {
    console.error('[Support API] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar e-mail' }, { status: 500 });
  }
}