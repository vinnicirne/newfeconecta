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
  const { data, error } = await supabase.rpc('get_triggers_from_pg', {});
  if (error) {
     console.log("RPC get_triggers_from_pg not found. Creating it...");
     await supabase.rpc('exec_sql', { sql: `
       CREATE OR REPLACE FUNCTION get_triggers_from_pg()
       RETURNS json AS $$
       BEGIN
         RETURN (
           SELECT json_agg(t) FROM (
             SELECT tgname, relname, proname 
             FROM pg_trigger 
             JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
             JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
             WHERE proname LIKE '%http_request%' OR tgname LIKE '%push%' OR proname LIKE '%send_push%'
           ) t
         );
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER;
     ` });
     const { data: d2 } = await supabase.rpc('get_triggers_from_pg', {});
     console.log(d2);
  } else {
     console.log(data);
  }
}

run();
