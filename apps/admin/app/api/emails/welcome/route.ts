import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email e Nome são obrigatórios' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'FéConecta <contato@feconecta.com.br>';

    if (!resendApiKey) {
      console.error('[Welcome Email] RESEND_API_KEY não configurada no servidor.');
      // Retornamos 200 de qualquer forma para não travar o cadastro do usuário, 
      // mas logamos o erro no console
      return NextResponse.json({ message: 'E-mail ignorado: API Key não configurada' }, { status: 200 });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00A676; margin-bottom: 10px;">Bem-vindo(a) à FéConecta!</h1>
          <p style="color: #a3a3a3; font-size: 16px;">Um lugar de adoração.</p>
        </div>
        
        <div style="background-color: #1a1a1a; padding: 25px; border-radius: 8px; border: 1px solid #333;">
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #ffffff;">
            Olá, <strong>${name}</strong>!<br><br>
            Estamos muito felizes em ter você conosco. A plataforma FéConecta foi criada para conectar, edificar e transformar através da fé.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
            Seu perfil já está configurado e você já pode acessar nossa rede, participar da Sala de Guerra e interagir com a comunidade.
          </p>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="https://feconecta.com.br" style="display: inline-block; background-color: #00A676; color: #0a0a0a; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px;">
              Acessar o App FéConecta
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} FéConecta. Todos os direitos reservados.</p>
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
        to: [email],
        subject: 'Bem-vindo(a) à FéConecta! 👋',
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Welcome Email] Erro do Resend:', data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    console.log(`[Welcome Email] Enviado com sucesso para ${email}`);
    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error: any) {
    console.error('[Welcome Email] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar e-mail' }, { status: 500 });
  }
}
