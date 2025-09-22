import { useNMNContext } from "@/components/NMNContext";
import { Avatar, Spacer } from "@nextui-org/react";
import { toast } from "react-hot-toast";

export function getStatusIcon(a, report, isSpecial, tempAnswers) {
  if (
    report?.some((item) => item.id == a.id && item.status == "markedForReview")
  ) {
    return (
      <img
        className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
        src="/amr.svg"
      />
    );
  }
  if (
    report?.find((item) => item.id == a.id) &&
    ((isSpecial == true &&
      report?.find((item) => item.id == a.id)?.isCorrect == false) ||
      false)
  ) {
    return (
      <img
        className=" -z-[10] absolute left-0 top-0 w-full h-full object-contain"
        src="/na.svg"
      />
    );
  }

  if (report?.find((item) => item.id == a.id && item?.status != "review")) {
    return (
      <img
        className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
        src="/sc.svg"
      />
    );
  }
  if (
    report
      ?.filter((item) => item.status == "review")
      ?.some((item) => item.id == a.id)
  ) {
    return (
      <img
        className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
        src="/mr.svg"
      />
    );
  }

  // Check for temporary answers (immediate feedback)
  if (tempAnswers && tempAnswers[a.id]) {
    return (
      <img
        className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
        src="/sc.svg"
      />
    );
  }

  return;
}

export default function QuestionBrowser({
  sideBarActive,
  setSidebarActive,
  gamestate,
  questions,
  report,
  tempAnswers,
  switchQuestion,
}) {
  const { userDetails } = useNMNContext();
  function getStatus(a) {
    if (
      report?.some((item) => item.id == a.id) &&
      report
        ?.filter((item) => item.status == "review")
        .some((item) => item.id == a.id)
    ) {
      return " aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md";
    }

    if (report?.some((item) => item.id == a.id)) {
      return " aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md";
    }
    if (
      report
        ?.filter((item) => item.status == "review")
        .some((item) => item.id == a.id)
    ) {
      return "aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md";
    }
    if (report?.some((item) => item.id == a.id)) {
      return " aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md bg-transparent";
    }
    return " border-1 text-black border-gray-400 aspect-square w-12 flex flex-col items-center justify-center rounded-md from-white to-gray-200 bg-gradient-to-b";
  }

  return (
    <div
      className={
        "flex h-full flex-col w-full max-w-0 bg-white shadow-[-2px_-2px_12px_-6px_#6663] transition-all z-[20] ease-in-out duration-300 translate-x-full fixed right-0 top-0  lg:relative  lg:translate-x-0 " +
        (sideBarActive ? " !max-w-[400px] !translate-x-0" : "")
      }
    >
      <div
        className="bg-primary w-auto h-auto bottom-8 lg:hidden flex  absolute p-2 rounded-r-xl"
        onClick={() => {
          setSidebarActive(false);
        }}
      >
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z"
            fill="#fff"
          />
        </svg>
      </div>
      <div
        className={"w-full flex-col hidden " + (sideBarActive ? " !flex " : "")}
      >
        {gamestate == 0 ? (
          <div className="p-4">
            <div className="p-4 rounded-xl border-1 border-gray-200 flex flex-row">
              <Avatar
                src={userDetails?.user_metadata?.profile_pic || ""}
                className="w-32 h-32"
              ></Avatar>
              <div className="flex flex-col p-2 px-4">
                <h2 className="text-xl font-bold text-primary">
                  {userDetails?.user_metadata?.full_name}
                </h2>
              </div>
            </div>
          </div>
        ) : (
          ""
        )}

        {gamestate == 1 ? (
          <>
            <div className="p-4 font-sans flex flex-row flex-wrap text-xs w-full">
              <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                <div className="w-8 h-8 relative">
                  <img
                    className="w-full h-full object-contain z-0"
                    src="/sc.svg"
                  />
                  <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                    <p className="text-white flex text-center">
                      {report?.length || 0}
                    </p>
                  </div>
                </div>
                <Spacer x={2} y={2}></Spacer>
                <p>Answered</p>
              </div>
              {/*   <div className=' w-1/2 flex-row flex items-center justify-start p-1'>
      <div className='w-8 h-8 relative'><img className='w-full h-full object-contain z-0' src='/na.svg'/>
        <div className='absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]'>
        <p className='text-white flex text-center'>{(questions?.length)-(report?.length || 0)}</p></div>
        </div>
        <Spacer x={2} y={2}></Spacer>
        <p>Not Answered</p>
      </div> */}
              <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                <div className="w-8 h-8 relative">
                  <div className="w-8 h-8 object-contain border-1 text-black border-gray-400 aspect-square flex flex-col items-center justify-center rounded-md from-white to-gray-200 bg-gradient-to-b" />
                  <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                    <p className="text-black flex text-center">
                      {questions?.length - (report?.length || 0)}
                    </p>
                  </div>
                </div>

                <Spacer x={2} y={2}></Spacer>
                <p>Not Answered</p>
              </div>
              <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                <div className="w-8 h-8 relative">
                  <img
                    className="w-full h-full object-contain z-0"
                    src="/mr.svg"
                  />
                  <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                    <p className="text-white flex text-center">
                      {report?.filter((item) => item.status == "review")
                        ?.length || 0}
                    </p>
                  </div>
                </div>
                <Spacer x={2} y={2}></Spacer>
                <p>Marked for Review</p>
              </div>
              <div className=" w-full flex-row flex items-center justify-start p-1 relative">
                <div className="w-8 h-8 relative">
                  <img
                    className="w-full h-full object-contain z-0"
                    src="/amr.svg"
                  />
                  <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                    <p className="text-white flex text-center">
                      {report?.filter(
                        (item) => item.status == "markedForReview"
                      )?.length || 0}
                    </p>
                  </div>
                </div>
                <Spacer x={2} y={2}></Spacer>
                <p>Answered & Marked for Review</p>
              </div>
            </div>

            <div className="p-4 bg-primary-50">
              <h2>Questions</h2>
              <div className="flex flex-row relative items-center justify-start flex-wrap">
                {questions &&
                  questions.map((i, d) => {
                    return (
                      <div
                        className="p-1 relative group"
                        onClick={() => {
                          switchQuestion(i.id);
                        }}
                      >
                        <div className="absolute left-0 top-0 opacity-0 group-hover:opacity-100 w-full h-full transition-all group-hover:scale-95 scale-75 z-[1] border-1 border-secondary-400 rounded-md"></div>
                        <div
                          className={
                            "p-1 z-10 cursor-pointer flex flex-col items-center justify-center relative font-sans " +
                            getStatus(i)
                          }
                        >
                          <p className="z-10  mt-[4px]">{d + 1}</p>
                          {getStatusIcon(i, report, false, tempAnswers)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
