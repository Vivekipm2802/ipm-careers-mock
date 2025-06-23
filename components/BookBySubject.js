import { CtoLocal } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { Button, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Popover, PopoverContent, PopoverTrigger, Spacer } from "@nextui-org/react";
import { useRouter } from "next/router";
import { useState ,useEffect} from "react";
import {  toast } from "react-hot-toast";
import SquareGroup from "./SquareGroup";
import Link from "next/link";
import styles from './SquareGroup.module.css'
function BookBySubject({userData,role,enrolled,changeSlug}){

const [views,setViews] = useState(0);


const [teacherData,setTeacherData] = useState();
const [results,setResults] = useState();
const [entries,setEntries] = useState();
const [teachers,setTeachers] = useState();
const [raw,SetRaw] = useState();
const [activeSubject,setActiveSubject] = useState();
const [tests,setTests] = useState();
const [testModal,setTestModal] = useState(false);
const [activeResults,setActiveResult] = useState();
const [scores,setScores] = useState();
const [activeModule,setActiveModule] = useState();
const [classes,setClasses] = useState();
const [progressData,setProgressData] = useState();
const [assignments,setAssignments] = useState();
const [studyModal,setStudyModal] = useState(false);
const [docs,setDocs] = useState()
async function getTeachers(){

    const {data,error} = await supabase.rpc('get_teacher_rows')
    if(data){
        console.log(data)
        setTeachers(data)
    }
    else{

    }
 }  

 async function getTeachersData(){

    const {data,error} = await supabase.from('teacher_data').select('*,subjects(title,id)')
    if(data){
        console.log(data)
        setTeachersData(data)
    }
    else{

    }
 }
const icons = {
    pdf: <svg
    xmlns="http://www.w3.org/2000/svg"
    height="24px"
    width="24px"
    viewBox="0 0 309.267 309.267"
    xmlSpace="preserve"
    
  >
    <path
      d="M38.658 0h164.23l87.049 86.711v203.227c0 10.679-8.659 19.329-19.329 19.329H38.658c-10.67 0-19.329-8.65-19.329-19.329V19.329C19.329 8.65 27.989 0 38.658 0z"
      fill="#e2574c"
    />
    <path
      d="M289.658 86.981h-67.372c-10.67 0-19.329-8.659-19.329-19.329V.193l86.701 86.788z"
      fill="#b53629"
    />
    <path
      d="M217.434 146.544c3.238 0 4.823-2.822 4.823-5.557 0-2.832-1.653-5.567-4.823-5.567h-18.44c-3.605 0-5.615 2.986-5.615 6.282v45.317c0 4.04 2.3 6.282 5.412 6.282 3.093 0 5.403-2.242 5.403-6.282v-12.438h11.153c3.46 0 5.19-2.832 5.19-5.644 0-2.754-1.73-5.49-5.19-5.49h-11.153v-16.903h13.24zm-62.327-11.124h-13.492c-3.663 0-6.263 2.513-6.263 6.243v45.395c0 4.629 3.74 6.079 6.417 6.079h14.159c16.758 0 27.824-11.027 27.824-28.047-.009-17.995-10.427-29.67-28.645-29.67zm.648 46.526h-8.225v-35.334h7.413c11.221 0 16.101 7.529 16.101 17.918 0 9.723-4.794 17.416-15.289 17.416zM106.33 135.42H92.964c-3.779 0-5.886 2.493-5.886 6.282v45.317c0 4.04 2.416 6.282 5.663 6.282s5.663-2.242 5.663-6.282v-13.231h8.379c10.341 0 18.875-7.326 18.875-19.107.001-11.529-8.233-19.261-19.328-19.261zm-.222 27.738h-7.703v-17.097h7.703c4.755 0 7.78 3.711 7.78 8.553-.01 4.833-3.025 8.544-7.78 8.544z"
      fill="#fff"
    />
  </svg>,
  xl: <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24px"
  height="24px"
  viewBox="-4 0 64 64"
  
>
  <path
    d="M5.112.006A5.074 5.074 0 00.039 5.08v53.841a5.073 5.073 0 005.073 5.074h45.774a5.074 5.074 0 005.074-5.074V20.316L37.058.006H5.112z"
    fillRule="evenodd"
    clipRule="evenodd"
    fill="#45B058"
  />
  <path
    d="M19.429 53.938a.64.64 0 01-.54-.27l-3.728-4.97-3.745 4.97a.641.641 0 01-.54.27.71.71 0 01-.72-.72c0-.144.035-.306.144-.432l3.89-5.131-3.619-4.826a.722.722 0 01-.145-.414c0-.342.288-.72.721-.72.216 0 .432.108.576.288l3.438 4.628 3.438-4.646a.643.643 0 01.541-.27c.378 0 .738.306.738.72a.695.695 0 01-.127.414l-3.619 4.808 3.891 5.149a.7.7 0 01.125.414c0 .396-.324.738-.719.738zm9.989-.126h-5.455a1.083 1.083 0 01-1.081-1.08V42.415c0-.396.324-.72.774-.72.396 0 .721.324.721.72V52.48h5.041c.359 0 .648.288.648.648 0 .396-.289.684-.648.684zm6.982.216c-1.782 0-3.188-.594-4.213-1.495a.71.71 0 01-.234-.54c0-.36.27-.756.702-.756.144 0 .306.036.433.144.828.738 1.98 1.314 3.367 1.314 2.143 0 2.826-1.152 2.826-2.071 0-3.097-7.111-1.386-7.111-5.672 0-1.98 1.764-3.331 4.123-3.331 1.548 0 2.881.468 3.853 1.278a.73.73 0 01.253.54c0 .36-.307.72-.703.72a.676.676 0 01-.432-.162c-.883-.72-1.98-1.044-3.079-1.044-1.44 0-2.467.774-2.467 1.909 0 2.701 7.112 1.152 7.112 5.636 0 1.748-1.188 3.53-4.43 3.53z"
    fill="#fff"
  />
  <path
    d="M55.953 20.352v1H43.152s-6.312-1.26-6.127-6.707c0 0 .207 5.707 6.002 5.707h12.926z"
    fillRule="evenodd"
    clipRule="evenodd"
    fill="#349C42"
  />
  <path
    d="M37.049 0v14.561c0 1.656 1.104 5.791 6.104 5.791h12.801L37.049 0z"
    opacity={0.5}
    fillRule="evenodd"
    clipRule="evenodd"
    fill="#fff"
  />
</svg>,
doc: <svg
xmlns="http://www.w3.org/2000/svg"
width="24px"
height="24px"
viewBox="-4 0 64 64"

>
<g fillRule="evenodd">
  <path
    d="M5.11 0A5.07 5.07 0 000 5v53.88A5.07 5.07 0 005.11 64h45.78A5.07 5.07 0 0056 58.88v-38.6L37.06 0z"
    fill="#107cad"
  />
  <path
    d="M56 20.35v1H43.18s-6.31-1.26-6.13-6.71c0 0 .21 5.71 6 5.71z"
    fill="#084968"
  />
  <path
    d="M37.07 0v14.56a5.78 5.78 0 006.11 5.79H56z"
    fill="#90d0fe"
    opacity={0.5}
  />
</g>
<path
  d="M14.24 53.86h-3a1.08 1.08 0 01-1.08-1.08v-9.85a1.08 1.08 0 011.08-1.08h3a6 6 0 110 12zm0-10.67h-2.61v9.34h2.61a4.41 4.41 0 004.61-4.66 4.38 4.38 0 00-4.61-4.68zm14.42 10.89a5.86 5.86 0 01-6-6.21 6 6 0 1111.92 0 5.87 5.87 0 01-5.92 6.21zm0-11.09c-2.7 0-4.41 2.07-4.41 4.88s1.71 4.88 4.41 4.88 4.41-2.09 4.41-4.88S31.35 43 28.66 43zm18.45.38a.75.75 0 01.2.52.71.71 0 01-.7.72.64.64 0 01-.51-.24 4.06 4.06 0 00-3-1.38 4.61 4.61 0 00-4.63 4.88 4.63 4.63 0 004.63 4.88 4 4 0 003-1.37.7.7 0 01.51-.24.72.72 0 01.7.74.78.78 0 01-.2.51 5.33 5.33 0 01-4 1.69 6.22 6.22 0 010-12.43 5.26 5.26 0 014 1.72z"
  fill="#fff"
/>
</svg>
}
 async function getResults(){

    const {data,error} = await supabase.from('results').select('*,test(course(title,id),id)').eq('email',userData?.email)
    if(data){
        
        setResults(data)
    }
    else{

    }
 }
async function getAssignments(a){

    const {data,error} = await supabase.rpc('get_assignment_count',{result_id_param:a})
    if(data){
        setAssignments(data)
    }else{}
}

 
 useEffect(()=>{
   
    getResults();
    if(userData != undefined){
        getEntries()
    }
   
 },[])



 async function addSubject(a){

    const {data,error} = await supabase.from('subjects').insert({
        title:a?.subjecttitle
    }).select()

    if(data){
getSubjects();




    }else{
        
    }

}

async function updateSubject(a,b){

    const {data,error} = await supabase.from('subjects').update({
        title:a?.subjecttitle
    }).eq('id',b).select()

    if(data){
getSubjects();




    }else{
        
    }

}

async function updateTopic(a,b){

    const {error} = await supabase.from('topics').update({
        title:a?.topictitle
    }).eq('id',b).select()

    if(!error){
getTopics();




    }else{
        
    }

}

async function deleteSubject(a){

    const {error} = await supabase.from('subjects').delete().eq('id',a)

    if(!error){
getSubjects();




    }else{
        
    }

}

async function getActiveResult(a){

const {data,error} = await supabase.from('scores').select("*,module(id,title)").match({result_id:a})

if(data){
    setScores(data)
    setViews(1)
}
else{}

}

async function getClasses(a){

const {data,error} = await supabase.from('schedules').select("*").eq('module',a);

if(data){
    return data;
}

else{
    toast.error('Error Loading Classes')
}


}

async function switchToClasses(a){

const classes = await getClasses(a);
setClasses(classes);
setViews(2)



}
async function deleteTopic(a){

    const {error} = await supabase.from('topics').delete().eq('id',a)

    if(!error){
getTopics();




    }else{
        
    }

}

async function getEntries(){
const {data,error} = await supabase.from('entries').select("*,schedules(id,title,module)").eq('student_id',userData?.email);

if(data){
    setEntries(data)
}
else{}

}

async function Bookclass(a){

    const{data,error} = await supabase.from('entries').insert({
        schedules:a,
        student_id:userData?.email
    }).select()

    if(data){
        getEntries()
    }
}

const stats= [
    {
        title:'Not Booked',
        status:'booked',
        colorclass:"!bg-gray-500"
    },
    {
        title:'In Waitlist',
        status:'waitlisted',
        colorclass:" !bg-[#87a9ff]"
    },
    {
        title:'Confirmed',
        status:'confirmed',
        colorclass:"!bg-blue-500 !border-blue-500"
    },
    {
        title:'Attended',
        status:'scheduled',
        colorclass:"!bg-[#325fd1] !border-[#325fd1]"
    },
    {
        title:'Rejected',
        status:'rejected',
        colorclass:"!bg-red-500 !border-red-500"
    },
    {
        title:'Completed',
        status:'completed',
        colorclass:"!bg-green-500 !border-green-500"
    }
]

async function loadDocuments(a){

    const {data,error} = await supabase.from('class_docs').select('*').eq('class_id',a)

    if(data){
       
        if(data?.length > 0){
            toast.success('Loaded All Study Materials');
        setStudyModal(true);
        setDocs(data)}else{
            toast.error('No Study Materials Found')
        }
    }

    else{
        toast.error('Error Loading Documents')
    }
}

const router = useRouter()
async function getTests(){

    const {data,error} = await supabase.from('swot_test').select('*')
    if(data){
        setTests(data)
        setTestModal(true)
    }
    else{}
}

const levels = [
    {
        title:'High Priority',
        priority:0,
        color:'bg-red-500 text-white'

    },
    {
        title:'Medium Priority',
        priority:1,
        color:'bg-yellow-300 '
        
    },
    {
        title:'Low Priority',
        priority:2,
        color:'bg-green-500 text-white'
        
    }
 
]
function filterTopics(a){

    return a?.filter(item=>item.parent == subjects[activeSubject]?.id) || []
}





return <div className="text-left w-full h-full overflow-hidden flex flex-col justify-start items-start ">


<Modal scrollBehavior={"outside"} isDismissable={false} size='3xl' className="flex mdl flex-col gap-1 text-center items-center" onClose={()=>{setTestModal(false)}} placement="bottom-center"  isOpen={testModal} >
<ModalContent className='sf'>
  {(onClose) => 
  (<>
  <ModalBody className='w-full mt-5'>
<p className="w-full text-left font-bold text-2xl">
Select a Test</p>
{tests && tests.filter(item => enrolled.some(course => course?.course?.id == item.course)).filter(item => !results.some(result => result.test.id == item.id) || results.some(result=> result.status == "pending")).map((i,d)=>{
    return <div className="w-full flex flex-row justify-between align-middle items-center rounded-md shadow-sm border-1 border-gray-100 px-4 py-3">
        
     <p>   {i?.title}</p>

     <Button color="primary" onPress={()=>{router.push(`/kyc/${i?.uid}`)}}>Take Test</Button>
        </div>
})}

  </ModalBody>

  </>)}</ModalContent></Modal>




  <Modal scrollBehavior={"outside"} isDismissable={true} size='3xl' className="flex mdl flex-col gap-1 text-center items-center" onClose={()=>{setStudyModal(false)}} placement="bottom-center"  isOpen={studyModal} >
<ModalContent className='sf'>
  {(onClose) => 
  (<>
  <ModalBody className='w-full mt-5'>
<p className="w-full text-left font-bold text-2xl">
    Class Learning Material
</p>

{docs != undefined && docs.map((i,d)=>{

    return <Link href={i.doc_link} target="_blank"><div className="w-full p-2 border-1 border-gray-200 rounded-md shadow-md text-left flex flex-row">
        {i.doc_type == "pdf" ? icons.pdf:''}
        {i.doc_type == "doc" ? icons.doc:''}
        {i.doc_type == "xl" ? icons.xl:''}
        
        <p className="ml-4">{i.title}</p></div></Link>
})}
  </ModalBody>

  </>)}</ModalContent></Modal>


    {views == 0 && activeSubject == undefined ? <>
<h2 className="text-2xl font-bold text-secondary">Select a Course</h2>
{results && results?.filter(item=> item.status == "finished").map((i,d)=>{
    return <div className="w-full flex flex-row justify-between items-center rounded-lg border-1 border-gray-200 shadow-md px-4 py-2 my-2">
      <div>
        <h2 className="text-md font-bold text-secondary">{i?.test?.course?.title}</h2>
        {i?.description ? <p>{i?.description}</p>:''} </div>
        
       <div className="flex flex-row">
        <Button color="primary" size="sm" onPress={()=>{getActiveResult(i.id),getAssignments(i.id),setActiveSubject(i.test?.course?.title)}}>Select</Button>
       {role == "admin" ?<>
        <Popover onOpenChange={(e)=>{e == true ? SetRaw(res=>({...res,subjecttitle:i?.title})):''}}><PopoverTrigger>
<Button color="success" className="ml-2" size="sm" >Update</Button></PopoverTrigger>
<PopoverContent>
<Input label="Subject Title" value={raw?.subjecttitle} placeholder="Enter Subject Title" onChange={(e)=>{SetRaw(res=>({...res,subjecttitle:e.target.value}))}}></Input>
<Button className="my-2" color="primary" onPress={()=>{updateSubject(raw,i?.id)}}>Update Subject Title</Button>
</PopoverContent>
</Popover>

</>:''}

      </div>
    
    </div>
})}

{results && results?.filter(item=> item.status == "finished").length == 0 ? <p className="bg-red-100 border-1 border-red-500 rounded-xl text-xs my-2 px-5 text-center py-2">You have not attempted any test yet. Attemp one to see your results or schedule a class here.</p> :'' }

<Divider></Divider>
<div className="mt-4">
    <h2 className="m-0 font-bold text-2xl text-secondary">Unable to see the course?</h2>
    <h2>You must attempt a SWOT test in order to get your personalized class schedules</h2>
    <Button color="primary" onPress={()=>{changeSlug('kyc')}}>Find all SWOT Tests</Button>
</div>


</>:''}

{views == 1 && scores != undefined ? <>



<Button size="sm" color="primary" className="mb-2" onPress={()=>{setViews(0),setActiveSubject()}}>
<svg  width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#222F3D"/></svg>
    Back to Course Selection</Button>


    
    <div className="w-full bg-gray-100 rounded-md min-h-[120px] relative flex flex-col justify-center items-center align-middle p-5 overflow-hidden">
        <img src="https://www.oxfordlearning.com/wp-content/uploads/2009/05/tips-for-easier-studying-860x420.jpg" className="w-full object-cover mix-blend-luminosity brightness-50 opacity-90 h-full absolute bg-gray-500"/>
       <div className="z-10 relative w-full justify-center flex flex-col align-center items-center">
    <p className="font-bold text-2xl text-primary">    Your Personalized Learning Plan { activeSubject != undefined  ? "for " + activeSubject : ''}</p>
        <div className="w-full max-w-[800px] mx-auto p-5 flex flex-row items-center align-middle">
        <h2 className="mr-2 font-bold text-white">{0}/{scores?.length}</h2>
    <div className="w-full h-[10px] bg-default-50 relative overflow-hidden rounded-full">
        <div className={`h-full absolute left-0 top-0 bg-primary rounded-full`} style={{width:(0/scores?.length)*100 + "%"}}></div>
        </div>
        <img className="ml-2" src="/medal.svg" width={40}/>
       
        </div>
        
<div className="flex flex-col flex-wrap lg:flex-nowrap justify-center items-center align-middle bg-white p-2 rounded-md shadow-md w-auto">

<h2 className="font-bold text-md">Legends</h2>
<div className="w-full flex flex-row flex-wrap">
    {stats && stats.map((i,d)=>{
        return <div className="flex flex-row items-center align-middle justify-center"><div
    
        className={`${styles.square}sf w-[20px] h-[20px] m-2 flex relative flex-col text-center justify-center items-center align-middle text-white`}
      
      >
        <div className={'bg-secondary border-1 border-primary w-full h-full absolute rotate-45 z-0 scale-[0.7] ' + i.colorclass }></div>


         
    <p className='z-10 relative text-white p-2 text-xs'></p>
    
      </div>
      <p className="text-xs text-center">{i?.title}</p>
      </div>
    })}</div>
</div>
</div> 
</div>
<div className="overflow-y-auto w-full flex-1">
    <div className="w-full flex flex-col flex-wrap overflow-y-auto">
{levels && levels.map((i,d)=>{
    return <div className="flex-0 min-h-[150px] w-full lg:flex-1 sf">
        <p className={`w-full p-1 text-center my-2 text-sm ${i.color || 'bg-primary'}`}>{i?.title}</p>
      <div className="w-full flex flex-row flex-wrap justify-center">  <SquareGroup data={scores && scores.filter(item=>item.priority == i.priority)} counts={assignments || ''} entries={entries} onClick={(e)=>{switchToClasses(e)}}></SquareGroup>
        
        
        </div>
        
        </div>
})}</div>
   </div>
    </>:''}

    {views == 2 && scores != undefined ? 
    <div className="w-full">
        <Button size="sm" color="primary" className="mb-2" onPress={()=>{setViews(1),setClasses()}}>
<svg  width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#222F3D"/></svg>
    Back to Module Selection</Button>
    <h2 className="text-2xl font-bold text-secondary">Booked Classes</h2>
    <Spacer y={2}></Spacer>
    {classes && classes.filter(item=> entries.some(entry => entry.schedules.id == item.id) ).map((i,d)=>{
    return <ScheduleCard fireDocLoad={()=>{loadDocuments(i.id)}} callBook={(e)=>{Bookclass(e)}} isBooked={entries?.filter(item=>item.schedules.id == i.id)?.length > 0 ? true : false} BookingStatus={entries.filter(item=>item.schedules.id == i.id)[0]?.status || 'Not Found'} data={i} type={"user"} ></ScheduleCard>
})}
{entries && classes && classes.filter(item=> entries.some(entry => entry.schedules.id == item.id) )?.length == 0 ? 
<div className="border-1 border-gray-300 text-center p-2 rounded-lg bg-gray-100 text-gray-500">No Booked Classes Found , Please book one from upcoming schedules</div>
:''}
<Spacer y={2}></Spacer>
<Divider></Divider>
<Spacer y={2}></Spacer>
    <h2 className="text-2xl font-bold text-secondary">Booking History</h2>

    {entries && entries.filter(item=> item.status == "completed")?.length == 0 ? 
<div className="border-1 border-gray-300 text-center p-2 rounded-lg bg-gray-100 text-gray-500">No Booked Classes Found , Please book one from upcoming schedules</div>
:''}

    <Spacer y={2}></Spacer>
    <Spacer y={2}></Spacer>
<Divider></Divider>
<h2 className="text-2xl font-bold text-secondary">Select a Class</h2>
<Spacer y={2}></Spacer>
{classes && classes?.filter(item=> !entries.some(entry => entry.schedules.id == item.id))?.map((i,d)=>{
    return <ScheduleCard callBook={(e)=>{Bookclass(e)}} isBooked={entries?.filter(item=>item.schedules.id == i.id)?.length > 0 ? true : false} data={i} type={"user"} ></ScheduleCard>
})}

{classes == undefined || classes?.length == 0 ? 
    <h2 className="text-md font-bold text-secondary border-1 rounded-md border-gray-200 p-2 text-center">No Class Schedule found for the selected module</h2>
:''}

    </div>
    :""}

</div>



}
function isURLValid(url) {
    const pattern = /^(http(s)?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,}){1,}/;
    return pattern.test(url);
}
const ScheduleCard = ({data,type,deleteSchedule,callEntry,callBook,isBooked,BookingStatus,fireDocLoad})=>{

    return <div className="w-full flex flex-row justify-between items-center align-middle p-1 mb-2 border-1 rounded-md border-gray-200 shadow-sm">
      <div className="flex flex-1 flex-row items-stretch">
        <div className="w-[80px] py-1 text-center flex flex-col justify-center items-center align-middle bg-gray-100 mr-2 rounded-md ">

           <h2 className="font-bold text-xl text-gray-500"> {CtoLocal(data?.datetime).date}</h2>
           <p className="text-xs text-gray-500">{CtoLocal(data?.datetime).monthName}</p>
        </div>
        <div className="flex flex-col flex-1">
       <p className="font-bold text-secondary"> {data?.title}</p>
       <p className="text-gray-500 text-sm">Time : {CtoLocal(data?.datetime).time} {CtoLocal(data?.datetime).amPm}</p>
       {data?.module?.title ?  <p className="text-gray-500 text-sm">Module : {data?.module.title}</p>:''}</div>
       </div>

       {isBooked ? '':
<div className="flex-1 text-center">
{data?.seats && data?.available != undefined ? <p className="font-light text-sm text-gray-500">Seats Available : <span className={`font-bold ${data?.available > data?.seats/2 ? "text-green-500" : ""} ${data?.available < data?.seats/2 ? "text-yellow-500" : ""} ${data?.available < 15 ? "!text-red-500" : ""}`}>{data?.seats}/{data?.available || data?.seats}</span></p>:''}
<p className="font-light text-sm text-red-500">Waitlist : {data?.waitlist || '0'}</p>
    <p className="font-light text-sm text-gray-500">Registration Starts : {new Date(data?.regstart)?.toLocaleString().split(',')[0]}</p>
</div>}

    {type == "self" || type == "admin" ? 
       <div className="flex-1 flex flex-row justify-end">
        <Button className="ml-2" size="sm" color="primary" onPress={()=>{callEntry()}}>Manage Entries</Button>
        <Button className="ml-2" size="sm" color="success">Edit</Button>
        <Button className="ml-2" size="sm" color="danger" onPress={()=>{deleteSchedule()}}>Delete</Button>
       </div>:''}


<div className="flex-1 flex flex-row justify-end items-center ">
{isBooked  ? 
<div className="text-blue-500 text-sm mx-5 hover:text-white hover:bg-blue-500 cursor-pointer" onClick={()=>{fireDocLoad()}}>Access Study Material</div>
:''}

    {isBooked  ? 
    <p className={`bg-yellow-200 p-2 rounded-full text-sm capitalize px-5 mr-2 ${BookingStatus == "confirmed" ? '!bg-green-500':''} ${BookingStatus == "pending" ? '!bg-yellow-300':''} ${BookingStatus == "rejected" ? '!bg-red-500':''}`}>{BookingStatus}</p> 
    :<Button isDisabled={new Date() < new Date(data.regstart) ? true: false} color="primary" onPress={()=>{callBook(data.id)}}>Book Now</Button>}</div>
{isBooked && data.location == "online" ?  <>{(BookingStatus == "confirmed" || BookingStatus == "attended") ? <>{data?.meeting_link != undefined && isURLValid(data?.meeting_link) ? <Link target="_blank" href={`/class/${data.id}`}><p className="bg-primary mx-2 rounded-full py-2 px-4 text-sm">Join Class</p></Link>:<p className="text-xs text-gray-500 mr-4 border-1 border-gray-200 rounded-full p-1">Class link will be available soon</p>}</>:''}</>:''}
    </div>

}
export default BookBySubject;