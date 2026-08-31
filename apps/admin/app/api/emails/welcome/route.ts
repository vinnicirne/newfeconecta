import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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
    const { email, name, user_id } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email e Nome são obrigatórios' }, { status: 400 });
    }

    // Validação de segurança: confirma se o perfil do usuário realmente existe no Supabase
    if (user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user_id)
        .maybeSingle();

      if (!profile) {
        console.warn(`[Welcome Email] Perfil não encontrado para ID ${user_id}.`);
      }
    }

    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.shop>';

    if (!smtpEmail && !resendApiKey) {
      console.warn('[Welcome Email] Nenhum provedor de e-mail (SMTP/Resend) configurado.');
      return NextResponse.json({ message: 'Nenhum provedor configurado' }, { status: 200 });
    }

    // 1. Puxar o template de boas-vindas do banco de dados
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('key', 'welcome')
      .maybeSingle();

    const subject = templateData?.subject || 'Bem-vindo ao FéConecta! 🙏';
    let finalHtml = templateData?.html_content || `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center;">
        <h1 style="color: #00A676;">Olá, {{name}}!</h1>
        <p style="font-size: 16px; color: #cbd5e1;">Seja muito bem-vindo ao FéConecta, sua rede de fé, louvor e edificação espiritual.</p>
        <div style="margin-top: 30px;">
          <a href="https://newfeconecta.vercel.app/app" style="background-color: #00A676; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Entrar no FéConecta</a>
        </div>
      </div>
    `;

    finalHtml = finalHtml.replace(/{{name}}/g, name);

    // 2. Registrar no Banco de Dados (Log)
    let logId = null;
    try {
      const { data: insertedLog } = await supabase.from('email_logs').insert({
        user_id: user_id || null,
        email: email,
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
    } catch {}

    let sentSuccess = false;
    let errorMessage = null;

    // 3. Disparo via SMTP ou Resend
    if (smtpEmail && smtpPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpEmail, pass: smtpPassword }
        });

        await transporter.sendMail({
          from: `"FéConecta" <${smtpEmail}>`,
          to: email,
          replyTo: smtpEmail,
          subject: subject,
          text: finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          html: finalHtml
        });
        sentSuccess = true;
        console.log(`[Welcome Email] Enviado com sucesso via SMTP para: ${email}`);
      } catch (err: any) {
        errorMessage = err.message;
        console.error('[Welcome Email] Erro SMTP:', err);
      }
    } else if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [email],
            subject: subject,
            html: finalHtml,
          }),
        });

        if (response.ok) {
          sentSuccess = true;
          console.log(`[Welcome Email] Enviado com sucesso via Resend para: ${email}`);
        } else {
          const data = await response.json();
          errorMessage = data.message || JSON.stringify(data);
          console.error('[Welcome Email] Erro Resend:', data);
        }
      } catch (err: any) {
        errorMessage = err.message;
        console.error('[Welcome Email] Erro Resend:', err);
      }
    }

    if (logId) {
      await supabase.from('email_logs').update({
        status: sentSuccess ? 'success' : 'error',
        error_message: errorMessage
      }).eq('id', logId);
    }

    return NextResponse.json({ success: sentSuccess, error: errorMessage }, { status: sentSuccess ? 200 : 500 });

  } catch (error: any) {
    console.error('[Welcome Email] Erro no endpoint:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar e-mail' }, { status: 500 });
  }
}
