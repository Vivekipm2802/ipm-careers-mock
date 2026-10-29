import { supabase } from '@/utils/supabaseClient';

/**
 * Returns an object with the Authorization header set to the current
 * user's access token. Use this when calling protected API routes.
 *
 * Usage:
 *   const headers = await getAuthHeaders();
 *   axios.post('/api/protectedRoute', body, { headers });
 *   // or with fetch:
 *   fetch('/api/protectedRoute', { headers });
 *
 * 2026-10-29: NEVER waits forever. getSession() can stall behind a hung
 * token refresh (the mock-submit "Saving your result…" 6h incident). After
 * AUTH_TIMEOUT_MS we fall back to the token stored in localStorage — the
 * server still validates it, so this grants nothing it shouldn't.
 */
const AUTH_TIMEOUT_MS = 6000;

function storedAccessToken() {
  try {
    if (typeof window === 'undefined') return null;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const v = JSON.parse(window.localStorage.getItem(k) || 'null');
        const tok = v?.access_token || v?.currentSession?.access_token;
        if (tok) return tok;
      }
    }
  } catch {}
  return null;
}

export async function getAuthHeaders() {
  let token = null;
  try {
    const res = await Promise.race([
      supabase.auth.getSession(),
      new Promise((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
    ]);
    token = res?.data?.session?.access_token || null;
  } catch {}
  if (!token) token = storedAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
