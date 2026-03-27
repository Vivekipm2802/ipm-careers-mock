import { serversupabase } from "@/utils/supabaseClient";
import { requireAdmin } from "@/lib/apiAuth";

const MIN_PASSWORD_LENGTH = 6; // Supabase minimum

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Admin-only endpoint
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ message: 'Unauthorized – admin access required' });
  }

  const { userdata } = req.body;

  if (!Array.isArray(userdata) || userdata.length === 0) {
    return res.status(400).json({ message: 'Invalid users data' });
  }

  const responses = [];
  const errors = [];

  try {
    for (const rawUser of userdata) {
      const email = (rawUser.email || '').trim().toLowerCase();
      const password = (rawUser.password || '').trim();

      // --- Validate email ---
      if (!email) {
        errors.push({ email: email || '(empty)', error: 'Email is required' });
        continue;
      }

      // --- Validate password ---
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        errors.push({
          email,
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters. Got ${password.length}.`,
        });
        continue;
      }

      // --- Build the user object for Supabase ---
      const userPayload = {
        email,
        password,
        email_confirm: true, // Always auto-confirm admin-created users
        user_metadata: rawUser.user_metadata || {},
      };

      // Trim metadata strings
      if (userPayload.user_metadata) {
        for (const [k, v] of Object.entries(userPayload.user_metadata)) {
          if (typeof v === 'string') userPayload.user_metadata[k] = v.trim();
        }
      }

      const { data, error } = await serversupabase.auth.admin.createUser(userPayload);

      if (error) {
        let errorMessage = error.message;

        if (error.status === 400 && error.message.includes('User already exists')) {
          errorMessage = `Email ${email} already exists.`;
        }

        errors.push({ email, error: errorMessage });
      } else {
        responses.push(data);
      }
    }

    if (errors.length > 0 && responses.length === 0) {
      return res.status(500).json({ message: 'All users failed to create', errors });
    }

    if (errors.length > 0) {
      return res.status(207).json({
        message: 'Some users could not be created',
        errors,
        responses,
      });
    }

    res.status(200).json({ message: 'Users created successfully', responses });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
