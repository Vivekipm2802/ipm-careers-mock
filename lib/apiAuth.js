const { createClient } = require('@supabase/supabase-js');

/**
 * Returns a Supabase client that uses the service-role key (bypasses RLS).
 * Shared across helpers so we don't recreate it on every call.
 */
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

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

    const supabase = getServiceClient();
    if (!supabase) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Check the `user_roles` table in Supabase for admin status.
 * Returns true if a row with role='admin' exists for this email.
 * Returns null (not true/false) if the table doesn't exist yet,
 * so the caller knows to fall back to ADMIN_EMAILS.
 */
async function isAdminInDB(email) {
  try {
    const supabase = getServiceClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email.toLowerCase())
      .eq('role', 'admin')
      .limit(1);

    // If the table doesn't exist, Supabase returns a 404-style error
    // with a message like "relation ... does not exist". Treat that
    // as "table not set up yet" and let caller fall back.
    if (error) {
      if (
        error.message?.includes('does not exist') ||
        error.code === '42P01'
      ) {
        return null; // table not created yet — use fallback
      }
      // Any other DB error — also fall back gracefully
      return null;
    }

    return data && data.length > 0;
  } catch {
    return null;
  }
}

/**
 * Check whether an email belongs to an admin via the ADMIN_EMAILS env var.
 * This is the fallback when the user_roles table doesn't exist yet.
 */
function isAdminByEnv(email) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const adminEmails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Check whether an email belongs to an admin.
 *
 * Strategy:
 *   1. Query user_roles table (database-driven, manageable via UI)
 *   2. If table doesn't exist yet → fall back to ADMIN_EMAILS env var
 *   3. If the DB says the user is NOT admin, still check ADMIN_EMAILS
 *      as a safety net so existing env-based admins don't lose access.
 */
async function isAdminEmail(email) {
  if (!email) return false;

  const dbResult = await isAdminInDB(email);

  // If DB returned true, they're an admin
  if (dbResult === true) return true;

  // If DB returned false (table exists, no row) or null (table missing),
  // fall back to env var check so existing admins keep working.
  return isAdminByEnv(email);
}

/**
 * Convenience: verify the caller is both authenticated AND an admin.
 * Returns the user object if admin, null otherwise.
 */
async function requireAdmin(req) {
  const user = await getAuthUser(req);
  if (!user) return null;
  const admin = await isAdminEmail(user.email);
  if (!admin) return null;
  return user;
}

module.exports = { getAuthUser, isAdminEmail, isAdminByEnv, isAdminInDB, requireAdmin };
