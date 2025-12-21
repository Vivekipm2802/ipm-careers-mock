import { supabase } from "@/utils/supabaseClient";
import {
  Accordion,
  AccordionItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Input,
  Textarea,
} from "@nextui-org/react";
import { useEffect, useState } from "react";

function Tutorials({ type, userData }) {
  const [tutorialData, setTutorialData] = useState();
  const [tutorialCategories, setTutorialCategories] = useState();
  const [tutorials, setTutorials] = useState();

  useEffect(() => {
    getTutorialCategories();
    getTutorials();
  }, []);

  async function updateTutorials(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase
      .from("teacher_tutorials")
      .update({
        title: a?.vtitle,
        description: a?.vdescription,
        video: a?.vvideo,
      })
      .eq("id", b);

    if (!error) {
      getTutorials();
    }
  }
  async function updateTutorialCategory(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase
      .from("teacher_tutorials")
      .update({
        title: a?.utitle,
        description: a?.udescription,
      })
      .eq("id", b);

    if (!error) {
      getTutorialCategories();
    }
  }
  async function getTutorialCategories() {
    const { data, error } = await supabase
      .from("teacher_tutorials")
      .select("*")
      .eq("type", "category")
      .order("created_at", { ascending: true });
    if (data) {
      setTutorialCategories(data);
    }
  }

  async function getTutorials() {
    const { data, error } = await supabase
      .from("teacher_tutorials")
      .select("*")
      .eq("type", "content")
      .order("created_at", { ascending: true });
    if (data) {
      setTutorials(data);
    }
  }

  return (
    <div className="w-full h-full sf flex flex-col justify-center align-middle items-center">
      <div className="w-full h-full flex flex-col overflow-y-auto">
        <Accordion isCompact defaultExpandedKeys={["0"]}>
          {tutorialCategories &&
            tutorialCategories.map((i, d) => {
              return (
                <AccordionItem
                  startContent={
                    type == "admin" ? (
                      <>
                        <Popover
                          className="flex flex-col justify-start align-middle items-start sf"
                          onOpenChange={(e) => {
                            e == true
                              ? setTutorialData((res) => ({
                                  ...res,
                                  utitle: i?.title,
                                  udescription: i?.description,
                                }))
                              : "";
                          }}
                        >
                          <PopoverTrigger>
                            <Button className="mr-2" size="sm" color="success">
                              Update
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent>
                            <Input
                              value={tutorialData?.utitle}
                              label="Tutorial Category Title"
                              placeholder="Enter Tutorial Category Title"
                              onChange={(e) => {
                                setTutorialData((res) => ({
                                  ...res,
                                  utitle: e.target.value,
                                }));
                              }}
                            ></Input>
                            <Textarea
                              value={tutorialData?.udescription}
                              className="mt-3"
                              label="Tutorial Category Description (optional)"
                              placeholder="Enter Tutorial Category Description (optional)"
                              onChange={(e) => {
                                setTutorialData((res) => ({
                                  ...res,
                                  udescription: e.target.value,
                                }));
                              }}
                            ></Textarea>

                            <Button
                              className="mr-2"
                              size="sm"
                              color="primary"
                              onPress={() => {
                                updateTutorialCategory(tutorialData, i.id);
                              }}
                            >
                              Update
                            </Button>
                          </PopoverContent>
                        </Popover>
                        <Button
                          color="danger"
                          size="sm"
                          onPress={() => {
                            DeleteTutorialCategory(i.id);
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      ""
                    )
                  }
                  key={d}
                  aria-label={i.title}
                  title={i.title}
                  subtitle={i.description}
                >
                  {/* Tutorial Content */}
                  <div className="flex flex-row flex-wrap justify-start align-top items-start">
                    {tutorials &&
                      tutorials
                        .filter((res) => res.parent == i.id)
                        .map((z, v) => {
                          return (
                            <div className="flex flex-col justify-start items-start align-top">
                              <iframe
                                className="rounded-lg overflow-hidden w-[150px] lg:w-[250px] m-1 bg-gray-200 lg:min-h-[5vw] aspect-video"
                                width="100%"
                                height="100%"
                                src={z?.video}
                                frameborder="0"
                                allowfullscreen="true"
                              ></iframe>
                              <h2 className="font-bold">{z?.title}</h2>
                              <p className="text-sm text-gray-600">
                                {z?.description}
                              </p>
                              <div>
                                {type == "admin" ? (
                                  <>
                                    <Popover
                                      className="flex flex-col justify-start align-middle items-start sf"
                                      onOpenChange={(e) => {
                                        e == true
                                          ? setTutorialData((res) => ({
                                              ...res,
                                              vtitle: z?.title,
                                              vdescription: z?.description,
                                              vvideo: z?.video,
                                            }))
                                          : "";
                                      }}
                                    >
                                      <PopoverTrigger>
                                        <Button
                                          className="mr-2"
                                          size="sm"
                                          color="success"
                                        >
                                          Update
                                        </Button>
                                      </PopoverTrigger>

                                      <PopoverContent>
                                        <Input
                                          value={tutorialData?.vvideo}
                                          className="mb-3"
                                          label="Tutorial Video URL"
                                          placeholder="Enter Tutorial Video URL"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              vvideo: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Popover>
                                          <PopoverTrigger>
                                            {tutorialData?.vvideo !=
                                            undefined ? (
                                              <Button
                                                className="mb-3"
                                                color="primary"
                                              >
                                                Preview Video
                                              </Button>
                                            ) : (
                                              ""
                                            )}
                                          </PopoverTrigger>
                                          <PopoverContent>
                                            <iframe
                                              className="rounded-lg overflow-hidden min-h-[20vw] lg:min-h-[10vw] w-full"
                                              width="100%"
                                              height="100%"
                                              src={tutorialData?.vvideo}
                                              frameborder="0"
                                              allowfullscreen="true"
                                            ></iframe>
                                          </PopoverContent>
                                        </Popover>

                                        <Input
                                          value={tutorialData?.vtitle}
                                          label="Tutorial Title"
                                          placeholder="Enter Tutorial Video Title"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              vtitle: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Textarea
                                          value={tutorialData?.vdescription}
                                          className="mt-3"
                                          label="Tutorial Video Description (optional)"
                                          placeholder="Enter Tutorial Description (optional)"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              vdescription: e.target.value,
                                            }));
                                          }}
                                        ></Textarea>

                                        <Button
                                          className="mr-2"
                                          size="sm"
                                          color="primary"
                                          onPress={() => {
                                            updateTutorials(tutorialData, z.id);
                                          }}
                                        >
                                          Update
                                        </Button>
                                      </PopoverContent>
                                    </Popover>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onPress={() => {
                                        DeleteTutorials(z.id);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  ""
                                )}
                              </div>
                            </div>
                          );
                        })}
                    {tutorials == undefined || tutorials?.length == 0 ? (
                      <div className="rounded-lg p-5 overflow-hidden min-h-[10vw] border-dashed border-1 border-gray-400 lg:min-h-[5vw] flex flex-col justify-center items-center align-middle relative aspect-video w-[150px] lg:w-[250px] m-1">
                        No Video Found
                      </div>
                    ) : (
                      ""
                    )}
                    {type == "admin" ? (
                      <div className="rounded-lg p-5 overflow-hidden min-h-[10vw] bg-gray-200 lg:min-h-[5vw] flex flex-col justify-center items-center align-middle relative aspect-video w-[150px] lg:w-[250px] m-1">
                        <Popover>
                          <PopoverTrigger>
                            <Button color="primary">Add Video</Button>
                          </PopoverTrigger>
                          <PopoverContent className="sf py-5 min-w-[500px] flex flex-col justify-start items-start">
                            <Input
                              className="mb-3"
                              label="Tutorial Video URL"
                              placeholder="Enter Tutorial Video URL"
                              onChange={(e) => {
                                setTutorialData((res) => ({
                                  ...res,
                                  vvideo: e.target.value,
                                }));
                              }}
                            ></Input>
                            <Popover>
                              <PopoverTrigger>
                                {tutorialData?.vvideo != undefined ? (
                                  <Button className="mb-3" color="primary">
                                    Preview Video
                                  </Button>
                                ) : (
                                  ""
                                )}
                              </PopoverTrigger>
                              <PopoverContent>
                                <iframe
                                  className="rounded-lg overflow-hidden min-h-[20vw] lg:min-h-[10vw] w-full"
                                  width="100%"
                                  height="100%"
                                  src={tutorialData?.vvideo}
                                  frameborder="0"
                                  allowfullscreen="true"
                                ></iframe>
                              </PopoverContent>
                            </Popover>
                            <Input
                              label="Tutorial Title"
                              placeholder="Enter Tutorial Title"
                              onChange={(e) => {
                                setTutorialData((res) => ({
                                  ...res,
                                  vtitle: e.target.value,
                                }));
                              }}
                            ></Input>
                            <Textarea
                              className="mt-3"
                              label="Tutorial Description"
                              placeholder="Enter Tutorial Description"
                              onChange={(e) => {
                                setTutorialData((res) => ({
                                  ...res,
                                  vdescription: e.target.value,
                                }));
                              }}
                            ></Textarea>

                            <Button
                              onPress={() => {
                                addTutorial(tutorialData, i.id);
                              }}
                              color="primary"
                              className="sf mt-3"
                            >
                              Add Video
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                </AccordionItem>
              );
            })}
        </Accordion>

        {type == "admin" ? (
          <Popover className="w-full sf">
            <PopoverTrigger>
              <div className="w-full border-1 rounded-lg border-dashed border-gray-200 p-2 hover:border-gray-500 cursor-pointer">
                Add New Category
              </div>
            </PopoverTrigger>

            <PopoverContent className="w-full p-5 min-w-[500px] text-left items-start justify-start">
              <Input
                label="Tutorial Category Title"
                placeholder="Enter Tutorial Category Title"
                onChange={(e) => {
                  setTutorialData((res) => ({ ...res, title: e.target.value }));
                }}
              ></Input>
              <Textarea
                className="mt-3"
                label="Tutorial Category Description (optional)"
                placeholder="Enter Tutorial Category Description (optional)"
                onChange={(e) => {
                  setTutorialData((res) => ({
                    ...res,
                    description: e.target.value,
                  }));
                }}
              ></Textarea>
              <Button
                onPress={() => {
                  addTutorialCategory(tutorialData);
                }}
                color="primary"
                className="sf mt-3"
              >
                Add Tutorial Category
              </Button>
            </PopoverContent>
          </Popover>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}

export default Tutorials;
