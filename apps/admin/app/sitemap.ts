import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://newfeconecta.vercel.app';

  // Rotas estáticas públicas
  const routes = [
    '',
    '/feed',
    '/bible',
    '/about',
    '/faq',
    '/login',
    '/register',
    '/terms',
    '/privacy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Rotas dinâmicas (Posts Públicos)
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const postRoutes = (posts || []).map((post) => ({
      url: `${baseUrl}/post/${post.id}`,
      lastModified: new Date(post.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));

    // Rotas de Salas de Guerra públicas (se houver)
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, created_at')
      .eq('status', 'active')
      .limit(100);

    const roomRoutes = (rooms || []).map((room) => ({
      url: `${baseUrl}/room/${room.id}`,
      lastModified: new Date(room.created_at),
      changeFrequency: 'always' as const,
      priority: 0.7,
    }));

    return [...routes, ...postRoutes, ...roomRoutes];
  } catch (err) {
    console.error('Erro ao gerar sitemap:', err);
    return routes;
  }
}
