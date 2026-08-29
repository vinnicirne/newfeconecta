import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseServer = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function requireAuth(request: Request) {
  let token: string | null = null;
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  }

  // Se não veio no Header, tenta extrair dos Cookies da requisição
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    const tokenCookie = Object.keys(cookies).find(k => 
      k.includes('fc-auth-token') || k.includes('-auth-token') || k === 'sb-access-token' || k === 'supabase-auth-token'
    );

    if (tokenCookie && cookies[tokenCookie]) {
      try {
        const parsed = JSON.parse(cookies[tokenCookie]);
        token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
      } catch {
        token = cookies[tokenCookie];
      }
    }
  }

  if (!token) {
    throw new Error('Não autorizado: Token ausente');
  }

  const { data: { user }, error } = await supabaseServer.auth.getUser(token);

  if (error || !user) {
    throw new Error(`Não autorizado: Sessão inválida ou expirada (${error?.message || 'Token rejeitado'})`);
  }

  return user;
}
