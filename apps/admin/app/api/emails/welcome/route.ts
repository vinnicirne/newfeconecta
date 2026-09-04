import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/emails/welcome
 * Endpoint transacional para disparo do e-mail de boas-vindas pós-cadastro.
 * Valida a existência do usuário pelo user_id/email no Supabase.
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[Welcome Email] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await request.json().catch(() => ({}));
    let { email, name, user_id } = body;

    // Se temos user_id mas não temos nome/email completos, buscar no profile
    if (user_id && (!email || !name)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, username')
        .eq('id', user_id)
        .maybeSingle();

      if (profile) {
        if (!email) email = profile.email;
        if (!name) name = profile.full_name || profile.username || 'Membro';
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0] || 'Membro').trim();

    // 🔒 Prevenção de duplicidade: se já foi enviado e-mail de boas-vindas com sucesso, não reenviar
    const { data: existingLog } = await supabase
      .from('email_logs')
      .select('id, sent_at')
      .eq('template_key', 'welcome')
      .eq('status', 'success')
      .eq('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      return NextResponse.json({ 
        success: true, 
        already_sent: true,
        message: `E-mail de boas-vindas já enviado anteriormente para ${cleanEmail}.` 
      }, { status: 200 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.shop>';
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    if (!resendApiKey && !smtpEmail) {
      console.warn('[Welcome Email] Nenhum provedor de e-mail (Resend/SMTP) configurado.');
      return NextResponse.json({ message: 'Nenhum provedor configurado' }, { status: 200 });
    }

    // 1. Puxar o template de boas-vindas do banco de dados
    const { data: templateData } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('key', 'welcome')
      .maybeSingle();

    const subject = templateData?.subject || 'Bem-vindo(a) à FéConecta! 👋';
    let finalHtml = templateData?.html_content || `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center;">
        <h1 style="color: #00A676;">Olá, {{name}}!</h1>
        <p style="font-size: 16px; color: #cbd5e1;">Seja muito bem-vindo ao FéConecta, sua rede de fé, louvor e edificação espiritual.</p>
        <div style="margin-top: 30px;">
          <a href="https://newfeconecta.vercel.app/app" style="background-color: #00A676; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Entrar no FéConecta</a>
        </div>
      </div>
    `;

    finalHtml = finalHtml.replace(/{{name}}/g, cleanName);

    // 2. Registrar no Banco de Dados (Log inicial)
    let logId = null;
    try {
      const { data: insertedLog } = await supabase.from('email_logs').insert({
        user_id: user_id || null,
        email: cleanEmail,
        template_key: 'welcome',
        status: 'sending'
      }).select('id').single();

      if (insertedLog) {
        logId = insertedLog.id;
        const host = request.headers.get('host') || 'newfeconecta.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const trackingPixelUrl = `${protocol}://${host}/api/emails/track?id=${logId}`;
        finalHtml += `\n<img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:block; opacity:0.01; margin-top:20px;" />`;
      }
    } catch (e: any) {
      console.warn('[Welcome Email] Aviso ao inserir log inicial:', e.message);
    }

    let sentSuccess = false;
    let errorMessage: string | null = null;

    // 3. Disparo prioritário via Resend API (Alta entregabilidade)
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [cleanEmail],
            subject: subject.replace(/{{name}}/g, cleanName),
            html: finalHtml,
          }),
        });

        if (response.ok) {
          sentSuccess = true;
          console.log(`[Welcome Email] Enviado com sucesso via Resend para: ${cleanEmail}`);
        } else {
          const data = await response.json().catch(() => ({}));
          errorMessage = data.message || `Erro Resend HTTP ${response.status}`;
          console.warn(`[Welcome Email] Resend falhou para ${cleanEmail} (${errorMessage}). Tentando SMTP...`);
        }
      } catch (err: any) {
        errorMessage = err.message;
        console.warn(`[Welcome Email] Exceção Resend para ${cleanEmail}:`, err.message);
      }
    }

    // 4. Fallback para SMTP caso Resend não esteja configurado ou falhe
    if (!sentSuccess && smtpEmail && smtpPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpEmail, pass: smtpPassword }
        });

        await transporter.sendMail({
          from: `"FéConecta" <${smtpEmail}>`,
          to: cleanEmail,
          replyTo: smtpEmail,
          subject: subject.replace(/{{name}}/g, cleanName),
          text: finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          html: finalHtml
        });
        sentSuccess = true;
        errorMessage = null;
        console.log(`[Welcome Email] Enviado com sucesso via SMTP Fallback para: ${cleanEmail}`);
      } catch (err: any) {
        errorMessage = err.message;
        console.error('[Welcome Email] Erro SMTP Fallback:', err);
      }
    }

    // 5. Atualizar log no banco
    if (logId) {
      await supabase.from('email_logs').update({
        status: sentSuccess ? 'success' : 'error',
        error_message: errorMessage
      }).eq('id', logId);
    } else {
      // Se não havia logId anterior, grava o status final agora
      await supabase.from('email_logs').insert({
        user_id: user_id || null,
        email: cleanEmail,
        template_key: 'welcome',
        status: sentSuccess ? 'success' : 'error',
        error_message: errorMessage
      }).catch(() => {});
    }

    return NextResponse.json({ 
      success: sentSuccess, 
      error: errorMessage 
    }, { status: sentSuccess ? 200 : 500 });

  } catch (error: any) {
    console.error('[Welcome Email] Erro no endpoint:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar e-mail' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/emails/welcome',
    description: 'Endpoint transacional de boas-vindas do FéConecta'
  });
}

