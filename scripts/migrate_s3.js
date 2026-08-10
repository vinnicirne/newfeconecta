// migrate_s3.js — Migração via S3 Protocol (Supabase Cloud → VPS)
// Acessa o storage da cloud antiga via protocolo S3 diretamente
// Bypassa o bloqueio de egress HTTP

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const https = require('https');

// ── Credenciais S3 da Cloud Antiga ────────────────────────────
const s3 = new S3Client({
  endpoint: 'https://dfqgmrhgwgozjqhhbblp.storage.supabase.co/storage/v1/s3',
  region: 'sa-east-1',
  credentials: {
    accessKeyId: 'd2ec95375c303cda3e9e59eb1a51f934',
    secretAccessKey: '3e0984ce257de5c0d73e56eaaaa56e2f1663fd8495dc6121ba3f28f6dc353e84'
  },
  forcePathStyle: true
});

// ── VPS Nova ─────────────────────────────────────────────────
const VPS_HTTP   = 'http://209.50.229.10:8000';
const VPS_HTTPS  = 'https://supabase.vps9432.panel.icontainer.cloud';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODIxMjgzNDYsImV4cCI6MjA5NzcwNDM0Nn0.Kkqjs-m99ajaPjKLf2ghdtZFosNHoYaxeP-GdJVTsy4';

const BUCKETS = ['avatars', 'posts', 'post-media'];

// IDs dos usuários que precisam ter avatar restaurado
const PROFILES_NEEDING_AVATAR = new Set([
  '5034f23f-4197-4f1a-aa88-23e9fd26f1bf',
  '98f94add-8596-41e8-a5cf-af9e02025bdb',
  '6a348602-fb9d-4549-b7c9-d95f5f3f6acc',
  'bc993b87-083e-475b-9a02-4127b1268980',
  'f3905006-3ee6-4454-950a-37603b199791',
  '650f6ebb-a764-4ce5-a25d-a7208415d43f',
  '07808c42-0692-4dee-91ed-524fffeb1713',
]);

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function listAllObjects(bucket) {
  const objects = [];
  let token = undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: token,
    });
    const res = await s3.send(cmd);
    if (res.Contents) objects.push(...res.Contents);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function downloadFromS3(bucket, key) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const res = await s3.send(cmd);
  return {
    buffer: await streamToBuffer(res.Body),
    contentType: res.ContentType || 'application/octet-stream'
  };
}

async function uploadToVPS(bucket, filename, buffer, contentType) {
  const res = await fetch(`${VPS_HTTP}/storage/v1/object/${bucket}/${filename}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: buffer
  });
  const text = await res.text();
  if (!res.ok && res.status !== 200) {
    throw new Error(`Upload HTTP ${res.status}: ${text}`);
  }
  return `${VPS_HTTPS}/storage/v1/object/public/${bucket}/${filename}`;
}

async function updateProfileAvatar(userId, avatarUrl) {
  const res = await fetch(`${VPS_HTTP}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ avatar_url: avatarUrl })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DB PATCH ${res.status}: ${t}`);
  }
}

async function main() {
  console.log('=== 🚀 Migração S3 — Supabase Cloud → VPS ===\n');

  let totalMigrated = 0, totalFailed = 0;

  for (const bucket of BUCKETS) {
    console.log(`\n📦 Bucket: ${bucket}`);
    console.log('─'.repeat(50));

    let objects;
    try {
      objects = await listAllObjects(bucket);
      console.log(`   ${objects.length} objetos encontrados\n`);
    } catch (e) {
      console.error(`   ❌ Erro ao listar: ${e.message}`);
      continue;
    }

    for (const obj of objects) {
      const key = obj.Key;
      const sizeKB = Math.round(obj.Size / 1024);
      process.stdout.write(`   📥 ${key} (${sizeKB}KB) ... `);

      try {
        // 1. Download via S3
        const { buffer, contentType } = await downloadFromS3(bucket, key);

        // 2. Upload para VPS
        const newUrl = await uploadToVPS(bucket, key, buffer, contentType);
        console.log(`✅`);

        // 3. Se for avatar, atualizar o perfil no banco
        if (bucket === 'avatars') {
          const match = key.match(/avatar_([0-9a-f-]{36})/);
          if (match) {
            const userId = match[1];
            if (PROFILES_NEEDING_AVATAR.has(userId)) {
              await updateProfileAvatar(userId, newUrl);
              console.log(`      👤 Perfil ${userId} atualizado → ${newUrl}`);
            }
          }
        }

        totalMigrated++;
      } catch (e) {
        console.log(`❌ ${e.message}`);
        totalFailed++;
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Migrados com sucesso: ${totalMigrated}`);
  console.log(`❌ Falhas:              ${totalFailed}`);
  console.log('═'.repeat(50));
}

main().catch(console.error);
