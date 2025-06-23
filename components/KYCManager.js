import { supabase } from "@/utils/supabaseClient";
import { Button } from "@nextui-org/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

function KYCManager({userData,role,enrolled}){
    const [tests,setTests] = useState();
    const [loading,setLoading] = useState(true);
    const [loading2,setLoading2] = useState(true);
    const [results,setResults] = useState();
    const router = useRouter();
    async function getTests(){

        const {data,error} = await supabase.from('swot_test').select('*')
        if(data){
            setTests(data)
            setLoading(false)
            
        }
        else{
            setLoading(false)
        }
    }
    async function getResults(){

        const {data,error} = await supabase.from('results').select('*,test(course(title,id),id)').eq('email',userData?.email)
        if(data){
            
            setResults(data)
            setLoading2(false)
        }
        else{
    
            setLoading2(false)
        }
     }
    useEffect(()=>{
        getTests();
        getResults();
    },[])

if(loading || loading2){
return <div>Loading...</div>
}

return <div className="flex flex-col w-full h-auto">

<p className="w-full text-left font-bold text-2xl mb-4">
Manage SWOT Tests</p>
{tests && tests?.length == 0 ? 
<div>No SWOT test available for the course you are enrolled in.</div>
:''}
{tests && tests?.map((i,d)=>{
    return <div className="w-full flex flex-row justify-between align-middle items-center rounded-md shadow-sm border-1 border-gray-100 px-4 py-3 my-1">
        
     <p className="font-bold text-md">   {i?.title}</p>
<div>
    {results?.filter(item => item.test.id == i.id && item.status == 'finished')?.length >  0  ? 
     <Button className="bg-blue-500 ml-2 text-white" onPress={()=>{router.push(`/results/${results?.filter(item => item.test.id == i.id && item.status == 'finished')[0].id}`),toast.loading('Loading Results')}}>View Results</Button>: ''}
   {results?.filter(item => item.test.id == i.id && item.status == 'paused')?.length >  0  ? 
     <Button className="ml-2 text-white" color="primary" onPress={()=>{router.push(`/kyc/${i?.uid}/?continue=${results?.filter(item=>item.test.id == i.id && item.status == 'paused')[0].id}`),toast.loading('Loading Test')}}>Continue Test</Button>: ''}
     {results?.filter(item => item.test.id == i.id)?.length ==  0 ||  results?.filter(item => item.status == "pending")?.length > 0  ? 
     <Button className="ml-2" color="success" onPress={()=>{router.push(`/kyc/${i?.uid}`) , toast.loading('Loading Test') }}>Take Test</Button> :''}
     
     </div>
        </div>
})}
{/* 
<p className="w-full text-left font-bold text-2xl mb-4">
Manage Results</p> */}

{/* {results && results.map((i,d)=>{
    return <div className="w-full flex flex-row justify-between align-middle items-center rounded-md shadow-sm border-1 border-gray-100 px-4 py-3 my-1">
        
     <p> {i?.id} </p>

     <Button color="primary" onPress={()=>{router.push(`/kyc/${i?.uid}`)}}>Take Test</Button>
        </div>
})} */}
{/* {results == undefined || results?.length == 0 ? 
<div>No Result found , Please attempt a test first</div>
:''} */}

</div>

}

export default KYCManager;