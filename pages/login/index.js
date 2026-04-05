// ============================================================
// UPDATED LOGIN PAGE — with Google Sign-In
// Updated on: 2026-04-05
// Changes made:
//   1. Added "Sign in with Google" button
//   2. Email is lowercased + trimmed before login (fixes case-sensitivity bug)
//   3. Google auth callback handled via onAuthStateChange (SIGNED_IN event)
//   4. Unenrolled Google users land on home page naturally (existing behaviour)
//   5. All original features (signup, forgot password, password reset) unchanged
// ============================================================

import Notifications from "@/components/Notification";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "./Login.module.css";
import {
  Button,
  Spacer,
  Spinner,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalContent,
  ModalBody,
  Input,
} from "@nextui-org/react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useNMNContext } from "@/components/NMNContext";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState();
  const [isPasswordVisible, setIsPasswordVisible] = useState();
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

  // ── Google Sign-In ──────────────────────────────────────────
  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      toast.error("Google Sign-In failed. Please try again.");
      setGoogleLoading(false);
    }
    // On success, Supabase redirects to Google → comes back to /login
    // The onAuthStateChange listener below handles the rest
  }

  // ── Auth state change — handles Google callback + password recovery ──
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setPasswordModal(true);
          return;
        }

        if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;

          // Only handle Google provider sign-ins here
          // (email/password sign-ins are handled in handleSignIn directly)
          const isGoogleProvider = user.app_metadata?.provider === "google";
          if (!isGoogleProvider) return;

          setUserDetails(user);

          // Check if admin
          try {
            const adminRes = await axios.post("/api/isAdmin", {
              email: user.email,
            });
            if (adminRes.data.success === true) {
              router.push("/admin");
              return;
            }
          } catch (_) {}

          // For all other users (enrolled or unenrolled), go to home.
          // The home page already handles unenrolled users by showing
          // the "Explore Courses / Redeem Code" screen — no extra logic needed.
          router.push(router.query.redirectTo ?? "/");
          toast.success("Logged in with Google!");
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // ── Sign Up ────────────────────────────────────────────────
  async function handleSignUp() {
    if (!formData) { toast.error("Empty Form"); return null; }
    if (!formData.fullname) { toast.error("Full Name must be a valid name."); return null; }
    if (!formData.email || !validateEmail(formData.email)) { toast.error("Empty or Invalid Email"); return null; }
    if (!formData.password || formData.password.length < 8) { toast.error("Password must be at least 8 characters."); return null; }
    if (!formData.city) { toast.error("Empty or Invalid City"); return null; }
    if (!formData.phone || !validateIndianPhoneNumber(formData.phone)) { toast.error("Empty or Invalid Indian Phone Number"); return null; }

    const r = toast.loading("Signing Up");
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
      if (data?.user?.email_confirmed_at != undefined ? true : false) {
        toast.success("Signed up successfully, You can Login Now");
        setLoading(false);
        toast.remove(r);
        setIsSignUp(false);
        return null;
      }
      setLoading(false);
      toast.remove(r);
      toast.success("Confirmation Email Sent");
      setIsSignUp(false);
    } else if (error) {
      setLoading(false);
      toast.remove(r);
      if (error.status == 400) {
        toast.error("User Already Registered");
      } else {
        toast.error(error.message);
      }
    } else {
      setLoading(false);
    }
  }

  // ── Sign In (email + password) ─────────────────────────────
  async function handleSignIn() {
    if (formData == undefined) { toast.error("Empty Login Details"); return null; }
    if (formData?.email == undefined) { toast.error("Email Empty or Invalid"); return null; }
    if (formData?.password == undefined) { toast.error("Password Empty or Invalid"); return null; }

    setLoading(true);

    // FIX: lowercase + trim email before sending to Supabase
    // This prevents "invalid credentials" errors caused by email case mismatch
    const cleanEmail = formData.email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword(
      { email: cleanEmail, password: formData.password },
      { redirectTo: router.query.redirectTo ?? "/" }
    );

    if (data && data.user && data.session) {
      setUserDetails(data.user);
      const userRole = await getRole(data.user.email);
      if (userRole === "admin") {
        router.push("/admin");
      } else {
        router.push(router.query.redirectTo ?? "/");
      }
      toast.success("Logged in Successfully");
      setLoading(false);
    } else if (error) {
      // FIX: More helpful error message instead of raw Supabase message
      toast.error(
        "Incorrect email or password. If you recently joined, use Forgot Password to set your password."
      );
      setLoading(false);
    }
  }

  function Switch() {
    setIsChanging(true);
    setTimeout(() => {
      isSignUp ? setIsSignUp(false) : setIsSignUp(true);
      setIsChanging(false);
    }, 500);
  }

  useEffect(() => {
    if (router.query.s && router.query.s == 1) { setIsSignUp(true); }
    else if (router.query.s && router.query.s == 0) { setIsSignUp(false); }
  }, [router]);

  async function getUser() {
    const user = await supabase.auth.getUser();
    if (!user || !user.data?.user) { return null; }
    axios
      .post("/api/isAdmin", { email: user.data.user.email })
      .then((res) => {
        if (res.data.success == true) { router.push("/admin"); }
        else { router.push("/"); }
      })
      .catch(() => {});
  }

  useEffect(() => { getUser(); }, []);

  async function getRole(a) {
    const { data, error } = await supabase.rpc("get_user_role_by_email", {
      email_address: a,
    });
    if (data) { return data; }
    else { return null; }
  }

  async function forgotPassword(a) {
    if (a == null || !validateEmail(a)) { toast.error("Email Empty or Invalid"); return null; }
    const r = toast.loading("Sending reset link...");
    try {
      const res = await axios.post("/api/resetPassword", { email: a });
      toast.remove(r);
      if (res.data.success) {
        toast.success("Reset link sent! Check your inbox and spam folder.");
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
      toast.error("Password must be at least 8 characters long");
      return null;
    }
    const { data, error } = await supabase.auth.updateUser({ password: a });
    if (data) { toast.success("Password updated! You can now log in."); setPasswordModal(false); }
    if (error) { toast.error("Error updating password"); }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <div className="w-full h-screen max-h-screen lg:p-0 p-6 bg-[#ddd] flex flex-col items-center justify-center overflow-hidden">
        {notificationText && notificationText.length > 2 ? (
          <Notifications text={notificationText} />
        ) : (
          ""
        )}

        {/* Password Recovery Modal */}
        <Modal
          placement="center"
          className="sf overflow-hidden"
          isOpen={passwordModal}
          backdrop="opaque"
          onClose={() => setPasswordModal(false)}
          isDismissable={false}
          classNames={{ backdrop: "opacity-10 bg-overlay/5" }}
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 justify-start items-start text-black">
                  <h2 className="text-black">Enter New Password</h2>
                </ModalHeader>
                <ModalBody>
                  <Input
                    label="New Password"
                    placeholder="Enter New Password"
                    onChange={(e) => setFPUpdate(e.target.value)}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="faded" onPress={() => setPasswordModal(false)}>
                    Cancel
                  </Button>
                  <Button color="primary" onPress={() => updatePassword(fpUpdate)}>
                    Update Password
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Forgot Password Modal */}
        <Modal
          placement="center"
          className="sf overflow-hidden"
          isOpen={fpModal}
          backdrop="opaque"
          onClose={() => setFPModal(false)}
          isDismissable={false}
          classNames={{ backdrop: "opacity-10 bg-overlay/5" }}
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 justify-start items-start text-black">
                  <h2 className="text-black">Enter your Email to Reset Password</h2>
                </ModalHeader>
                <ModalBody>
                  <Input
                    label="Your Email"
                    placeholder="Enter your Email"
                    onChange={(e) => setFPData(e.target.value)}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="faded" onPress={() => setFPModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="text-white bg-gradient-purple"
                    onPress={() => forgotPassword(fpData)}
                  >
                    Send Reset Link
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <div className={styles.bgfill}></div>

        <div className="w-full max-w-[1000px] z-10 relative shadow-lg border-1 bg-white border-white h-full max-h-[80vh] md:max-h-[95vh] overflow-hidden my-auto rounded-xl mx-auto flex flex-row justify-between">

          {/* Left Column — Form */}
          <div className={styles.col1 + " relative md:flex-1 flex-0 !w-full"}>
            <img
              className="relative w-[50vw] md:w-[20vw] mr-auto"
              width={100}
              src="/newlog.svg"
            />

            <div className={styles.form + " " + (isChanging ? styles.hid : "")}>
              <h2 className="!text-md" style={{ color: "var(--brand-col1)" }}>
                {isSignUp
                  ? "Create a new account to start learning on our panel"
                  : "Login to your account !"}
              </h2>
              <Spacer y={1} />

              {/* Sign Up only fields */}
              {isSignUp && (
                <input
                  name="name"
                  autoComplete="name"
                  className={styles.input}
                  placeholder="Enter your Full Name"
                  type="text"
                  value={formData && formData.fullname}
                  onChange={(e) =>
                    setFormData((res) => ({ ...res, fullname: e.target.value }))
                  }
                />
              )}

              <input
                name="email"
                autoComplete="email"
                className={styles.input}
                placeholder="Enter your Email Address"
                type="text"
                value={formData && formData.email}
                onChange={(e) =>
                  setFormData((res) => ({ ...res, email: e.target.value }))
                }
              />

              {isSignUp && (
                <input
                  name="phone"
                  autoComplete="phone"
                  className={styles.input}
                  placeholder="Enter your Phone Number"
                  type="text"
                  maxLength={10}
                  value={formData && formData.phone}
                  onChange={(e) =>
                    setFormData((res) => ({ ...res, phone: e.target.value }))
                  }
                />
              )}

              {isSignUp && (
                <input
                  name="city"
                  autoComplete="city"
                  className={styles.input}
                  placeholder="Enter your City"
                  type="text"
                  value={formData && formData.city}
                  onChange={(e) =>
                    setFormData((res) => ({ ...res, city: e.target.value }))
                  }
                />
              )}

              {/* Password field with show/hide toggle */}
              <div className={styles.password}>
                <div
                  className={styles.tog}
                  onClick={() => setIsPasswordVisible((v) => !v)}
                >
                  {!isPasswordVisible ? (
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 9.005a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 5.5c4.613 0 8.596 3.15 9.701 7.564a.75.75 0 1 1-1.455.365 8.503 8.503 0 0 0-16.493.004.75.75 0 0 1-1.455-.363A10.003 10.003 0 0 1 12 5.5Z" fill="#BDC3C8" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.22 2.22a.75.75 0 0 0-.073.976l.073.084 4.034 4.035a9.986 9.986 0 0 0-3.955 5.75.75.75 0 0 0 1.455.364 8.49 8.49 0 0 1 3.58-5.034l1.81 1.81A4 4 0 0 0 14.8 15.86l5.919 5.92a.75.75 0 0 0 1.133-.977l-.073-.084-6.113-6.114.001-.002-6.95-6.946.002-.002-1.133-1.13L3.28 2.22a.75.75 0 0 0-1.06 0ZM12 5.5c-1 0-1.97.148-2.889.425l1.237 1.236a8.503 8.503 0 0 1 9.899 6.272.75.75 0 0 0 1.455-.363A10.003 10.003 0 0 0 12 5.5Zm.195 3.51 3.801 3.8a4.003 4.003 0 0 0-3.801-3.8Z" fill="#BDC3C8" />
                    </svg>
                  )}
                </div>
                <input
                  name="password"
                  autoComplete="password"
                  className={styles.input}
                  placeholder="Enter Password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={formData && formData.password}
                  onChange={(e) =>
                    setFormData((res) => ({ ...res, password: e.target.value }))
                  }
                />
              </div>

              <Spacer y={1} />

              {/* Primary Sign In / Sign Up button */}
              <Button
                className="text-white gradient-purple bg-gradient-purple w-full"
                auto
                onClick={() => (isSignUp ? handleSignUp() : handleSignIn())}
              >
                {isSignUp ? "Sign Up" : "Sign In"}
                {loading && (
                  <>
                    <Spacer x={0.5} />
                    <Spinner size="sm" color="default" />
                  </>
                )}
              </Button>

              {/* ── OR divider ── */}
              {!isSignUp && (
                <>
                  <div className={styles.orDivider}>
                    <span className={styles.orLine}></span>
                    <span className={styles.orText}>or</span>
                    <span className={styles.orLine}></span>
                  </div>

                  {/* Google Sign-In Button */}
                  <button
                    className={styles.googleBtn}
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    type="button"
                  >
                    {googleLoading ? (
                      <Spinner size="sm" color="default" />
                    ) : (
                      <>
                        {/* Google "G" SVG icon */}
                        <svg
                          className={styles.googleIcon}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 48 48"
                          width="20px"
                          height="20px"
                        >
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

              {/* Forgot Password */}
              {!isSignUp && (
                <p
                  className="text-blue-500 text-sm my-2 cursor-pointer hover:text-blue-700"
                  onClick={() => setFPModal(true)}
                >
                  Forgot Password?
                </p>
              )}

              <p className={styles.txt + " text-xs my-2 bg-white rounded-lg shadow-sm p-2 py-4"}>
                {isSignUp ? "Already have an Account ? " : "Want to create a new account ? "}
                <span
                  className={
                    styles.log +
                    " !text-secondary border-1 border-secondary p-1 rounded-md hover:bg-secondary transition-all hover:!text-white"
                  }
                  onClick={Switch}
                >
                  {isSignUp ? "Sign In" : "Sign Up Now"}
                </span>
              </p>
            </div>
            <div></div>
          </div>

          {/* Right Column — Illustration */}
          <div className={styles.col2 + " !p-3 flex-1 flex flex-col items-stretch justify-center"}>
            <div className="w-full h-full rounded-3xl relative items-center flex flex-col justify-center">
              <img src="/framed.png" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
