import { serversupabase } from '@/utils/supabaseClient';
import { getTransporter, getFromAddress } from '@/lib/emailTransporter';
import { resetPasswordTemplate } from '@/templates/resetPasswordTemplate';

/**
 * POST /api/resetPassword
 * Body: { email: "user@example.com" }
 *
 * Generates a password-recovery link via Supabase Admin API
 * and sends it through the app's own SMTP (ZeptoMail),
 * bypassing Supabase's built-in email which has strict rate limits.
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

    const trimmedEmail = email.trim().toLowerCase();

    // Generate a recovery link using the Supabase Admin API.
    // This creates a one-time magic link that puts the user into
    // PASSWORD_RECOVERY state when they click it.
    const { data, error } = await serversupabase.auth.admin.generateLink({
      type: 'recovery',
      email: trimmedEmail,
      options: {
        redirectTo: 'https://study.ipmcareer.in/login',
      },
    });

    if (error) {
      // Don't reveal whether the email exists or not (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a reset link has been sent.',
      });
    }

    // The admin API returns the full action_link.
    // data.properties.action_link contains the recovery URL.
    const resetLink =
      data?.properties?.action_link ||
      data?.properties?.hashed_token;

    if (!resetLink) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a reset link has been sent.',
      });
    }

    // Send the email via ZeptoMail SMTP
    const transporter = getTransporter();
    const htmlContent = resetPasswordTemplate({
      email: trimmedEmail,
      resetLink,
    });

    await transporter.sendMail({
      from: getFromAddress(),
      to: trimmedEmail,
      subject: 'Reset your IPM Careers password',
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      message: 'If this email is registered, a reset link has been sent.',
    });
  } catch (error) {
    // Still return success to avoid revealing email existence
    return res.status(200).json({
      success: true,
      message: 'If this email is registered, a reset link has been sent.',
    });
  }
}
