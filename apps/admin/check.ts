import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('feed_posts').select('*').limit(1);
  if (error) {
    console.log("ERROR feed_posts:", error.message);
  } else {
    console.log("OK feed_posts:", data[0]);
  }
}
check();
