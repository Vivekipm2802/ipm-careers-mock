import { supabase } from '@/utils/supabaseClient';
import { useEffect, useState } from 'react';


export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = supabase.auth.getSession();

    if (session) {
      setUser(session.user);
    } else {
      setUser(null);
    }
  }, []);

  return user;
}
