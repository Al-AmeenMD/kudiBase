import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yzuvolsjsgdadxecpagb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dXZvbHNqc2dkYWR4ZWNwYWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODE1NTIsImV4cCI6MjA5Mjk1NzU1Mn0.Y7xXy2SkcZK6LFNxOE2L-mT2WcQ2f8eQyihdUsNv9KA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
