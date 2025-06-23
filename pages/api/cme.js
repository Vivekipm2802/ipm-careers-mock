import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  const { emails } = req.body;

  
  if (!emails || emails.length === 0) {
    return res.status(400).json({ error: "No emails provided" });
  }

  const { data, error } = await serversupabase.rpc("cme", {
    email_list: emails,
  });

  console.log(data,error)

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const emailCheckResults = {};
  emails.forEach((email) => {
    emailCheckResults[email] = data?.includes(email) ? "exists" : "available";
  });

  res.status(200).json(emailCheckResults);
}
