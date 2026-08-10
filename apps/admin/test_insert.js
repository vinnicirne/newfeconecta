const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envStr.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if(line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('notifications').insert({
    recipient_id: '5034f23f-4197-4f1a-aa88-23e9fd26f1bf', // some user
    sender_id: '5034f23f-4197-4f1a-aa88-23e9fd26f1bf',
    type: 'message',
    content: 'Test message'
  }).select('*').single();
  
  console.log("INSERTED NOTIFICATION:");
  console.log(JSON.stringify(data, null, 2));
}

run();
