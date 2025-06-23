import { supabase } from "@/utils/supabaseClient";
import { Button, Select, SelectItem, Spinner } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function ResultManager(){

const [users,setUsers] = useState();
const [selected,setSelected] = useState()
const [results,setResults] = useState();
const [loading,setLoading] = useState(true);
const updateStateFromArray = (array) => {
    const updatedState = array.map((value, index) => ({
      id: index,
      value: value,
    }));
  
    setUsers(updatedState);
  };
async function getEmails(){

    const {data,error} = await supabase.rpc('get_all_emails');
    if(data){
      updateStateFromArray(data)   
    }
  }

useEffect(()=>{

    setResults()
    if(selected != undefined){
        getResults(selected)
    }
},[selected])
  useEffect(()=>{
    getEmails()
  },[])


  async function getResults(a){


    setLoading(true)
    const{data,error} = await supabase.from('results').select('id,status,created_at,currentLevel,student_name,test(*)').eq('email',a);
    if(data){
        setResults(data)
        setLoading(false)
    }
    if(error){
        toast.error('Unable to Load Results')
        setLoading(false)
    }
  }
  async function deleteResult(a){


    setLoading(true)
    const{error} = await supabase.from('results').delete().eq('id',a);
    if(!error){
        getResults(selected)
        setLoading(false)
        toast.success('Deleted Successfully')
    }
    if(error){
        toast.error('Unable to Delete this Result')
        setLoading(false)
    }
  }
  


    return <div className="flex flex-col justify-start items-start w-full h-full">
<h2 className="font-bold text-md mt-4 text-primary text-left my-2">Select a User</h2>
<Select onChange={(e)=>{setSelected(e.target.value)}} label="Select User to get Result" placeholder="Fetch Result of User">
    {users && users.map((i,d)=>{
        return <SelectItem key={i.value} value={i.value}>{i.value}</SelectItem>
    })}
</Select>

{!loading && selected ? <>
    <h2 className="font-bold text-md mt-4 text-primary text-left">Showing Results for <br/>{selected}</h2>
{results && results.map((i,d)=>{
    return <div className="flex flex-row w-full p-2 border-1 items-center justify-between rounded-xl shadow-md my-2">
        
        <h2 className="text-lg font-bold">{i.test.title}</h2>
    
    <div className="flex flex-row items-center">
        <p className="flex flex-row  items-center mr-2 font-bold text-xs">Status:  {i.status}</p>
        <Button color="danger" onPress={()=>{deleteResult(i.id)}}>Delete</Button></div>
    </div>
})}
{results == undefined || results?.length == 0 ? 
<h2 className="p-4 border-1 border-dashed bg-white shadow-md my-2 w-full rounded-xl">This user has no results</h2>
:''}
</>:''}

{loading && selected ? 
<Spinner></Spinner>
:''}

    </div>
}