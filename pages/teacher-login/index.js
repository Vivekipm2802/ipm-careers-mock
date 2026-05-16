// ============================================================
// Teacher Login — Phase 2 (final), centered single-card design.
// All teacher auth logic preserved (role check, redirect, etc.)
// ============================================================

import Notifications from "@/components/Notification";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "./Login.module.css";
import { Spinner, Modal, ModalBody, ModalContent, ModalHeader, ModalFooter } from "@nextui-org/react";
import axios from "axios";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

function TeacherLogin() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [notificationText, setNotificationText] = useState();
  const [fpModal, setFPModal] = useState(false);
  const [fpData, setFPData] = useState();
  const [fpUpdate, setFPUpdate] = useState();
  const [passwordModal, setPasswordModal] = useState(false);
  const router = useRouter();

  function setNotification(de) {
    setNotificationText(de);
    setTimeout(() => { setNotificationText(); }, 2500);
  }
  function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

  async function getRole(a) {
    const { data } = await supabase.rpc("get_user_role_by_email", { email_address: a });
    return data || null;
  }

  async function handleSignUp() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.fullname, role: "teacher", city: formData.city, phone: formData.phone } },
    });
    if (data) { setLoading(false); setNotification("Confirmation email sent"); setIsSignUp(false); }
    else if (error) {
      setLoading(false);
      if (error.status == 400) setNotification("User already registered");
      else setNotification(error.message);
    } else { setLoading(false); }
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
    const { data } = await supabase.auth.getUser();
    if (data && data?.user != undefined) {
      const role = await getRole(data?.user?.email);
      if (role == "teacher") router.push("/teacher");
      if (role == "user") router.push("/");
    }
    if (!data || data?.user == undefined) return null;
  }
  useEffect(() => { getUser(); }, []);

  async function handleSignIn() {
    if (formData == undefined) { setNotification("Please enter your details"); return null; }
    if (formData?.email == undefined) { setNotification("Please enter your email"); return null; }
    if (formData?.password == undefined) { setNotification("Please enter your password"); return null; }
    if ((await getRole(formData?.email)) != "teacher") {
      setNotification("This account isn't registered as a teacher");
      return null;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(
      { email: formData.email, password: formData.password },
      { redirectTo: "/" }
    );
    if (data && data.user && data.session) {
      if (router.query.redirect_to != undefined) router.push(router.query.redirect_to);
      else router.push("/teacher");
      setNotification("Welcome back"); setLoading(false);
    } else if (error) { setNotification(error.message); setLoading(false); }
  }

  async function forgotPassword(a) {
    if (a == null || !validateEmail(a)) { setNotification("Please enter a valid email"); return null; }
    try {
      const res = await axios.post("/api/resetPassword", { email: a });
      if (res.data.success) { setNotification("Reset link sent. Check your inbox."); setFPModal(false); }
      else setNotification(res.data.message || "Unable to send reset link");
    } catch (err) { setNotification("Unable to send reset link. Try again."); }
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") setPasswordModal(true);
    });
  }, []);

  async function updatePassword(a) {
    if (a == undefined || a?.length < 8) { setNotification("Password must be at least 8 characters"); return null; }
    const { data, error } = await supabase.auth.updateUser({ password: a });
    if (data) { setNotification("Password updated. Sign in now."); setPasswordModal(false); }
    if (error) setNotification("Error updating password");
  }

  return (
    <>
      <div className={styles.page}>
        {notificationText && notificationText.length > 2 ? <Notifications text={notificationText} /> : ""}

        <Modal placement="center" isOpen={passwordModal} backdrop="opaque" onClose={() => setPasswordModal(false)} isDismissable={false}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>Set a new password</h2>
                </ModalHeader>
                <ModalBody>
                  <input type="password" placeholder="At least 8 characters" onChange={(e) => setFPUpdate(e.target.value)} className={styles.input} />
                </ModalBody>
                <ModalFooter>
                  <button className={styles.primaryBtn} style={{ width: "auto", padding: "0 22px", height: 42, marginTop: 0 }} onClick={() => updatePassword(fpUpdate)}>Update password</button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <Modal placement="center" isOpen={fpModal} backdrop="opaque" onClose={() => setFPModal(false)} isDismissable={false}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>Reset your password</h2>
                    <p style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 4 }}>Enter your email and we'll send you a reset link.</p>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <input type="email" placeholder="you@example.com" onChange={(e) => setFPData(e.target.value)} className={styles.input} />
                </ModalBody>
                <ModalFooter>
                  <button className={styles.primaryBtn} style={{ width: "auto", padding: "0 22px", height: 42, marginTop: 0 }} onClick={() => forgotPassword(fpData)}>Send reset link</button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <div className={styles.wrap}>
          <div className={`${styles.card} ${!isSignUp ? styles.cardCompact : ""}`}>
            <img className={styles.logo} src="/newlog.svg" alt="IPM Careers" />

            <div className={styles.formArea + " " + (isChanging ? styles.formHidden : "")}>
              <div className={styles.eyebrow}>{isSignUp ? "Teacher signup" : "Teacher sign in"}</div>
              <h1 className={styles.heading}>
                {isSignUp ? (
                  <>Join as a <span className={styles.headingAccent}>teacher.</span></>
                ) : (
                  <>Welcome <span className={styles.headingAccent}>back.</span></>
                )}
              </h1>
              <p className={styles.sub}>
                {isSignUp
                  ? "Set up your teacher account to start running classes."
                  : "Sign in to your teacher dashboard."}
              </p>

              <div className={styles.form}>
                {isSignUp && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Full name</label>
                    <input
                      name="name" className={styles.input} placeholder="Your name" type="text"
                      value={(formData && formData.fullname) || ""}
                      onChange={(e) => setFormData((r) => ({ ...r, fullname: e.target.value }))}
                    />
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Email</label>
                  <input
                    name="email" autoComplete="email" className={styles.input}
                    placeholder="you@example.com" type="text"
                    value={(formData && formData.email) || ""}
                    onChange={(e) => setFormData((r) => ({ ...r, email: e.target.value }))}
                  />
                </div>

                {isSignUp && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Phone number</label>
                    <input
                      name="phone" className={styles.input}
                      placeholder="10-digit Indian mobile" type="text" maxLength={10}
                      value={(formData && formData.phone) || ""}
                      onChange={(e) => setFormData((r) => ({ ...r, phone: e.target.value }))}
                    />
                  </div>
                )}

                {isSignUp && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>City</label>
                    <input
                      name="city" className={styles.input} placeholder="Indore" type="text"
                      value={(formData && formData.city) || ""}
                      onChange={(e) => setFormData((r) => ({ ...r, city: e.target.value }))}
                    />
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Password</label>
                  <div className={styles.passwordWrap}>
                    <input
                      name="password" className={styles.input}
                      placeholder={isSignUp ? "At least 8 characters" : "Your password"}
                      type={isPasswordVisible ? "text" : "password"}
                      value={(formData && formData.password) || ""}
                      onChange={(e) => setFormData((r) => ({ ...r, password: e.target.value }))}
                    />
                    <button
                      type="button" className={styles.passwordToggle}
                      onClick={() => setIsPasswordVisible((v) => !v)}
                      aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <button type="button" className={styles.forgot} onClick={() => setFPModal(true)}>
                    Forgot password?
                  </button>
                )}

                <button
                  type="button" className={styles.primaryBtn}
                  onClick={() => (isSignUp ? handleSignUp() : handleSignIn())}
                  disabled={loading}
                >
                  {isSignUp ? "Create teacher account" : "Sign in"}
                  {loading ? <Spinner size="sm" color="default" /> : <ArrowRight size={16} />}
                </button>
              </div>

              <div className={styles.toggleRow}>
                {isSignUp ? "Already have a teacher account?" : "New here as a teacher?"}
                <span className={styles.toggleLink} onClick={Switch}>
                  {isSignUp ? "Sign in" : "Create account"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.modeToggle}>
            <button
              type="button"
              className={!isSignUp ? styles.active : ""}
              onClick={() => { if (isSignUp) Switch(); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={isSignUp ? styles.active : ""}
              onClick={() => { if (!isSignUp) Switch(); }}
            >
              Sign up
            </button>
          </div>

          <div className={styles.footnote}>
            <span>From the makers of AIR 1</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default TeacherLogin;
