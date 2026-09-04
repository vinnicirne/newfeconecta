import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyMessage } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleDailyMessageDispatch(request: Request) {
  try {
    const url = new URL(request.url);
    const keyParam = url.searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');

    // 1. Verifica se é a Cron da Vercel, Bearer CRON_SECRET ou param ?key=
    let isAuthorized = 
      isVercelCron ||
      (cronSecret && (
        authHeader === `Bearer ${cronSecret}` ||
        authHeader === cronSecret ||
        keyParam === cronSecret
      ));

    // 2. Se não for cron secret, tenta autenticar como Admin logado via token/cookies
    if (!isAuthorized) {
      try {
        const user = await requireAuth(request);
        if (user) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      console.warn('[CRON] Tentativa de acesso não autorizada ao disparo de devocional diário.');
      return NextResponse.json({ error: 'Não autorizado: É necessário privilégio de administrador ou token de cron' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Gerar devocional via IA
    console.log('[CRON] Iniciando geração da mensagem do dia...');
    const generatedContent = await generateDailyMessage();
    
    // 2. Atualizar o template no banco
    console.log('[CRON] Atualizando banco de dados...');
    const { error: updateError } = await supabase
      .from('email_templates')
      .update({
        subject: generatedContent.subject,
        html_content: generatedContent.html
      })
      .eq('key', 'mensagem_do_dia');

    if (updateError) {
      console.error('[CRON] Erro ao atualizar template:', updateError);
      return NextResponse.json({ error: 'Erro ao salvar template' }, { status: 500 });
    }

    // 3. Buscar todos os usuários para envio
    console.log('[CRON] Buscando usuários pendentes...');
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .not('email', 'is', null);

    if (pError || !profiles) {
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }

    // 🔒 Proteção Anti-Spam / Anti-Duplicidade: Evita enviar mais de uma vez no mesmo dia para o mesmo usuário
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: alreadySentToday } = await supabase
      .from('email_logs')
      .select('email, user_id')
      .eq('template_key', 'mensagem_do_dia')
      .eq('status', 'success')
      .gte('sent_at', todayStart.toISOString());

    const alreadySentSet = new Set(
      (alreadySentToday || []).map(l => l.email?.toLowerCase()).filter(Boolean)
    );

    const pendingProfiles = profiles.filter(p => {
      const email = p.email?.trim().toLowerCase();
      return email && !alreadySentSet.has(email);
    });

    if (pendingProfiles.length === 0) {
      console.log('[CRON] Todos os usuários já receberam a mensagem de hoje.');
      return NextResponse.json({
        success: true,
        message: 'Devocional de hoje já foi entregue a todos os membros.',
        total_profiles: profiles.length,
        already_sent: alreadySentSet.size,
        sent_now: 0
      }, { status: 200 });
    }

    // 4. Configuração do Mailer
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.shop>';

    if (!smtpEmail && !resendApiKey) {
      return NextResponse.json({ error: 'Nenhum provedor de e-mail configurado' }, { status: 500 });
    }

    let transporter: nodemailer.Transporter | null = null;
    if (smtpEmail && smtpPassword) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpEmail,
          pass: smtpPassword,
        }
      });
    }

    const host = request.headers.get('host') || 'newfeconecta.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    let successCount = 0;
    let errorCount = 0;

    console.log(`[CRON] Iniciando envio em lote para ${pendingProfiles.length} usuários.`);

    // 5. Disparo em lote com controle de Rate Limit (Evita erro 429 do Resend e protege reputação do domínio)
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < pendingProfiles.length; i += BATCH_SIZE) {
      const batch = pendingProfiles.slice(i, i + BATCH_SIZE);
      
      const sendPromises = batch.map(async (user) => {
        const email = user.email.trim();
        const name = user.full_name || user.username || 'Membro';
        const userId = user.id;

        try {
          let finalHtml = generatedContent.html.replace(/{{name}}/g, name);

          const { data: insertedLog } = await supabase.from('email_logs').insert({
            user_id: userId,
            email: email,
            template_key: 'mensagem_do_dia',
            status: 'sending'
          }).select('id').single();

          let logId = insertedLog?.id;

          if (logId) {
            const trackingPixelUrl = `${protocol}://${host}/api/emails/track?id=${logId}`;
            finalHtml += `\n<img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:block; opacity:0.01; margin-top:20px;" />`;
          }

          let sentSuccess = false;
          let errorMessage: string | null = null;

          // 1. Tenta envio prioritário via Resend API com cabeçalhos anti-spam
          if (resendApiKey) {
            try {
              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: senderEmail,
                  to: [email],
                  subject: generatedContent.subject,
                  html: finalHtml,
                  headers: {
                    'List-Unsubscribe': '<mailto:contato@feconecta.shop?subject=unsubscribe>',
                    'Precedence': 'bulk',
                    'X-Auto-Response-Suppress': 'OOF, AutoReply'
                  }
                }),
              });

              if (resendRes.ok) {
                sentSuccess = true;
              } else {
                const d = await resendRes.json().catch(() => ({}));
                errorMessage = d.message || `Erro Resend HTTP ${resendRes.status}`;
                console.warn(`[CRON] Resend falhou para ${email} (${errorMessage}). Tentando fallback SMTP...`);
              }
            } catch (e: any) {
              errorMessage = e.message;
              console.warn(`[CRON] Exceção Resend para ${email}. Tentando fallback SMTP...`);
            }
          }

          // 2. Fallback para SMTP caso Resend não esteja configurado ou tenha falhado
          if (!sentSuccess && transporter && smtpEmail) {
            try {
              await transporter.sendMail({
                from: `"FéConecta" <${smtpEmail}>`,
                to: email,
                replyTo: smtpEmail,
                subject: generatedContent.subject,
                text: finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                html: finalHtml,
                headers: {
                  'List-Unsubscribe': `<mailto:${smtpEmail}?subject=unsubscribe>`,
                  'Precedence': 'bulk'
                }
              });
              sentSuccess = true;
              errorMessage = null; // Limpa erro pois fallback teve sucesso
            } catch (e: any) {
              errorMessage = e.message;
              console.error(`[CRON] Falha também no SMTP para ${email}:`, e);
            }
          }

          if (logId) {
            await supabase.from('email_logs').update({
              status: sentSuccess ? 'success' : 'error',
              error_message: errorMessage
            }).eq('id', logId);
          }

          if (sentSuccess) successCount++;
          else errorCount++;

        } catch (err) {
          console.error(`[CRON] Erro no envio de e-mail para usuário ID ${userId}:`, err);
          errorCount++;
        }
      });

      await Promise.all(sendPromises);
      
      // Pequeno delay entre os lotes para não estourar limite do Resend
      if (i + BATCH_SIZE < profiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[CRON] Finalizado. Sucessos: ${successCount}, Erros: ${errorCount}`);
    return NextResponse.json({ success: true, sent: successCount, failed: errorCount }, { status: 200 });

  } catch (error: any) {
    console.error('[CRON] Erro crítico:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleDailyMessageDispatch(request);
}

export async function POST(request: Request) {
  return handleDailyMessageDispatch(request);
}
