import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ 
    operational: !!process.env.GEMINI_API_KEY,
    model: "gemini-2.5-flash",
    message: process.env.GEMINI_API_KEY 
      ? "Gemini Engine Ready ✅" 
      : "Gemini Engine Missing API Key"
  });
}

export async function POST(req: Request) {
  try {
    // SECURITY: Validação de JWT. Evita que a cota da IA seja drenada publicamente (DoW).
    const user = await requireAuth(req);

    const { verse, book, chapter, verseNumber, version } = await req.json();

    // SERVERLESS-SAFE RATE LIMITING (Postgres Backed)
    // Inicializa o admin client localmente para contornar RLS e checar limites
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data: limitData } = await supabaseAdmin
      .from('ai_rate_limits')
      .select('last_request_at')
      .eq('user_id', user.id)
      .single();

    const now = new Date();
    if (limitData && limitData.last_request_at) {
      const lastReq = new Date(limitData.last_request_at);
      const diffSeconds = (now.getTime() - lastReq.getTime()) / 1000;
      
      if (diffSeconds < 60) {
        return NextResponse.json(
          { error: `Aguarde ${Math.ceil(60 - diffSeconds)} segundos antes de gerar outro estudo.` },
          { status: 429 }
        );
      }
    }

    // Registra a requisição atual
    await supabaseAdmin.from('ai_rate_limits').upsert({ 
      user_id: user.id, 
      last_request_at: now.toISOString() 
    });

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key ausente no servidor. Adicione GEMINI_API_KEY no .env.local" },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",        // Padrão estável e ultra-rápido para Abril/2026
      generationConfig: {
        temperature: 0.65,              // Fidelidade exegética com fluidez pastoral
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const prompt = `
Você é um especialista em exegese bíblica e teologia sistemática, com tom pastoral, profético e encorajador.

Analise o seguinte versículo da Bíblia (Versão ${version}):

Livro: ${book}
Capítulo: ${chapter}
Versículo: ${verseNumber}
Texto: "${verse}"

Forneça um estudo profundo seguindo **exatamente** este formato numerado, mas **NUNCA use formatação como "**" (negrito) ou qualquer outro marcador de markdown**. O texto deve ser plano e limpo:

1. Contexto Histórico: Quem escreveu, para quem, quando e por quê.
2. Significado Original: Análise dos termos-chave no hebraico (AT) ou grego (NT), com transliteração quando relevante.
3. Mensagem Central: O que Deus está comunicando neste texto.
4. Aplicação Prática: Como aplicar isso de forma concreta e transformadora na vida cristã hoje.
5. Conexão Bíblica: Pelo menos 2-3 versículos que confirmam ou expandem este ensino.

Seja fiel às Escrituras, profundo, claro e cheio de unção. Não use asteriscos no texto em hipótese alguma.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text?.trim()) {
      throw new Error("O Gemini retornou uma resposta vazia.");
    }

    return NextResponse.json({ study: text });

  } catch (error: any) {
    console.error("❌ ERRO NO MOTOR GEMINI:", {
      message: error.message,
      status: error.status || error.response?.status,
      details: error.response?.data || error.details,
    });

    if (error.message?.toLowerCase().includes("not found") || error.status === 404) {
      return NextResponse.json({
        error: "Modelo não encontrado",
        details: "Use 'gemini-2.5-flash', 'gemini-2.5-pro' ou 'gemini-2.5-flash-lite'."
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "Falha ao gerar o estudo bíblico",
      details: error.message 
    }, { status: 500 });
  }
}
