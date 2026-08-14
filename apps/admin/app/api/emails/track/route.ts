import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        // Atualiza o opened_at no banco
        await supabase
          .from('email_logs')
          .update({ opened_at: new Date().toISOString() })
          .eq('id', id)
          .is('opened_at', null); // Atualiza apenas se ainda não foi aberto
      }
    }

    // Retorna a marca d'água SVG quase invisível
    const svg = `<svg width="120" height="30" xmlns="http://www.w3.org/2000/svg">
  <text x="5" y="20" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000000" opacity="0.02">FéConecta</text>
</svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // Mesmo se der erro, retorna o SVG para não quebrar a imagem no cliente
    const svgFallback = `<svg width="120" height="30" xmlns="http://www.w3.org/2000/svg"><text x="5" y="20" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000000" opacity="0.02">FéConecta</text></svg>`;
    return new NextResponse(svgFallback, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    });
  }
}
