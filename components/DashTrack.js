import { CtoLocal } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { Button, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Popover, PopoverContent, PopoverTrigger, Spacer } from "@nextui-org/react";
import { useRouter } from "next/router";
import { useState ,useEffect} from "react";
import {  toast } from "react-hot-toast";
import SquareGroup from "./SquareGroup";
import Link from "next/link";
import styles from './SquareGroup.module.css'
import Loader from "./Loader";
import LearningPath from "./LearningPath";
function DashTrack({userData,role,enrolled,changeSlug,goToTest}){

const [views,setViews] = useState(0);



const [results,setResults] = useState();
const [entries,setEntries] = useState();

/* const [raw,SetRaw] = useState(); */
const [activeSubject,setActiveSubject] = useState();
const [tests,setTests] = useState();
const [isNull,setIsNull] = useState(true);
const [testModal,setTestModal] = useState(false);

const [scores,setScores] = useState();

const [classes,setClasses] = useState();
const [loading,setLoading] = useState(true)
const [assignments,setAssignments] = useState();
const [studyModal,setStudyModal] = useState(false);
const [docs,setDocs] = useState()

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

    const {data,error} = await supabase.from('results').select('*,test(course(title,id),id)').match({'email':userData?.email,status:"finished"})
    if(data && data?.length > 0){
        
        setResults(data);
        setIsNull(false)
        setLoading(false)
        getActiveResult(data[0].id)
    }
    else{
        setIsNull(true)
        setLoading(false)
    }
 }

 async function getActiveResult(a){

    const {data,error} = await supabase.from('scores').select("*,module(id,title)").match({result_id:a})
    
    if(data){
        setScores(data)
        setViews(1);
        
        setLoading(false)
        
    }
    else{}
    
    }
useEffect(()=>{
    getResults()
},[])



const router = useRouter()

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

if(loading){
    return <div className='w-full h-screen bg-white flex flex-col justify-center items-center align-middle'>
    <Loader></Loader> </div>
}

if(isNull && !loading){
    return <div>
        <h2 className="p-3 border-dashed border-1 border-gray-200 rounded-md bg-gray-100 text-gray-500">No Result Found , Please attempt a SWOT Test to track your progress Here </h2>

        <Button className="my-3 text-white" size="sm" color="primary" onPress={()=>{goToTest()}}>Go to SWOT Tests</Button>
        </div>
}



return <div className="text-left w-full h-full overflow-hidden flex flex-col justify-start items-start ">





 


    

{views == 1 && scores != undefined ? <>


    
   
<div className="overflow-y-auto w-full flex-1">
   <LearningPath topics={scores} ></LearningPath>
   </div>
    </>:''}

    

</div>



}


export default DashTrack;