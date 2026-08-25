import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * MIDDLEWARE DE SEGURANÇA SERVER-SIDE COM CSP NONCE + STRICT-DYNAMIC (NOTA A+ NO MOZILLA OBSERVATORY)
 */

function generateNonce(): string {
  // Gera um nonce criptográfico padrão Base64 compatível com Web Crypto API (Edge Runtime)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

function buildCsp(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com https://www.youtube.com https://s.ytimg.com https://*.googleapis.com https://va.vercel-scripts.com https://vercel.live;
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
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  // Injeta o Content-Security-Policy com Nonce + Strict-Dynamic (Garante Nota A+ no Mozilla Observatory)
  response.headers.set('Content-Security-Policy', buildCsp(nonce));

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
  const nonce = generateNonce();

  // Injeta o header x-nonce na request para componentes React que precisarem
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Se não for rota /admin, apenas aplica todos os security headers
  if (!pathname.startsWith('/admin')) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return applySecurityHeaders(response, nonce);
  }

  const token = extractSupabaseToken(request);

  // Sem token -> Redireciona para login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)), nonce);
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
      return applySecurityHeaders(NextResponse.redirect(loginUrl), nonce);
    }

    // Validação estrita de autorização no banco
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      // Usuário autenticado mas sem permissão de admin -> Redireciona para o Feed
      return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)), nonce);
    }

    // Autorizado como admin -> Segue com headers de segurança
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return applySecurityHeaders(response, nonce);
  } catch (err) {
    console.error('[Admin Guard Middleware] Falha na verificação de admin:', err);
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)), nonce);
  }
}

export const config = {
  matcher: [
    // Executa em todas as rotas de aplicação, exceto estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)',
  ],
};
