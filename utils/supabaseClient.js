
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Public client — safe for browser use (uses anon key with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only client — uses service role key that bypasses RLS.
// Reads SUPABASE_SERVICE_KEY first (correct), falls back to the legacy
// NEXT_PUBLIC_ name so existing deployments keep working until the
// env var is renamed on Vercel.
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

export const serversupabase = createClient(supabaseUrl, supabaseServiceKey);
