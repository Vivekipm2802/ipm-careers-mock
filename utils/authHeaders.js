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
 */
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
