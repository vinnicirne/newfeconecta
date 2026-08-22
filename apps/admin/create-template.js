const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://vps9432.panel.icontainer.cloud';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTemplate() {
  const { data, error } = await supabase.from('email_templates').insert([
    { 
      key: 'mensagem_do_dia', 
      subject: 'Seu versículo de hoje: Deus está com você 🙏', 
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #00A676; margin-bottom: 10px;">Seu versículo de hoje: Deus está com você 🙏</h1>
    <p style="color: #a3a3a3; font-size: 16px;">Volte para o seu lugar de adoração.</p>
  </div>
  
  <div style="background-color: #1a1a1a; padding: 25px; border-radius: 8px; border: 1px solid #333;">
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #ffffff;">
      Bom dia, <strong>{{name}}</strong>!<br><br>
      Que tal começar o dia lembrando de uma verdade que traz paz ao coração?    </p>
    
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
</div>`
    }
  ]);
  
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Template criado com sucesso:', data);
  }
}

createTemplate();
