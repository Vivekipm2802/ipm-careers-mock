import { useEffect, useState } from "react";
import { useNMNContext } from "./NMNContext"
import { supabase } from "@/utils/supabaseClient";
import { Skeleton } from "@nextui-org/react";

export default function Assigned({size}){


    const {userDetails} = useNMNContext();
const [tests,setTests] = useState([]);
const [loading,setLoading] = useState(true);

async function getAssignedTests(a){

    const {data,error} = await supabase.from('assigned-tests').select('*').eq('user',a?.email);
    if(data){
        setTests(data);
        setLoading(false)
    }if(error){
        
        setLoading(false)
    }
}

useEffect(()=>{
if(userDetails != undefined){

    getAssignedTests(userDetails)
}

},[
    userDetails
])


    if(size == "big"){
        return <div></div>
    }




    return <div className="w-full flex flex-col">
    {tests == undefined || tests?.length ==0 ? 
    <Skeleton className="rounded-lg overflow-hidden" isLoaded={!loading}>
        <h2 className="rounded-md p-2 text-gray-500 border-1 border-gray-100 bg-gray-100">There is no test assigned to you yet.</h2></Skeleton>
    :''}
    {tests && tests?.map((i,d)=>{
        return <div></div>
    })}
            </div>
}