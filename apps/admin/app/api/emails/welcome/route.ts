import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.com.br>';

    if (!resendApiKey) {
      console.error('[Welcome Email] RESEND_API_KEY não configurada no servidor.');
      return NextResponse.json({ message: 'E-mail ignorado: API Key não configurada' }, { status: 200 });
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

    // 3. Disparar via Resend
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

    // 4. Registrar no Banco de Dados (Log)
    let logStatus = 'success';
    let logErrorMessage = null;

    if (!response.ok) {
      logStatus = 'error';
      logErrorMessage = data.message || JSON.stringify(data);
      console.error('[Welcome Email] Erro do Resend:', data);
    } else {
      console.log(`[Welcome Email] Enviado com sucesso para ${email}`);
    }

    // Salvar de forma assíncrona o log
    await supabase.from('email_logs').insert({
      user_id: user_id || null, // Se o client mandar o id, atrela
      email: email,
      template_key: 'welcome',
      status: logStatus,
      error_message: logErrorMessage
    });

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error: any) {
    console.error('[Welcome Email] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar e-mail' }, { status: 500 });
  }
}

