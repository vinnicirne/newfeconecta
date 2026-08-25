import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://cdn.ywxi.net https://*.trustedsite.com https://www.instagram.com https://platform.twitter.com https://www.tiktok.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https: android-webview-video-poster:;
  font-src 'self' data: https://fonts.gstatic.com;
  media-src 'self' blob: data: https:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://fenamoro.vercel.app https://vercel.live https://*.trustedsite.com https://www.tiktok.com https://www.instagram.com;
  connect-src 'self' https: wss: blob: data: https://cdn.ywxi.net https://*.trustedsite.com;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', cspHeader);
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
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)',
  ],
};
