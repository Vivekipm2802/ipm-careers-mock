// ============================================================
// WelcomeScreen — Phase 20.1
// ============================================================
// Replaces the old phone-mockup + 4-button welcome block in pages/index.js
// for newly-signed-up users without an active course.
//
// One primary path: Access free panel → /demo
// One secondary path: Browse all courses → ipmcareer.com/courses
// Sign out demoted to a small text link below the cards.
//
// Use:
//   import WelcomeScreen from "@/components/WelcomeScreen";
//   ...
//   if (userCourses?.length === 0) {
//     return <WelcomeScreen />;
//   }
// ============================================================

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "@/utils/supabaseClient";
import { useNMNContext } from "@/components/NMNContext";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

const serifStyle = {
  fontFamily: "'Instrument Serif', serif",
  fontStyle: "italic",
  fontWeight: 400,
  color: "var(--c-brand-primary)",
};

export default function WelcomeScreen() {
  const router = useRouter();
  const ctx = useNMNContext();
  const userDetails = ctx?.userDetails;

  const firstName = useMemo(() => {
    const full = userDetails?.user_metadata?.full_name || "";
    return full.split(" ")[0] || "there";
  }, [userDetails]);

  const email = userDetails?.email || "";

  async function handleSignOut(e) {
    e?.preventDefault();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Failed to sign out");
        return;
      }
      router.reload();
    } catch (_err) {
      toast.error("Something went wrong");
    }
  }

  return (
    <>
      <Head>
        <title>Welcome — IPM Careers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </Head>

      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          width: "100%",
          background: "var(--c-bg)",
          color: "var(--c-text-primary)",
          fontFamily: FONT,
          overflowX: "hidden",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // Phase 20.1 Ship B.1: flex-start (was: center). With center the
          // top of the page (logo) was clipped when content was taller than
          // the viewport. flex-start + top padding keeps the logo on-screen.
          justifyContent: "flex-start",
          padding: "48px 24px 40px",
        }}
      >
        {/* Phase 20.1 Ship B.1: theme toggle (top-right) */}
        <ThemeToggleButton />


        {/* Decorative blob behind hero */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, var(--c-brand-glow, rgba(217,119,6,0.16)), transparent 65%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 760,
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <img
            src="/newlog.svg"
            alt="IPM Careers"
            className="welcome-logo"
            style={{
              height: 72,
              width: "auto",
              display: "block",
              margin: "0 auto 30px",
            }}
          />

          {/* Signed-in pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 500,
              letterSpacing: "0.06em",
              color: "var(--c-text-secondary)",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.20)",
              }}
            />
            You're signed in {email ? `· ${email}` : ""}
          </span>

          {/* Hero headline */}
          <h1
            style={{
              margin: "0 0 14px",
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: "-0.028em",
              lineHeight: 1.05,
            }}
            className="welcome-hero"
          >
            Welcome, {firstName}.<br />
            Let's pick your <span style={serifStyle}>starting point</span>.
          </h1>

          {/* Lead copy */}
          <p
            style={{
              margin: "0 auto 40px",
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--c-text-secondary)",
              maxWidth: "56ch",
            }}
          >
            You don't have an active course yet — that's totally fine. Try
            the full prep dashboard for free, or browse our IPMAT batches.
          </p>

          {/* Primary CTA card */}
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 20,
              padding: "28px 32px 28px",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              marginBottom: 16,
              boxShadow: "0 24px 48px -28px rgba(217,119,6,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap",
              }}
              className="welcome-prim-row"
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--c-brand-primary)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  ★ Recommended for you
                </div>
                <h2
                  style={{
                    margin: "0 0 8px",
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: "-0.018em",
                    lineHeight: 1.2,
                  }}
                >
                  Try the free demo
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    color: "var(--c-text-secondary)",
                    lineHeight: 1.5,
                    maxWidth: "44ch",
                  }}
                >
                  One full IPMAT mock, a video pack and a concept test —
                  same dashboard our enrolled students use. No payment, no
                  card.
                </p>
              </div>
              <Link
                href="/demo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 22px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "var(--c-brand-primary)",
                  color: "white",
                  textDecoration: "none",
                  boxShadow: "0 6px 18px -8px var(--c-brand-primary)",
                  whiteSpace: "nowrap",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 22px -10px var(--c-brand-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 18px -8px var(--c-brand-primary)";
                }}
              >
                Access free panel →
              </Link>
            </div>
          </div>

          {/* Secondary: Browse all courses */}
          <div style={{ marginBottom: 32 }}>
            <a
              href="https://ipmcareer.com/courses"
              style={{
                display: "block",
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 16,
                padding: "20px 22px 20px",
                textAlign: "left",
                textDecoration: "none",
                color: "var(--c-text-primary)",
                cursor: "pointer",
                transition: "transform 0.16s ease, border-color 0.16s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "var(--c-border-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--c-border-faint)";
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--c-brand-glow, rgba(217,119,6,0.16))",
                  color: "var(--c-brand-primary)",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 12,
                  fontSize: 16,
                }}
              >
                ↗
              </div>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: 15.5,
                  fontWeight: 600,
                  letterSpacing: "-0.012em",
                }}
              >
                Browse all courses
              </h3>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 12.5,
                  color: "var(--c-text-secondary)",
                  lineHeight: 1.45,
                }}
              >
                See every IPMAT batch — Indore, Rohtak, JIPMAT, crash &
                full-year. Pick one when you're ready.
              </p>
              <span
                style={{
                  color: "var(--c-text-primary)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderTop: "1px dashed var(--c-border-faint)",
                  paddingTop: 12,
                  display: "block",
                }}
              >
                View courses →
              </span>
            </a>
          </div>

          {/* Sign out */}
          <div
            style={{
              marginTop: 12,
              fontSize: 12.5,
              color: "var(--c-text-tertiary)",
            }}
          >
            Not your account?{" "}
            <a
              href="#"
              onClick={handleSignOut}
              style={{
                color: "var(--c-text-secondary)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                marginLeft: 6,
              }}
            >
              Sign out
            </a>
          </div>

          {/* Trust strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 22,
              flexWrap: "wrap",
              marginTop: 38,
              fontSize: 11.5,
              color: "var(--c-text-tertiary)",
              paddingTop: 22,
              borderTop: "1px solid var(--c-border-faint)",
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
              width: "100%",
            }}
          >
            <span>
              ★{" "}
              <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>
                4.8/5
              </b>{" "}
              · 600+ reviews
            </span>
            <span>
              👥{" "}
              <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>
                2,400+
              </b>{" "}
              students enrolled
            </span>
          </div>
        </div>

        {/* Phase 20.1 Ship B.2: dropped the dark-mode invert filter — it was
            flipping the logo's purple+amber colours into the wrong hues.
            The newlog.svg is left in its original colours in both modes. */}
        <style jsx global>{`
          @media (max-width: 720px) {
            .welcome-hero {
              font-size: 34px !important;
            }
            .welcome-prim-row {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .welcome-prim-row a {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </>
  );
}

// ============================================================
// ThemeToggleButton — Phase 20.1 Ship B.1
// Floating pill in the top-right that flips html[data-theme].
// Reads/writes localStorage so the choice sticks across visits.
// ============================================================
function ThemeToggleButton() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      window.localStorage.getItem("ipm-theme") ||
      document.documentElement.getAttribute("data-theme") ||
      "light";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem("ipm-theme", next);
      } catch (_e) {
        /* ignore */
      }
    }
  };

  return (
    <button
      onClick={flip}
      aria-label="Toggle theme"
      style={{
        position: "fixed",
        top: 16,
        right: 24,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 14px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        color: "var(--c-text-secondary)",
        cursor: "pointer",
        fontFamily: "inherit",
        zIndex: 50,
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      }}
    >
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>
        {theme === "dark" ? "☾" : "☼"}
      </span>
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}

// We need useState + useEffect imported at the top — they're already in the
// import list above (useMemo's siblings). Adding here as a doc reminder.
