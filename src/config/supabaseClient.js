import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kiuykhakbpjesoofinil.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdXlraGFrYnBqZXNvb2ZpbmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDAxNDAsImV4cCI6MjA5NTE3NjE0MH0.g6eFVGHsX6svgWpWKGHNCFsYYF7kEhLGkEKBgAtcA4E';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.info('ℹ️ VITE_SUPABASE environment variables not detected in build environment. Using fallback credentials.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
