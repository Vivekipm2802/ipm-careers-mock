import { serversupabase, supabase } from "@/utils/supabaseClient";
import { Divider, Spinner } from "@nextui-org/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Countdown from "react-countdown";

function ClassAttender({data,id}){


const [userData,setUserData] = useState();
const [remainingTime,setRemainingTime] = useState()
    async function addRedirects(callback) {
        // Simulate a delay of 2 seconds
      const {data,error} =  await supabase.from('redirects').insert({
            email:userData?.email,
            class_id:id
        }).select()

        if(data){
            callback();
        }
        else{
            alert('Error redirecting to class')
        }
        // After 2 seconds, invoke the callback function
       
      }

const router = useRouter();
useEffect(()=>{
    if(userData != undefined){
    if(data && data.is_expired == true &&  data?.link != undefined){
addRedirects(()=>{router.push(data.link)})
    }

    if(data && data?.is_expired == false){
        getTime(id)
    }

}
    

},[userData])

async function getTime(a){

    const {data,error} = await supabase.from('schedules').select('datetime').eq('id',a)

    if(data && data?.length > 0){
        setRemainingTime(data[0].datetime)
    }else{

    }
}

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
    getUserData()
},[])

const renderCount = ({ days,hours, minutes, seconds, completed }) => {
    if (completed) {
      // Render a completed state
      return <div>Refresh the Page</div>;
    } else {
      // Render a countdown
      return <span className="text-sm text-secondary font-bold bg-yellow-100 rounded-full p-1 px-3 my-2 flex justify-center items-center content-center w-auto">{days} {days > 1 ? 'Days' : 'Day'} and {hours}:{minutes}:{seconds} Remaining</span>;
    }
  };

    return <div className="w-full h-screen bg-gray-200 p-5 lg:p-1 flex flex-col justify-center items-center align-middle">

        <div className="w-full max-w-[800px] bg-white shadow-sm h-auto mx-auto min-h-[30vh] rounded-md flex flex-col justify-center items-center align-middle">

<img src="/newlog.svg" width={120} className="mx-auto my-5"/>
<div className="flex-1 flex flex-col items-center align-middle justify-center">

{data == null || data == undefined || data?.is_expired == false ? 
<div className="sf text-center w-full">Class link is not accessible before scheduled time. <br/> Please check back later 😉<br/> 
{remainingTime != undefined ? 
<Countdown  renderer={renderCount}  date={new Date(remainingTime)} />:''}
</div>

:''}

{data && data.is_expired == true &&  data?.link == undefined ? 
<p>Meeting Link not Found</p>
:''}


    {data && data.is_expired == true &&  data?.link != undefined ? 
    <div className="w-full text-center flex flex-row align-middle items-center justify-center sf">
        <Spinner className="mr-2" color="danger" size="sm"></Spinner>
        Redirecting to your Class...</div>
    :''}
</div>
<div className="flex-1"></div>
        </div>
    </div>
}

export default ClassAttender;
export async function getServerSideProps(context){

const {id} = context.query;

const {data,error} = await serversupabase.rpc('check_schedule',{id_to_check:id})
if(data){
    
}
else{
    
}


return {props:{data:data[0] ,id:id}}

}