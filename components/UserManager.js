import { CtoLocal } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Spacer,
  Spinner,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ShortUniqueId from "short-unique-id";
import { useNMNContext } from "./NMNContext";
import Fuse from "fuse.js";
import { FixedSizeList as VirtualList } from "react-window";

export default function UserManager(props) {
  const [enrollmentData, setEnrollmentdata] = useState();
  const [enrolledCourses, setEnrolledCourses] = useState();
  const [dialog, setDialog] = useState();
  const [coupons, setCoupons] = useState();
  const [couponData, setCouponData] = useState();
  const [type, setType] = useState(0);
  const [courses, setCourses] = useState();
  const [emails, setEmails] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState();
  const [userModal, setUserModal] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [emailPage, setEmailPage] = useState(0);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const EMAIL_PAGE_SIZE = 50;

  function onComplete(e) {
    getCourses();
    getEnrollments(e?.email, false);
  }
  const updateStateFromArray = (array, offset = 0) => {
    const updatedState = array.map((value, index) => ({
      id: offset + index,
      value: value,
    }));
    if (offset === 0) {
      setEmails(updatedState);
    } else {
      setEmails((prev) => [...prev, ...updatedState]);
    }
  };

  async function getEmails(page = 0, pageSize = EMAIL_PAGE_SIZE, search = "") {
    setLoadingEmails(true);
    const offset = page * pageSize;
    let data = [];
    let error = null;

    try {
      const res = await fetch(
        `/api/listUsers?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(
          search
        )}`
      );
      if (res.ok) {
        data = await res.json();
      } else {
        error = await res.text();
      }
    } catch (err) {
      error = err.message;
    }

    if (data && Array.isArray(data)) {
      updateStateFromArray(data, offset);
      setHasMoreEmails(data.length === pageSize);
      setEmailPage(page + 1);
    } else {
      setHasMoreEmails(false);
    }
    setLoadingEmails(false);
  }
  const { userCourses, setUserCourses, userDetails, payments } =
    useNMNContext();

  const userData = userDetails;
  function couponUtility() {
    return {
      getCoupons: async () => {
        const { data, error } = await supabase
          .from("coupons")
          .select("*,course_id(*)")
          .order("created_at", { ascending: false });
        if (data) {
          setCoupons(data);
        }
        if (error) {
          toast.error("Error Loading Coupons");
        }
      },
      createCoupon: async (a) => {
        if (!a.code || a?.code.length < 16) {
          toast.error("Please enter valid coupon code");
          return null;
        }
        if (!a.course) {
          toast.error("Please select a course");
          return null;
        }

        if (!a.expiry) {
          toast.error("Please set an expiry date for this coupon");
          return null;
        }

        const { data, error } = await supabase
          .from("coupons")
          .insert({
            coupon_code: a.code,

            course_id: a.course,
            user: type == 1 ? "" : a.email,
            expiry: a.expiry,
          })
          .select();

        if (data) {
          couponUtility().getCoupons();
        }
        if (error) {
          if (error.code == 23505) {
            toast.error("Same Coupon Code Already Exists");
          } else {
            toast.error("Something went wrong");
          }
        }
      },

      generateRandomCoupon: () => {
        const a = new ShortUniqueId({ length: 16 });
        setCouponData((res) => ({ ...res, code: a.rnd() }));
      },
      deleteCouponCode: async (a) => {
        const { error } = await supabase.from("coupons").delete().eq("id", a);
        if (!error) {
          toast.success("Successfully Deleted Coupon Code");
        }
        if (error) {
          toast.success("Unable to Coupon Code");
        }
      },
    };
  }

  useEffect(() => {
    couponUtility().getCoupons(), getEnrollments(), getCourses();

    if (userModal) {
      setEmails([]);
      setEmailPage(0);
      setHasMoreEmails(true);
      getEmails(0, EMAIL_PAGE_SIZE, filterText);
    }
  }, [userModal]);

  useEffect(() => {
    if (!userModal) return;
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setEmails([]);
        setEmailPage(0);
        setHasMoreEmails(true);
        getEmails(0, EMAIL_PAGE_SIZE, filterText);
      }, 400)
    );
  }, [filterText]);

  async function deleteCourse(a) {
    const { error } = await supabase.from("enrollments").delete().eq("id", a);
    if (!error) {
      toast.success("Deleted Enrolled Course");
      setDialog(false);
      setEnrolledCourses();
      onComplete(enrollmentData);
    }
    if (error) {
      toast.error("Unable to delete Enrolled Course");
    }
  }

  async function getCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("id", { ascending: true });
    if (data) {
      setCourses(data);
    }
  }

  // filteredEmails removed: search is now server-side
  async function getEnrollments(a, b) {
    const query = supabase.from("enrollments").select("*,course(*)");

    if (b == true) {
    } else {
      query.eq("email", a);
    }
    const { data, error } = await query;
    if (data && data.length > 0) {
      setEnrolledCourses(data);

      setUserCourses(data);
    } else {
      setEnrolledCourses([]);
      setUserCourses([]);
    }
  }

  async function AddCoursetoUser(a, b) {
    const selected = selectedEmails.map((i, d) => {
      return {
        addedby: a?.email || "ashutosh.mishra@gmail.com",
        paidby: b?.payment || 1,
        email: i,
        course: b?.course,
      };
    });
    const { data, error } = await supabase
      .from("enrollments")
      .insert(selected)
      .select();
    if (data) {
      onComplete(b);
      toast.success(`Added Course to Selecter Users`);
    } else if (error) {
      if (error?.code == 23505) {
        toast.error(
          "This course has already been added to this user's account."
        );
      }
    }
  }

  return (
    <div className="w-full overflow-y-auto h-full">
      <Modal
        isOpen={userModal}
        onClose={() => {
          setUserModal(false);
          setEmails([]);
          setEmailPage(0);
          setHasMoreEmails(true);
        }}
      >
        <ModalContent>
          <ModalHeader>
            Select one or more user to enroll into a course
          </ModalHeader>
          <ModalBody className="max-h-[50vh] overflow-y-auto">
            <Input
              type="search"
              className=" sticky top-0 z-10 bg-white"
              size="sm"
              placeholder="Search Here..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
              }}
            ></Input>
            {loadingEmails && emails.length === 0 ? (
              <div className="flex justify-center items-center py-10">
                <Spinner size="lg" color="primary" />
              </div>
            ) : (
              <CheckboxGroup
                value={selectedEmails}
                onValueChange={(e) => {
                  setSelectedEmails(e);
                }}
              >
                {emails && (
                  <>
                    <VirtualList
                      height={300}
                      itemCount={emails.length}
                      itemSize={40}
                      width="100%"
                      onItemsRendered={({ visibleStopIndex }) => {
                        if (
                          hasMoreEmails &&
                          !loadingEmails &&
                          visibleStopIndex >= emails.length - 10
                        ) {
                          getEmails(emailPage, EMAIL_PAGE_SIZE, filterText);
                        }
                      }}
                    >
                      {({ index, style }) => {
                        const eml = emails[index];
                        if (!eml) return null;
                        return (
                          <div style={style} key={eml.value}>
                            <Checkbox value={eml.value}>{eml.value}</Checkbox>
                          </div>
                        );
                      }}
                    </VirtualList>
                    {loadingEmails && emails.length > 0 && (
                      <div className="flex justify-center py-2">
                        <Spinner size="sm" color="primary" />
                      </div>
                    )}
                  </>
                )}
              </CheckboxGroup>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              onPress={() => {
                setEmails(), setUserModal(false);
              }}
              color="danger"
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                setUserModal(false);
              }}
              color="primary"
            >
              Add
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <div className="flex flex-col w-full">
        <div className="w-full flex flex-col lg:flex-col">
          <div className="flex flex-col w-full lg:w-1/2 rounded-xl shadow-md p-4">
            <h2 className="font-bold text-left text-xl mb-2 text-secondary">
              Add Course to User
            </h2>

            {courses != undefined ? (
              <>
                <div className="flex flex-row items-center justify-start flex-wrap max-w-[50%]">
                  {selectedEmails &&
                    selectedEmails.slice(0, 10).map((eml, idx) => {
                      return (
                        <Chip
                          key={eml}
                          endContent={
                            <svg
                              onClick={() => {
                                setSelectedEmails(
                                  selectedEmails.filter((item) => item != eml)
                                );
                              }}
                              className=" rotate-45"
                              width="24"
                              height="24"
                              fill="none"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 12 7Z"
                                fill="currentColor"
                              />
                            </svg>
                          }
                          className="m-1"
                          color="primary"
                          size="sm"
                        >
                          {eml}
                        </Chip>
                      );
                    })}
                  {selectedEmails && selectedEmails?.length > 10 ? (
                    <p>and {selectedEmails?.length - 9} more...</p>
                  ) : (
                    ""
                  )}
                </div>

                <Button
                  size="sm"
                  className="my-2 mr-auto text-black"
                  color="secondary"
                  onPress={() => {
                    setUserModal(true);
                  }}
                >
                  Select Users
                </Button>
                <Select
                  classNames={"my-2"}
                  items={payments || ""}
                  label="Payment Method"
                  placeholder="....Select Payment Method"
                  className="max-w-md font-sans"
                  onChange={(e) => {
                    setEnrollmentdata((res) => ({
                      ...res,
                      payment: e.target.value,
                    }));
                  }}
                >
                  {(method) => (
                    <SelectItem
                      className="font-sans font-bold"
                      key={method.value}
                    >
                      {method.title}
                    </SelectItem>
                  )}
                </Select>
                <Select
                  items={courses || []}
                  label="Course"
                  placeholder="....Select Course"
                  className="max-w-md font-sans my-2"
                  onChange={(e) => {
                    setEnrollmentdata((res) => ({
                      ...res,
                      course: e.target.value,
                    }));
                  }}
                >
                  {(course) => (
                    <SelectItem className="font-sans font-bold" key={course.id}>
                      {course.title}
                    </SelectItem>
                  )}
                </Select>
              </>
            ) : (
              ""
            )}
            <Button
              color="primary"
              className="text-white"
              onPress={() => {
                AddCoursetoUser(userData, enrollmentData);
              }}
            >
              Enroll User
            </Button>
            <Divider className="my-4"></Divider>
            <div className="flex flex-col w-full mb-3">
              <h2 className="w-full text-xl font-bold text-left">
                Courses Enrolled :
              </h2>
              {enrolledCourses != undefined &&
                enrolledCourses.map((i, d) => {
                  return (
                    <div
                      key={i.id}
                      className="font-bold w-full text-left p-2 border-1 flex flex-row items-center justify-between text-sm  rounded-lg my-2 mx-0 bg-green-100 border-green-400 text-green-500"
                    >
                      {i.course?.title}
                      <Popover
                        key={"99"}
                        shouldCloseOnInteractOutside={() => {
                          setDialog(false);
                        }}
                        isOpen={dialog}
                      >
                        <PopoverTrigger>
                          <Button
                            size="sm"
                            color="danger"
                            onPress={() => {
                              setDialog(true);
                            }}
                          >
                            Delete
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="max-w-[300px] text-xs p-4">
                          <h2>
                            Are you sure you want to delete this course from{" "}
                            {enrollmentData?.email || ""}
                          </h2>
                          <div className="w-full justify-start flex flex-row my-2">
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              onPress={() => {
                                setDialog(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Spacer x={2}></Spacer>
                            <Button
                              size="sm"
                              color="danger"
                              onPress={() => {
                                deleteCourse(i.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
              {enrolledCourses == undefined ? (
                <div>No Courses Enrolled</div>
              ) : (
                ""
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white mt-4 border-1 flex flex-col justify-start items-start border-gray-100 ">
            <h2 className="text-xl font-bold my-2">Create Coupon</h2>
            <ButtonGroup className="my-2">
              <Button
                color={type == 0 ? "secondary" : "default"}
                className={type == 0 ? "text-white" : ""}
                onPress={() => {
                  setType(0);
                }}
              >
                Specific User
              </Button>
              <Button
                color={type == 1 ? "secondary" : "default"}
                className={type == 1 ? "text-white" : ""}
                onPress={() => {
                  setType(1);
                }}
              >
                Any User
              </Button>
            </ButtonGroup>
            <Input
              type="text"
              maxLength={16}
              label="Coupon Code"
              placeholder="Enter Coupon Code"
              endContent={
                <Button
                  size="sm"
                  className="text-white"
                  color="primary"
                  onPress={() => {
                    couponUtility().generateRandomCoupon();
                  }}
                >
                  Generate Random Code
                </Button>
              }
              value={couponData?.code}
              onChange={(e) => {
                setCouponData((res) => ({ ...res, code: e.target.value }));
              }}
            ></Input>
            <div className="w-full flex flex-row">
              {emails != undefined && type == 0 ? (
                <Select
                  classNames="my-2"
                  items={emails || []}
                  label="Select User Email"
                  fullWidth
                  placeholder="....Select Email"
                  className="max-w-md font-sans my-2"
                  onChange={(e) => {
                    setCouponData((res) => ({ ...res, email: e.target.value }));
                  }}
                >
                  {(emailz) => (
                    <SelectItem
                      className="font-sans font-bold"
                      key={emailz.value}
                    >
                      {emailz.value}
                    </SelectItem>
                  )}
                </Select>
              ) : (
                ""
              )}
              {type == 0 ? <Spacer x={2}></Spacer> : ""}
              <Select
                items={courses || []}
                label="Course"
                placeholder="....Select Course"
                className="max-w-md font-sans my-2"
                onChange={(e) => {
                  setCouponData((res) => ({ ...res, course: e.target.value }));
                }}
              >
                {(course) => (
                  <SelectItem className="font-sans font-bold" key={course.id}>
                    {course.title}
                  </SelectItem>
                )}
              </Select>
            </div>
            <h2>Select Expiry Date</h2>
            <Input
              type="date"
              placeholder="Select Expiry Date"
              onChange={(e) => {
                setCouponData((res) => ({ ...res, expiry: e.target.value }));
              }}
            ></Input>
            <Button
              onPress={() => {
                couponUtility().createCoupon(couponData);
              }}
              color="primary"
              className="text-white my-2"
            >
              Add Coupon
            </Button>

            <div className="flex flex-col justify-start w-full items-start">
              <h2 className="text-xl font-bold my-2">Manage Coupons</h2>
              <div className="w-full flex flex-row rounded-md p-2 border-1 border-green-500 bg-green-100">
                <p className="text-sm text-center flex-1">ID</p>
                <p className="text-sm text-center flex-1">Coupon Code</p>
                <p className="text-sm text-center flex-1">User</p>
                <p className="text-sm text-center flex-1">Course</p>
                <p className="text-sm text-center flex-1">Expiry</p>
                <p className="text-sm text-center flex-1">Is Active</p>
                <p className="text-sm text-center flex-1">Manager</p>
              </div>

              {coupons &&
                coupons.map((i, d) => {
                  return (
                    <div className="w-full flex-row flex p-2 my-1">
                      <p className="text-xs text-center flex-1">{i.id}</p>
                      <p className="text-xs text-center flex-1">
                        {i.coupon_code}{" "}
                      </p>
                      <p className="text-xs text-center flex-1">
                        {i?.user || "Anyone can use"}
                      </p>
                      <p className="text-xs text-center flex-1">
                        {i.course_id.title}
                      </p>
                      <p className="text-xs text-center flex-1">
                        {CtoLocal(i.expiry).dayName} {CtoLocal(i.expiry).date}{" "}
                        {CtoLocal(i.expiry).monthName} {CtoLocal(i.expiry).year}
                      </p>
                      <p className="text-xs text-center flex-1 flex flex-row items-center justify-center">
                        {i.redeemed ? (
                          <svg
                            className="rotate-45"
                            width="24"
                            height="24"
                            fill="none"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z"
                              fill="#E84B3C"
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
                              d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z"
                              fill="#2ECC70"
                            />
                          </svg>
                        )}
                      </p>

                      <p className="text-xs text-center flex-1">
                        <Button
                          size="sm"
                          color="danger"
                          onPress={() => {
                            couponUtility().deleteCouponCode(i.id);
                          }}
                        >
                          Delete Coupon
                        </Button>
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
