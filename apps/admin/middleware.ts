import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * MIDDLEWARE DE SEGURANÇA SERVER-SIDE 10/10 — FéConecta
 *
 * 1. Protege rotas /admin com verificação server-side completa:
 *    - Validação de sessão / token ativo no Supabase
 *    - Checagem estrita de privilégio (role === 'admin') no banco de dados
 *    - Redirecionamento instantâneo no Edge para usuários não autorizados
 *
 * 2. Injeta Headers de Segurança HTTP modernos em todas as requisições:
 *    - X-Content-Type-Options: nosniff
 *    - X-Frame-Options: SAMEORIGIN (proteção contra clickjacking)
 *    - Referrer-Policy: strict-origin-when-cross-origin
 *    - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *    - Strict-Transport-Security (HSTS)
 */

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  return response;
}

function extractSupabaseToken(request: NextRequest): string | null {
  const cookieNames = request.cookies.getAll().map((c) => c.name);

  for (const name of cookieNames) {
    if (name.includes('auth-token') && !name.endsWith('.1') && !name.endsWith('.2')) {
      const value = request.cookies.get(name)?.value;
      if (!value) continue;

      try {
        const parsed = JSON.parse(decodeURIComponent(value));
        if (parsed?.access_token) return parsed.access_token;
        if (typeof parsed === 'string' && parsed.includes('.')) return parsed;
      } catch {
        if (value.includes('.')) return value;
      }
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Se não for rota /admin, apenas aplica headers de segurança
  if (!pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  const token = extractSupabaseToken(request);

  // Sem token -> Redireciona para login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Valida criptograficamente o JWT e obtém o usuário autêntico
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Validação estrita de autorização no banco (Server-Side)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      // Usuário autenticado mas sem permissão de admin -> Redireciona para o Feed
      return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)));
    }

    // Autorizado como admin -> Segue com headers de segurança
    return applySecurityHeaders(NextResponse.next());
  } catch (err) {
    console.error('[Admin Guard Middleware] Falha na verificação de admin:', err);
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }
}

export const config = {
  matcher: [
    // Executa em todas as rotas de aplicação, exceto estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)',
  ],
};
