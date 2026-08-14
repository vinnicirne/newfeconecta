import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyMessage } from '@/lib/gemini';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Se houver CRON_SECRET configurado, exigir autenticação
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
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
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.com.br>';

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

    // 5. Disparo em lote (Paralelo)
    const sendPromises = profiles.map(async (user) => {
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
        let errorMessage = null;

        if (transporter) {
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
          } catch (e: any) {
            errorMessage = e.message;
          }
        } else if (resendApiKey) {
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
              const d = await resendRes.json();
              errorMessage = d.message || 'Erro no Resend';
            }
          } catch (e: any) {
            errorMessage = e.message;
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
        console.error(`[CRON] Erro no envio para ${email}:`, err);
        errorCount++;
      }
    });

    await Promise.all(sendPromises);

    console.log(`[CRON] Finalizado. Sucessos: ${successCount}, Erros: ${errorCount}`);
    return NextResponse.json({ success: true, sent: successCount, failed: errorCount }, { status: 200 });

  } catch (error: any) {
    console.error('[CRON] Erro crítico:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
