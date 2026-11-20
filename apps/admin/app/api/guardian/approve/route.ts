import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

/** Email scanners commonly prefetch links, so GET only opens a confirmation screen. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const destination = token && TOKEN_PATTERN.test(token)
    ? `/guardian/approve?token=${encodeURIComponent(token)}`
    : '/guardian/result?status=invalid';
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

/** Approval is a one-time, atomic POST using the high-entropy token from the guardian email. */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const token = (body as { token?: unknown } | null)?.token;
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      return errorResponse('Link de autorização inválido.', 400);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return errorResponse('Serviço de autorização indisponível.', 503);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        guardian_approved: true,
        guardian_approved_at: now,
        guardian_token: null,
      })
      .eq('guardian_token', tokenHash)
      .eq('is_minor', true)
      .eq('guardian_approved', false)
      .gt('guardian_token_expires_at', now)
      .select('id, full_name')
      .maybeSingle();

    if (error) {
      console.error('[GuardianApprove] Não foi possível validar o token:', error.message);
      return errorResponse('Não foi possível concluir a autorização.', 500);
    }
    if (!profile) return errorResponse('Link expirado ou já utilizado.', 410);

    return NextResponse.json({ success: true, name: profile.full_name || 'seu filho(a)' }, {
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch (error) {
    console.error('[GuardianApprove] Falha inesperada:', error instanceof Error ? error.message : 'erro desconhecido');
    return errorResponse('Erro ao processar a autorização.', 500);
  }
}
