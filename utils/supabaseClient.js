
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 2026-10-29 ROOT-CAUSE FIX (mock "Saving your result…" forever, 6h+):
// supabase-js had NO timeout on any request. A mock runs 2h+, the access
// token lives 1h, so at submit the auth client must refresh the token. If
// that refresh fetch stalls (laptop slept, Wi-Fi blip, Safari background
// throttling) it never settles — and gotrue queues EVERY later
// getSession() / query behind it, so submit, the fallback insert and every
// other call wait forever. Every request now aborts after REQUEST_TIMEOUT_MS
// and the auth client simply retries / reports an error instead of hanging.
// Storage object uploads/downloads (recordings, PDFs) are exempt — they
// can legitimately take longer.
const REQUEST_TIMEOUT_MS = 30000;
function fetchWithTimeout(input, init = {}) {
  const url = typeof input === "string" ? input : input?.url || "";
  if (url.includes("/storage/v1/object")) return fetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // honour a caller-supplied signal too
  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Public client — safe for browser use (uses anon key with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});

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
