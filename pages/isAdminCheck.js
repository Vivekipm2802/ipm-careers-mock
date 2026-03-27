import { supabase } from "@/utils/supabaseClient";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function IsAdminCheck(props) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

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
  }, [router]);

  if (!verified) return null;

  return props.children;
}

export default IsAdminCheck;
