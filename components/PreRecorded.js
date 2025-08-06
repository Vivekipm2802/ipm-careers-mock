import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  Select,
  SelectItem,
  Spacer,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  CircularProgress,
  Card,
  CardFooter,
  CardBody,
  CardHeader,
  Progress,
  Chip,
} from "@nextui-org/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";
import _ from "lodash";
import {
  AArrowUpIcon,
  ArrowLeft,
  ArrowRight,
  BookText,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Edit2,
  Eye,
  Lock,
  Play,
  PlusIcon,
  SidebarOpen,
  Space,
  Trash2,
  Trash2Icon,
  Video,
  View,
} from "lucide-react";
import Link from "next/link";
import FileUploaderHomework from "./FileUploaderHomework";
import dynamic from "next/dynamic";

const QuillWarapper = dynamic(() => import("@/components/QuillSSRWrapper"), {
  ssr: false,
});

export default function PreRecorded({
  role,
  categoryName,
  listName,
  title,
  group,
  onBack,
  demoListName,
}) {
  const [videos, setVideos] = useState();
  const [vcategory, setVCategory] = useState();
  const [videosData, setVideosData] = useState();
  const [editCategoryData, setEditCategoryData] = useState();
  const [view, setView] = useState(0);
  const [fullScreenVideo, setFullScreenVideo] = useState(false);
  const [currentCategory, setCurrentCategory] = useState();
  const [videoURL, setVideoURL] = useState();
  const [bgLoading, setBGLoading] = useState(false);
  const [drawerActive, setDrawerActive] = useState(true);
  const [currentVideo, setCurrentVideo] = useState();
  const [loading, setLoading] = useState(true);
  const [editVideoData, setEditVideoData] = useState();
  const [tests, setTests] = useState();
  const [homeworks, setHomeworks] = useState();
  const [contentLoading, setContentLoading] = useState(false);
  const [homeworkModal, showHomeworkModal] = useState(false);
  const [testModal, showTestModal] = useState(false);
  const [manageHomeworkModal, setManageHomeworkModal] = useState(false);
  const [currentHomework, setCurrentHomework] = useState();
  const [homeworkFile, setHomeworkFile] = useState();
  const [homeworkMessage, setHomeworkMessage] = useState();
  const [homeworkData, setHomeWorkData] = useState();
  const [availableTests, setAvailableTests] = useState();
  const [selectedTest, setSelectedTest] = useState();
  const [selectedParent, setSelectedParent] = useState();
  const [testData, setTestData] = useState();

  const { isDemo, userDetails } = useNMNContext();

  async function getAvailableTests() {
    const { data, error } = await supabase
      .from("m_categories")
      .select("id,title,parent,levels(id,title,description,parent)");
    if (data) {
      setAvailableTests(data);
    }
    if (error) {
      toast.error("Unable to Delete");
    }
  }

  async function getVideoContent(a) {
    setTests();
    setHomeworks();
    setContentLoading(true);
    const { data, error } = await supabase
      .from("self_learning_tests")
      .select("*,self_learning_attempts(*)")
      .eq("self_learning_attempts.user", userDetails?.email)
      .in(
        "vuid",
        a?.map((item) => item.id)
      );

    getHomeworks(a);
    if (data) {
      setTests(data);
      setContentLoading(false);
      return;
    }
    if (error) {
      toast.error("Unable to Load");
      setContentLoading(false);
      return;
    }
  }

  async function getHomeworks(a) {
    const { data, error } = await supabase
      .from("homeworks")
      .select("*,homework_submissions(*)")
      .in(
        "content_id",
        a.map((item) => item.id)
      )
      .eq("homework_submissions.user_id", userDetails?.email);
    if (data) {
      setHomeworks(data);
      setContentLoading(false);
      return;
    }
    if (error) {
      toast.error("Unable to Load");
      setContentLoading(false);
      return;
    }
  }

  async function submitHomework(a, b, c) {
    const { data, error } = await supabase
      .from("homework_submissions")
      .insert({
        homework_id: b?.id,
        file_url: a,
        message: c || "",
      })
      .select();
    if (data) {
      getHomeworks(vcategory);
      toast.success("Uploaded Homework");
      return;
    }
    if (error) {
      toast.error("Unable to Upload Homework");
      return;
    }
  }

  async function AddVideoCategory(a, t, c) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from(categoryName).insert({
      title: a.cattitle,
      description: a.catdesc,
      type: t,
      parent: t == "sub" ? c : null,
      group_id: t == "parent" ? group : null,
    });

    if (!error) {
      getVideoCategories();
    }
  }

  async function updateOrder(s) {
    const { data, error } = await supabase
      .from(listName)
      .update({
        seq: s.seq,
      })
      .eq("id", s.id)
      .select();
    if (data) {
      getVideos(currentCategory);
      toast.success("Updated Order");
    }
    if (error) {
      toast.error("Unable to Update Order");
    }
  }
  async function updateVideoCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { data, error } = await supabase
      .from(categoryName)
      .update({
        title: a.title,
        description: a.description,
        seq: a?.seq ?? undefined,
      })
      .eq("id", a.id)
      .select();
    if (data) {
      getVideoCategories();
      toast.success("Updated Category Successfully");
    }
    if (error) {
      toast.error("Error Updating Category");
    }
  }
  async function AddVideo(a, b) {
    if (a == undefined) {
      return null;
    }

    const { data, error } = await supabase
      .from(listName)
      .insert({
        title: a?.title,
        url: a?.url,
        type: a?.type,
        category: b,
        by: userDetails?.email || "",
      })
      .select();

    if (data) {
      getVideos(vcategory);
      toast.success("Added Video Successfully");
    }
    if (error) {
      toast.error("Unable to Add");
    }
  }
  async function updateVideo(a) {
    const { data, error } = await supabase
      .from(listName)
      .update(a)
      .eq("id", a?.id)
      .select();

    if (data) {
      getVideos(vcategory);
      toast.success("Successfully Updated Video");
    }
    if (error) {
      toast.error("Unable to Update Video");
    }
  }
  async function DeleteVideo(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from(listName).delete().eq("id", a);

    if (!error) {
      getVideos(vcategory);
    }
  }
  async function DeleteVideoCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from(categoryName).delete().eq("id", a);

    if (!error) {
      getVideoCategories();
    }
  }

  function checkUnlocked() {
    // Filter top-level and sub-level categories
    const topLevel = vcategory?.filter((item) => item.type === "parent");
    const subLevel = vcategory?.filter((item) => item.type === "sub");

    // Iterate over each topLevel item to determine if it's unlocked
    topLevel?.forEach((parentItem, index) => {
      if (index === 0) {
        // Automatically unlock the first item
        parentItem.unlocked = true;
        return;
      }

      // Check if the previous item is unlocked by criteria
      const previousItem = topLevel[index - 1];
      const relatedSubLevels = subLevel.filter(
        (subItem) => subItem.parent === previousItem.id
      );

      const lastItem =
        relatedSubLevels?.length > 0 &&
        relatedSubLevels[relatedSubLevels?.length - 1];
      const previousItemUnlocked = tests
        ?.filter((item) => item.vuid == lastItem.id)
        ?.some((item) =>
          item.self_learning_attempts?.some((item) => item.is_passed == true)
        );

      // Set the current item's unlocked status based on the previous item's unlock criteria
      if (previousItemUnlocked) {
        const crelatedSubLevels = subLevel.filter(
          (subIteme) => subIteme.parent === parentItem.id
        );
        crelatedSubLevels.forEach((subItem, subIndex) => {
          if (subIndex == 0) {
            setVCategory((prevCategory) =>
              prevCategory.map((item) =>
                item.id === subItem.id ? { ...item, unlocked: true } : item
              )
            );
            return;
          }

          const prevSub =
            crelatedSubLevels?.length > 0 && crelatedSubLevels[subIndex - 1];
          const isPrevUnlocked = tests
            .filter((item) => item.vuid == prevSub.id)
            ?.some((item) =>
              item.self_learning_attempts?.some(
                (attemp) => attemp?.is_passed == true
              )
            );
          if (isPrevUnlocked) {
            setVCategory((prevCategory) =>
              prevCategory.map((item) =>
                item.id === subItem.id ? { ...item, unlocked: true } : item
              )
            );
          }
        });

        setVCategory((prevCategory) =>
          prevCategory.map((item) =>
            item.id === parentItem.id ? { ...item, unlocked: true } : item
          )
        );
        return;
      }
    });
  }

  async function getVideoCategories() {
    // First, load categories by group ID
    const { data: initialData, error: initialError } = await supabase
      .from(categoryName)
      .select("*")
      .eq("group_id", group)
      .order("seq", { ascending: true });

    if (initialError) {
      console.error("Error loading initial categories:", initialError);
      return;
    }

    if (initialData && initialData.length > 0) {
      // Set the initial data
      setVCategory(initialData);

      // Extract IDs from initial data to use for the second query
      const parentIds = initialData.map((item) => item.id);

      // Second, load additional categories where parent is in initialData's IDs
      const { data: subData, error: subError } = await supabase
        .from(categoryName)
        .select("*")
        .in("parent", parentIds)
        .order("seq", { ascending: true });

      if (subError) {
        console.error("Error loading sub-level categories:", subError);
        return;
      }

      // Combine the initial data with the sub-level data
      const allData = [...initialData, ...subData];
      setVCategory(allData);
      getVideos(subData);
      // Call other functions with the combined data
      getVideoContent(allData);
    } else {
      setLoading(false);
    }
  }

  async function addHomework(a, b) {
    const { data, error } = await supabase
      .from("homeworks")
      .insert({
        ...a,
        content_id: b,
      })
      .select();
    if (data) {
      getHomeworks(vcategory);
      toast.success("Added Homework");
      return;
    }
    if (error) {
      toast.error("Error while adding");
      return;
    }
  }
  async function deleteHomework(a, b) {
    const { data, error } = await supabase
      .from("homeworks")
      .delete()
      .eq("id", a)
      .select();
    if (error) {
      toast.error("Unable to Delete");
      return;
    }
    if (data) {
      getHomeworks(vcategory);
      toast.success("Deleted Successfully");
      return;
    }
  }
  async function updateDemo(a, b, c, handler) {
    const { data, error } = await supabase
      .from(c)
      .update({
        demo: a,
      })
      .eq("id", b)
      .select();

    if (data) {
      toast.success("Updated Demo");
      handler();
    }
    if (error) {
      toast.error("Unable to Update Demo");
    }
  }
  function isUnlocked(category_data, category_idx) {
    if (category_idx === 0) {
      return true;
    }

    // Find the previous category in the sequence
    const previous = vcategory.filter(
      (item) => item.type === "parent" && item.group_id === group
    )[category_idx - 1];

    // Find the last subcategory of the previous parent
    const previousSub = vcategory
      .filter((item) => item.parent === previous.id)
      .slice(-1)[0]; // Get the last subcategory

    if (!previousSub) {
      return false;
    }

    // Find the last video associated with the previousSub.id (if there are multiple videos)
    const lastVideo = videos
      .filter((item) => item.category === previousSub.id)
      .slice(-1)[0]; // Get the last video in the list for that subcategory

    if (lastVideo) {
      // Find if this last video has a matching self_learning_test using the tests map
      const matchingTest = tests?.vuid == lastVideo.id;

      if (matchingTest) {
        // Check if any self_learning_attempts for this test has is_passed = true
        const hasPassed = tests.self_learning_attempts.some(
          (attempt) => attempt.is_passed === true
        );

        return hasPassed;
      }
    }

    return false;
  }

  async function getVideos(a) {
    const { data, error } = await supabase
      .from(isDemo == true ? demoListName : listName)
      .select("*")
      .order("seq", { ascending: true })
      .in(
        "category",
        a?.map((item) => item.id)
      );
    setLoading(false);
    if (data) {
      setVideos(data);
    }
  }

  useEffect(() => {
    getVideoCategories();
  }, []);

  async function addTest(a) {
    const { data, error } = await supabase
      .from("self_learning_tests")
      .insert({
        title: a?.title,
        description: a?.description,
        level_id: a?.level_id,
        vuid: selectedParent,
      })
      .select();
    if (data) {
      toast.success("Added Test Successfully");
      getVideoContent(vcategory);
      setTestData();

      return;
    }
    if (error) {
      toast.success("Unable to Update Test ");
      return;
    }
  }

  useEffect(() => {
    if (vcategory && homeworks && tests) {
      checkUnlocked();
    }
  }, [homeworks, tests]);

  async function deleteTest(a) {
    const { data, error } = await supabase
      .from("self_learning_tests")
      .delete()
      .eq("id", a)
      .select();
    if (data) {
      getVideoContent(vcategory);
    }
  }
  async function updateTest(a) {
    const { data, error } = await supabase
      .from("self_learning_tests")
      .update({
        title: a?.title,
        description: a?.description,
        level_id: a?.level_id,
      })
      .eq("id", a?.id)
      .select();
    if (data) {
      toast.success("Updated Test");
      return;
    }

    if (error) {
      toast.error("Unable to Update Test");
      return;
    }
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <CircularProgress size="sm"></CircularProgress>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col justify-center align-middle items-center overflow-hidden">
      {/* Manage Homework */}

      <Modal
        isOpen={manageHomeworkModal}
        onClose={() => {
          setManageHomeworkModal(false);
        }}
      >
        <ModalContent className="min-[unset] lg:min-w-[800px]">
          <ModalHeader>
            Homeworks of{" "}
            {vcategory?.find((item) => item.id == selectedParent)?.title}
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-row items-start justify-start">
              <div className="flex-1 flex flex-col items-start justify-start">
                <Input
                  label="Enter Title"
                  size="sm"
                  placeholder="Enter Homework Title"
                  onChange={(e) => {
                    setHomeWorkData((res) => ({
                      ...res,
                      title: e.target.value,
                    }));
                  }}
                ></Input>
                <Spacer y={2}></Spacer>
                <Input
                  label="Enter Description"
                  size="sm"
                  placeholder="Enter Homework Description"
                  onChange={(e) => {
                    setHomeWorkData((res) => ({
                      ...res,
                      description: e.target.value,
                    }));
                  }}
                ></Input>
                <Spacer y={2}></Spacer>
                <QuillWarapper
                  label="Enter Description"
                  size="sm"
                  value={homeworkData?.content?.text ?? ""}
                  placeholder="Enter Homework Description"
                  onChange={(e) => {
                    setHomeWorkData((res) => ({
                      ...res,
                      content: { text: e },
                    }));
                  }}
                ></QuillWarapper>
                <Spacer y={2}></Spacer>
                <FileUploaderHomework
                  onUploadComplete={(e) => {
                    setHomeWorkData((res) => ({ ...res, file_url: e }));
                  }}
                ></FileUploaderHomework>
                <Spacer y={2}></Spacer>

                <Button
                  color="primary"
                  onPress={() => {
                    addHomework(homeworkData, currentCategory);
                  }}
                >
                  Add to Homework
                </Button>
              </div>
              <Spacer x={4}></Spacer>
              <div className="flex-1 flex flex-col items-start justify-start">
                <h2 className="text-primary font-semibold">Homeworks</h2>
                {homeworks &&
                  homeworks
                    .filter((item) => item.content_id == selectedParent)
                    .map((i, d) => {
                      return (
                        <div className="flex w-full mb-2 flex-row border-1 rounded-xl p-2 items-center justify-between">
                          <p className="text-sm">{i.title}</p>
                          <div className="flex flex-row items-center justify-end">
                            <Button
                              size="sm"
                              color="success"
                              startContent={<Edit2 size={16}></Edit2>}
                            >
                              Edit
                            </Button>
                            <Spacer x={2}></Spacer>
                            <Button
                              size="sm"
                              color="danger"
                              onPress={() => {
                                deleteHomework(i.id, currentVideo);
                              }}
                              startContent={<Trash2 size={16}></Trash2>}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>

      {/* End Manage Homework */}

      {/* Test Modal */}

      <Modal
        isOpen={testModal}
        onClose={() => {
          showTestModal(false);
        }}
      >
        <ModalContent>
          <ModalHeader>
            Test of{" "}
            {vcategory?.find((item) => item.id == selectedParent)?.title}
          </ModalHeader>
          <ModalBody>
            {tests && tests?.some((item) => item?.vuid == selectedParent) && (
              <div className="bg-gray-50 flex flex-row items-center justify-center p-2 rounded-xl text-center text-sm text-primary">
                {" "}
                Assigned Test :{" "}
                <Chip className="ml-2" size="sm" color="primary">
                  {" "}
                  {tests.find((item) => item?.vuid == selectedParent)?.title}
                </Chip>
                <Popover
                  onOpenChange={(e) => {
                    e == true
                      ? setTestData(
                          tests?.find((item) => item?.vuid == selectedParent)
                        )
                      : setTestData();
                  }}
                >
                  <PopoverTrigger>
                    <Button
                      size="sm"
                      className="ml-2"
                      color="success"
                      isIconOnly
                      startContent={<Edit2 size={16}></Edit2>}
                    ></Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Select
                      className="w-[300px]"
                      selectedKeys={[selectedTest?.toString()]}
                      onSelectionChange={(e) => {
                        setSelectedTest(e.anchorKey);
                      }}
                      placeholder="Select Test category"
                    >
                      {availableTests &&
                        availableTests.map((i, d) => {
                          return (
                            <SelectItem
                              key={i.id}
                              value={i.id}
                              className="flex flex-row items-start"
                            >
                              {i.title}
                            </SelectItem>
                          );
                        })}
                    </Select>
                    {availableTests && selectedTest && (
                      <Select
                        className="w-[300px]"
                        selectedKeys={[testData?.level_id?.toString()]}
                        onSelectionChange={(e) => {
                          setTestData((res) => ({
                            ...res,
                            level_id: e.anchorKey,
                          }));
                        }}
                        placeholder="Select Test"
                      >
                        {availableTests &&
                          availableTests
                            ?.filter((item) => item.id == selectedTest)
                            .flatMap((item) => item.levels)
                            .map((i, d) => {
                              return (
                                <SelectItem
                                  key={i.id}
                                  value={i.id}
                                  className="flex flex-row items-start"
                                >
                                  {i.title}
                                </SelectItem>
                              );
                            })}
                      </Select>
                    )}

                    <Input
                      value={testData?.title ?? ""}
                      title="Test Title"
                      placeholder="Enter Test Title"
                      onChange={(e) => {
                        setTestData((res) => ({
                          ...res,
                          title: e.target.value,
                        }));
                      }}
                    ></Input>
                    <Input
                      value={testData?.description ?? ""}
                      title="Test Description"
                      placeholder="Enter Test Description"
                      onChange={(e) => {
                        setTestData((res) => ({
                          ...res,
                          description: e.target.value,
                        }));
                      }}
                    ></Input>
                    {selectedTest && (
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => {
                          updateTest(testData);
                        }}
                      >
                        Update Test
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  className="ml-2"
                  color="danger"
                  onPress={() => {
                    deleteTest(
                      tests?.find((item) => item?.vuid == selectedParent)?.id
                    );
                  }}
                  isIconOnly
                  startContent={<Trash2 size={16}></Trash2>}
                ></Button>
              </div>
            )}
            {availableTests &&
              !tests?.some((item) => item?.vuid == selectedParent) && (
                <>
                  <Select
                    onSelectionChange={(e) => {
                      setSelectedTest(e.anchorKey);
                    }}
                    placeholder="Select Test category"
                  >
                    {availableTests &&
                      availableTests.map((i, d) => {
                        return (
                          <SelectItem
                            key={i.id}
                            value={i.id}
                            className="flex flex-row items-start"
                          >
                            {i.title}
                          </SelectItem>
                        );
                      })}
                  </Select>

                  {selectedTest && (
                    <Select
                      onSelectionChange={(e) => {
                        setTestData((res) => ({
                          ...res,
                          level_id: e.anchorKey,
                        }));
                      }}
                      selectedKeys={[testData?.level_id?.toString()]}
                      placeholder="Select Test"
                    >
                      {availableTests &&
                        availableTests
                          .filter((item) => item.id == selectedTest)
                          .flatMap((item) => item.levels)
                          .map((i, d) => {
                            return (
                              <SelectItem
                                key={i.id}
                                value={i.id}
                                className="flex flex-row items-start"
                              >
                                {i.title}
                              </SelectItem>
                            );
                          })}
                    </Select>
                  )}

                  <Input
                    value={testData?.title ?? ""}
                    title="Test Title"
                    placeholder="Enter Test Title"
                    onChange={(e) => {
                      setTestData((res) => ({ ...res, title: e.target.value }));
                    }}
                  ></Input>
                  <Input
                    value={testData?.description ?? ""}
                    title="Test Description"
                    placeholder="Enter Test Description"
                    onChange={(e) => {
                      setTestData((res) => ({
                        ...res,
                        description: e.target.value,
                      }));
                    }}
                  ></Input>
                </>
              )}
          </ModalBody>
          <ModalFooter>
            {tests && !tests?.some((item) => item?.vuid == selectedParent) && (
              <Button
                onPress={() => {
                  addTest(testData);
                }}
                size="sm"
                color="primary"
              >
                Add
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* End Test Modal */}

      {/* View Homework */}

      <Modal
        isOpen={homeworkModal}
        onClose={() => {
          showHomeworkModal(false),
            setCurrentHomework(),
            setHomeworkFile(),
            setHomeworkMessage();
        }}
      >
        <ModalContent>
          <ModalHeader>
            Homeworks of{" "}
            {videos?.find((item) => item.id == currentVideo)?.title}
          </ModalHeader>
          <ModalBody className=" overflow-hidden">
            {
              // Homework is submitted
              currentHomework?.submitted ? (
                <Card className="w-full max-w-md mx-auto">
                  <CardBody className="pt-6 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h2 className="text-2xl font-bold mb-2">
                      Homework Submitted Successfully!
                    </h2>
                    <p className="text-gray-600">
                      Your homework has been received and is now being reviewed.
                      Great job!
                    </p>
                  </CardBody>
                  <CardFooter className="flex justify-center">
                    <Button
                      color="primary"
                      onPress={() => {
                        setCurrentHomework(null); // Clear currentHomework
                        setHomeworkFile(null); // Clear uploaded file
                        setHomeworkMessage(""); // Clear any messages
                      }}
                    >
                      Back to List
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                // Homework submission window
                <div className="flex flex-col items-start justify-start">
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<ArrowLeft size={16} />}
                    onPress={() => {
                      setCurrentHomework(null);
                      setHomeworkFile(null);
                      setHomeworkMessage("");
                    }}
                  >
                    Back to List
                  </Button>
                  <Spacer y={4} />
                  <p className="font-semibold">{currentHomework?.title}</p>
                  <p className="text-sm">{currentHomework?.description}</p>
                  <Divider className="my-3" />
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{
                      __html: currentHomework?.content?.text,
                    }}
                  />
                  {currentHomework?.file_url && (
                    <div className="w-full flex flex-row items-center my-2 bg-gray-50 p-2 rounded-xl justify-between">
                      Homework File
                      <Button
                        target="_blank"
                        as={Link}
                        href={currentHomework?.file_url}
                        size="sm"
                        color="secondary"
                        className="text-black"
                      >
                        Download
                      </Button>
                    </div>
                  )}
                  <Spacer y={2} />
                  <div className="flex w-full flex-row items-center justify-start">
                    <FileUploaderHomework
                      onUploadComplete={(e) => setHomeworkFile(e)}
                    />
                    <Spacer x={2} />
                    <Button
                      onPress={() =>
                        submitHomework(homeworkFile, currentHomework)
                      }
                      size="sm"
                      color="primary"
                      className="flex-shrink-0"
                      isDisabled={!homeworkFile}
                    >
                      Submit Homework
                    </Button>
                  </div>
                </div>
              )
            }
          </ModalBody>
          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>

      {/* End View Homework */}

      <div className="flex flex-row items-center justify-between w-full">
        <Button
          size="sm"
          color="primary"
          startContent={<ChevronLeft size={16}></ChevronLeft>}
          onPress={() => {
            onBack();
          }}
        >
          Back to Selection
        </Button>
        <h2 className="text-left text-xl font-normal  px-2 pt-4 lg:pt-0 text-black">
          {title}
        </h2>
        <div></div>
      </div>
      <Spacer y={2}></Spacer>
      <div className="w-full h-full flex flex-row overflow-y-auto overflow-x-hidden rounded-lg">
        {vcategory?.length == 0 ? (
          <p className="border-1 border-dashed border-gray-400 p-2 rounded-lg bg-gray-50 my-2">
            No {title} Found
          </p>
        ) : (
          ""
        )}

        <div
          className={
            "bg-gray-100 fixed left-0 z-[999] h-full md:z-[1] top-0 overflow-y-auto transition-all  md:translate-x-[unset] translate-x-full max-h-full md:relative w-full md:w-[300px] lg:w-[400px] " +
            (drawerActive ? " !translate-x-0 md:translate-x-[unset]" : "")
          }
        >
          <div
            className="right-0 flex md:hidden cursor-pointer bg-white rounded-l-xl top-4 p-3 absolute z-[100]"
            onClick={() => {
              setDrawerActive(false);
            }}
          >
            <ChevronRight className=" "></ChevronRight>
          </div>
          <motion.div
            initial={{ x: "-100%" }}
            exit={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="w-full bg-white relative  overflow-y-auto  right-0 top-0 h-full z-[99] shadow-md"
          >
            {/*  <div className="bg-white text-primary rounded-full shadow-lg w-12 h-12 flex flex-col items-center justify-center top-4 left-4 absolute cursor-pointer hover:brightness-90" onClick={()=>{setDrawerActive(!drawerActive)}}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.53 4.22a.75.75 0 0 1 0 1.06L8.81 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0Z" fill="currentColor"/></svg>
        </div> */}

            {/* Content Here */}

            {vcategory &&
              vcategory
                .filter(
                  (item) => item.type == "parent" && item.group_id == group
                )
                .map((i, d) => {
                  return (
                    <div
                      className="bg-white"
                      startContent={
                        role == "admin" ? (
                          <div className="flex flex-row items-center justify-center">
                            <Popover
                              onOpenChange={(e) => {
                                e == true
                                  ? setEditCategoryData(i)
                                  : setEditCategoryData();
                              }}
                            >
                              <PopoverTrigger>
                                <Button size="sm" color="success" isIconOnly>
                                  <Edit2 color="white" size={16}></Edit2>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Input
                                  size="sm"
                                  label="Video Category Title"
                                  value={editCategoryData?.title}
                                  placeholder="Enter Video Category Title"
                                  onChange={(e) => {
                                    setEditCategoryData((res) => ({
                                      ...res,
                                      title: e.target.value,
                                    }));
                                  }}
                                ></Input>
                                <Input
                                  size="sm"
                                  label="Category Sequenece Number"
                                  value={editCategoryData?.seq}
                                  placeholder="Enter Video Category Sequenece Number"
                                  onChange={(e) => {
                                    setEditCategoryData((res) => ({
                                      ...res,
                                      seq: e.target.value,
                                    }));
                                  }}
                                ></Input>
                                <Textarea
                                  size="sm"
                                  className="mt-3"
                                  label="Video Category Description"
                                  value={editCategoryData?.description}
                                  placeholder="Enter Video Category Description"
                                  onChange={(e) => {
                                    setEditCategoryData((res) => ({
                                      ...res,
                                      description: e.target.value,
                                    }));
                                  }}
                                ></Textarea>
                                <Button
                                  onPress={() => {
                                    updateVideoCategory(editCategoryData);
                                  }}
                                  color="primary"
                                  className="sf mt-3"
                                >
                                  Update
                                </Button>
                              </PopoverContent>
                            </Popover>
                            <Spacer x={1}></Spacer>
                            <Button
                              size="sm"
                              color="danger"
                              onPress={() => {
                                DeleteVideoCategory(i.id);
                              }}
                              isIconOnly
                            >
                              <Trash2 size={16} color="white"></Trash2>
                            </Button>
                            <Divider
                              className="mx-2"
                              orientation="vertical"
                            ></Divider>

                            <Switch
                              isSelected={i.demo}
                              onValueChange={(e) => {
                                updateDemo(e, i.id, categoryName, () => {
                                  getVideoCategories();
                                });
                              }}
                              size="sm"
                            ></Switch>
                          </div>
                        ) : (
                          ""
                        )
                      }
                      key={d}
                      aria-label={i.title}
                      title={i.title}
                      subtitle={i.description}
                    >
                      <div
                        className={
                          "from-primary to-primary-500 text-lg font-bold flex flexo-row items-center justify-center bg-gradient-to-r p-4 sticky top-0 z-50 py-8 text-white " +
                          (d == 0 || role == "admin" || !isDemo
                            ? ""
                            : " grayscale pointer-events-none")
                        }
                      >
                        {i.title}
                        {d === 0 || !isDemo || role == "admin" ? (
                          ""
                        ) : (
                          <Lock className="ml-2" size={16} />
                        )}

                        {role == "admin" ? (
                          <>
                            <Popover
                              onOpenChange={(e) => {
                                e == true
                                  ? setEditCategoryData(i)
                                  : setEditCategoryData();
                              }}
                            >
                              <PopoverTrigger>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  color="secondary"
                                  className="text-black ml-3"
                                >
                                  <Edit2 size={16}></Edit2>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Input
                                  value={editCategoryData?.title}
                                  size="sm"
                                  className="my-1"
                                  placeholder="Enter Category Title"
                                  label="Category Title"
                                  onChange={(e) => {
                                    setEditCategoryData((res) => ({
                                      ...res,
                                      title: e.target.value,
                                    }));
                                  }}
                                ></Input>
                                <Input
                                  value={editCategoryData?.seq}
                                  size="sm"
                                  className="my-1"
                                  placeholder="Enter Number"
                                  label="Category Sequence"
                                  onChange={(e) => {
                                    setEditCategoryData((res) => ({
                                      ...res,
                                      seq: e.target.value,
                                    }));
                                  }}
                                ></Input>
                                {/* <Input value={editCategoryData?.description} size="sm" className="my-1" placeholder="Enter Category Description" label="Category Description" onChange={(e)=>{setEditCategoryData(res=>({...res,description:e.target.value}))}}></Input> */}
                                <Button
                                  size="sm"
                                  color="primary"
                                  onPress={() => {
                                    updateVideoCategory(editCategoryData);
                                  }}
                                >
                                  Update
                                </Button>
                              </PopoverContent>
                            </Popover>
                            <Popover>
                              <PopoverTrigger>
                                <Button
                                  isIconOnly
                                  color="danger"
                                  size="sm"
                                  className="ml-3"
                                >
                                  <Trash2 size={16}></Trash2>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Button
                                  size="sm"
                                  color="danger"
                                  onPress={() => {
                                    DeleteVideoCategory(i.id);
                                  }}
                                >
                                  Confirm Delete
                                </Button>
                              </PopoverContent>
                            </Popover>
                          </>
                        ) : (
                          ""
                        )}
                      </div>

                      <div className="flex flex-col overflow-hidden  bg-gray-100">
                        <div className="flex flex-col my-0 flex-wrap">
                          {vcategory &&
                            vcategory
                              .filter((item) => item.parent == i.id)
                              .map((z, v) => {
                                return (
                                  <>
                                    <div
                                      onClick={() => {
                                        setCurrentCategory(
                                          currentCategory == z.id
                                            ? undefined
                                            : z.id
                                        );
                                      }}
                                      className={
                                        "flex-[50%] px-4 bg-white my-0 border-b-1 border-b-gray-200 p-2 sm:flex-[10%] !flex-grow-0 lg:flex-[10%] xl:flex-[10%] items-between w-full justify-start flex flex-col relative  hover:border-gray-200 border-transparent border-1 cursor-pointer transition-all duration-150 hover:bg-gray-50 " +
                                        ((d == 0 &&
                                          v == 0 &&
                                          !(isDemo && d > 0)) ||
                                        role == "admin" ||
                                        !isDemo
                                          ? ""
                                          : " grayscale pointer-events-none")
                                      }
                                    >
                                      <div className="text-gray-700 text-sm w-full flex flex-row items-center justify-between">
                                        <div className="flex text-left flex-col items-start justify-center">
                                          <p>{z.title}</p>
                                          <p className="text-xs">
                                            {z.description}
                                          </p>
                                        </div>
                                        <div className="flex-1 flex-row flex items-center justify-end">
                                          <Button
                                            size="sm"
                                            className=" bg-transparent pointer-events-none"
                                            isIconOnly
                                          >
                                            {(d == 0 &&
                                              v === 0 &&
                                              !(isDemo && d > 0)) ||
                                            role == "admin" ||
                                            !isDemo ? (
                                              <ChevronUp
                                                className={
                                                  " transition-all rotate-180 " +
                                                  (currentCategory == z.id
                                                    ? " !rotate-0"
                                                    : "")
                                                }
                                              ></ChevronUp>
                                            ) : (
                                              <Lock size={16}></Lock>
                                            )}
                                          </Button>

                                          {role == "admin" ? (
                                            <>
                                              <Button
                                                size="sm"
                                                color="primary"
                                                onPress={() => {
                                                  setManageHomeworkModal(true),
                                                    setSelectedParent(z.id);
                                                }}
                                                isIconOnly
                                              >
                                                <BookText size={16}></BookText>
                                              </Button>
                                              <Spacer x={2}></Spacer>
                                              <Button
                                                size="sm"
                                                color="secondary"
                                                isIconOnly
                                                onPress={() => {
                                                  showTestModal(true),
                                                    getAvailableTests(),
                                                    setSelectedParent(z.id);
                                                }}
                                              >
                                                {" "}
                                                <Clipboard
                                                  size={16}
                                                ></Clipboard>{" "}
                                              </Button>
                                            </>
                                          ) : (
                                            ""
                                          )}
                                          {role == "admin" ? (
                                            <>
                                              {" "}
                                              <Spacer x={2}></Spacer>
                                              <Popover
                                                placement="bottom-start"
                                                onOpenChange={(e) => {
                                                  e == true
                                                    ? setEditCategoryData(z)
                                                    : setEditCategoryData();
                                                }}
                                              >
                                                <PopoverTrigger>
                                                  <Button
                                                    className="z-10"
                                                    size="sm"
                                                    color="success"
                                                    isIconOnly
                                                  >
                                                    <Edit2
                                                      size={16}
                                                      color="white"
                                                    ></Edit2>
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                  <Input
                                                    size="sm"
                                                    label="Video Category Title"
                                                    value={
                                                      editCategoryData?.title
                                                    }
                                                    placeholder="Enter Video Category Title"
                                                    onChange={(e) => {
                                                      setEditCategoryData(
                                                        (res) => ({
                                                          ...res,
                                                          title: e.target.value,
                                                        })
                                                      );
                                                    }}
                                                  ></Input>
                                                  <Textarea
                                                    size="sm"
                                                    className="mt-3"
                                                    label="Video Category Description"
                                                    value={
                                                      editCategoryData?.description
                                                    }
                                                    placeholder="Enter Video Category Description"
                                                    onChange={(e) => {
                                                      setEditCategoryData(
                                                        (res) => ({
                                                          ...res,
                                                          description:
                                                            e.target.value,
                                                        })
                                                      );
                                                    }}
                                                  ></Textarea>
                                                  <Input
                                                    size="sm"
                                                    label="Video Category Sequence"
                                                    value={
                                                      editCategoryData?.seq
                                                    }
                                                    placeholder="Enter Sequence"
                                                    className="mt-2"
                                                    onChange={(e) => {
                                                      setEditCategoryData(
                                                        (res) => ({
                                                          ...res,
                                                          seq: e.target.value,
                                                        })
                                                      );
                                                    }}
                                                  ></Input>
                                                  <Button
                                                    onPress={() => {
                                                      updateVideoCategory(
                                                        editCategoryData
                                                      );
                                                    }}
                                                    color="primary"
                                                    className="sf mt-3"
                                                  >
                                                    Update
                                                  </Button>
                                                </PopoverContent>
                                              </Popover>
                                            </>
                                          ) : (
                                            ""
                                          )}

                                          {role == "admin" ? (
                                            <>
                                              {" "}
                                              <Spacer x={2}></Spacer>
                                              <Popover>
                                                <PopoverTrigger>
                                                  <Button
                                                    color="danger"
                                                    isIconOnly
                                                    size="sm"
                                                  >
                                                    <Trash2
                                                      size={16}
                                                      color="white"
                                                    ></Trash2>
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                  <Button
                                                    size="sm"
                                                    color="danger"
                                                    onPress={() => {
                                                      DeleteVideoCategory(z.id);
                                                    }}
                                                  >
                                                    Confirm Delete
                                                  </Button>
                                                </PopoverContent>
                                              </Popover>
                                            </>
                                          ) : (
                                            ""
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <AnimatePresence mode="wait">
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        animate={{
                                          height:
                                            currentCategory == z.id
                                              ? "100%"
                                              : "0%",
                                          opacity: 1,
                                        }} // Animate height
                                        transition={{
                                          duration: 0.3,
                                          type: "tween",
                                        }} // Animation duration
                                        key={"accoridan" + z.id}
                                        className={"w-full overflow-hidden "}
                                      >
                                        {videos &&
                                          currentCategory == z.id &&
                                          videos
                                            .filter(
                                              (res) => res.category == z.id
                                            )
                                            .map((p, b) => {
                                              return (
                                                <div
                                                  onClick={() => {
                                                    setView(1),
                                                      setCurrentVideo(p.id),
                                                      setDrawerActive(false);
                                                  }}
                                                  className={
                                                    "w-full text-left overflow-hidden hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer flex flex-row items-center py-4 px-3 justify-center flex-nowrap text-xs border-b-1 " +
                                                    (currentVideo == p.id
                                                      ? " bg-gradient-to-r from-secondary to-yellow-400 text-black"
                                                      : "")
                                                  }
                                                >
                                                  {role == "admin" ? (
                                                    <Button
                                                      color="danger"
                                                      size="sm"
                                                      className="sf mr-2"
                                                      onPress={() => {
                                                        DeleteVideo(p.id);
                                                      }}
                                                      isIconOnly
                                                    >
                                                      <Trash2Icon
                                                        size={16}
                                                      ></Trash2Icon>
                                                    </Button>
                                                  ) : (
                                                    ""
                                                  )}
                                                  {role == "admin" ? (
                                                    <Popover
                                                      onOpenChange={(e) => {
                                                        e == true
                                                          ? setEditVideoData(p)
                                                          : setEditVideoData();
                                                      }}
                                                    >
                                                      <PopoverTrigger>
                                                        <Button
                                                          color="success"
                                                          size="sm"
                                                          className="sf mr-2"
                                                          onPress={() => {
                                                            DeleteVideo(p.id);
                                                          }}
                                                          isIconOnly
                                                        >
                                                          <Edit2
                                                            color="white"
                                                            size={16}
                                                          ></Edit2>
                                                        </Button>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-[300px] p-4 flex flex-col items-start justify-start">
                                                        <Input
                                                          label="Video Title"
                                                          value={
                                                            editVideoData?.title
                                                          }
                                                          placeholder="Enter Video Title"
                                                          onChange={(e) => {
                                                            setEditVideoData(
                                                              (res) => ({
                                                                ...res,
                                                                title:
                                                                  e.target
                                                                    .value,
                                                              })
                                                            );
                                                          }}
                                                        ></Input>
                                                        <Input
                                                          value={
                                                            editVideoData?.url
                                                          }
                                                          className="mt-3"
                                                          label="Video URL"
                                                          placeholder="Enter Video URL"
                                                          onChange={(e) => {
                                                            setEditVideoData(
                                                              (res) => ({
                                                                ...res,
                                                                url: e.target
                                                                  .value,
                                                              })
                                                            );
                                                          }}
                                                        ></Input>
                                                        <Input
                                                          value={
                                                            editVideoData?.seq
                                                          }
                                                          className="mt-3"
                                                          label="Video Sequence"
                                                          placeholder="Enter Video Sequence"
                                                          onChange={(e) => {
                                                            setEditVideoData(
                                                              (res) => ({
                                                                ...res,
                                                                seq: e.target
                                                                  .value,
                                                              })
                                                            );
                                                          }}
                                                        ></Input>
                                                        <Select
                                                          classNames="my-2"
                                                          items={[
                                                            {
                                                              title: "YouTube",
                                                              value: "yt",
                                                            },
                                                            {
                                                              title: "HTML5",
                                                              value: "html5",
                                                            },
                                                            {
                                                              title:
                                                                "Self Hosted",
                                                              value: "self",
                                                            },
                                                            {
                                                              title: "Vimeo",
                                                              value: "vimeo",
                                                            },
                                                          ]}
                                                          label="Select Type"
                                                          placeholder="....Select Type"
                                                          className="max-w-md sf my-2"
                                                          selectedKeys={[
                                                            editVideoData?.type,
                                                          ]}
                                                          onChange={(e) => {
                                                            setEditVideoData(
                                                              (res) => ({
                                                                ...res,
                                                                type: e.target
                                                                  .value,
                                                              })
                                                            );
                                                          }}
                                                        >
                                                          {(emailz) => (
                                                            <SelectItem
                                                              className="sf font-bold"
                                                              key={emailz.value}
                                                            >
                                                              {emailz.title}
                                                            </SelectItem>
                                                          )}
                                                        </Select>
                                                        <Switch
                                                          isSelected={
                                                            editVideoData?.demo ??
                                                            false
                                                          }
                                                          onValueChange={(
                                                            e
                                                          ) => {
                                                            setEditVideoData(
                                                              (res) => ({
                                                                ...res,
                                                                demo: e,
                                                              })
                                                            );
                                                          }}
                                                        >
                                                          {" "}
                                                          Is Demo
                                                        </Switch>

                                                        <Button
                                                          onPress={() => {
                                                            updateVideo(
                                                              editVideoData
                                                            );
                                                          }}
                                                          color="primary"
                                                          className="sf mt-3"
                                                        >
                                                          Update Video
                                                        </Button>
                                                      </PopoverContent>
                                                    </Popover>
                                                  ) : (
                                                    ""
                                                  )}
                                                  <p className=" w-full text-nowrap text-ellipsis overflow-hidden whitespace-nowrap ">
                                                    {p.title}
                                                  </p>

                                                  <Play
                                                    fill="#666"
                                                    stroke="transparent"
                                                    size={16}
                                                  ></Play>
                                                </div>
                                              );
                                            })}

                                        {homeworks &&
                                          currentCategory == z.id &&
                                          homeworks
                                            .filter(
                                              (item) => item.content_id == z.id
                                            )
                                            .map((hmwrk, hindex) => {
                                              return (
                                                <div className="flex flex-row items-center justify-between bg-gray-100 hover:bg-gray-50 p-4 border-b-1 py-2">
                                                  <div className="text-xs flex flex-row items-center justify-start flex-1 text-left">
                                                    <BookText
                                                      size={20}
                                                    ></BookText>
                                                    <Spacer x={1}></Spacer>
                                                    {hmwrk.title}
                                                  </div>
                                                  <div className="flex-1 flex flex-row items-end justify-end">
                                                    <Button
                                                      color="primary"
                                                      size="sm"
                                                      isDisabled={isDemo}
                                                      onPress={() => {
                                                        isDemo
                                                          ? toast.error(
                                                              "You cannot access this feature in demo mode"
                                                            )
                                                          : showHomeworkModal(
                                                              true
                                                            ),
                                                          setCurrentHomework(
                                                            hmwrk
                                                          );
                                                      }}
                                                      startContent={<Eye></Eye>}
                                                    >
                                                      View/Submit
                                                    </Button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        {tests &&
                                          currentCategory == z.id &&
                                          tests
                                            .filter((item) => item.vuid == z.id)
                                            .map((test, testindex) => {
                                              return (
                                                <div className="flex flex-row items-center justify-between bg-gray-100 hover:bg-gray-50 p-4 border-b-1 py-2">
                                                  <div className="text-xs flex flex-row items-center justify-start flex-1 text-left">
                                                    <Clipboard
                                                      size={20}
                                                    ></Clipboard>
                                                    <Spacer x={1}></Spacer>
                                                    {test.title}
                                                  </div>
                                                  <div className="flex-1 flex flex-row items-end justify-end">
                                                    {test?.self_learning_attempts.some(
                                                      (item) =>
                                                        item.is_passed == true
                                                    ) ? (
                                                      <Button
                                                        variant="flat"
                                                        color="success"
                                                        size="sm"
                                                        startContent={
                                                          <Check
                                                            size={16}
                                                          ></Check>
                                                        }
                                                      >
                                                        Test Passed
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        as={Link}
                                                        href={
                                                          isDemo
                                                            ? `/self-learning/test/demo/${test?.uuid}`
                                                            : `/self-learning/test/${test?.uuid}`
                                                        }
                                                        target="_blank"
                                                        color="primary"
                                                        size="sm"
                                                        endContent={
                                                          <ArrowRight></ArrowRight>
                                                        }
                                                      >
                                                        Attempt Test
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                      </motion.div>
                                    </AnimatePresence>
                                    {role == "admin" ? (
                                      <Popover className="w-full sf">
                                        <PopoverTrigger>
                                          <div className="w-full border-1 text-xs my-2 rounded-lg border-dashed border-gray-200 p-2 hover:border-gray-500 cursor-pointer bg-gray-300">
                                            Add New Video
                                          </div>
                                        </PopoverTrigger>

                                        <PopoverContent className="w-full p-5 min-w-[500px] text-left items-start justify-start">
                                          <Input
                                            label="Video Title"
                                            placeholder="Enter Video Title"
                                            onChange={(e) => {
                                              setVideosData((res) => ({
                                                ...res,
                                                title: e.target.value,
                                              }));
                                            }}
                                          ></Input>

                                          {/* <Dropdown><DropdownTrigger>
 <Button size='sm' color='primary' ><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.25 3.509a.75.75 0 1 0 0-1.5l-13-.004a.75.75 0 1 0 0 1.5l13 .004Zm-6.602 18.488.102.007a.75.75 0 0 0 .743-.649l.007-.101-.001-13.685 3.722 3.72a.75.75 0 0 0 .976.072l.085-.072a.75.75 0 0 0 .072-.977l-.073-.084-4.997-4.996a.75.75 0 0 0-.976-.073l-.085.072-5.003 4.997a.75.75 0 0 0 .976 1.134l.084-.073 3.719-3.713L11 21.254c0 .38.282.693.648.743Z" fill="#222F3D"/></svg> Upload Video</Button> 
</DropdownTrigger>

<DropdownMenu>
  <DropdownItem isReadOnly>
    <VideoUploader onComplete={(e)=>{setVideosData(res=>({...res,url:e}))}} value={videosData?.url || ''}></VideoUploader>
  </DropdownItem>
  
</DropdownMenu>
</Dropdown> */}
                                          <Input
                                            value={videosData?.url}
                                            className="mt-3"
                                            label="Video URL"
                                            placeholder="Enter Video URL"
                                            onChange={(e) => {
                                              setVideosData((res) => ({
                                                ...res,
                                                url: e.target.value,
                                              }));
                                            }}
                                          ></Input>

                                          <Select
                                            classNames="my-2"
                                            items={[
                                              {
                                                title: "YouTube",
                                                value: "yt",
                                              },
                                              {
                                                title: "HTML5",
                                                value: "html5",
                                              },
                                              {
                                                title: "Self Hosted",
                                                value: "self",
                                              },
                                              {
                                                title: "Vimeo",
                                                value: "vimeo",
                                              },
                                            ]}
                                            label="Select Type"
                                            placeholder="....Select Type"
                                            className="max-w-md sf my-2"
                                            onChange={(e) => {
                                              setVideosData((res) => ({
                                                ...res,
                                                type: e.target.value,
                                              }));
                                            }}
                                          >
                                            {(emailz) => (
                                              <SelectItem
                                                className="sf font-bold"
                                                key={emailz.value}
                                              >
                                                {emailz.title}
                                              </SelectItem>
                                            )}
                                          </Select>

                                          <Button
                                            onPress={() => {
                                              AddVideo(videosData, z.id);
                                            }}
                                            color="primary"
                                            className="sf mt-3"
                                          >
                                            Add Video
                                          </Button>
                                        </PopoverContent>
                                      </Popover>
                                    ) : (
                                      ""
                                    )}
                                  </>
                                );
                              })}
                          {role == "admin" ? (
                            <Popover className="w-full sf">
                              <PopoverTrigger>
                                <div className=" flex-[10%] grayscale items-center justify-center flex flex-row p-4 flex-grow-0 border-dashed border-gray-200  border-1 cursor-pointer rounded-xl transition-all duration-150 hover:bg-gray-50">
                                  <PlusIcon className="mr-2"></PlusIcon>
                                  <p className="text-gray-600 text-sm">
                                    Add New Folder
                                  </p>
                                </div>
                              </PopoverTrigger>

                              <PopoverContent className="w-full p-5 min-w-[500px] text-left items-start justify-start">
                                <Input
                                  label="Video Category Title"
                                  value={videosData?.cattitle}
                                  placeholder="Enter Video Category Title"
                                  onChange={(e) => {
                                    setVideosData((res) => ({
                                      ...res,
                                      cattitle: e.target.value,
                                    }));
                                  }}
                                ></Input>
                                <Textarea
                                  className="mt-3"
                                  label="Video Category Description"
                                  value={videosData?.catdesc}
                                  placeholder="Enter Video Category Description"
                                  onChange={(e) => {
                                    setVideosData((res) => ({
                                      ...res,
                                      catdesc: e.target.value,
                                    }));
                                  }}
                                ></Textarea>

                                <Button
                                  onPress={() => {
                                    AddVideoCategory(videosData, "sub", i.id);
                                  }}
                                  color="primary"
                                  className="sf mt-3"
                                >
                                  Add Category
                                </Button>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            ""
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

            {role == "admin" ? (
              <Popover className="w-full sf">
                <PopoverTrigger>
                  <div className="w-full bg-secondary  p-2 hover:border-gray-500 cursor-pointer">
                    Add New Category
                  </div>
                </PopoverTrigger>

                <PopoverContent className="w-full p-5 min-w-[500px] text-left items-start justify-start">
                  <Input
                    label="Video Category Title"
                    placeholder="Enter Video Category Title"
                    onChange={(e) => {
                      setVideosData((res) => ({
                        ...res,
                        cattitle: e.target.value,
                      }));
                    }}
                  ></Input>
                  <Textarea
                    className="mt-3"
                    label="Video Category Description"
                    placeholder="Enter Video Category Description"
                    onChange={(e) => {
                      setVideosData((res) => ({
                        ...res,
                        catdesc: e.target.value,
                      }));
                    }}
                  ></Textarea>
                  <Button
                    onPress={() => {
                      AddVideoCategory(videosData, "parent");
                    }}
                    color="primary"
                    className="sf mt-3"
                  >
                    Add Category
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              ""
            )}
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.2, type: "spring" }}
            className="flex-1 bg-gray-50 p-4"
          >
            <div className="flex flex-row items-center justify-end w-full my-2 md:hidden">
              <div
                onClick={() => {
                  setDrawerActive(true);
                }}
                className="  rounded-xl cursor-pointer p-2  bg-white shadow-md flex flex-row items-center justify-start"
              >
                <SidebarOpen className="mr-2"></SidebarOpen> Open Modules
              </div>
            </div>
            {view == 0 && !currentVideo ? (
              <div className="w-full h-full text-gray-500 flex flex-col items-center justify-center">
                <Video size={48} color="#ddd"></Video>
                Please select a video from modules to watch
              </div>
            ) : (
              ""
            )}
            {view == 1 && currentVideo ? (
              <>
                <Modal
                  key={videoURL}
                  size="3xl"
                  className="flex mdl flex-col gap-1 text-center items-center"
                  onClose={() => {
                    setFullScreenVideo(false);
                  }}
                  placement="center"
                  isOpen={fullScreenVideo}
                >
                  <ModalContent className="sf">
                    {(onClose) => (
                      <>
                        <ModalBody className="w-full mt-5 p-8">
                          <iframe
                            className="rounded-lg overflow-hidden aspect-video w-full"
                            width="100%"
                            height="100%"
                            src={videoURL}
                            frameborder="0"
                            allowfullscreen="true"
                          ></iframe>
                        </ModalBody>
                      </>
                    )}
                  </ModalContent>
                </Modal>

                {/* <div className="flex flex-row items-center justify-start my-2">
<Button startContent={<svg width="16" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#DDE6E8"/></svg>} size="sm" color="primary" onPress={()=>{setView(0),setCurrentCategory()}}>Back to Categories</Button></div> */}
                <div className="w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    className="rounded-lg overflow-hidden aspect-video w-full h-full"
                    width="100%"
                    height="100%"
                    src={videos?.find((item) => item.id == currentVideo)?.url}
                    frameborder="0"
                    allowfullscreen="true"
                  ></iframe>
                </div>
                <Spacer y={2}></Spacer>
                <h2 className="text-xl sm:text-3xl md:text-4xl  my-3 text-primary font-bold text-left">
                  {videos?.find((item) => item.id == currentVideo)?.title}
                </h2>
              </>
            ) : (
              ""
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const FolderIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 85"
      width={96}
      fill="#FFF"
    >
      <path
        fill="#FFB900"
        d="M45 24l-4.243-4.243A6 6 0 0036.515 18H9a3 3 0 00-3 3v56a1 1 0 001 1h82a1 1 0 001-1V27a3 3 0 00-3-3H45z"
      />
      <path
        fill="#FFD75E"
        d="M45 24l-4.243 4.243A6 6 0 0136.515 30H6v47a1 1 0 001 1h82a1 1 0 001-1V27a3 3 0 00-3-3H45z"
      />
      <linearGradient
        id="a"
        x1={48}
        x2={48}
        y1={24}
        y2={78}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#fff" stopOpacity={0} />
        <stop offset={1} stopColor="#ffd75e" stopOpacity={0.3} />
      </linearGradient>
      <path
        fill="url(#a)"
        d="M45 24l-4.243 4.243A6 6 0 0136.515 30H6v47a1 1 0 001 1h82a1 1 0 001-1V27a3 3 0 00-3-3H45z"
      />
      <path
        opacity={0.4}
        d="M6 30v1h30.6a7 7 0 004.95-2.05L46.5 24H45l-4.243 4.243A6 6 0 0136.515 30H6z"
      />
      <path fill="#DA7B16" d="M89 78H7a1 1 0 01-1-1h84a1 1 0 01-1 1z" />
    </svg>
  );
};
