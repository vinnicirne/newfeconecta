import { POST as sendEmailPOST } from '../send/route';

export async function POST(request: Request) {
  // Encaminha a chamada diretamente para a rota /api/emails/send garantindo template_key: 'welcome'
  try {
    const body = await request.json();
    const augmentedBody = {
      ...body,
      template_key: body.template_key || 'welcome'
    };

    const newRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(augmentedBody)
    });

    return await sendEmailPOST(newRequest);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar e-mail de boas-vindas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
