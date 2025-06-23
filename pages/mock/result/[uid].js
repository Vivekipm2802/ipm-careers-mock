import Loader from "@/components/Loader";
import { useNMNContext } from "@/components/NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient"
import { Button, CircularProgress, Divider, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spacer } from "@nextui-org/react";
import { Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast";

export default function MockResult({result}){


  const [sections,setSections] = useState();
  const [modules,setModules] =useState();
  const [questions,setQuestions] = useState();
  const [activeVideo,setActiveVideo] = useState()
  const [modal,setModal] = useState(undefined)


  const {userDetails,isRouting} = useNMNContext()
  async function getSections(a){

    const {data,error} = await supabase.from('mock_groups').select('*,subject(*)').eq('test',a).order('seq',{ascending:true})
  if(data){
    
    setSections(data)
   getModules(data)
  }
  else{
   
    /* router.push('/login') */
  }
  }
  
  
  async function getModules(a){
  
    const {data,error} = await supabase.from('mock_groups').select('*,module(*)').in('parent_sub',a.map(i=>i.id))
  if(data){
    
    setModules(data)
   getQuestions(data)
  }
  else{
   
    /* router.push('/login') */
  }
  }
  async function getQuestions(a){

    const {data,error} = await supabase.from('mock_questions').select('*').in('parent',a.map(i=>i.module.id)).order('seq',{ascending:true})
if(data){
    
    setQuestions(data)
    /* if(data.length == 0){
        router.push('/404')
    } */
}
else{
  
}
}
useEffect(()=>{
  if(result != undefined){
  getSections(result?.test_id.id)}
},[])
function getStatus(a){

const answered = result.report;
const miscData = result.data;

  if(answered?.some(item=>item.id == a.id) && miscData?.filter(item=>item.status == "review").some(item=>item.id == a.id)){
    return 'Answered & Marked for Review'
  }

  if(answered?.some(item=>item.id == a.id)){
    return 'Answered'
  }
  if(miscData?.filter(item=>item.status == "review")?.some(item=>item.id == a.id)){
    return 'Marked for Review'
  }
  if(miscData?.some(item=>item.id == a.id)){
    return 'Not Answered'
  }
  return ''
}
const table = [
  {
    key:'Participant Name',
    value:result?.name
  },
  {
    key:'Test Center Name',
    value:'IPM Careers Online Portal'
  },
  {
    key:'Test Date',
    value:`${CtoLocal(result.created_at).dayName}, ${CtoLocal(result.created_at).date} ${CtoLocal(result.created_at).monthName}, ${CtoLocal(result.created_at).year}`
  },
  
  {
    key:'Subject',
    value:result.test_id.title
  },
]
function printPage() {
  if (window.matchMedia) {
      const mediaQueryList = window.matchMedia('print');
      mediaQueryList.addListener(function(mql) {
          if (!mql.matches) {
              console.log('Print dialog closed');
          }
      });
  }
  window.print();
}
const router = useRouter()
if(userDetails == undefined){
  return <div className="w-full h-screen justify-center items-center flex flex-col ">You cannot access this without logging in 
<Button className="border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank">Login</Button>

  </div>
}
if(questions == undefined || result == undefined ){
  return <div className='flex flex-col relative justify-center align-middle items-center text-center font-sans h-screen w-full'>
   <Loader></Loader>
    Loading...</div>
}



return <div className="p-2 md:p-4 lg:p-6">
  <Modal isOpen={modal != undefined} onClose={()=>{setModal(undefined)}}>
<ModalContent>

<ModalHeader>Solution </ModalHeader>
  <ModalBody>
    {modal?.explanationimage &&<img className="w-full h-full aspect-video max-w-lg" src={modal?.explanationimage}/>}
    <div dangerouslySetInnerHTML={{__html:modal?.explanation}}></div>
  </ModalBody>
  <ModalFooter><Button color="danger" variant="flat" onPress={()=>{setModal(undefined)}}>Close</Button></ModalFooter>
</ModalContent>

  </Modal>
  <div className="w-full flex flex-row items-center justify-end">
    
  <Button className="border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" isLoading={isRouting} onPress={()=>{router.push(`/mock/analytics/${router.query.uid}`)}}>View Analysis</Button>
  <Spacer x={2}></Spacer>
  <Button className=" border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" onPress={()=>{printPage()}}>Print</Button>
  </div>
  <Spacer y={4}></Spacer>
<div className="border-1 border-yellow-500 bg-yellow-50 p-2 flex flex-col items-start justify-start">
<div className="bg-white w-[90%] my-2 p-4 ">
<img src="/newlog.svg" className="w-[300px]"/></div>
<div className="border-1 border-neutral-400 flex flex-col w-full max-w-[500px]">
   {table && table.map((i,d)=>{
    return <div className="flex flex-col lg:flex-row items-stretch flex-nowrap w-full text-sm py-1 px-2">
     
      <><div className="flex-1 font-bold p-1 px-2 border-1 border-neutral-400 mr-1">{i.key}</div><div className="flex-1 p-1 px-2 border-1 border-neutral-400">{i.value}</div></>
     
    </div>
   })}</div>
   <Spacer y={4}></Spacer>
<p className="text-xs">
Note :</p>
<p className="text-xs">1. Options shown in green color with a tick icon are correct.</p>
<p className="text-xs">2. Chosen option on the right of the question indicates the option selected by the candidate.</p>
    </div>
    <Spacer y={4}></Spacer>

<div className="flex flex-col justify-start items-center border-transparent mb-4 p-4 bg-white border-1 border-neutral-200 rounded-xl shadow-md">
  <div className="w-full flex flex-col md:flex-row items-center justify-start">
{sections && sections.map((i,d)=>{
        return <div className=" text-white flex-[20%] flex-grow-0 text-center flex flex-col justify-center items-center">
        {modules && modules.filter(item=>item.parent_sub == i.id).flatMap((z,v)=>{
        return <CircularProgress label={i.subject.title} strokeWidth={3} color="red-500"  classNames={{
          svg: "w-36 h-36 drop-shadow-md",
          indicator: "stroke-secondary",
            label: "text-xs text-black",
          }} value={ (
            questions && questions
            .filter((item) => item.parent === z.module.id)
            .sort((a, b) => a.seq - b.seq)
            .reduce((sum, question) => {
              const reportItem = result.report.find((item) => item.id === question.id);
              if (!reportItem) return sum; // Skip if no matching report item
          
              const reportValue = reportItem.value - 1;
              const isCorrect = question.type === "options"
                ? question.options.findIndex((option) => option.isCorrect) === reportValue
                : question.options.answer.replace(/\s/g, '') == reportItem.value.replace(/\s/g, '');
          
              return isCorrect ? sum + i.pos : sum + i.neg;
            }, 0)/
            questions
            .filter(item => item.parent === z.module.id)
            .reduce((sum, n) => sum + i.pos, 0))*100}></CircularProgress>})}


        <div className=" text-black">
        {modules && modules.filter(item=>item.parent_sub == i.id).flatMap((z,v)=>{
          return <> 
          {questions && questions
  .filter((item) => item.parent === z.module.id)
  .sort((a, b) => a.seq - b.seq)
  .reduce((sum, question) => {
    const reportItem = result.report.find((item) => item.id == question.id);
    if (!reportItem ?? false ) return sum; // Skip if no matching report item

    const reportValue = reportItem.value - 1;
    const isCorrect = question.type === "options"
      ? question?.options?.findIndex((option) => option?.isCorrect) == reportValue
      : question?.options?.answer.trim() == reportItem.value.trim();

    return isCorrect ? sum + i.pos : sum + i.neg;
  }, 0)
           }
           
           /{questions
            .filter(item => item.parent === z.module.id)
            .reduce((sum, n) => sum + i.pos, 0)}</>})}</div>
            {/* <div className="flex flex-col p-2 text-neutral-500 font-semibold text-xs items-start justify-start text-center ">{i.subject.title}</div> */}
            
            
            
            </div>})}
            

            

</div></div>

    <div className="p-2 px-2 bg-neutral-600">
      {sections && sections.map((i,d)=>{
        return <div className="bg-neutral-500 text-white"><div className="flex flex-col p-2 text-white font-semibold text-xs items-start justify-start text-left w-full ">Section : {i.subject.title}</div>
        
        <div className="bg-gray-50 text-black">
        {modules && modules.filter(item=>item.parent_sub == i.id).map((z,v)=>{
          return <> 
          {questions && questions.filter(item=>item.parent == z.module.id).sort((a, b) => a.seq - b.seq).map((n,b)=>{
            return <><div className="p-4 flex flex-col lg:flex-row items-start justify-between">
<div className="flex-1  p-2">

<div className="flex flex-row items-center justify-start">
  <h2 className="text-sm font-bold">Q.{b+1} : {n.seq} {n.id}</h2>
  
  <Spacer x={4}></Spacer><div>
{n.title}
<div className="text-xs" dangerouslySetInnerHTML={{__html:n.question}}></div>
{n?.questionimage ? <img className="max-h-[200px] w-auto object-contain" src={n.questionimage}/>:''}</div>
</div>

<Spacer y={4}></Spacer>
<div className="flex flex-row items-center justify-start">
  <h2 className="text-sm font-bold">Ans.</h2>
  <Spacer x={4}></Spacer>
{n?.type == "options" ? 
<div>
  {n && n?.options?.map((f,ind)=>{
    return <div className={"flex flex-row items-center justify-start " + ((ind) == n?.options?.findIndex(item=>item?.isCorrect == true) ? '!text-green-600':'text-red-500')}><strong>{ind+1} : </strong><div dangerouslySetInnerHTML={{__html:f?.title}}></div></div>
  })}
</div>
:''}
{n?.type == "input" ? 
<div>
<p className={" text-sm " + (result.report.find(item=>item.id == n.id)?.value.toString().replace(/\s/g, '') == n?.options?.answer.toString().replace(/\s/g, '') ? 'text-green-600':'text-red-500' )}>Your Answer : {result.report.find(item=>item.id == n.id)?.value}</p>
  <p className="text-green-600 text-sm">Correct Answer : {n?.options?.answer}</p>
</div>
:''}
</div>
</div>
<div className="bg-slate-200 w-full max-w-[350px] text-xs p-2">

  <p><strong>Question ID</strong> : {n.id}</p>
  <p><strong>Status</strong> : {getStatus(n)}</p>
  {n.type == "options" ? <>
  <p><strong>Chosen Option</strong> : {result?.report.find(item=>item?.id == n?.id)?.value}</p>
  <p><strong>Correct Option</strong> : {n?.options?.findIndex(item=>item?.isCorrect == true)+1}</p>
  </>:''}
</div>

            </div>
            <div className="p-4 flex flex-col">

            {n?.video != undefined && n?.video?.length > 2 && <>
              Explanation & Solution:
              <Spacer y={4}></Spacer>
              
            {activeVideo == b  ?    <iframe className="w-full print:hidden aspect-video h-auto max-w-[500px] bg-neutral-500 rounded-xl" src={n.video}></iframe> : <div className="w-full flex flex-col items-center justify-center print:hidden aspect-video h-auto max-w-[500px] bg-neutral-200 rounded-xl"><Button color="primary" endContent={<Play size={16}></Play>} onPress={()=>{setActiveVideo(b)}}>View Solution</Button></div>}</> }
            
            {((n?.explanation && n?.explanation != '<p><strong>Write your Explanation Here...</strong></p>') || n?.explanationimage ) && <div className="my-4 px-4">
            <Divider className="max-w-md my-4"></Divider>
              <Button className=" bg-gradient-purple text-white border-1 border-white shadow-[2px_2px_10px_-2px] shadow-primary/50" size="sm" onPress={()=>{setModal(n)}}>View Written Solution</Button></div>}
            
            </div>
            <Divider></Divider>
            </>

          })}
          </>
        })}</div>
        </div>
      })}
    </div>
</div>
}


export async function getServerSideProps(context){


    const {data,error} = await serversupabase.from('mock_plays').select('*,test_id(*)').eq('uid',context.query.uid)
    if(data && data?.length > 0){}
    
    if(data?.length == 0 || error){
      return {notFound:true}
    }
    
      return {props:{result:data[0]}}
    }