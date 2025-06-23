import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactCanvasConfetti from "react-canvas-confetti";

import Flasher from '@/components/Flasher';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@nextui-org/react';
import { serversupabase, supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';


import dynamic from 'next/dynamic';


import {  toast } from 'react-hot-toast';

function Icon() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="25"
        height="25"
        viewBox="0 0 192 192"
        className='relative w-full h-full'
      >
        <linearGradient id="a" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop offset="0" stopColor="#f65e7a"></stop>
          <stop offset="0.051" stopColor="#f65e7a"></stop>
          <stop offset="0.1" stopColor="#f65d79"></stop>
          <stop offset="0.146" stopColor="#f55c78"></stop>
          <stop offset="0.191" stopColor="#f45b76"></stop>
          <stop offset="0.233" stopColor="#f35974"></stop>
          <stop offset="0.274" stopColor="#f25771"></stop>
          <stop offset="0.314" stopColor="#f1546f"></stop>
          <stop offset="0.353" stopColor="#f0526b"></stop>
          <stop offset="0.39" stopColor="#ee4f68"></stop>
          <stop offset="0.427" stopColor="#ed4b64"></stop>
          <stop offset="0.464" stopColor="#eb4860"></stop>
          <stop offset="0.5" stopColor="#e9445c"></stop>
          <stop offset="0.536" stopColor="#e84057"></stop>
          <stop offset="0.573" stopColor="#e63c53"></stop>
          <stop offset="0.61" stopColor="#e5374e"></stop>
          <stop offset="0.647" stopColor="#e33349"></stop>
          <stop offset="0.686" stopColor="#e22e44"></stop>
          <stop offset="0.726" stopColor="#e02940"></stop>
          <stop offset="0.767" stopColor="#df253b"></stop>
          <stop offset="0.809" stopColor="#de2037"></stop>
          <stop offset="0.854" stopColor="#dd1c33"></stop>
          <stop offset="0.9" stopColor="#dd1830"></stop>
          <stop offset="0.949" stopColor="#dc152e"></stop>
          <stop offset="1" stopColor="#dc142d"></stop>
        </linearGradient>
        <g fill="none" fillRule="evenodd">
          <circle cx="96" cy="96" r="96" fill="url(#a)"></circle>
          <path
            fill="#fff"
            d="M95.926 70.264c1.666-5.311 5.057-9.77 10.171-13.374 8.485-5.982 29.714-7.652 40.268 8.14 10.555 15.791 5.613 37.04-10.554 53.746-10.555 10.905-23.674 21.075-39.358 30.508a2 2 0 01-2.018.026c-13.021-7.386-26.062-17.564-39.12-30.534-20.1-19.962-21.546-37.989-10.773-53.747 10.772-15.757 31.73-14.12 40.215-8.14 5.115 3.606 8.52 8.065 10.215 13.377a.5.5 0 00.954-.002z"
          ></path>
        </g>
      </svg>
    );
  }
const canvasStyles = {
    position: "fixed",
    pointerEvents: "none",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    zIndex:9999,
  };



const ProgressLine = (props) =>{

const level = props.currentLevel || undefined;
const questions = props.question || undefined;

    return <div className='hidden lg:flex flex-row'> 
    
{questions && questions.map((i,d)=>{
        return <div className={`h-[18px] w-[18px] md:md-2 md:h-[24px] md:w-[24px] relative transition-all bg-gray-300 rounded-full mx-1 ${d < level ? "bg-primary":'scale-75'}`}>

{d < level -1 ? <div className='absolute top-[50%] right-[-100%] translate-y-[-50%] w-full bg-primary h-[1px]'></div>:''}
        </div>
    })}
    </div>
}

const QuestionCard = ({ question, handleOptionClick,time,handleSubmitAnswer,isPlaying }) => {
    const [answer,setAnswer] = useState();
if(question == undefined){
  return <div>Question Undefined </div>

}

    return (
      <div className='sf w-full max-w-[800px] mx-auto p-2 lg:p-5 flex-1 justify-center align-middle items-start flex flex-col text-left '>
        <div className='shadow-lg rounded-xl w-full p-5 lg:p-10 relative'>
            <div className='absolute top-5 right-5'>{/* <CountdownCircleTimer key={question.id} isPlaying={isPlaying} size={36} strokeWidth={3}
    duration={time}
    colors={['#05ffa3', '#fbff05', '#ffa305', '#ff0505']}
    colorsTime={[90, 60, 30, 0]}
     onComplete={()=>{handleOptionClick(false,"Time is Up , Now Next Question","Time is Up , Now Next Question",question)}} >
        {({ remainingTime }) => <p className='font-bold'>{remainingTime}</p>}
        </CountdownCircleTimer> */}</div>
        <h2 className='font-bold text-2xl text-primary'>{question.title}</h2>
        <div className='font-medium text-sm qcontent overflow-y-auto max-h-[40vh] lg:max-h-[60vh]' dangerouslySetInnerHTML={{__html:question.question}}></div>

      {question && question?.questionimage != undefined ? <img src={question?.questionimage}/>:''}
        <ul className='p-0'>
            {question?.type == "options" ? <>
            <h2 className='my-2 text-xl font-bold text-secondary'>Select the Correct Option</h2>
            <div className='flex flex-row flex-wrap justify-start -m-2'>
          {question.options.map((option, index) => (
            <li onClick={() => handleOptionClick(option.isCorrect, option.text,option.text,question,option.title)} key={index} className="rounded-xl shadow-md p-3 m-2 mt-2 hover:bg-primary cursor-pointer transition-all">
              
                {option.title}
             
            </li>
          ))}</div></>:
          <>
          
          <Input className='my-2' placement="Enter your Answer" onChange={(e)=>{setAnswer(e.target.value)}}></Input>
          <Button color='primary' isDisabled={answer == undefined} onPress={()=>{handleSubmitAnswer(answer == question.options.answer,answer == question.options.answer ? question.options.wintext : question.options.losetext,question.options.text,question)}}>Submit Answer</Button>
          </>}
        </ul></div>
      </div>
    );
  };
  

const Assignment = ({data}) => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [level, setLevel] = useState(0);
  const [secondaryLevel,setSecondaryLevel] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({});
  
  const [isFlashing,setIsFlashing] = useState(false);
const [isHintAvailable,setIsHintAvailable] = useState(true);
const [userData,setUserData] = useState();
const [isHintVisible,setisHintVisible] = useState(false);
const  [config,setConfig] = useState({
    increment:3,
    decrement:1
})
const [gamestate,setGameState] = useState(0);
const [questions,setQuestions] = useState();
const [parentData,setParentData] = useState();
const [leaderboard,setLeaderBoard] = useState();
const [timestamp,setTimestamp] = useState([]);
const [gameOverModal,setGameOverModal] = useState(false);
const [key, setKey] = useState('');
const [played,setPlayed] = useState(false)
const [report,setReport] = useState([]);
const [activeExplanation,setActiveExplanation] = useState()
/* 

const {
  totalSeconds,
  seconds,
  minutes,
  hours,
  days,
  isRunning,
  start,
  pause,
  reset
  
} = useStopwatch({ autoStart: false }); */

const fnl = data;
const StaticMathField = dynamic(() => import('react-mathquill'), {
  ssr: false,
});
function generateRandomKey() {
    const randomKey = Math.random().toString(36).substring(2, 10); // Generate a random key
    setKey(randomKey); // Set the random key using setKey
  }

const router = useRouter();
async function getQuestions(){

    const {data,error} = await supabase.from('questions').select('*').eq('slug',fnl.level.id+'aiex')
if(data){
    
    setQuestions(data)
    if(data.length == 0){
        router.push('/404')
    }
}
else{
   
    router.push('/login')
}
}


async function getParentData(){
    const {data,error} = await supabase.from('questions').select('parent(*)').eq('slug',router.query.slug).limit(1)
    if(data && data.length != 0){
        
        setParentData(data[0])
    }
    else{
        
    }

}

async function submitScore(a){
  if(a.filter(item=> item.isCorrect == true)?.length < 0.6 * a?.length){
    toast.error('Could not submit assignment , score at least 60% marks.')
    return null
  }
  const {data,error} = await supabase.from('assignments_done').insert({
assignment_id:fnl.id,
email:userData.email,

  }).select();
  if(data && data.length != 0){
    
    toast.success('Submitted Assignment')
}
else{
  toast.error('Unable to submit Assignment') 
}
}
async function getLeaderboard(a){
  const {data,error} = await supabase.from('plays').select('*').eq('slug',a).order('score',{ascending:false}).limit(3)
  if(data && data.length != 0){
      
      setLeaderBoard(data);
  }
  else{
      
  }

}


function handleSubmitAnswer(a,b,c,d){

if(a == true){
    handleOptionClick(a,b,c,d)
}else{
    handleOptionClick(a,b,c,d)
}
}
useEffect(()=>{
    if(router.query.slug != undefined){
    getQuestions()
    getParentData()}
    
},[router])

async function getUserData(){
    const {data} = await supabase.auth.getUser();
    
    if(data && data.user != undefined){
      setUserData(data.user)
      
    }
    else{
      setUserData('no data')
    }
  }
  useEffect(()=>{
    getUserData();
  },[])

useEffect(()=>{

    if(lives == 0){
        setFlash();
        setGameState(2);
        setGameOverModal(true)
    }
},[lives])

function showHint(a){
    setLives(lives => lives - 1)
    
}

const setFlash =() =>{

    setIsFlashing(true)
    setTimeout(()=>{
        setIsFlashing(false)
    },1000)
}

  const refAnimationInstance = useRef(null);

  const getInstance = useCallback((instance) => {
    refAnimationInstance.current = instance;
  }, []);

  const makeShot = useCallback((particleRatio, opts) => {
    refAnimationInstance.current &&
      refAnimationInstance.current({
        ...opts,
        origin: { y: 0.7 },
        particleCount: Math.floor(200 * particleRatio)
      });
  }, []);

  const fire = useCallback(() => {
    makeShot(0.25, {
      spread: 26,
      startVelocity: 55
    });

    makeShot(0.2, {
      spread: 60
    });

    makeShot(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    makeShot(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    makeShot(0.1, {
      spread: 120,
      startVelocity: 45
    });
  }, [makeShot]);

  const startGame = () => {
    setLevel(0);
    setScore(0);
    setLives(3);
    setShowModal(false);
    setWrongAttempts([]);
  };

  const handleOptionClick = (isCorrect, congratstext,headertext,cQ,selected) => {
    
    setReport(res=>([...res,{level:level,isCorrect:isCorrect,selected:selected}]))
    if (isCorrect) {
      /* setTimestamp(res=>([...res,`${hours}:${minutes}:${seconds}`])) */
      setScore(score + config.increment);
     if(level < questions?.length ){
      setLevel(level + 1);
    
    }
    setSecondaryLevel(secondaryLevel + 1);
      setIsHintAvailable(true);
      setModalContent({ color: 'green', text: congratstext,message: headertext, isCorrect:true });
      fire();
      setShowModal(true);
      generateRandomKey()
    } else {
      /* setLives(lives - 1); */
      setFlash();
      if(level < questions?.length ){
      setLevel(level + 1);}
      setSecondaryLevel(secondaryLevel + 1);
      setScore(score - config.decrement);
      setIsHintAvailable(true)
    
      setModalContent({ color: 'red', text: congratstext , message: headertext, isCorrect:false});
      setShowModal(true);
      generateRandomKey()
    }
  };
async function handleIncompleteSubmit(){

}
/* useEffect(()=>{

  if(showModal ==  true){
pause()
  }else{
start()
  }
},[showModal]) */
function removeObjectAtIndex(array, index, handler) {
  // Check if the index is valid
  if (index < 0 || index >= array.length) {
    console.error("Invalid index");
    return;
  }

  // Remove the object at the specified index
  const removedObject = array.splice(index, 1)[0];

  // Call the handler function with the updated array and removed object
  if (handler && typeof handler === "function") {
    handler(array, removedObject);
  }
}
/* 
useEffect(()=>{

    if(level == questions?.length){

        setInterval(()=>{fire()},2000)
    }
},[level]) */

useEffect(()=>{
  if(level == questions?.length){
    submitScore(report)
  }
  
  },[
    level
  ])

useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (gamestate == 1) {
        event.preventDefault();
        event.returnValue = 'Your Game is in Progress , Are you sure want to unload?'; // Display a custom message here if needed
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gamestate]);


 
if(userData == undefined || questions == undefined ){
    return <div className='flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full'>Loading...</div>
}
  return (<div className='w-full sf h-[100vh] p-2 justify-center align-middle items-center overflow-hidden max-h-[100vh] flex flex-col bg-primary'>
    <ReactCanvasConfetti key={1} refConfetti={getInstance} style={canvasStyles} />
   
    <div className='bg-white rounded-xl shadow-md w-full h-full p-2 lg:p-5'>
     {gamestate == 0 ? <>
     <div className='w-full h-full flex flex-col text-center justify-center items-center align-middle'>
        
        <h2 className='font-bold'>Hi , {userData.user_metadata.full_name}
        </h2>
        <p>Game Objective : 
        </p>
        <div dangerouslySetInnerHTML={{__html:parentData?.parent?.objective}}></div>
        <div className='mt-2'>
            <Button color='default' className='mr-2 px-5 sf' onClick={()=>{router.push('/')}}>Go Back</Button>
            <Button color='primary' className='px-5 sf' onClick={()=>{setGameState(1)}}>Start Game</Button>
        </div>
     
     </div>
     </>:''}
     
     {gamestate == 1 ? <>
      <h1>Level Name : {parentData?.parent?.title}</h1>
      {lives <= 0 && (
        <div>
          <p>Game Over</p>
          <p>Your score: {score}</p>
          <button onClick={startGame}>Start Over</button>
        </div>
      )}
      
        <Modal placement='center' className='sf overflow-hidden' isOpen={showModal} backdrop='opaque'  classNames={{backdrop:"opacity-10 bg-overlay/5"}}  isDismissable={false} scrollBehavior="inside">
<ModalContent>
{(onClose)=>(<>
    <ModalHeader className={`flex flex-col gap-1 justify-start items-start text-white ${modalContent && modalContent.isCorrect == false ? "bg-red-500":'bg-green-500'}`}>
    {modalContent && modalContent.isCorrect == false ? <p>Incorrect</p>:<p>Correct</p> }
<div className='border-1 rounded-xl text-sm border-white p-1 px-2 w-auto'>
  
   {modalContent && modalContent.isCorrect == false ? <p>You have lost a point</p>:<p>You have earned {config.increment} {config.increment > 1 ? "Points" : "Point"}</p> }</div>
    </ModalHeader>
    <ModalBody>
    <div dangerouslySetInnerHTML={{__html:modalContent?.text}}></div>
    {questions != undefined && questions[level]?.explanationimage != undefined ? <img src={questions[level]?.expanationimage}/>:''}
   {/* {questions[level].equation != '\frac{1}{\sqrt{2}}\cdot 2' ? <StaticMathField key={'eq'+level} className="w-full" latex={questions[level]?.equation}>{console.log(questions[level]?.equation)}</StaticMathField>:''} */}
    </ModalBody>
    

    <ModalFooter>
    
    <Button className='flex-1' color='primary' onPress={()=>{setShowModal(false)}}>Next</Button>
    
</ModalFooter></>
)}</ModalContent>

        </Modal>


      
      {level  < questions.length && (
        <div className='w-full flex flex-col justify-center align-middle items-stretch h-full'>
          <div className='flex flex-col lg:flex-row font-bold text-sm lg:text-xl gap-2 mt-2 lg:mt-5 md:mt-0  text-left justify-start align-middle items-start w-full'><p>Question: {level + 1}</p>
          <p>Score: {score}</p>
          <p className='flex flex-row justify-center align-middle items-center'>Lives: <span className='flex flex-row'>{lives != undefined && Array(lives).fill().map((i,d)=>{
            return <div className='h-[24px] w-[24px] relative mx-1'><Icon></Icon></div>
          })}</span></p></div>
          
          {isFlashing ? <Flasher></Flasher> : ''}
          <div className='absolute top-5 right-5'>
            <h2>Level : {level + 1}/{questions?.length}</h2>
          <ProgressLine currentLevel={level + 1} question={questions}></ProgressLine>
          <Dropdown onClose={()=>{setisHintVisible(false)}}>
            <DropdownTrigger>
          <Button onPress={()=>{showHint(questions[level].hint),generateRandomKey(),setisHintVisible(true),setIsHintAvailable(false)}} isDisabled={!isHintAvailable} className='my-2' color='primary'>See Hint <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.538 18.999L15.2473 20.2575C15.0241 21.2208 14.2013 21.9184 13.2285 21.993L13.0554 21.9996H10.9437C9.95426 21.9996 9.0885 21.3547 8.79678 20.4232L8.75135 20.2559L8.461 18.999H15.538ZM12 2.00098C16.0041 2.00098 19.25 5.24691 19.25 9.25098C19.25 11.3875 18.3144 13.3443 16.4846 15.0917C16.4493 15.1254 16.4247 15.1687 16.4137 15.2162L15.886 17.499H8.114L7.58801 15.2164C7.57702 15.1688 7.55234 15.1255 7.51701 15.0917C5.68616 13.3443 4.75 11.3875 4.75 9.25098C4.75 5.24691 7.99593 2.00098 12 2.00098Z" fill="currentColor"/>
</svg>
</Button></DropdownTrigger>
<DropdownMenu>
    <DropdownItem>
        <div dangerouslySetInnerHTML={{__html:questions[level].hint}}></div>
    </DropdownItem>
</DropdownMenu>
</Dropdown>
          </div>

          <QuestionCard isPlaying={!(showModal || isHintVisible)} key={level} time={parentData?.parent?.time} handleSubmitAnswer={(e,f,g,h)=>{handleSubmitAnswer(e,f,g,h)}} question={questions[level]} handleOptionClick={handleOptionClick} />

        </div>
      )}
</>:''}

{gamestate == 2 ? <><div className='w-full h-full text-center flex flex-col justify-center align-middle items-center'>
<div className='font-bold sf text-red-500 text-xl text-center w-full '>Game Over</div>
<h2 className='my-5'>You scored <span className='text-white bg-green-500  p-3 rounded-full'>{score}</span></h2>
<div className='flex flex-row gap-1'>
<Button color='danger' onPress={()=>{router.push('/')}}>Quit</Button>
<Button color='primary' onPress={()=>{router.reload()}}>Restart Game</Button></div>
</div>
</>:''}

{level == questions?.length   ? <div className='w-full h-full flex flex-col align-middle justify-center items-center'>
    

<Modal placement='center' className='sf overflow-hidden' isOpen={activeExplanation != undefined ? true : false} backdrop='opaque' onClose={()=>{setActiveExplanation()}}  classNames={{backdrop:"opacity-10 bg-overlay/5"}}  isDismissable={true} scrollBehavior="inside">
<ModalContent>
{(onClose)=>(<>
    <ModalHeader className={`flex flex-col gap-1 justify-start items-start text-white`}>
    
    </ModalHeader>
    <ModalBody>
    <div className='text-sm font-bold' dangerouslySetInnerHTML={{__html:questions[activeExplanation].question}}></div>
    {questions[activeExplanation]?.questionimage != undefined ? <img src={questions[activeExplanation].questionimage}/>:''}
<div dangerouslySetInnerHTML={{__html:questions[activeExplanation].explanation}}></div>
{questions[activeExplanation]?.explanationvideo != undefined ? 
    <iframe className='rounded-lg overflow-hidden w-auto m-1 bg-gray-200 lg:min-h-[12vw] aspect-video'
  width="100%"
  height="100%"
  src={questions[activeExplanation]?.explanationvideo}
  frameborder="0"
  allowfullscreen="true"
></iframe>
:''}

    </ModalBody>
    

    <ModalFooter>
    <div className='w-full'><h2 className='font-bold text-md text-green-500'>Correct Answer : {questions[activeExplanation].options.filter(item=>item.isCorrect == true)[0].title}</h2>
<h2 className='font-bold text-md text-blue-500'>Your Answer : {report[activeExplanation].selected}</h2>
</div>
  
    
</ModalFooter></>
)}</ModalContent>

        </Modal>

{report && report.filter(item=>item.isCorrect == true).length > questions.length/2 ? <p className='font-bold text-green-600 text-2xl text-center'>You have successfully completed {parentData?.parent?.title}</p> : <p className='font-bold text-red-600 text-2xl text-center'>You need to try hard and get more 60% questions right in order to complete {parentData?.parent?.title}</p> }

{/* <p>Now Next Level will be unlocked</p> */}
<h2 className='my-3 flex flex-col align-middle justify-center items-center'>You scored <span className=' text-5xl font-bold w-auto text-green-500'>{score + (lives*5)}</span></h2>
{report && report.filter(item=>item.isCorrect == true).length > questions.length/2 ? <p className='text-green-500'>Your Assignment is Submitted</p>:
<p className='text-red-500 flex w-full text-center justify-center items-center align-middle'>
<svg className='rotate-45' width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z" fill="red" /></svg>    
    Your Assignment is not Submitted</p>
}
{/* <h2 className='font-bold text-xl my-5'>Leaderboard</h2> */}
<div className='flex flex-col w-full max-w-[800px] p-0 text-center bg-gray-100 rounded-xl overflow-hidden'>
  <div className='flex flex-row flex-wrap justify-between align-middle items-center p-2 bg-primary text-xs'>
    <h2 className='flex-1 font-bold text-sm'>Name</h2>
    <h2 className='flex-1 font-bold text-sm'>Status</h2>
    <h2 className='flex-1 font-bold text-sm'>Explanation</h2>
  </div>
  <div className='max-h-[30vh] lg:max-h-[50vh] overflow-y-auto'>
  {report && report.map((i,d)=>{
    return <div className='flex flex-row flex-wrap justify-between align-middle items-center p-2 text-xs'>
     <h2 className='flex-1'>Level {i.level + 1}</h2>
    <h2 className='flex-1 flex flex-row justify-center align-middle items-center'>{i.isCorrect ? 
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z" fill="#2ECC70"/></svg>:
        <svg className='rotate-45' width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z" fill="red" /></svg>    
}</h2> 
<h2 className='flex-1'><Button color='primary' size='sm' onPress={()=>{setActiveExplanation(d)}}>Open Explanation</Button></h2>
    </div>
  })}</div>
</div>
<div className='flex flex-row justify-center items-center align-middle w-full shadow-sm p-2 m-2 rounded-lg'><p className='flex-1 text-center text-green-500 font-bold'>Correct : {report.filter(item=>item.isCorrect == true)?.length}</p><p className='flex-1 text-center text-red-500 font-bold'>Incorrect : {report.filter(item=>item.isCorrect == false)?.length}</p></div>
<Button className='my-2' color='primary' onPress={()=>{router.push('/')}}>Go back to Dashboard</Button>
</div>
:''}
    </div> 
    
   
    </div>
  );
};

export default Assignment;

export async function getServerSideProps(context){

const {slug} = context.query;

const {data,error} = await serversupabase.from('assignments').select('*,level(id)').eq('id',slug)

if(data && data?.length > 0){}
if(error || data?.length == 0){
  return { notFound:true}
}

return {props:{
  data:data[0]
}}

}

