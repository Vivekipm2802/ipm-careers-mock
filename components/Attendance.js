import { extractDateInfo } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { Button, ButtonGroup } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useNMNContext } from "./NMNContext";

function Attendance({userData}){


const user = userData;
const [attendance,setAttendance] = useState();
function getClosestMonday() {
    const currentDate = new Date();
    
    
    for (let d = 0; d < 7; d++) {
        const r = extractDateInfo(currentDate.toISOString(), -d).day;
        if (r == 1) {
            const findDate = currentDate.setDate(currentDate.getDate() - d);
           const z = new Date(findDate).toISOString().split('T')[0];
           console.log(z,r)
            return z;
        }
    }
  
    /* return closestMonday.toISOString().split('T')[0]; // Return in 'YYYY-MM-DD' format */
  }


  async function getLastSevenDays(){

    const {data,error} = await supabase.from('attendance').select('*').eq('teacher',user?.email).order('created_at',{ascending:false}).limit(10);


    if(data){

setAttendance(data)
    }

    else{

    }
  }

function isTodayMarked(a){

if(a == undefined || a?.length == 0){
    return undefined
}

const todayDate = new Date().toISOString().split('T')[0];
    
const matchingItems = a.filter(item => item.created_at.startsWith(todayDate));

return matchingItems[0] || undefined;

    

}
useEffect(()=>{
    if(userData != undefined){
    getLastSevenDays();}

},[userData])

async function markAs(a){

    const currentTime = new Date();
    
const {error} = await supabase.from('attendance').insert({
    teacher:user?.email,
    status:a,
    attended_at:currentTime.toISOString(),
    isAvailable:true,
    onVacation:a == "holiday" ? true : false

})


if(!error){
    getLastSevenDays()
}

}
const {isDemo} = useNMNContext()
function getDateStatus(a, b) {
    const futureDate = new Date(a);
    futureDate.setDate(futureDate.getDate() + b);
    const formattedFutureDate = futureDate.toLocaleDateString().slice(0, 10);

    function isMatching(date) {
        const currentDate = new Date(date?.attended_at);
        const formattedCurrentDate = currentDate.toLocaleDateString().slice(0, 10);
        return formattedCurrentDate === formattedFutureDate;
    }

    const status = attendance?.filter((i) => isMatching(i));

    console.log(status);

    return <p className={`rounded-full ${status != undefined && status[0]?.status == "present" ? 'bg-green-500 text-white':''} ${status != undefined && status[0]?.status == "absent" ? 'bg-red-500 text-white':''} ${status != undefined && status[0]?.status == "holiday" ? 'bg-blue-500 text-white':''}`}>{status && status.length > 0 ? status[0].status : 'nr'}</p>;
}


function isToday(a,b){
    const currentDate = new Date().toLocaleDateString().slice(0, 10);
  
    // Create a new date by adding b days to the current date
    const futureDate = new Date(a);
    futureDate.setDate(futureDate.getDate() + b );
    const formattedFutureDate = futureDate.toLocaleDateString().slice(0, 10);


// Compare the given date with the current date
if (formattedFutureDate === currentDate) {
  return true
} else {
  return false
}
}

    return <><div className="bg-white shadow-md rounded-md border-1 border-gray-200 flex flex-row fixed top-5 right-16 px-2 py-2 text-xs align-middle items-center">Your Status : <span className="mx-1 w-[9px] h-[9px] bg-green-600 rounded-full animate-pulse"></span> Online</div>
    
    
    <div className="my-2 p-3 border-1 border-gray-100 rounded-md w-full">



<h2 className="text-lg font-bold">Your Weekly Attendance Report</h2>



{Array(7).fill().map((i,d)=>{
    return <div className={`p-2 rounded-lg border-1 border-gray-200 shadow-md my-2 flex flex-row justify-between items-stretch align-middle ${isToday(getClosestMonday(),d) == true ? "border-green-500" : ""}`}>

      
        <h2 className="text-sm"><span className="bg-green-500 text-white rounded-full py-1 px-3 ">{extractDateInfo(getClosestMonday(),d).dayName}</span> : {extractDateInfo(getClosestMonday(),d).date} {extractDateInfo(getClosestMonday(),d).monthName}</h2>
        <div className="w-auto flex flex-row">Status:
        <div className="bg-primary min-w-[100px] ml-2 text-center rounded-full cursor-pointer text-sm">{getDateStatus( getClosestMonday() , d)}</div>
        </div></div>

    })}

{isDemo == true ? '':
<div className="border-1 rounded-lg p-5 my-2 flex flex-col text-left justify-start items-start align-top">
    <p>Your Attendance Today : </p>


   {attendance && isTodayMarked(attendance) != undefined ? 
   <div>
    <h2 className="font-bold text-3xl text-secondary">
    {isTodayMarked(attendance)?.status == "present" ? 'Marked as Present':''}
    {isTodayMarked(attendance)?.status == "absent" ? 'Marked as Absent':''}
    {isTodayMarked(attendance)?.status == "holiday" ? 'On a Vacation':''}</h2>
    </div>
   : 
   <div className="flex flex-row my-2 flex-wrap -mx-1">
      <Button color={"success"} className="m-1"  onPress={()=>{markAs('present')}}>Mark as Present</Button>
      <Button color={"danger"} className="m-1" onPress={()=>{markAs('absent')}}>Mark as Absent</Button>
      <Button color={"primary"} className="m-1" onPress={()=>{markAs('holiday')}}>Mark as Holiday/Vacation</Button>
      </div>}
</div>}





    </div></>
    
}

export default Attendance;