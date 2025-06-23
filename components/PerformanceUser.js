import { useEffect, useState } from "react";
import { useNMNContext } from "./NMNContext"
import { supabase } from "@/utils/supabaseClient";
import { CartesianAxis, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Spacer } from "@nextui-org/react";
import { format } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { CtoLocal } from "@/utils/DateUtil";
import { toast } from "react-hot-toast";
export default function PerformanceUser(){


const {userDetails} = useNMNContext();
const [logins,setLogins] = useState();
const [attendance,setAttendance] = useState()
const [stats,setStats] = useState()

async function getLogins(){

    const {data,error} = await supabase.rpc('get_user_session_details')
    if(data){
        setLogins(data)
    }

}
async function getAttendance(){
    const {data,error} = await supabase.from('attendance').select('*').eq('student',userDetails.email).order('created_at',{ascending:true});
    if(data){
        setAttendance(data)
    }
    if(error){
        toast.error('Unable to load attendance')
    }
}
async function getStats(){
  const {data,error} = await supabase.rpc('count_user_records_by_period')
  if(data && data?.length > 0){
      setStats(data[0])
  }
  if(error){
      toast.error('Unable to load attendance')
  }
}
useEffect(()=>{getAttendance()
getStats()
},[])
function prepareLoginCountData(sessionData) {
    if(sessionData == undefined){
        return;
    }
    // Create an object to store counts per day
    const loginCountPerDay = {};

    // Iterate over the session data
    sessionData.forEach(session => {
        // Extract and format the date part of the created_at field
        const date = format(parseISO(session.created_at), 'dd MMMM');
        
        // Increment the count for the date
        if (loginCountPerDay[date]) {
            loginCountPerDay[date] += 1;
        } else {
            loginCountPerDay[date] = 1;
        }
    });

    // Convert the login counts into an array of objects suitable for Recharts
    const visualizableData = Object.keys(loginCountPerDay).map(date => ({
        date,
        count: loginCountPerDay[date]
    }));

    return visualizableData;
}
const visualizableData = prepareLoginCountData(logins);

useEffect(()=>{
    getLogins()
},[])
function getAllDaysOfCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
  
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Get the number of days in the current month
  
    const daysArray = [];
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(new Date(year, month, day));
    }
  
    return daysArray;
  }
  
  const getStatusClass = (date, jsonArray) => {
    // Convert the date to UTC midnight to ensure consistent comparison
    const currentDate = new Date(date).toISOString().split('T')[0];
    
    const matchingItem = jsonArray?.find(item => {
      // Convert attendance date to UTC midnight as well
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0, 0, 0, 0);
      const formattedItemDate = itemDate.toISOString().split('T')[0];
      return formattedItemDate === currentDate;
    });

    if (!matchingItem) {
      return '';
    }

    switch (matchingItem.status) {
      case 'present':
        return ' !bg-green-500';
      case 'absent':
        return ' !bg-red-500';
      case 'holiday':
        return ' !bg-secondary-400';
      default:
        return '';
    }
  };
  
  
    return <div className=" w-full font-sans h-full rounded-xl overflow-y-auto flex flex-col justify-start items-start p-2">
<div className="flex flex-row w-full  flex-wrap lg:flex-nowrap">
<div className="w-full lg:w-2/3 rounded-xl from-primary-500 to-primary p-4 bg-gradient-to-r min-h-[200px] flex flex-col items-start justify-start text-white">
<h2 className="text-lg font-semibold">Monthly Attendance Analysis</h2>
<p className="text-secondary-400">{CtoLocal(new Date()).monthName}</p>
<div className="flex flex-row items-end justify-start w-full mt-2 text-ellipsis max-w-[1200px]">
{getAllDaysOfCurrentMonth().map((i,d)=>{
    return <div className="text-xs flex-1 h-[100px] items-center mr-1 flex flex-col">
        <div className={" h-full w-[2px] rounded-full my-2 bg-[#fff2] " + (getStatusClass(i,attendance))}></div>
        <p>{i.getDate()}</p></div>
})}</div>
</div>
<Spacer x={2}></Spacer>
<div className="w-full lg:w-1/3 rounded-xl from-secondary-500 to-secondary p-4 bg-gradient-to-r min-h-[200px] flex flex-col items-start justify-start text-white">
<h2 className="text-lg font-semibold">Login History</h2>
<h2 className="text-2xl font-bold">{logins?.length ?? 0}</h2>
<ResponsiveContainer width="100%" height="100%">
      <LineChart width={300} height={100}  data={visualizableData}>
        <Tooltip content={<CustomToolip></CustomToolip>} className="text-black" ></Tooltip>
        <XAxis className="text-xs fill-white allwhite" dataKey="date" />
        
        <Line type="monotone" dataKey="count" stroke="#fff" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
    
</div>
</div>
<Spacer y={2}></Spacer>
<div className="w-full flex flex-col md:flex-row flex-wrap items-stretch justify-start">
<div className="w-2/3 flex flex-row  items-center justify-start">
  
<CustomCard title={"Today's Attempts"} count={stats?.today_count}></CustomCard>
<CustomCard title={"Week's Attempts"} count={stats?.last_7_days_count}></CustomCard>
<CustomCard title={"Month's Attempts"} count={stats?.last_30_days_count}></CustomCard>
<CustomCard title={"Total Attempts"} count={stats?.lifetime_count}></CustomCard>
</div>
<div className="flex-1 w-full md:w-auto m-2 flex flex-row items-center justify-center bg-gradient-purple rounded-xl p-4"></div>
    </div></div>
}

const CustomCard = ({count,title})=>{

  return <div className="bg-gray-50 flex flex-col items-start justify-start  aspect-square m-2 flex-1 rounded-xl p-4">
    <h2 className="text-lg text-primary text-left font-semibold">{title}</h2>
    <p className="w-full flex flex-col flex-1 items-center justify-center text-7xl text-secondary font-bold">{count || 0}</p>
  </div>

}

const CustomToolip = ({ active, payload, label })=>{
    if (active && payload && payload.length) {
        return (
          <div className="custom-tooltip rounded-xl bg-white shadow-md text-gray-500 text-sm px-2 py-2">
            <p className="label">{`${label} : ${payload[0].value} Logins`}</p>
            
          
          </div>
        );
    
    }
}