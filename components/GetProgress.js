import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";

function GetProgress({enrolled,userData}){

    const [results,setResults] = useState();
    const [tests,setTests] = useState();
    const [scores,setScores] = useState();
    const [activeTest,setActiveTest]= useState(0);
async function getResults(a){

    const {data,error} = await supabase.from('results').select('*,test(course(id,title),id)').eq('email',userData?.email);

    if(data){
        setResults(data)
    }else{

    }
}
async function getTests(){

    const {data,error} = await supabase.from('swot_test').select('*,course(id,title)').order('title',{ascending:true});

    if(data){
        setTests(data)
    }else{

    }

}

useEffect(()=>{
    getResults();
    getTests();
},[])

useEffect(()=>{
    
},[
    activeTest
])

    const [active,setActive] = useState(0)
const re = []

if(enrolled == undefined || enrolled?.length == 0 ){
    return <div className="border-1 border-gray-300 w-full h-full p-2 rounded-lg flex flex-col items-center justify-center align-middle text-sm">
No Course Enrolled to Track Progress
    </div>
}
if(tests == undefined || tests?.length == 0){
    return <div className="border-1 border-gray-300 w-full h-full p-2 rounded-lg flex flex-col items-center justify-center align-middle text-sm">
Please attempt a SWOT Test to Track Progress
    </div>
}

    return <div className="flex flex-col items-stretch align-middle justify-center w-full h-full">


        <div className="flex flex-row justify-start align-middle items-center w-full">
        {tests != undefined && tests?.filter(item=> enrolled.some(enroll=>enroll.course.id == item.course.id))?.map((i,d)=>{
            return <div className={`bg-default mx-1 font-light rounded-full hover:bg-yellow-200 text-xs px-3 py-1 cursor-pointer ${active == d ? "bg-primary":""}`} onClick={()=>{setActive(d)}}>{i.course.title}</div>

        })}</div>
<div className="bg-white w-full h-full mt-2 rounded-md">


</div>
        
    </div>
}

export default GetProgress;