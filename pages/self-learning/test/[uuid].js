import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Flasher from '@/components/Flasher';
import { Button, ScrollShadow, Spacer } from '@nextui-org/react';
import { serversupabase, supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';
import HeaderMock from './components/HeaderMock';
import { useTimer } from 'react-timer-hook';
import { useNMNContext } from '@/components/NMNContext';
import { useMediaQuery } from 'react-responsive';
import { toast } from 'react-hot-toast';
import QuestionBrowser, { getStatusIcon } from './components/QuestionBrowser';
import QuestionCard from './components/QuestionCard';
import { Check, ChevronLeft, ChevronRight, Grip, Home, X, XCircle } from 'lucide-react';




import { motion } from 'framer-motion';
import DraggableModal from './components/Modal';
import axios from 'axios';


const canvasStyles = {
    position: "fixed",
    pointerEvents: "none",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    zIndex:9999,
  };


      

const Game = ({test_data}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' })
  const [sideBarActive,setSidebarActive] = useState(!isMobile);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [level, setLevel] = useState(0);
  
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({});
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHintAvailable, setIsHintAvailable] = useState(true);
  const [isHintVisible, setisHintVisible] = useState(false);
  const [config, setConfig] = useState({
    increment: 4,
    decrement: 1
  })
  const [gamestate, setGameState] = useState(0);
  const [questions, setQuestions] = useState();
  const [parentData, setParentData] = useState();
  const [leaderboard, setLeaderBoard] = useState();
  const [status,setStatus] = useState(undefined)
  const [report, setReport] = useState([]);
  const [activeExplanation, setActiveExplanation] = useState()
  const [drawerActive,setDrawerActive] = useState(false)
  const [calculatorActive,setCalculatorActive]= useState(false)
  const {userDetails,isDemo} = useNMNContext()
  
  async function submitScore(a){
    const {data,error} = await supabase.from('self_learning_attempts').insert({

  test_uid:test_data?.uuid,
  report:a,
  
  
    }).select();

    if(data && data.length != 0){
      
      toast.success('Submitted Scores')
  }
  if(error){
    if(error?.code == "23505"){
        toast.error('Cannot Submit Again')
    }
  }
  }
  const timeDuration = (parentData?.time*60) ;

  const {
    seconds,
    minutes,
    hours,
    totalSeconds,
    restart,
    isRunning,
  } = useTimer({
    expiryTimestamp: new Date(),
    onExpire: () => handleComplete(),
    autoStart: false,
  });

  useEffect(() => {
    if (gamestate === 1) {
      const time = new Date();
      time.setSeconds(time.getSeconds() + timeDuration);
      restart(time);
    }
  }, [ gamestate, restart, timeDuration]);

  const handleComplete = () => {
    setGameState(2)
    submitScore(report)
  };

const router = useRouter();
async function getQuestions() {
  try {
      // Call is_user_paid RPC first
      const { data: isPaid } = await supabase.rpc('is_user_paid');

      setStatus(isPaid)
      if(isPaid == false){
        return
      }

      // Fetch questions if user is paid
      const { data } = await axios.post('/api/getSelfAttemptData', {
          level_id: test_data?.level_id?.id,
      });

      setQuestions(data.questions);
      setParentData(data.parent);
  } catch (error) {
      if (error.response?.status === 404) {
          router.push('/404');
      } else {
          console.error('Error fetching questions:', error);
      }
  }
}



useEffect(()=>{
    if(router.query.uuid != undefined){
    getQuestions()
  }
    
},[router])




  const refAnimationInstance = useRef(null);
  

  const addToReport = (newObject) => {
    setReport((prevReport) => {
      const existingIndex = prevReport.findIndex(item => item.id === newObject.id);
      
      if (existingIndex !== -1) {
        // Update existing object
        const updatedReport = [...prevReport];
        updatedReport[existingIndex] = { ...updatedReport[existingIndex], ...newObject };
        return updatedReport;
      } else {
        // Add new object
        return [...prevReport, newObject];
      }
    });
  };

  const handleSubmit = (answerData) => {
    
   
    const {selectedOption,options,id,type} = answerData;
    const currentOption = options[selectedOption - 1];
    const isCorrect = currentOption?.isCorrect;
    const bodyText = currentOption?.text;
    const popupImage = currentOption?.popupimage;
    const headerText = currentOption?.text;
    const answer = type == "options" ? currentOption?.title : currentOption?.title;
      
    
    addToReport({
      id:id,
      status:report.find(item=>item.id == id) ? 'markedForReview':'answered',
      selectedOption:selectedOption,
      timestamp:timeDuration - totalSeconds,
      isCorrect:isCorrect,
      answer:answer


    })
    
    if (isCorrect) {
      
      setScore(score + config.increment);
     if(level < questions?.length ){
      incrementLevel()
    }
    
     
      
      
      
    } else {
     
      
      if(level < questions?.length ){
        incrementLevel()
      }
      setScore(score - config.decrement);
     
      
    }
  };

  const incrementLevel = ()=>{
    setLevel(res=>res+1)
  }

/* Unload Listener */
useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (gamestate == 1) {
        event.preventDefault();
        event.returnValue = 'Your Test is in Progress , Are you sure want to unload?'; // Display a custom message here if needed
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gamestate]);

/* Submit if Complete */

useEffect(()=>{
if(level == questions?.length){
  handleComplete()
}

},[level])
const calculateIntervalDelta = (report, questions, d, i) => {
  if (d === 0) {
    // For the first question, just return its timestamp
    return report?.find(item => item.id === i.id)?.timestamp;
  } else if (d === 1) {
    // For the second question, return the interval (no delta yet)
    const currentTimestamp = report?.find(item => item.id === i.id)?.timestamp;
    const previousTimestamp = report?.find(item => item.id === questions[d-1]?.id)?.timestamp;
    return currentTimestamp - previousTimestamp;
  } else {
    // For subsequent questions, calculate the delta between intervals
    const currentInterval = report?.find(item => item.id === i.id)?.timestamp - report.find(item => item.id === questions[d-1]?.id)?.timestamp;
    const previousInterval = report?.find(item => item.id === questions[d-1]?.id)?.timestamp - report.find(item => item.id === questions[d-2]?.id)?.timestamp;
    return currentInterval - previousInterval;
  }
};
if(status == false) 
{
return <div className='flex flex-col items-center justify-center text-sm h-screen w-full'>Not Allowed to access in demo mode
<Button size='sm' className='bg-gradient-purple text-white mt-3' onPress={()=>{router.back()}}>Go Back</Button>
</div>

}
if(userDetails == undefined || questions == undefined ){
    return <div className='flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full'>Loading...</div>
}
  return (
    <div className="w-full sf h-screen max-h-screen justify-center align-middle items-center overflow-hidden flex flex-col" style={{ background: "var(--c-bg)" }}>
      <HeaderMock
        key={config?.title}
        isHintAvailable={isHintAvailable}
        isHintVisible={isHintVisible}
        setIsHintAvailable={setIsHintAvailable}
        onSetVisible={(e) => {
          setisHintVisible(e);
        }}
        level={level}
        questions={questions}
        calc={parentData?.calculator_allowed ?? false}
        remainingTime={totalSeconds}
        openCalculator={() => {
          setCalculatorActive(true);
        }}
        state={gamestate}
        userData={userDetails}
        title={parentData?.title}
        timeOut={config?.config?.timeout || 1800}
      ></HeaderMock>
       <DraggableModal handleModal={()=>setCalculatorActive(false)} closeable={false} open={calculatorActive}>
      {parentData?.is_scientific ? <iframe
      src='https://ipmkanpur.tcyonline.com/onlinefiles/scientific_calculator/GATECalculator.htm#nogo'
      className='w-full h-full p-1 overflow-hidden' 
      ></iframe>:<iframe
      src='https://chamoda.com/react-calculator/'
      className='w-full mx-auto h-full rounded-2xl shadow-lg p-1 overflow-hidden' 
      ></iframe>}
    </DraggableModal>
      <div style={{ background: "var(--c-bg)" }} className="overflow-hidden w-full h-full lg:p-0 flex flex-row items-start justify-start">
        {gamestate == 0 ? (
          <>
            <div className="w-full h-full overflow-y-auto flex flex-col justify-start items-stretch">
              <div style={{ background: "var(--c-bg)", padding: "32px 40px 24px", flex: 1 }}>
                <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                    Before you begin
                  </div>
                  <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 600, letterSpacing: "-0.022em", color: "var(--c-text-primary)", lineHeight: 1.15 }}>
                    Hi{" "}
                    <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                      {userDetails?.user_metadata?.full_name?.split(" ")[0] || "there"}
                    </span>
                    , let&apos;s learn.
                  </h1>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--c-text-secondary)", margin: "0 0 28px", maxWidth: "56ch" }}>
                    A quick look at what this learning module covers before you dive in. You&apos;ll get hints if you need them.
                  </p>

                  {parentData?.description && (
                    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                        Test description
                      </div>
                      <div
                        className="qcontent"
                        style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--c-text-primary)" }}
                        dangerouslySetInnerHTML={{ __html: parentData.description }}
                      />
                    </div>
                  )}
                  {parentData?.objective && (
                    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                        Test objective
                      </div>
                      <ScrollShadow
                        className="qcontent"
                        style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--c-text-primary)", maxHeight: "30vh" }}
                        dangerouslySetInnerHTML={{ __html: parentData.objective }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div
                className="sticky bottom-0 w-full"
                style={{
                  background: "var(--c-surface)",
                  borderTop: "1px solid var(--c-border-faint)",
                  padding: "14px 28px",
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
                }}
              >
                <button
                  onClick={() => { router.push("/"); }}
                  style={{
                    height: 40, padding: "0 18px", borderRadius: 999,
                    background: "transparent",
                    color: "var(--c-text-secondary)",
                    border: "1px solid var(--c-border-soft)",
                    fontSize: 13.5, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Go back
                </button>
                <button
                  onClick={() => { setGameState(1); }}
                  style={{
                    height: 40, padding: "0 18px", borderRadius: 999,
                    background: "var(--c-brand-primary)",
                    color: "#fff",
                    border: "1px solid transparent",
                    fontSize: 13.5, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  Start learning →
                </button>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate == 1 ? (
          <>
            

            

            
              <div className="w-full flex flex-col justify-center align-middle items-stretch h-full relative">
              

                {isFlashing ? <Flasher></Flasher> : ""}
                <Button size='sm' color='primary' onPress={()=>{setSidebarActive(true)}} className='absolute flex sm:hidden right-0 z-[2] rounded-r-none top-2'>Open <Grip></Grip></Button>

                <QuestionCard
                  isPlaying={!(showModal || isHintVisible)}
                  key={level}
                  onReview={(e)=>{addToReport({id:e,status:"review"})}}
                  question={questions[level]}
                  onSelect={(e)=>{handleSubmit(e)}}
                />
              </div>
           
          </>
        ) : (
          ""
        )}

        {gamestate == 2 ? (
          <>
         <>
  {/* Backdrop */}
  {activeExplanation != undefined && (
    <motion.div
      className="fixed  bg-black bg-opacity-50 z-40 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      key={"Modal2"}
     // Explicitly set undefined
    />
  )}

  {/* Modal */}
  {activeExplanation != undefined && (
    <motion.div
      key={"Modal"}
      className="fixed inset-0 z-50 w-full flex justify-center items-start overflow-y-auto pointer-events-auto"
      initial={{ opacity: 0, y: "10%" }}
      
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "10%" }}
      transition={{ duration: 0.2 }}
    >
      
      <div style={{ background: "var(--c-surface)", borderRadius: 20, overflow: "hidden", maxWidth: 900, width: "100%", border: "1px solid var(--c-border-faint)", marginTop: 40, marginBottom: 40, position: "relative" }}>
        <div style={{ padding: 20, borderBottom: "1px solid var(--c-border-faint)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", margin: 0 }}>Explanation</h2>
          <button onClick={() => setActiveExplanation(undefined)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", padding: 0 }}>
            <XCircle size={24} />
          </button>
        </div>

        <div style={{ padding: 24, maxHeight: "60vh", overflowY: "auto" }}>
          {questions[activeExplanation]?.explanationvideo && (
            <iframe
              style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, marginBottom: 16, background: "var(--c-surface-muted, var(--c-bg))" }}
              src={questions[activeExplanation]?.explanationvideo}
              frameBorder="0"
              allowFullScreen
            />
          )}
          <div className="qcontent" style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--c-text-primary)" }}
               dangerouslySetInnerHTML={{ __html: questions[activeExplanation].question }} />
          {questions[activeExplanation]?.questionimage && (
            <img src={questions[activeExplanation].questionimage} style={{ marginTop: 16, borderRadius: 12, maxWidth: "100%", border: "1px solid var(--c-border-faint)" }} />
          )}
          <div className="qcontent" style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--c-text-secondary)" }}
               dangerouslySetInnerHTML={{ __html: questions[activeExplanation].explanation }} />
        </div>

        <div style={{ padding: 20, borderTop: "1px solid var(--c-border-faint)", background: "var(--c-surface-muted, var(--c-bg))" }}>
          <div style={{ fontSize: 13, color: "var(--c-success)", fontWeight: 600 }}>
            Correct answer: {questions[activeExplanation].options.find((item) => item.isCorrect)?.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--c-brand-primary)", fontWeight: 600, marginTop: 4 }}>
            Your answer: {report[activeExplanation]?.answer || "—"}
          </div>
        </div>
      </div>
    </motion.div>
  )}
</>

           
    
            <div className="w-full text-center h-full flex flex-col justify-between items-center">
             <div className='w-full h-full  flex flex-row overflow-y-auto items-start justify-start'>



<div
            className={"w-full fixed sm:relative transition-all z-[9] sm:!transform-none sm:z-0 left-0 top-0 max-w-[400px] flex-1 overflow-y-auto overflow-x-hidden h-full flex flex-col justify-start items-start " + (drawerActive ? 'translate-x-0' : '-translate-x-full')}
            style={{ background: "var(--c-surface)", borderRight: "1px solid var(--c-border-faint)" }}
          >
            <div className="flex flex-col w-full p-0 overflow-hidden relative" style={{ background: "var(--c-surface)" }}>
              <Button size="sm" isIconOnly color="secondary" onPress={() => setDrawerActive(false)} className="absolute flex sm:hidden right top-1/2 -translate-y-1/2 z-50 rounded-r-none right-0"><ChevronLeft /></Button>

              <div style={{
                display: "flex", flexDirection: "row", padding: "12px 16px",
                background: "var(--c-surface-muted, var(--c-bg))",
                borderBottom: "1px solid var(--c-border-faint)",
                fontSize: 11, fontWeight: 500, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "var(--c-text-tertiary)",
              }}>
                <div style={{ flex: 1 }}>Q</div>
                <div style={{ flex: 1, textAlign: "center" }}>Status</div>
                <div style={{ flex: 1, textAlign: "center" }}>Time</div>
                <div style={{ flex: 1, textAlign: "right" }}>View</div>
              </div>

              <div className="overflow-y-auto">
                {questions && questions.map((i, d) => {
                  const r = report.find((item) => item.id == i.id);
                  const isCorrect = r?.isCorrect === true;
                  const isWrong = r?.isCorrect === false;
                  return (
                    <div
                      key={i.id || d}
                      onClick={() => setActiveExplanation(d)}
                      style={{
                        display: "flex", flexDirection: "row",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--c-border-faint)",
                        fontSize: 13, cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <div style={{ flex: 1, fontWeight: 600, color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums" }}>Q {d + 1}</div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : "var(--c-surface-sunken, var(--c-surface-muted))",
                          color: "#fff",
                          display: "grid", placeItems: "center",
                          border: !isCorrect && !isWrong ? "1px solid var(--c-border-soft)" : "none",
                        }}>
                          {isCorrect && <Check size={14} />}
                          {isWrong && <X size={14} />}
                        </span>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", color: "var(--c-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {calculateIntervalDelta(report, questions, d, i)}s
                      </div>
                      <div style={{ flex: 1, textAlign: "right", color: "var(--c-brand-primary)" }}>
                        <ChevronRight size={16} style={{ display: "inline" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              width: "100%",
              padding: "14px 16px",
              borderTop: "1px solid var(--c-border-faint)",
              background: "var(--c-surface)",
              display: "flex", flexDirection: "row",
              alignItems: "center", justifyContent: "space-around",
              fontSize: 13,
            }}>
              <span style={{ color: "var(--c-success)", fontWeight: 600 }}>
                Correct: <span style={{ fontVariantNumeric: "tabular-nums" }}>{report.filter((item) => item.isCorrect == true)?.length || 0}</span>
              </span>
              <span style={{ color: "var(--c-danger)", fontWeight: 600 }}>
                Wrong: <span style={{ fontVariantNumeric: "tabular-nums" }}>{report.filter((item) => item.isCorrect == false)?.length || 0}</span>
              </span>
            </div>
          </div>

          <div className="flex-1 h-full flex flex-col items-stretch justify-start overflow-hidden">
            <div style={{ padding: "32px 40px", background: "var(--c-bg)", flex: 1, overflowY: "auto" }}>
              <Button onPress={() => setDrawerActive(true)} className="mb-2 mr-auto flex sm:hidden" color="primary" size="sm">Open Explanations<ChevronRight /></Button>

              <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
                {report && report.filter((item) => item.isCorrect == true).length > questions.length / 2 ? (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 14px", borderRadius: 999,
                    background: "var(--c-success-soft, #E0F2E8)",
                    color: "var(--c-success)",
                    border: "1px solid var(--c-success)",
                    fontSize: 13, fontWeight: 500,
                  }}>
                    <Check size={14} /> Your test is submitted
                  </div>
                ) : (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 14px", borderRadius: 999,
                    background: "var(--c-danger-soft, #F8DADA)",
                    color: "var(--c-danger)",
                    border: "1px solid var(--c-danger)",
                    fontSize: 13, fontWeight: 500,
                  }}>
                    <X size={14} /> Your test is not submitted
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", margin: "32px 0 10px" }}>
                  Your score
                </div>
                <h1 style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--c-text-primary)", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>{score}</span>
                </h1>

                {report && report.filter((item) => item.isCorrect == true).length > questions.length / 2 ? (
                  <p style={{ marginTop: 20, fontSize: 18, color: "var(--c-success)", fontWeight: 600 }}>
                    You have successfully completed {parentData?.parent?.title}
                  </p>
                ) : (
                  <p style={{ marginTop: 20, fontSize: 14, color: "var(--c-danger)", maxWidth: "50ch", marginLeft: "auto", marginRight: "auto" }}>
                    You need to get more than 60% questions right to complete {parentData?.parent?.title}.
                  </p>
                )}
              </div>
            </div>
          </div>
             </div>
             <div
              className="flex flex-row items-center justify-center w-full sticky bottom-0"
              style={{
                background: "var(--c-surface)",
                borderTop: "1px solid var(--c-border-faint)",
                padding: "14px 28px",
              }}
            >
              <button
                onClick={() => { router.push("/"); }}
                style={{
                  height: 40, padding: "0 18px", borderRadius: 999,
                  background: "var(--c-brand-primary)",
                  color: "#fff",
                  border: "1px solid transparent",
                  fontSize: 13.5, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <Home size={14} /> Back to dashboard
              </button>
             </div>
            </div>
         
        
         
          </>
        ) : (
          ""
        )}

         {gamestate < 2 && <QuestionBrowser gamestate={gamestate} questions={questions} report={report} sideBarActive={sideBarActive} setSidebarActive={(e)=>{setSidebarActive(e)}}></QuestionBrowser>}
      </div>

    </div>
  );
};

export default Game;

export async function getServerSideProps(context){

    const {data,error} =await serversupabase.from('self_learning_tests').select('*,level_id(*),vuid(*),luid(*)').eq('uuid',context.query.uuid) 


    

    return {props:{test_data:data[0]}}
}

