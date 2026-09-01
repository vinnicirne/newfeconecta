import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyMessage } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

async function handleDailyMessageDispatch(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');

    // 1. Verifica se é a Cron da Vercel ou Bearer CRON_SECRET
    let isAuthorized = 
      isVercelCron ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && authHeader === cronSecret);

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

    console.log(`[CRON] Iniciando envio em lote para ${profiles.length} usuários.`);

    // 5. Disparo em lote com controle de Rate Limit (Evita erro 429 do Resend)
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      
      const sendPromises = batch.map(async (user) => {
        const email = user.email;
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

          // 1. Tenta envio prioritário via Resend API (Fast HTTP / Domínio Verificado)
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
