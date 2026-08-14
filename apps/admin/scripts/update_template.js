const fs = require('fs');

async function main() {
  try {
    let htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #00A676; margin-bottom: 10px;">Sentimos sua falta!</h1>
    <p style="color: #a3a3a3; font-size: 16px;">Volte para o seu lugar de adoração.</p>
  </div>
  
  <div style="background-color: #1a1a1a; padding: 25px; border-radius: 8px; border: 1px solid #333;">
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #ffffff;">
      Olá, <strong>{{name}}</strong>!<br><br>
      Sentimos a sua falta por aqui. Faz uns dias que você não entra na FéConecta e gostaríamos muito de ter você novamente com a gente.
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
      Muitas coisas novas aconteceram na nossa rede e nas Salas de Guerra. Volte a interagir, orar e edificar junto com a comunidade!
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
</div>`;
    
    // escape single quotes
    htmlContent = htmlContent.replace(/'/g, "''");

    const res = await fetch('http://209.50.229.10:8000/pg/query', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODIxMjgzNDYsImV4cCI6MjA5NzcwNDM0Nn0.Kkqjs-m99ajaPjKLf2ghdtZFosNHoYaxeP-GdJVTsy4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODIxMjgzNDYsImV4cCI6MjA5NzcwNDM0Nn0.Kkqjs-m99ajaPjKLf2ghdtZFosNHoYaxeP-GdJVTsy4',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `UPDATE email_templates SET html_content = '${htmlContent}' WHERE key = 'reengagement';`
      })
    });
    console.log(await res.json());
  } catch (err) {
    console.error(err);
  }
}
main();
