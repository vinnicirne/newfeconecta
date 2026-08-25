import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/guardian/approve?token=<token>
 * 
 * Endpoint acessado pelo responsável ao clicar no link do e-mail.
 * Valida o token, aprova a conta do adolescente e redireciona para uma página de confirmação.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!token) {
    return NextResponse.redirect(new URL('/guardian/result?status=invalid', request.url));
  }

  // Buscar o perfil pelo token
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, is_minor, guardian_approved, guardian_token_expires_at')
    .eq('guardian_token', token)
    .single();

  if (error || !profile) {
    return NextResponse.redirect(new URL('/guardian/result?status=invalid', request.url));
  }

  // Verificar se o token expirou (válido por 7 dias)
  if (profile.guardian_token_expires_at) {
    const expiresAt = new Date(profile.guardian_token_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/guardian/result?status=expired', request.url));
    }
  }

  // Verificar se já aprovado
  if (profile.guardian_approved) {
    return NextResponse.redirect(new URL('/guardian/result?status=already_approved', request.url));
  }

  // Aprovar a conta
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      guardian_approved: true,
      guardian_approved_at: new Date().toISOString(),
      guardian_token: null, // Invalidar o token após uso
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('[GuardianApprove] Erro ao aprovar conta:', updateError);
    return NextResponse.redirect(new URL('/guardian/result?status=error', request.url));
  }

  const name = encodeURIComponent(profile.full_name || 'seu filho(a)');
  return NextResponse.redirect(new URL(`/guardian/result?status=approved&name=${name}`, request.url));
}
