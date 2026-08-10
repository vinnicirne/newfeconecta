// migrate_avatars.js — Migração de Avatares Supabase Cloud → VPS
// Executa: node scripts/migrate_avatars.js

const { Client } = require('pg');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Credenciais ───────────────────────────────────────────────
const OLD_DB = {
  host: 'db.dfqgmrhgwgozjqhhbblp.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '@@Vinni1105@@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

const NEW_VPS_URL = 'https://supabase.vps9432.panel.icontainer.cloud';
const NEW_VPS_HTTP = 'http://209.50.229.10:8000';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODIxMjgzNDYsImV4cCI6MjA5NzcwNDM0Nn0.Kkqjs-m99ajaPjKLf2ghdtZFosNHoYaxeP-GdJVTsy4';

// IDs de usuários que precisam ter avatar migrado
const PROFILES_NEEDING_AVATAR = [
  '5034f23f-4197-4f1a-aa88-23e9fd26f1bf',   // feconecta
  '98f94add-8596-41e8-a5cf-af9e02025bdb',   // izacirne
  '6a348602-fb9d-4549-b7c9-d95f5f3f6acc',   // vinnicirne
  'bc993b87-083e-475b-9a02-4127b1268980',   // davilessa.ofc
  'f3905006-3ee6-4454-950a-37603b199791',   // thaisarajonascimento
  '650f6ebb-a764-4ce5-a25d-a7208415d43f',   // andreluizdavilva
  '07808c42-0692-4dee-91ed-524fffeb1713',   // playstore
];

const AGENT = new https.Agent({ rejectUnauthorized: false });
const TMP_DIR = path.join(__dirname, '..', 'tmp_migration');

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    },
    agent: AGENT,
    timeout: 30000
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.buffer();
}

async function uploadToVPS(bucket, filename, buffer, mimetype) {
  const res = await fetch(`${NEW_VPS_HTTP}/storage/v1/object/${bucket}/${filename}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': mimetype || 'image/jpeg',
      'x-upsert': 'true'
    },
    body: buffer,
    agent: new https.Agent(),
    timeout: 60000
  });
  const text = await res.text();
  if (!res.ok && res.status !== 200) throw new Error(`Upload HTTP ${res.status}: ${text}`);
  return `${NEW_VPS_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

async function updateProfileAvatar(userId, avatarUrl) {
  const res = await fetch(`${NEW_VPS_HTTP}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ avatar_url: avatarUrl })
  });
  if (!res.ok) throw new Error(`DB Update HTTP ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log('=== 🚀 Migração de Avatares Supabase Cloud → VPS ===\n');

  // Conectar na cloud antiga
  const client = new Client(OLD_DB);
  try {
    await client.connect();
    console.log('✅ Conectado ao banco da cloud antiga\n');
  } catch (e) {
    console.error('❌ Falha na conexão ao banco da cloud antiga:', e.message);
    process.exit(1);
  }

  // Listar TODOS os arquivos de avatar da cloud antiga
  let avatarFiles = [];
  try {
    const result = await client.query(`
      SELECT 
        so.name,
        so.bucket_id,
        so.metadata->>'mimetype' as mimetype,
        so.metadata->>'size' as size
      FROM storage.objects so
      WHERE so.bucket_id = 'avatars'
      ORDER BY so.created_at DESC
    `);
    avatarFiles = result.rows;
    console.log(`📦 Encontrados ${avatarFiles.length} arquivos no bucket 'avatars' da cloud antiga:\n`);
    avatarFiles.forEach(f => console.log(`  • ${f.name} (${f.mimetype}, ${parseInt(f.size)/1024|0}KB)`));
  } catch (e) {
    console.error('❌ Erro ao listar arquivos:', e.message);
    await client.end();
    process.exit(1);
  }

  console.log('\n--- Iniciando download e upload ---\n');
  fs.mkdirSync(TMP_DIR, { recursive: true });

  let migrated = 0, failed = 0;

  for (const file of avatarFiles) {
    const { name, bucket_id, mimetype } = file;
    const oldUrl = `https://dfqgmrhgwgozjqhhbblp.supabase.co/storage/v1/object/${bucket_id}/${name}`;

    process.stdout.write(`📥 ${name} ... `);

    try {
      // 1. Tentar download da cloud antiga (authenticated)
      const buffer = await downloadBuffer(oldUrl);
      process.stdout.write(`${buffer.length}B baixados ... `);

      // 2. Upload para VPS
      const newUrl = await uploadToVPS(bucket_id, name, buffer, mimetype);
      console.log(`✅ → ${newUrl}`);

      // 3. Atualizar perfil se for avatar de usuário
      const userIdMatch = name.match(/avatar_([0-9a-f-]{36})/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        if (PROFILES_NEEDING_AVATAR.includes(userId)) {
          await updateProfileAvatar(userId, newUrl);
          console.log(`   👤 Perfil ${userId} atualizado no banco`);
        }
      }

      migrated++;
    } catch (e) {
      console.log(`❌ FALHA: ${e.message}`);
      failed++;
    }
  }

  // Também verificar bucket posts para arquivos antigos
  console.log('\n--- Verificando bucket posts ---\n');
  try {
    const result = await client.query(`
      SELECT name, bucket_id, metadata->>'mimetype' as mimetype
      FROM storage.objects
      WHERE bucket_id IN ('posts', 'post-media')
      ORDER BY created_at DESC
      LIMIT 50
    `);
    console.log(`📦 ${result.rows.length} arquivos nos buckets posts/post-media da cloud antiga`);
    
    for (const file of result.rows) {
      const { name, bucket_id, mimetype } = file;
      const oldUrl = `https://dfqgmrhgwgozjqhhbblp.supabase.co/storage/v1/object/${bucket_id}/${name}`;
      process.stdout.write(`📥 ${name} ... `);
      try {
        const buffer = await downloadBuffer(oldUrl);
        const newUrl = await uploadToVPS(bucket_id, name, buffer, mimetype);
        console.log(`✅ → VPS`);
        migrated++;
      } catch (e) {
        console.log(`❌ ${e.message}`);
        failed++;
      }
    }
  } catch (e) {
    console.log('Erro nos posts:', e.message);
  }

  await client.end();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\n=== 🏁 Migração Concluída ===`);
  console.log(`✅ Migrados: ${migrated} arquivos`);
  console.log(`❌ Falhados: ${failed} arquivos`);
}

main().catch(console.error);
