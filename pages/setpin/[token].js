// ============================================================
// Set PIN page — Phase 2 redesign
// Token-based PIN setup for teachers. Logic preserved exactly.
// ============================================================

import Loader from "@/components/Loader";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

function setPIN({ isExpired }) {
  const [pin, setPIN] = useState();
  const [userData, setUserData] = useState();
  const [loading, setLoading] = useState(true);
  const [isTokenExpired, setTokenExpired] = useState(false);
  const inputRefs = useRef([]);
  const [isSet, setIsSet] = useState(false);
  const router = useRouter();

  async function getUserData() {
    const { data } = await supabase.auth.getUser();
    if (data && data.user != undefined) { setUserData(data.user); setLoading(false); }
    else { setUserData(undefined); setLoading(false); }
  }

  useEffect(() => {
    getUserData();
    setTokenExpired(isExpired);
  }, []);

  function getPin(pin) {
    return parseInt(Object.values(pin).join(""), 10) || 0;
  }

  async function setPINCode() {
    if (pin == undefined) { alert("Please enter a 4-digit PIN"); return null; }
    const final = getPin(pin);
    if (final == undefined || final?.toString().length !== 4) {
      alert("Please enter a 4-digit PIN");
      return null;
    }
    const { data, error } = await supabase.rpc("set_pin_hash", {
      pin_arg: final.toString(),
      email_arg: userData?.email,
    });
    if (data && data == "done") {
      setIsSet(true);
      setTimeout(() => { router.push("/teacher"); }, 1200);
    }
  }

  const handleInputChange = (index, e) => {
    const inputValue = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
    setPIN((prevPIN) => ({ ...prevPIN, ["p" + index]: inputValue }));
    const nextIndex = index + 1;
    if (nextIndex < inputRefs.current.length && inputValue) {
      inputRefs.current[nextIndex].focus();
    }
  };

  // Shared layout shell
  const Shell = ({ children }) => (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--c-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--c-surface)",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 24,
          boxShadow: "var(--c-shadow-lg)",
          padding: 40,
          textAlign: "center",
        }}
      >
        <img
          src="/newlog.svg"
          alt="IPM Careers"
          style={{ width: 120, height: "auto", margin: "0 auto 28px", display: "block" }}
        />
        {children}
      </div>
    </div>
  );

  if (isTokenExpired) {
    return (
      <Shell>
        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)", marginBottom: 8 }}>
          Link expired
        </h2>
        <p style={{ fontSize: 14, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
          This PIN setup link has already been used or has expired. Ask an admin to send a fresh one.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      {loading ? (
        <div style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader />
        </div>
      ) : userData != undefined ? (
        isSet ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)", marginBottom: 8 }}>
              PIN set successfully
            </h2>
            <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>
              Taking you to your dashboard…
            </p>
          </>
        ) : (
          <>
            <p style={{
              fontSize: 11, fontWeight: 500, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 4,
            }}>
              Hi, {userData?.user_metadata?.full_name}
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--c-text-primary)", marginBottom: 6 }}>
              Set your <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>4-digit PIN.</span>
            </h2>
            <p style={{ fontSize: 14, color: "var(--c-text-secondary)", lineHeight: 1.5, marginBottom: 28 }}>
              You'll use this PIN to verify yourself when starting a class.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>
              {Array(4).fill().map((item, index) => (
                <input
                  key={index}
                  maxLength={1}
                  value={pin?.["p" + index] || ""}
                  ref={(el) => (inputRefs.current[index] = el)}
                  onChange={(e) => handleInputChange(index, e)}
                  style={{
                    width: 56, height: 64,
                    textAlign: "center",
                    fontSize: 28, fontWeight: 600,
                    color: "var(--c-text-primary)",
                    background: "var(--c-surface)",
                    border: "1px solid var(--c-border-strong)",
                    borderRadius: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    letterSpacing: "-0.02em",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--c-brand-primary)";
                    e.target.style.boxShadow = "0 0 0 4px var(--c-brand-primary-tint)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--c-border-strong)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setPINCode()}
              style={{
                width: "100%", height: 46,
                background: "var(--c-brand-primary)",
                color: "var(--c-text-on-brand)",
                border: 0, borderRadius: 999,
                fontFamily: "inherit", fontSize: 15, fontWeight: 500,
                letterSpacing: "-0.01em", cursor: "pointer",
                boxShadow: "var(--c-shadow-sm)",
                transition: "all 0.18s ease",
              }}
              onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
            >
              Set PIN
            </button>
          </>
        )
      ) : (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)", marginBottom: 8 }}>
            You're not signed in
          </h2>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)", marginBottom: 28 }}>
            Sign in to your teacher account and try this link again.
          </p>
          <button
            onClick={() => router.push(`/teacher-login?redirect_to=${router.asPath}`)}
            style={{
              width: "100%", height: 46,
              background: "var(--c-brand-primary)",
              color: "var(--c-text-on-brand)",
              border: 0, borderRadius: 999,
              fontFamily: "inherit", fontSize: 15, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </>
      )}
    </Shell>
  );
}

export default setPIN;

export async function getServerSideProps(context) {
  const token = context?.query?.token;
  const { data, error } = await serversupabase
    .from("update_pin")
    .select("*")
    .match({ token: token })
    .is("pin_hash", null);

  return {
    props: {
      isExpired: data != undefined && data?.length > 0 ? false : true,
    },
  };
}
