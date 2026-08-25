/** @type {import('next').NextConfig} */

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.youtube.com https://s.ytimg.com https://*.googleapis.com https://va.vercel-scripts.com https://vercel.live https://cdn.ywxi.net https://*.trustedsite.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https:;
  font-src 'self' https://fonts.gstatic.com data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://fenamoro.vercel.app https://vercel.live https://*.trustedsite.com;
  connect-src 'self' https: wss: blob: data:;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(self)',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
