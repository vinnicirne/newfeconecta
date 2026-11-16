import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const routes = [
    '',
    '/bible',
    '/about',
    '/faq',
    '/terms',
    '/privacy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    const pageSize = 1000;
    const postRoutes: MetadataRoute.Sitemap = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      for (const post of posts || []) {
        postRoutes.push({
          url: `${baseUrl}/post/${post.id}`,
          lastModified: new Date(post.created_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
      if (!posts || posts.length < pageSize) break;
    }

    return [...routes, ...postRoutes];
  } catch (err) {
    console.error('Erro ao gerar sitemap:', err);
    return routes;
  }
}
