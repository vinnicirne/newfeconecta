import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * MIDDLEWARE DE SEGURANÇA SERVER-SIDE COM CSP (MOZILLA OBSERVATORY A+) — FéConecta
 *
 * Injeta headers de segurança de alto nível (Content Security Policy, HSTS, X-Frame-Options, etc.)
 * e protege rotas /admin com verificação server-side no Edge.
 */

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.youtube.com https://s.ytimg.com https://*.googleapis.com https://va.vercel-scripts.com https://vercel.live;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https: http:;
  font-src 'self' https://fonts.gstatic.com data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://fenamoro.vercel.app https://vercel.live;
  connect-src 'self' https: wss: http: blob: data:;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy (Resolve a pendência do Mozilla Observatory)
  response.headers.set('Content-Security-Policy', cspHeader);

  // Demais Headers de Segurança padrão A+
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self)'
  );
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

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

  // Se não for rota /admin, apenas aplica todos os security headers (incluindo CSP)
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

    // Valida criptograficamente o JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Validação estrita de autorização no banco
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
