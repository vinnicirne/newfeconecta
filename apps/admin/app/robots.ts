import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/faq', '/login', '/register', '/post/', '/bible', '/biblia'],
      disallow: ['/admin/', '/api/', '/settings/', '/configuracoes/', '/messages/', '/chat/', '/dashboard/', '/saved/', '/notifications/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
