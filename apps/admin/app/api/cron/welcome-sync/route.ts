import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET/POST /api/cron/welcome-sync
 * Cron/Job para reconciliar novos cadastros e garantir que todo usuário
 * receba o e-mail de boas-vindas mesmo se o cliente web/mobile não tiver chamado a rota.
 */
async function handleWelcomeSync(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');

    let isAuthorized =
      isVercelCron ||
      !cronSecret ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && authHeader === cronSecret);

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Configuração do Supabase ausente' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Obter template oficial de boas-vindas
    const { data: templateData } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('key', 'welcome')
      .maybeSingle();

    const baseSubject = templateData?.subject || 'Bem-vindo(a) à FéConecta! 👋';
    const baseHtml = templateData?.html_content || `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center;">
        <h1 style="color: #00A676;">Olá, {{name}}!</h1>
        <p style="font-size: 16px; color: #cbd5e1;">Seja muito bem-vindo ao FéConecta, sua rede de fé, louvor e edificação espiritual.</p>
        <div style="margin-top: 30px;">
          <a href="https://newfeconecta.vercel.app/app" style="background-color: #00A676; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Entrar no FéConecta</a>
        </div>
      </div>
    `;

    // 2. Buscar usuários cadastrados recentemente (últimos 30 dias) que possuem e-mail
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentProfiles, error: pError } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, created_at')
      .gte('created_at', thirtyDaysAgo)
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    if (pError || !recentProfiles) {
      return NextResponse.json({ error: 'Erro ao buscar perfis', details: pError }, { status: 500 });
    }

    // 3. Buscar quais usuários já receberam o e-mail de boas-vindas
    const { data: welcomeLogs } = await supabase
      .from('email_logs')
      .select('email, user_id, status')
      .eq('template_key', 'welcome')
      .eq('status', 'success');

    const sentEmails = new Set(
      (welcomeLogs || []).map((l) => l.email?.toLowerCase()).filter(Boolean)
    );
    const sentUserIds = new Set(
      (welcomeLogs || []).map((l) => l.user_id).filter(Boolean)
    );

    // Filtrar apenas quem ainda NÃO recebeu
    const pendingUsers = recentProfiles.filter((p) => {
      const email = p.email?.trim().toLowerCase();
      if (!email) return false;
      if (sentEmails.has(email)) return false;
      if (p.id && sentUserIds.has(p.id)) return false;
      return true;
    });

    if (pendingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os usuários recentes já receberam o e-mail de boas-vindas.',
        pending_count: 0,
        sent_count: 0
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.shop>';
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    let transporter: nodemailer.Transporter | null = null;
    if (smtpEmail && smtpPassword) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpEmail, pass: smtpPassword }
      });
    }

    let successCount = 0;
    let errorCount = 0;

    // 4. Disparo em lotes para respeitar rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < pendingUsers.length; i += BATCH_SIZE) {
      const batch = pendingUsers.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user) => {
          const email = user.email.trim().toLowerCase();
          const name = user.full_name || user.username || 'Membro';
          const userId = user.id;

          let finalHtml = baseHtml.replace(/{{name}}/g, name);
          const finalSubject = baseSubject.replace(/{{name}}/g, name);

          let logId: string | null = null;
          try {
            const { data: log } = await supabase
              .from('email_logs')
              .insert({
                user_id: userId,
                email: email,
                template_key: 'welcome',
                status: 'sending'
              })
              .select('id')
              .single();
            logId = log?.id || null;
          } catch {}

          let sentSuccess = false;
          let errorMessage: string | null = null;

          // 1. Resend prioritário
          if (resendApiKey) {
            try {
              const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: senderEmail,
                  to: [email],
                  subject: finalSubject,
                  html: finalHtml
                })
              });

              if (res.ok) {
                sentSuccess = true;
              } else {
                const d = await res.json().catch(() => ({}));
                errorMessage = d.message || `Resend status ${res.status}`;
              }
            } catch (err: any) {
              errorMessage = err.message;
            }
          }

          // 2. SMTP Fallback
          if (!sentSuccess && transporter && smtpEmail) {
            try {
              await transporter.sendMail({
                from: `"FéConecta" <${smtpEmail}>`,
                to: email,
                replyTo: smtpEmail,
                subject: finalSubject,
                text: finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                html: finalHtml
              });
              sentSuccess = true;
              errorMessage = null;
            } catch (err: any) {
              errorMessage = err.message;
            }
          }

          if (logId) {
            await supabase
              .from('email_logs')
              .update({
                status: sentSuccess ? 'success' : 'error',
                error_message: errorMessage
              })
              .eq('id', logId);
          } else {
            await supabase
              .from('email_logs')
              .insert({
                user_id: userId,
                email: email,
                template_key: 'welcome',
                status: sentSuccess ? 'success' : 'error',
                error_message: errorMessage
              })
              .catch(() => {});
          }

          if (sentSuccess) {
            successCount++;
            sentEmails.add(email);
          } else {
            errorCount++;
          }
        })
      );

      if (i + BATCH_SIZE < pendingUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    return NextResponse.json({
      success: true,
      pending_total: pendingUsers.length,
      sent_success: successCount,
      failed: errorCount
    });
  } catch (error: any) {
    console.error('[Welcome Sync] Erro no job:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleWelcomeSync(request);
}

export async function POST(request: Request) {
  return handleWelcomeSync(request);
}
