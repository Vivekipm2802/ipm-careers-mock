
import { createClient } from '@supabase/supabase-js'

// Ship 5: this file previously created a client from
// NEXT_PUBLIC_SUPABASE_SERVICE_KEY — a service-role key in a public env var.
// Nothing imports this module anymore; it is kept only so any stale import
// fails safe (anon key, RLS enforced) instead of leaking the service key.
// Prefer utils/supabaseClient.js (`supabase` / `serversupabase`).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
