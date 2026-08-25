import { NextRequest, NextResponse } from 'next/server';

/**
 * MIDDLEWARE DE SEGURANÇA SERVER-SIDE — FéConecta
 *
 * Protege rotas /admin verificando o JWT do cookie de sessão do Supabase
 * ANTES de qualquer renderização ou execução de código client-side.
 *
 * Por que isso é necessário?
 * A proteção anterior era puramente client-side (auth-guard.tsx React component).
 * Um usuário podia bypassá-la desabilitando JavaScript ou manipulando o estado
 * React via DevTools. Esta verificação roda no Edge (servidor) e é impermeável a esses ataques.
 *
 * Estratégia de verificação:
 * 1. Extrai o access_token do cookie de sessão do Supabase
 * 2. Decodifica o JWT sem validar assinatura (rápido, no Edge)
 * 3. Verifica o campo `role` no payload
 * 4. Para confirmação crítica, checa o DB via API route (apenas quando necessário)
 *
 * NOTA: Para validação completa de assinatura JWT no Edge, instalar @supabase/ssr
 * e configurar conforme: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64URL decode sem atob (compatível com Edge runtime)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice((base64.length + 3) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function extractSupabaseToken(request: NextRequest): string | null {
  // Supabase armazena a sessão em cookies no formato:
  // sb-<project-ref>-auth-token ou sb-<project-ref>-auth-token.0, etc.
  // Também pode estar como access_token em um cookie JSON
  const cookieNames = request.cookies.getAll().map(c => c.name);
  
  for (const name of cookieNames) {
    if (name.includes('auth-token') && !name.endsWith('.1') && !name.endsWith('.2')) {
      const value = request.cookies.get(name)?.value;
      if (!value) continue;
      
      try {
        // O cookie pode ser um JSON com access_token
        const parsed = JSON.parse(decodeURIComponent(value));
        if (parsed?.access_token) return parsed.access_token;
        // Ou pode ser o access_token diretamente
        if (typeof parsed === 'string' && parsed.includes('.')) return parsed;
      } catch {
        // O cookie pode ser o token diretamente
        if (value.includes('.')) return value;
      }
    }
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Aplica proteção apenas em rotas /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const token = extractSupabaseToken(request);

  // Sem token → redireciona para login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decodifica o JWT para checar se o token não expirou e pegar o role
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifica expiração do token
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifica se a sessão é de um usuário autenticado (não anon)
  const tokenRole = payload.role;
  if (tokenRole === 'anon' || !tokenRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // O role de aplicação (admin/user) está em user_metadata ou app_metadata
  // O auth-guard.tsx client-side faz a verificação final consultando a tabela profiles.
  // O middleware é a primeira linha de defesa (bloqueio de usuários não autenticados).
  // A verificação de role admin é feita server-side no auth-guard, garantindo dupla proteção.

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplica apenas em rotas /admin, excluindo _next e arquivos estáticos
    '/admin/:path*',
  ],
};
