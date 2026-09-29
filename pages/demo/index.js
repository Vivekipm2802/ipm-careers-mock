// ============================================================
// /demo — thin gateway to the demo experience (2026-09).
//
// The old 3,400-line fork of the portal that lived here rotted
// (old test layout, blank DSB/vault/progress — owner audit, Sep
// 2026) and is retired. The demo experience is now the REAL
// portal signed in as the demo account (see lib/demo.js):
//   · logged in already → straight to the portal ("/"), where
//     NMNContext flags demo mode by email (banner, upsell gates)
//   · not logged in → /login with a return here, so counsellors
//     sign into the demo account once and land in the portal
// Every future portal feature reaches the demo automatically —
// nothing to keep in sync ever again.
// ============================================================

import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";
import Loader from "@/components/Loader";

export default function DemoGateway() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data?.user?.email) router.replace("/");
        else router.replace("/login?redirectTo=/demo");
      } catch (e) {
        if (!cancelled) router.replace("/login?redirectTo=/demo");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Loader />
      <p style={{ marginTop: 12, color: "var(--c-text-tertiary)", fontSize: 14 }}>Opening the demo portal…</p>
    </div>
  );
}
