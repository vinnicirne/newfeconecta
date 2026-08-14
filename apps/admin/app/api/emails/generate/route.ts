import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Email Generator] GEMINI_API_KEY não configurada.');
      return NextResponse.json({ error: 'Chave de API do Gemini não configurada no servidor.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
Você é um redator de conteúdo cristão inspirador para a plataforma FéConecta.
Crie a "Mensagem do Dia" ("Devocional") para ser enviada por e-mail aos usuários.

A mensagem deve conter:
1. Um versículo bíblico encorajador.
2. Uma reflexão curta, amigável e edificante.
3. Uma pergunta rápida para reflexão.
4. Uma oração final de 1 a 2 parágrafos.

**IMPORTANTE:**
Você deve retornar a resposta estritamente no formato JSON, com as propriedades "subject" (o assunto do email) e "html" (o corpo do email).

O "html" **DEVE** seguir EXATAMENTE a estrutura visual, o CSS inline e as cores do modelo abaixo.
NÃO use variáveis markdown (como \`\`\`json ou \`\`\`html) ao redor da resposta. Retorne Apenas o JSON puro.

Modelo do HTML (siga esta mesma estrutura de <div>s e styles):
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #00A676; margin-bottom: 10px;">[Crie um título atraente baseado no versículo] 🙏</h1>
    <p style="color: #a3a3a3; font-size: 16px;">[Crie um subtítulo ou frase de chamada]</p>
  </div>
  
  <div style="background-color: #1a1a1a; padding: 25px; border-radius: 8px; border: 1px solid #333;">
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #ffffff;">
      Bom dia, <strong>{{name}}</strong>!<br><br>
      [Texto introdutório]
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
      “[Versículo bíblico completo]”<br>
      [Referência do Versículo]
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
      [Reflexão da mensagem (2 a 3 parágrafos curtos)]
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
      💭 <strong>Para refletir hoje:</strong><br>
      [Pergunta reflexiva]
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
      🙏 <strong>Ore:</strong><br>
      “[Texto da Oração] Amém.”
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff; text-align: center;">
      Que Deus abençoe o seu dia! ❤️<br>
      Continue sua caminhada de fé com a gente.
    </p>

    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; color: #a3a3a3; text-align: center;">
      👉 Acesse o FéConecta e compartilhe, ore e edifique junto com a comunidade.<br>
      <strong>FéConecta</strong><br>
      Conectando pessoas, fortalecendo a fé.
    </p>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="https://play.google.com/store/apps/details?id=com.feconecta.myapp&hl=pt_BR" style="display: inline-block; background-color: #00A676; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px;">
        Abrir o App FéConecta
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
    <p>© 2026 FéConecta. Todos os direitos reservados.</p>
  </div>
</div>
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Opcional: tentar parsear caso a IA retorne com markdown (mesmo com mimetype ativado é bom garantir)
    let jsonParsed;
    try {
      jsonParsed = JSON.parse(responseText);
    } catch (e) {
      // Tentar limpar blocos de código
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      jsonParsed = JSON.parse(cleaned);
    }

    if (!jsonParsed || !jsonParsed.subject || !jsonParsed.html) {
      throw new Error('A IA não retornou o formato esperado.');
    }

    return NextResponse.json({ success: true, data: jsonParsed }, { status: 200 });

  } catch (error: any) {
    console.error('[Email Generator] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar e-mail com IA' }, { status: 500 });
  }
}
