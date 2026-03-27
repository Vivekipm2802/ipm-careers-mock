import { requireAdmin } from '@/lib/apiAuth';
import { serversupabase } from '@/utils/supabaseClient';

/**
 * POST /api/setup-roles
 *
 * One-time setup endpoint: creates the `user_roles` table and seeds it
 * with the current ADMIN_EMAILS from the environment variable.
 *
 * Protected: only existing admins can call this.
 *
 * After running once successfully, this endpoint becomes a no-op
 * (it checks whether the table already exists before creating it).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // --- Auth guard: only admins can set up the roles table ---
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized – admin access required',
    });
  }

  try {
    // Step 1: Check if the table already exists by trying a simple query
    const { error: probeError } = await serversupabase
      .from('user_roles')
      .select('id')
      .limit(1);

    const tableExists =
      !probeError ||
      (!probeError.message?.includes('does not exist') &&
        probeError.code !== '42P01');

    if (tableExists && !probeError) {
      // Table already exists — just seed any missing admin emails
      const seeded = await seedAdminEmails();
      return res.status(200).json({
        success: true,
        message: 'Table already exists. Seeded any missing admin emails.',
        seeded,
      });
    }

    // Step 2: Create the table via Supabase SQL (using the REST SQL endpoint)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'user',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (email, role)
      );

      -- Enable RLS (the service-role key bypasses it, but good practice)
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

      -- Index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_user_roles_email_role
        ON public.user_roles (email, role);

      -- Grant select to anon/authenticated so RLS policies can be added later
      GRANT SELECT ON public.user_roles TO anon, authenticated;
    `;

    // Use Supabase's /rest/v1/rpc endpoint won't work for DDL,
    // so we use the pg-meta SQL endpoint instead
    const sqlRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ query: createTableSQL }),
    });

    if (!sqlRes.ok) {
      // Fallback: try the older /rest/v1/rpc/exec_sql if pg/query doesn't exist
      // This is for older Supabase versions
      const errText = await sqlRes.text();
      return res.status(500).json({
        success: false,
        message: 'Failed to create table via SQL endpoint. You may need to create it manually in the Supabase SQL Editor.',
        error: errText,
        sql: createTableSQL.trim(),
      });
    }

    // Step 3: Seed ADMIN_EMAILS into the new table
    const seeded = await seedAdminEmails();

    return res.status(200).json({
      success: true,
      message: 'user_roles table created and admin emails seeded successfully.',
      seeded,
    });
  } catch (error) {
    console.error('Error in setup-roles:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

/**
 * Seeds the user_roles table with admin emails from ADMIN_EMAILS env var.
 * Uses upsert so it's safe to call multiple times.
 */
async function seedAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return [];

  const rows = emails.map((email) => ({ email, role: 'admin' }));

  const { data, error } = await serversupabase
    .from('user_roles')
    .upsert(rows, { onConflict: 'email,role', ignoreDuplicates: true })
    .select();

  if (error) {
    console.error('Error seeding admin emails:', error);
    return [];
  }

  return data || [];
}
