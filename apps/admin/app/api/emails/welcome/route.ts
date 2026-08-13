import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[Welcome Email] Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { email, name, user_id } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email e Nome são obrigatórios' }, { status: 400 });
    }

    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.com.br>';

    if (!smtpEmail && !resendApiKey) {
      console.error('[Welcome Email] SMTP_EMAIL e RESEND_API_KEY não configurados.');
      return NextResponse.json({ message: 'E-mail ignorado: Nenhum provedor configurado' }, { status: 200 });
    }

    // 1. Puxar o template do banco de dados
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('key', 'welcome')
      .single();

    if (templateError || !templateData) {
      console.error('[Welcome Email] Template não encontrado no banco:', templateError);
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 500 });
    }

    // 2. Substituir as variáveis do HTML
    const finalHtml = templateData.html_content.replace(/{{name}}/g, name);

    let logStatus = 'success';
    let logErrorMessage = null;
    let providerData = null;
    let responseOk = false;
    let responseStatus = 200;

    // 3. Disparar o email
    if (smtpEmail && smtpPassword) {
      // Disparo via SMTP (Gmail)
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpEmail,
            pass: smtpPassword,
          }
        });

        const info = await transporter.sendMail({
          from: `"FéConecta" <${smtpEmail}>`,
          to: email,
          subject: templateData.subject,
          html: finalHtml,
        });

        responseOk = true;
        providerData = info;
        console.log(`[Welcome Email] Enviado com sucesso via SMTP para ${email}`);
      } catch (err: any) {
        logStatus = 'error';
        logErrorMessage = err.message;
        responseStatus = 500;
        console.error('[Welcome Email] Erro SMTP:', err);
      }
    } else {
      // Fallback para Resend
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
            subject: templateData.subject,
            html: finalHtml,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          logStatus = 'error';
          logErrorMessage = data.message || JSON.stringify(data);
          responseStatus = response.status;
          console.error('[Welcome Email] Erro do Resend:', data);
        } else {
          responseOk = true;
          providerData = data;
          console.log(`[Welcome Email] Enviado com sucesso via Resend para ${email}`);
        }
      } catch (err: any) {
        logStatus = 'error';
        logErrorMessage = err.message;
        responseStatus = 500;
        console.error('[Welcome Email] Erro Resend:', err);
      }
    }

    // 4. Registrar no Banco de Dados (Log)
    await supabase.from('email_logs').insert({
      user_id: user_id || null, // Se o client mandar o id, atrela
      email: email,
      template_key: 'welcome',
      status: logStatus,
      error_message: logErrorMessage
    });

    if (!responseOk) {
      return NextResponse.json({ error: logErrorMessage }, { status: responseStatus });
    }

    return NextResponse.json({ success: true, data: providerData }, { status: 200 });

  } catch (error: any) {
    console.error('[Welcome Email] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar e-mail' }, { status: 500 });
  }
}
