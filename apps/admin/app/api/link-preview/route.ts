import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // SSRF Protection: Bloqueia IPs locais, rede privada, AWS Metadata e loopback
  const isPrivateOrLocalIP = (hostname: string) => {
    return /^localhost$/i.test(hostname) ||
           /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
           /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
           /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname) ||
           /^192\.168\.\d+\.\d+$/.test(hostname) ||
           /^169\.254\.\d+\.\d+$/.test(hostname) ||
           /^::1$/.test(hostname) ||
           hostname.endsWith('.local') ||
           hostname.endsWith('.internal');
  };

  try {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5000); // 5s timeout

    let currentUrlStr = url;
    let response;
    let maxRedirects = 3;

    for (let i = 0; i <= maxRedirects; i++) {
      const targetUrl = new URL(currentUrlStr);
      
      if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
        throw new Error('Only HTTP/HTTPS are allowed');
      }
      
      if (isPrivateOrLocalIP(targetUrl.hostname)) {
        console.warn("[SECURITY] SSRF attempt blocked:", currentUrlStr);
        return NextResponse.json({ error: 'Private or local IP addresses are not allowed' }, { status: 403 });
      }

      response = await fetch(currentUrlStr, {
        headers: {
          'User-Agent': 'WhatsApp/2.21.12.21 A',
          'Accept': 'text/html'
        },
        signal: abortController.signal,
        redirect: 'manual', // Prevent automatic redirects to re-validate them
        next: { revalidate: 86400 } 
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;
        currentUrlStr = new URL(location, currentUrlStr).toString();
        continue; // Segue o redirect no próximo loop para re-validar o host
      }
      
      break;
    }

    clearTimeout(timeout);

    if (!response || !response.ok) throw new Error('Failed to fetch');

    const html = await response.text();

    // Extrair tags OGs via Regex (rápido e não precisa de dependências pesadas)
    const getTag = (name: string, isProperty = true) => {
      const regex = new RegExp(
        `<meta[^>]*${isProperty ? 'property' : 'name'}=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
        'i'
      );
      const match = html.match(regex);
      if (match) return match[1];

      // fallback com ordem invertida (content antes do name/property)
      const regexReverse = new RegExp(
        `<meta[^>]*content=["']([^"']+)["'][^>]*${isProperty ? 'property' : 'name'}=["']${name}["'][^>]*>`,
        'i'
      );
      const matchReverse = html.match(regexReverse);
      return matchReverse ? matchReverse[1] : null;
    };

    let title = getTag('og:title') || getTag('twitter:title') || getTag('title', false);
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1] : url;
    }

    const description = getTag('og:description') || getTag('twitter:description') || getTag('description', false) || '';
    const image = getTag('og:image') || getTag('twitter:image') || '';
    
    // Pegar o hostname para exibir de forma limpa
    let domain = '';
    try {
      domain = new URL(url).hostname.replace('www.', '');
    } catch (e) {}

    const decodeHtmlCharCodes = (str: string) => {
      if (!str) return str;
      return str.replace(/(&#(\d+);)/g, (match, capture, charCode) => 
        String.fromCharCode(parseInt(charCode, 10))
      ).replace(/(&#x([a-fA-F0-9]+);)/gi, (match, capture, charCode) => 
        String.fromCharCode(parseInt(charCode, 16))
      ).replace(/&quot;/g, '"')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&apos;/g, "'")
       .replace(/&nbsp;/g, " ");
    };

    return NextResponse.json({
      title: decodeHtmlCharCodes(title?.trim()),
      description: decodeHtmlCharCodes(description?.trim()),
      image,
      domain
    });

  } catch (error) {
    return NextResponse.json({ 
      title: url,
      description: '',
      image: '',
      domain: new URL(url).hostname
    });
  }
}
