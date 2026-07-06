import { getAuthUser, isAdminEmail } from '@/lib/apiAuth';

/**
 * POST /api/isAdmin
 * Auth: Authorization: Bearer <supabase access token> (required)
 *
 * Ship 5: previously this accepted ANY email in the body with no auth —
 * an open oracle for probing which emails are admins. Now the caller must
 * be authenticated and we check the TOKEN's email, never the body's.
 * Response shape ({ success }) unchanged for existing callers.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getAuthUser(req);
    if (!user?.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const admin = await isAdminEmail(user.email);
    return res.status(200).json({ success: !!admin });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
