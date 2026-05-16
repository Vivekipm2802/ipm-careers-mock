// ============================================================
// Login Page — Phase 2 redesign
// All original logic preserved (signup, signin, Google, forgot
// password, password recovery, validation, role routing). Only
// the JSX layout and styling are rebuilt to match the design
// system: two-pane card, refined typography, light + dark mode.
// ============================================================

import Notifications from "@/components/Notification";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "./Login.module.css";
import {
  Spinner,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalContent,
  ModalBody,
} from "@nextui-org/react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNMNContext } from "@/components/NMNContext";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [notificationText, setNotificationText] = useState();
  const [fpModal, setFPModal] = useState(false);
  const [fpData, setFPData] = useState();
  const [fpUpdate, setFPUpdate] = useState();
  const [passwordModal, setPasswordModal] = useState(false);
  const router = useRouter();
  const { setUserDetails } = useNMNContext();

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  function validateIndianPhoneNumber(phone) {
    const regex = /^(?:\+91)?[6-9]\d{9}$/;
    return regex.test(phone);
  }

  // ── Google Sign-In ──
  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) {
      toast.error("Google Sign-In failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  // ── Auth state change — Google callback + password recovery ──
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setPasswordModal(true);
          return;
        }
        if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;
          const isGoogleProvider = user.app_metadata?.provider === "google";
          if (!isGoogleProvider) return;

          setUserDetails(user);
          try {
            const adminRes = await axios.post("/api/isAdmin", { email: user.email });
            if (adminRes.data.success === true) { router.push("/admin"); return; }
          } catch (_) {}
          router.push(router.query.redirectTo ?? "/");
          toast.success("Logged in with Google!");
        }
      }
    );
    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);

  // ── Sign Up ──
  async function handleSignUp() {
    if (!formData) { toast.error("Please fill in the form"); return null; }
    if (!formData.fullname) { toast.error("Please enter your full name"); return null; }
    if (!formData.email || !validateEmail(formData.email)) { toast.error("Please enter a valid email"); return null; }
    if (!formData.password || formData.password.length < 8) { toast.error("Password must be at least 8 characters"); return null; }
    if (!formData.city) { toast.error("Please enter your city"); return null; }
    if (!formData.phone || !validateIndianPhoneNumber(formData.phone)) { toast.error("Please enter a valid Indian phone number"); return null; }

    const r = toast.loading("Creating your account…");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullname,
          city: formData.city,
          phone: formData.phone,
          role: "user",
        },
      },
    });

    if (data) {
      if (data?.user?.email_confirmed_at != undefined) {
        toast.success("Account created. You can sign in now.");
        setLoading(false);
        toast.remove(r);
        setIsSignUp(false);
        return null;
      }
      setLoading(false);
      toast.remove(r);
      toast.success("Confirmation email sent — check your inbox.");
      setIsSignUp(false);
    } else if (error) {
      setLoading(false);
      toast.remove(r);
      toast.error(error.status == 400 ? "An account with this email already exists" : error.message);
    } else {
      setLoading(false);
    }
  }

  // ── Sign In ──
  async function handleSignIn() {
    if (!formData) { toast.error("Please enter your details"); return null; }
    if (!formData?.email) { toast.error("Please enter your email"); return null; }
    if (!formData?.password) { toast.error("Please enter your password"); return null; }

    setLoading(true);
    const cleanEmail = formData.email.toLowerCase().trim();
    const { data, error } = await supabase.auth.signInWithPassword(
      { email: cleanEmail, password: formData.password },
      { redirectTo: router.query.redirectTo ?? "/" }
    );

    if (data && data.user && data.session) {
      setUserDetails(data.user);
      const userRole = await getRole(data.user.email);
      if (userRole === "admin") { router.push("/admin"); }
      else { router.push(router.query.redirectTo ?? "/"); }
      toast.success("Welcome back.");
      setLoading(false);
    } else if (error) {
      toast.error("Incorrect email or password. If you recently joined, use Forgot Password to set yours.");
      setLoading(false);
    }
  }

  function Switch() {
    setIsChanging(true);
    setTimeout(() => {
      isSignUp ? setIsSignUp(false) : setIsSignUp(true);
      setIsChanging(false);
    }, 250);
  }

  useEffect(() => {
    if (router.query.s && router.query.s == 1) setIsSignUp(true);
    else if (router.query.s && router.query.s == 0) setIsSignUp(false);
  }, [router]);

  async function getUser() {
    const user = await supabase.auth.getUser();
    if (!user || !user.data?.user) return null;
    axios.post("/api/isAdmin", { email: user.data.user.email })
      .then((res) => {
        if (res.data.success == true) router.push("/admin");
        else router.push("/");
      })
      .catch(() => {});
  }
  useEffect(() => { getUser(); }, []);

  async function getRole(a) {
    const { data, error } = await supabase.rpc("get_user_role_by_email", { email_address: a });
    return data || null;
  }

  async function forgotPassword(a) {
    if (a == null || !validateEmail(a)) { toast.error("Please enter a valid email"); return null; }
    const r = toast.loading("Sending reset link…");
    try {
      const res = await axios.post("/api/resetPassword", { email: a });
      toast.remove(r);
      if (res.data.success) {
        toast.success("Reset link sent. Check inbox and spam folder.");
        setFPModal(false);
      } else {
        toast.error(res.data.message || "Unable to send reset link");
      }
    } catch (err) {
      toast.remove(r);
      toast.error("Unable to send reset link. Please try again.");
    }
  }

  async function updatePassword(a) {
    if (a == undefined || a?.length < 8) {
      toast.error("Password must be at least 8 characters");
      return null;
    }
    const { data, error } = await supabase.auth.updateUser({ password: a });
    if (data) { toast.success("Password updated. You can now sign in."); setPasswordModal(false); }
    if (error) { toast.error("Error updating password"); }
  }

  // ── Render ──
  return (
    <>
      <div className={styles.page}>
        {notificationText && notificationText.length > 2 ? (
          <Notifications text={notificationText} />
        ) : ""}

        {/* Password Recovery Modal */}
        <Modal
          placement="center"
          className="overflow-hidden"
          isOpen={passwordModal}
          backdrop="opaque"
          onClose={() => setPasswordModal(false)}
          isDismissable={false}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
                    Set a new password
                  </h2>
                </ModalHeader>
                <ModalBody>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    onChange={(e) => setFPUpdate(e.target.value)}
                    className={styles.input}
                  />
                </ModalBody>
                <ModalFooter>
                  <button className={styles.googleBtn} style={{ width: "auto", padding: "0 20px" }} onPress={() => setPasswordModal(false)} onClick={() => setPasswordModal(false)}>
                    Cancel
                  </button>
                  <button className={styles.primaryBtn} style={{ width: "auto", padding: "0 22px" }} onClick={() => updatePassword(fpUpdate)}>
                    Update password
                  </button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Forgot Password Modal */}
        <Modal
          placement="center"
          className="overflow-hidden"
          isOpen={fpModal}
          backdrop="opaque"
          onClose={() => setFPModal(false)}
          isDismissable={false}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
                      Reset your password
                    </h2>
                    <p style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 4 }}>
                      Enter the email you signed up with — we'll send you a reset link.
                    </p>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    onChange={(e) => setFPData(e.target.value)}
                    className={styles.input}
                  />
                </ModalBody>
                <ModalFooter>
                  <button className={styles.googleBtn} style={{ width: "auto", padding: "0 20px" }} onClick={() => setFPModal(false)}>
                    Cancel
                  </button>
                  <button className={styles.primaryBtn} style={{ width: "auto", padding: "0 22px" }} onClick={() => forgotPassword(fpData)}>
                    Send reset link
                  </button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* The card */}
        <div className={styles.card}>

          {/* LEFT — Form */}
          <div className={styles.formPane}>
            <img className={styles.logo} src="/newlog.svg" alt="IPM Careers" />

            <div className={styles.form + " " + (isChanging ? styles.formHidden : "")}>
              <h1 className={styles.heading}>
                {isSignUp ? (
                  <>Create your <span className={styles.headingAccent}>account.</span></>
                ) : (
                  <>Welcome <span className={styles.headingAccent}>back.</span></>
                )}
              </h1>
              <p className={styles.sub}>
                {isSignUp
                  ? "Join thousands of students preparing for IPMAT with India's #1 coaching."
                  : "Sign in to continue to your study panel."}
              </p>

              {/* Sign Up only fields */}
              {isSignUp && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Full name</label>
                  <input
                    name="name"
                    autoComplete="name"
                    className={styles.input}
                    placeholder="Riya Sharma"
                    type="text"
                    value={(formData && formData.fullname) || ""}
                    onChange={(e) => setFormData((r) => ({ ...r, fullname: e.target.value }))}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Email</label>
                <input
                  name="email"
                  autoComplete="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  type="text"
                  value={(formData && formData.email) || ""}
                  onChange={(e) => setFormData((r) => ({ ...r, email: e.target.value }))}
                />
              </div>

              {isSignUp && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Phone number</label>
                  <input
                    name="phone"
                    autoComplete="tel"
                    className={styles.input}
                    placeholder="10-digit Indian mobile"
                    type="text"
                    maxLength={10}
                    value={(formData && formData.phone) || ""}
                    onChange={(e) => setFormData((r) => ({ ...r, phone: e.target.value }))}
                  />
                </div>
              )}

              {isSignUp && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>City</label>
                  <input
                    name="city"
                    autoComplete="address-level2"
                    className={styles.input}
                    placeholder="Indore"
                    type="text"
                    value={(formData && formData.city) || ""}
                    onChange={(e) => setFormData((r) => ({ ...r, city: e.target.value }))}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    name="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className={styles.input}
                    placeholder={isSignUp ? "At least 8 characters" : "Your password"}
                    type={isPasswordVisible ? "text" : "password"}
                    value={(formData && formData.password) || ""}
                    onChange={(e) => setFormData((r) => ({ ...r, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setIsPasswordVisible((v) => !v)}
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <button type="button" className={styles.forgotLink} onClick={() => setFPModal(true)}>
                  Forgot password?
                </button>
              )}

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => (isSignUp ? handleSignUp() : handleSignIn())}
                disabled={loading}
              >
                {isSignUp ? "Create account" : "Sign in"}
                {loading ? <Spinner size="sm" color="default" /> : <ArrowRight size={16} />}
              </button>

              {!isSignUp && (
                <>
                  <div className={styles.divider}>
                    <span className={styles.dividerLine}></span>
                    <span className={styles.dividerText}>or</span>
                    <span className={styles.dividerLine}></span>
                  </div>

                  <button
                    type="button"
                    className={styles.googleBtn}
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <Spinner size="sm" color="default" />
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                          <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.3C29.4 35.3 26.8 36 24 36c-5.2 0-9.6-3.2-11.3-7.8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
                          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.3 5.3C41 35.5 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>
                </>
              )}

              <div className={styles.toggleRow}>
                {isSignUp ? "Already have an account?" : "New to IPM Careers?"}
                <span className={styles.toggleLink} onClick={Switch}>
                  {isSignUp ? "Sign in" : "Create an account"}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — Visual */}
          <div className={styles.visualPane}>
            <div>
              <div className={styles.eyebrow}>From the makers of AIR 1</div>
              <div className={styles.quote}>
                "IPM Careers turned every weakness I had into a <span className={styles.quoteHighlight}>strength.</span> The clarity in their approach is what got me to All India Rank 1."
              </div>
              <div className={styles.attribution}>
                <strong>Nikhilesh Sanka</strong>
                IPMAT 2025 · All India Rank 1
              </div>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>1,000+</div>
                <div className={styles.statLabel}>students placed in IIMs</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>10+ yrs</div>
                <div className={styles.statLabel}>perfecting the IPMAT blueprint</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
