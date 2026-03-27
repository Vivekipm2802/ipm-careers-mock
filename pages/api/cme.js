import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { emails } = req.body || {};

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'No emails provided. Expected a non-empty array.' });
    }

    const { data, error } = await serversupabase.rpc("cme", {
      email_list: emails,
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    const emailCheckResults = {};
    emails.forEach((email) => {
      emailCheckResults[email] = Array.isArray(data) && data.includes(email) ? "exists" : "available";
    });

    return res.status(200).json(emailCheckResults);
  } catch (error) {
    console.error('Error in cme:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
