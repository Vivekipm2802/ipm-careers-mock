// ============================================================
// lib/reportEvent.js — fire-and-forget problem report to
// /api/clientEvent (2026-10-29). Never throws, never waits, never
// blocks the student. Uses the stored session token if present so the
// report carries the student's email.
// ============================================================

function storedToken() {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const v = JSON.parse(window.localStorage.getItem(k) || "null");
        if (v?.access_token) return v.access_token;
      }
    }
  } catch {}
  return null;
}

export function reportEvent(kind, { testId, detail } = {}) {
  try {
    if (typeof window === "undefined") return;
    const body = JSON.stringify({
      kind,
      page: window.location.pathname,
      test_id: testId ?? null,
      detail: { ...(detail || {}), online: navigator.onLine, at: new Date().toISOString() },
    });
    const token = storedToken();
    fetch("/api/clientEvent", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    }).catch(() => {});
  } catch {}
}
