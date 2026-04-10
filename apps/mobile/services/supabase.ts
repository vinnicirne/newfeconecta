import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfqgmrhgwgozjqhhbblp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcWdtcmhnd2dvempxaGhiYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzQwNjksImV4cCI6MjA4OTUxMDA2OX0.xNMl9klq4izoajZ8secIQXTgp3SB3vjkWSZq6ez7B0Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
