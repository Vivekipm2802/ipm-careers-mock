import { supabase } from "@/utils/supabaseClient"
import { Button } from "@nextui-org/react";
import { useEffect, useState } from "react"
import Bookings from "./Bookings";

function BookByTeacher({userData,role}){

const [teachers,setTeachers] = useState();
const [teachersData,setTeachersData] = useState();
const [view,setView] = useState(0);
const [currentTeacher,setCurrentTeacher] = useState();
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
 
 useEffect(()=>{
    getTeachers();
    getTeachersData();
 },[])

function ExtractShifts(a){
    const days = ['S','M','T','W','T','F','S']
const teacher = teachersData?.filter(item=>item.email == a?.email)[0];
const shifts = teacher?.shifts || [];

if(teacher != undefined )
return <>
<div className="text-left font-medium">Subject : {teacher?.subjects?.title}</div>
<div className="flex flex-row justify-start items-center align-middle">Availability : {shifts && shifts.map((i,d)=>{
    return <div className={`w-[24px] h-[24px] mx-1 ${i?.isAvailable ? "bg-primary rounded-full":"opacity-50 line-through"}`}>{days[i?.day]}</div>
})}</div></>

else
return null
}

return <div className="w-full h-auto sf">
    {view == 0 ? <>
<h2 className="text-2xl text-left font-bold mb-6">Select your Teacher</h2>
{teachers && teachers?.map((i,d)=>{
    return <div className={`px-5 py-3 border-1 border-gray-200 rounded-lg my-2 shadow-md flex flex-row justify-between align-middle items-center ${teachersData?.filter(item=>item.email == i?.email)?.length > 0 ? '':'opacity-50 pointer-events-none grayscale'}`}>
     <div>
      <h2 className="font-bold text-lg text-left text-secondary flex flex-row align-middle"><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 17.75v-3.766l4.06 2.653a5.375 5.375 0 0 0 5.88 0L19 13.984v3.766a.75.75 0 0 1-.15.45l-.001.001-.001.002-.003.004-.009.01-.012.016-.013.017-.086.101a5.325 5.325 0 0 1-.317.33c-.277.267-.69.614-1.25.958C16.037 20.329 14.339 21 12 21c-2.339 0-4.036-.67-5.159-1.361a7.433 7.433 0 0 1-1.25-.957 5.313 5.313 0 0 1-.427-.464l-.009-.01-.003-.005v-.002A.755.755 0 0 1 5 17.75Z" fill="#222F3D"/><path d="m22.16 10.128-8.04 5.253a3.875 3.875 0 0 1-4.24 0L3 10.886v5.364a.75.75 0 0 1-1.5 0V10c0-.088.015-.172.043-.25a.75.75 0 0 1 .302-.881l8.064-5.17a3.875 3.875 0 0 1 4.182 0l8.064 5.17a.75.75 0 0 1 .005 1.259Z" fill="#222F3D"/></svg>  {i?.raw_user_meta_data?.full_name}</h2>
      {ExtractShifts(i)}
      </div>
       {/* <p className="text-left font-medium text-md"> {i?.email}</p> */}

       {teachersData?.filter(item=>item.email == i?.email)?.length > 0 ? <Button onPress={()=>{setView(1),setCurrentTeacher(i)}} color="primary">Get Slots</Button>:<Button onPress={()=>{getSlots()}} disabled color="primary">Teacher Unavailable</Button>}
    </div>
})}


</>:''}

{view == 1 ? <div className="text-left">
<Button size="sm" color="primary" className="mb-4" onPress={()=>{setView(0),setCurrentTeacher()}}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#222F3D"/></svg>Back to Teacher Selection</Button>
    <h2 className="text-2xl text-left font-bold mb-6">Select a Day</h2>
    <p className="text-left">You have selected {currentTeacher?.raw_user_meta_data?.full_name}</p>

    <p className="border-1 border-dashed text-center rounded-md p-3">Currently No Slot are available</p>

</div>:""}
<Bookings type="teacher" userData={userData}></Bookings>
</div>



}

export default BookByTeacher