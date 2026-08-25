import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * POST /api/guardian/send-consent
 * 
 * Chamado logo após o cadastro de um adolescente (13–17 anos).
 * Gera um token único, salva no perfil e envia o e-mail de consentimento ao responsável.
 * 
 * Body: { user_id: string, minor_name: string, guardian_email: string }
 */
export async function POST(request: Request) {
  try {
    const { user_id, minor_name, guardian_email } = await request.json();

    if (!user_id || !minor_name || !guardian_email) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Gerar token único e seguro (válido por 7 dias)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Salvar token no perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        guardian_token: token,
        guardian_token_expires_at: expiresAt.toISOString(),
        guardian_approved: false,
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('[GuardianConsent] Erro ao salvar token:', updateError);
      return NextResponse.json({ error: 'Erro ao gerar token de autorização' }, { status: 500 });
    }

    // Construir o link de aprovação
    const host = request.headers.get('host') || 'newfeconecta.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const approvalLink = `${protocol}://${host}/api/guardian/approve?token=${token}`;

    // Montar o HTML do e-mail de consentimento
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d9488,#16a34a);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🔥</div>
            <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0;letter-spacing:-0.5px;">FéConecta</h1>
            <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">Conectando vidas pela Fé</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111;font-size:20px;font-weight:800;margin:0 0 16px;">Solicitação de Autorização Parental</h2>
            <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
              Olá! <strong>${minor_name}</strong> se cadastrou no <strong>FéConecta</strong>, uma rede social cristã 
              voltada para comunhão, louvor e edificação espiritual.
            </p>
            <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
              Por ser menor de 18 anos, a lei brasileira (LGPD, Art. 14) exige que um responsável legal 
              autorize o acesso à plataforma. <strong>Sem essa autorização, a conta não ficará ativa.</strong>
            </p>

            <!-- O que é o FéConecta -->
            <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;border-radius:12px;margin-bottom:28px;">
              <p style="color:#15803d;font-size:13px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">✅ O FéConecta oferece:</p>
              <ul style="color:#166534;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
                <li>Feed limpo com testemunhos e mensagens bíblicas</li>
                <li>FéMusic — streaming de louvores cristãos sem anúncios</li>
                <li>Salas de oração e comunhão com irmãos na fé</li>
                <li>Bíblia integrada com versículo do dia</li>
                <li>Ambiente sem conteúdos impróprios ou violentos</li>
              </ul>
            </div>

            <!-- Botão de Aprovação -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${approvalLink}" 
                 style="display:inline-block;background:linear-gradient(135deg,#0d9488,#16a34a);color:#fff;font-size:16px;font-weight:800;padding:16px 40px;border-radius:16px;text-decoration:none;letter-spacing:-0.3px;">
                ✅ Autorizar a conta de ${minor_name}
              </a>
              <p style="color:#9ca3af;font-size:11px;margin:12px 0 0;">
                Este link é válido por 7 dias e pode ser usado apenas uma vez.
              </p>
            </div>

            <!-- Aviso de segurança -->
            <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:16px;margin-bottom:24px;">
              <p style="color:#854d0e;font-size:12px;line-height:1.6;margin:0;">
                ⚠️ <strong>Importante:</strong> Se você não reconhece este cadastro ou não deseja autorizar, 
                simplesmente ignore este e-mail. A conta permanecerá inativa. 
                Para reportar uso indevido: <a href="mailto:suporte@feconecta.com.br" style="color:#0d9488;">suporte@feconecta.com.br</a>
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.8;">
              FéConecta · Conectando vidas pela Fé<br>
              Este e-mail foi enviado em conformidade com a LGPD (Lei 13.709/2018), Art. 14<br>
              Dúvidas? <a href="mailto:suporte@feconecta.com.br" style="color:#0d9488;">suporte@feconecta.com.br</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Enviar o e-mail via SMTP
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (smtpEmail && smtpPassword) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpEmail, pass: smtpPassword },
      });

      await transporter.sendMail({
        from: `"FéConecta" <${smtpEmail}>`,
        to: guardian_email,
        subject: `⚠️ Autorização necessária: ${minor_name} quer entrar no FéConecta`,
        html,
        text: `${minor_name} se cadastrou no FéConecta e precisa da sua autorização. Acesse: ${approvalLink}`,
      });
    } else if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.com.br>',
          to: [guardian_email],
          subject: `⚠️ Autorização necessária: ${minor_name} quer entrar no FéConecta`,
          html,
        }),
      });
    } else {
      console.warn('[GuardianConsent] Nenhum provedor de e-mail configurado.');
      return NextResponse.json({ error: 'Provedor de e-mail não configurado' }, { status: 500 });
    }

    console.log(`[GuardianConsent] E-mail de consentimento enviado para: ${guardian_email}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[GuardianConsent] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
