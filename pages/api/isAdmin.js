import { isAdminEmail } from '@/lib/apiAuth';

/**
 * POST /api/isAdmin
 * Body: { email: "user@example.com" }
 *
 * Checks whether the given email is an admin.
 * Strategy: DB (user_roles table) first → ADMIN_EMAILS env var fallback.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // isAdminEmail is now async — checks DB first, falls back to env var
    const admin = await isAdminEmail(email);

    if (admin) {
      return res.status(200).json({ success: true, message: 'Email found in the array' });
    } else {
      return res.status(200).json({ success: false, message: 'Email not found in the array' });
    }
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
