import Notifications from "@/components/Notification";
import { supabase } from "@/utils/supabaseClient";

import { useRouter } from "next/router";

import { useEffect, useState } from "react";
import styles from "./Login.module.css";
import {
  Button,
  Spacer,
  CircularProgress,
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
  const [isChanging, setIsChanging] = useState(false);
  const [notificationText, setNotificationText] = useState();
  const [fpModal, setFPModal] = useState(false);
  const [fpData, setFPData] = useState();
  const [fpUpdate, setFPUpdate] = useState();
  const [passwordModal, setPasswordModal] = useState(false);
  const router = useRouter();

  function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
  function validateIndianPhoneNumber(phone) {
    const regex = /^(?:\+91)?[6-9]\d{9}$/;
    return regex.test(phone);
  }

  const { setUserDetails } = useNMNContext();

  async function handleSignUp() {
    if (!formData) {
      toast.error("Empty Form");
      return null;
    }
    if (!formData.fullname) {
      toast.error("Full Name must be a valid name.");
      return null;
    }
    if (!formData.email || !validateEmail(formData.email)) {
      toast.error("Empty or Invalid Email");
      return null;
    }
    if (!formData.password || formData.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return null;
    }
    if (!formData.city) {
      toast.error("Empty or Invalid City");
      return null;
    }
    if (!formData.phone || !validateIndianPhoneNumber(formData.phone)) {
      toast.error("Empty or Invalid Indian Phone Number");
      return null;
    }
    const r = toast.loading("Signing Up");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
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
        toast.success("Signed up successfully , You can Login Now");
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
        setLoading(false);
        toast.remove(r);
        toast.error("User Already Registered");
      } else {
        toast.error(error.message);
      }
    } else {
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
    if (router.query.s && router.query.s == 1) {
      setIsSignUp(true);
    } else if (router.query.s && router.query.s == 0) {
      setIsSignUp(false);
    }
  }, [router]);

  async function getUser() {
    const user = await supabase.auth.getUser();

    if (user || user.data == undefined) {
      return null;
    }
    if (user != undefined) {
      axios
        .post("/api/isAdmin", {
          email: user.data.user.email,
        })
        .then((res) => {
          if (res.data.success == true) {
            router.push("/admin");
          } else {
            router.push("/");
          }
        })
        .catch((res) => {});
    }
  }

  useEffect(() => {
    getUser();
  }, []);

  async function getRole(a) {
    const { data, error } = await supabase.rpc("get_user_role_by_email", {
      email_address: a,
    });
    if (data) {
      console.log(data);
      return data;
    } else {
      console.log(error);
    }
  }
  async function handleSignIn() {
    if (formData == undefined) {
      toast.error("Empty Login Details");
      return null;
    }

    if (formData?.email == undefined) {
      toast.error("Email Empty or Invalid");
      return null;
    }
    if (formData?.password == undefined) {
      toast.error("Password Empty or Invalid");
      return null;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(
      {
        email: formData.email,
        password: formData.password,
      },
      {
        redirectTo: router.query.redirectTo ?? "/",
      }
    );

    if (data && data.user && data.session) {
      setUserDetails(data.user);
      const userRole = await getRole(data.user.email);
      if (userRole === "admin") {
        router.push("/admin");
      } else {
        router.push(router.query.redirectTo ?? "/");
      }
      toast.success("Logged in Successfully", false);

      setLoading(false);
    } else if (error) {
      toast.error(error.message, true);

      setLoading(false);
    }
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  async function forgotPassword(a) {
    if (a == null || !validateEmail(a)) {
      toast.error("Email Empty or Invalid");
      return null;
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(a, {
      redirectTo: "https://study.ipmcareer.in/login",
    });

    if (data) {
      toast.success("Sent Reset Link to your Email");
      setFPModal(false);
    } else {
      toast.error("Unable to send reset link");
    }
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        setPasswordModal(true);
      }
    });
  }, []);

  async function updatePassword(a) {
    if (a == undefined || a?.length < 8) {
      toast.error("Password Must be atleast 8 characters long");
      return null;
    }

    const { data, error } = await supabase.auth.updateUser({ password: a });

    if (data) {
      toast.success("Password Update Now Login");
      setPasswordModal(false);
    }
    if (error) {
      toast.error("Error updating password");
    }
  }

  return (
    <>
      <div
        className={
          " w-full h-screen max-h-screen lg:p-0 p-6 bg-[#ddd] flex flex-col items-center justify-center overflow-hidden"
        }
      >
        {notificationText && notificationText.length > 2 ? (
          <Notifications text={notificationText} />
        ) : (
          ""
        )}

        <Modal
          placement="center"
          className="sf overflow-hidden"
          isOpen={passwordModal}
          backdrop="opaque"
          onClose={() => {
            setPasswordModal(false);
          }}
          isDismissable={false}
          classNames={{ backdrop: "opacity-10 bg-overlay/5" }}
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader
                  className={`flex flex-col gap-1 justify-start items-start text-black`}
                >
                  <h2 className="text-black">Enter New Password</h2>
                </ModalHeader>
                <ModalBody>
                  <Input
                    label="New Password"
                    placeholder="Enter New Password"
                    onChange={(e) => {
                      setFPUpdate(e.target.value);
                    }}
                  ></Input>
                </ModalBody>

                <ModalFooter>
                  <Button
                    color="danger"
                    variant="faded"
                    onPress={() => {
                      setPasswordModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    onPress={() => {
                      updatePassword(fpUpdate);
                    }}
                  >
                    Update Password
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <Modal
          placement="center"
          className="sf overflow-hidden"
          isOpen={fpModal}
          backdrop="opaque"
          onClose={() => {
            setFPModal(false);
          }}
          isDismissable={false}
          classNames={{ backdrop: "opacity-10 bg-overlay/5" }}
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader
                  className={`flex flex-col gap-1 justify-start items-start text-black`}
                >
                  <h2 className="text-black">
                    Enter your Email to Reset Password
                  </h2>
                </ModalHeader>
                <ModalBody>
                  <Input
                    label="Your Email"
                    placeholder="Enter your Email"
                    onChange={(e) => {
                      setFPData(e.target.value);
                    }}
                  ></Input>
                </ModalBody>

                <ModalFooter>
                  <Button
                    color="danger"
                    variant="faded"
                    onPress={() => {
                      setFPModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="text-white bg-gradient-purple"
                    onPress={() => {
                      forgotPassword(fpData);
                    }}
                  >
                    Send Reset Link
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        <div className={styles.bgfill}></div>
        <div className="w-full max-w-[1000px] z-10 relative  shadow-lg border-1 bg-white border-white  h-full max-h-[80vh]  md:max-h-[95vh] overflow-hidden my-auto rounded-xl mx-auto flex flex-row justify-between">
          <div className={styles.col1 + " relative md:flex-1 flex-0 !w-full"}>
            <img
              className={"relative w-[50vw] md:w-[20vw] mr-auto"}
              width={100}
              src="/newlog.svg"
            />
            {/*  <div></div> */}

            <div className={styles.form + " " + (isChanging ? styles.hid : "")}>
              <h2 className="!text-md " style={{ color: "var(--brand-col1)" }}>
                {isSignUp
                  ? "Create a new account to start learning on our panel"
                  : "Login to your account !"}
              </h2>

              <Spacer y={1}></Spacer>
              {isSignUp ? (
                <input
                  name={"name"}
                  autoComplete="name"
                  className={styles.input}
                  placeholder={"Enter your Full Name"}
                  type={"text"}
                  value={formData && formData.fullname}
                  onChange={(e) => {
                    setFormData((res) => ({
                      ...res,
                      fullname: e.target.value,
                    }));
                  }}
                />
              ) : (
                ""
              )}
              <input
                name={"email"}
                autoComplete="email"
                className={styles.input}
                placeholder={"Enter your Email Address"}
                type={"text"}
                value={formData && formData.email}
                onChange={(e) => {
                  setFormData((res) => ({ ...res, email: e.target.value }));
                }}
              />
              {isSignUp ? (
                <input
                  name={"phone"}
                  autoComplete="phone"
                  className={styles.input}
                  placeholder={"Enter your Phone Number"}
                  type={"text"}
                  maxLength={10}
                  value={formData && formData.phone}
                  onChange={(e) => {
                    setFormData((res) => ({ ...res, phone: e.target.value }));
                  }}
                />
              ) : (
                ""
              )}
              {isSignUp ? (
                <input
                  name={"city"}
                  autoComplete="city"
                  className={styles.input}
                  placeholder={"Enter your City"}
                  type={"text"}
                  value={formData && formData.city}
                  onChange={(e) => {
                    setFormData((res) => ({ ...res, city: e.target.value }));
                  }}
                />
              ) : (
                ""
              )}
              {/* {isSignUp ?<input name={"date"} className={styles.input} placeholder={"Enter Date of Birth"} type={"date"}  value={formData && formData.dob} onChange={(e)=>{setFormData(res=>({...res,dob:e.target.value})) }}/>:''} */}
              <div className={styles.password}>
                <div
                  className={styles.tog}
                  onClick={() => {
                    isPasswordVisible
                      ? setIsPasswordVisible(false)
                      : setIsPasswordVisible(true);
                  }}
                >
                  {!isPasswordVisible ? (
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 9.005a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 5.5c4.613 0 8.596 3.15 9.701 7.564a.75.75 0 1 1-1.455.365 8.503 8.503 0 0 0-16.493.004.75.75 0 0 1-1.455-.363A10.003 10.003 0 0 1 12 5.5Z"
                        fill="#BDC3C8"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.22 2.22a.75.75 0 0 0-.073.976l.073.084 4.034 4.035a9.986 9.986 0 0 0-3.955 5.75.75.75 0 0 0 1.455.364 8.49 8.49 0 0 1 3.58-5.034l1.81 1.81A4 4 0 0 0 14.8 15.86l5.919 5.92a.75.75 0 0 0 1.133-.977l-.073-.084-6.113-6.114.001-.002-6.95-6.946.002-.002-1.133-1.13L3.28 2.22a.75.75 0 0 0-1.06 0ZM12 5.5c-1 0-1.97.148-2.889.425l1.237 1.236a8.503 8.503 0 0 1 9.899 6.272.75.75 0 0 0 1.455-.363A10.003 10.003 0 0 0 12 5.5Zm.195 3.51 3.801 3.8a4.003 4.003 0 0 0-3.801-3.8Z"
                        fill="#BDC3C8"
                      />
                    </svg>
                  )}
                </div>{" "}
                <input
                  name={"password"}
                  autoComplete="password"
                  className={styles.input}
                  placeholder={"Enter Password"}
                  type={isPasswordVisible ? "text" : "password"}
                  value={formData && formData.password}
                  onChange={(e) => {
                    setFormData((res) => ({
                      ...res,
                      password: e.target.value,
                    }));
                  }}
                />
              </div>
              <Spacer y={1}></Spacer>
              <Button
                className="text-white gradient-purple bg-gradient-purple"
                auto
                onClick={() => {
                  isSignUp ? handleSignUp() : handleSignIn();
                }}
              >
                {isSignUp ? "Sign Up" : "Sign In"}
                {loading ? (
                  <>
                    <Spacer x={0.5}></Spacer>
                    <Spinner size="sm" color={"default"}></Spinner>
                  </>
                ) : (
                  ""
                )}
              </Button>
              <p
                className="text-blue-500 text-sm my-2 cursor-pointer hover:text-blue-700"
                onClick={() => {
                  setFPModal(true);
                }}
              >
                Forgot Password?
              </p>

              <p
                className={
                  styles.txt +
                  " text-xs my-2 bg-white rounded-lg shadow-sm p-2 py-4"
                }
              >
                {isSignUp
                  ? "Already have an Account ? "
                  : "Want to create a new account ? "}
                <span
                  className={
                    styles.log +
                    " !text-secondary border-1 border-secondary p-1 rounded-md hover:bg-secondary transition-all hover:!text-white"
                  }
                  onClick={(e) => {
                    Switch();
                  }}
                >
                  {isSignUp ? "Sign In" : "Sign Up Now"}
                </span>
              </p>
            </div>
            <div></div>
          </div>
          <div
            className={
              styles.col2 +
              " !p-3 flex-1 flex flex-col items-stretch justify-center"
            }
          >
            <div className=" w-full h-full rounded-3xl relative items-center flex fle-col justify-center">
              <img src="/framed.png" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
