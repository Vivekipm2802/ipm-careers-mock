import { createClient } from "@supabase/supabase-js";

export default async function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return res.status(401).json({ success: false, message: 'Authentication failed', error: error.message });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error in checkUser:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
