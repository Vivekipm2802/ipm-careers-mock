/**
 * Ship 5 — Edge-runtime-safe auth helpers (pure fetch, no Node SDK).
 * Mirrors lib/apiAuth.js semantics: user_roles table first, ADMIN_EMAILS fallback.
 */

export async function getEdgeUser(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || null;
    if (!token) return null;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !anon) return null;
    const r = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function isEdgeAdmin(email) {
  if (!email) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (base && key) {
    try {
      const r = await fetch(
        `${base}/rest/v1/user_roles?select=role&email=eq.${encodeURIComponent(
          email.toLowerCase(),
        )}&role=eq.admin&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length > 0) return true;
      }
    } catch {
      /* fall through to env check */
    }
  }
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** Valid signed-in admin, or null. */
export async function requireEdgeAdmin(req) {
  const user = await getEdgeUser(req);
  if (!user?.email) return null;
  return (await isEdgeAdmin(user.email)) ? user : null;
}

/**
 * True only when the request carries the server-side CRON_SECRET.
 * A bare `x-vercel-cron` header is NOT trusted — external clients can set it.
 * (Vercel cron automatically sends Authorization: Bearer $CRON_SECRET.)
 */
export function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
