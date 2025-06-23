import { createClient } from "@supabase/supabase-js";




export default async function handleRequest(req,res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
    { cookies: () => req.headers.get("cookie") || "" }
  );

  
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log(user,error)
  if (error) {
    return res.send(user)
  }

  return res.json({ user });
}
