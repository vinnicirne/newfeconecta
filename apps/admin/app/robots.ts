import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/faq', '/login', '/register', '/post/', '/room/', '/bible', '/feed'],
      disallow: ['/admin/', '/api/', '/settings/', '/messages/'],
    },
    sitemap: 'https://newfeconecta.vercel.app/sitemap.xml',
  };
}
