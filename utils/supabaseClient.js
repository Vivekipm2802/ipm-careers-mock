
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Public client — safe for browser use (uses anon key with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only client — uses service role key that bypasses RLS.
// Ship 5: the NEXT_PUBLIC_SUPABASE_SERVICE_KEY fallback is GONE. This module
// is imported by client components, so a NEXT_PUBLIC_ service key gets
// inlined into the public JS bundle — full RLS bypass for anyone who reads
// it. SUPABASE_SERVICE_KEY (server-only) is undefined in the browser, so we
// fall back to the anon key there: `serversupabase` degrades to an
// RLS-respecting client on the client side instead of crashing at import.
// Server code paths (API routes / getServerSideProps) get the real key.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const serversupabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
);
