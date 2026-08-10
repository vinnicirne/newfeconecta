import { createClient } from '@supabase/supabase-js';

// Cria um cliente com a Anon Key em vez da Service Role, evitando vazamento de acesso de administrador
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseServer = createClient(supabaseUrl, supabaseKey);

export async function requireAuth(request: Request) {

  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    throw new Error('Não autorizado: Token ausente');
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Não autorizado: Token malformado');
  }

  const { data: { user }, error } = await supabaseServer.auth.getUser(token);

  if (error || !user) {
    throw new Error('Não autorizado: Sessão inválida ou expirada');
  }

  return user;
}
