import { supabase } from "@/utils/supabaseClient";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * Auth gate component used by both admin and student pages.
 *
 * Props:
 *   type – "admin" | "user" (default "user")
 *
 * When type="admin": verifies user is logged in AND is an admin.
 *                    Redirects non-admins to "/".
 * When type="user":  only verifies user is logged in.
 *                    Redirects unauthenticated users to "/login".
 */
function IsAdminCheck(props) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const requireAdmin = props.type === "admin";

  useEffect(() => {
    async function verify() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // For regular users, just being logged in is enough
        if (!requireAdmin) {
          setVerified(true);
          return;
        }

        // For admin pages, also check admin status
        const res = await axios.post("/api/isAdmin", { email: user.email });

        if (res.data.success) {
          setVerified(true);
        } else {
          router.push("/");
        }
      } catch {
        router.push("/login");
      }
    }

    verify();
  }, [router, requireAdmin]);

  if (!verified) return null;

  return props.children;
}

export default IsAdminCheck;
