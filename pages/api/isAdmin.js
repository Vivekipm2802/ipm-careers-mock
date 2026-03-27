
/**
 * Admin emails are read from the ADMIN_EMAILS environment variable.
 * Set it as a comma-separated list, e.g.:
 *   ADMIN_EMAILS=rishabhsingh0363@gmail.com,ipmcareeronline@gmail.com
 */
function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim()).filter(Boolean);
}

export default (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const storedEmails = getAdminEmails();

    if (storedEmails.includes(email)) {
      return res.status(200).json({ success: true, message: 'Email found in the array' });
    } else {
      return res.status(200).json({ success: false, message: 'Email not found in the array' });
    }
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}; 
 