import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iatvnqefuzxvaotaibeu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdHZucWVmdXp4dmFvdGFpYmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Mjc0NTYsImV4cCI6MjEwNTAwMzQ1Nn0.R51uCfddbc60lnlI1xY-LVQNnVQPZpTrl2rpWyb-qgw';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.info('ℹ️ VITE_SUPABASE environment variables not detected in build environment. Using fallback credentials.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
