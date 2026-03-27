const { createClient } = require('@supabase/supabase-js');

/**
 * Verify the caller is authenticated by checking the Authorization header.
 * Returns the Supabase user object on success, or null on failure.
 *
 * Usage in any API route:
 *   const user = await getAuthUser(req);
 *   if (!user) return res.status(401).json({ error: 'Unauthorized' });
 */
async function getAuthUser(req) {
  try {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies?.['sb-access-token'] ||
      null;

    if (!token) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Check whether an email belongs to an admin.
 */
function isAdminEmail(email) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const adminEmails = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Convenience: verify the caller is both authenticated AND an admin.
 * Returns the user object if admin, null otherwise.
 */
async function requireAdmin(req) {
  const user = await getAuthUser(req);
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
}

module.exports = { getAuthUser, isAdminEmail, requireAdmin };
