import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars:", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseKey
    );

    // Valida o token e extrai o usuário confiavelmente
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 });
    }

    const email = user.email;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (error) {
      throw error;
    }

    // O generateLink retorna um email_otp que podemos usar no verifyOtp do lado do cliente
    const token = data.properties?.email_otp;

    if (!token) {
      throw new Error("Não foi possível gerar o token OTP.");
    }

    return NextResponse.json({ token, email });
  } catch (error: any) {
    console.error("SSO Fenamoro Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
