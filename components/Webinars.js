import { ISOto12Hour, extractDateInfo } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { Button, ButtonGroup, Divider, Input, Popover, PopoverContent, PopoverTrigger, Select, SelectItem, Spacer } from "@nextui-org/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import DateTimePicker from 'react-datetime-picker';

function Webinars({role,data,enrolled}){


const [webinars,setWebinars] = useState()
const [webinarData,setWebinarData] = useState();
const [courses,setCourses] = useState();
const [activeFilter,setActiveFilter] = useState('all');
const [teachers,setTeachers] = useState();

async function getCourses(){
    const {data,error} = await supabase.from('courses').select("*").order('id',{ascending:true})
    if(data){
      setCourses([...data,{id:449489,title:"ALL"}]);
    }
  }
 async function getWebinars(a,b){

let query = supabase.from("webinars").select('*');

if(a == 'admin'){
    
}
if(a == "teacher"){
console.log(b)
    query.eq('host',b?.email);
}

if(a == "user" || a === undefined){



    console.log(enrolled)
    query.in('allowed_to',["CUET","IPMAT","ALL","CAT"])
}

const {data,error} = await query.order('created_at',{ascending:false})


console.log(data,error)

if(data){
    setWebinars(data)
}
else{
    
}

 }

useEffect(()=>{

    getWebinars(role,data)
    getCourses()
},[


])

function localtoISO(a){
    
    var date = new Date(a);
    var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
                    date.getUTCDate(), date.getUTCHours(),
                    date.getUTCMinutes(), date.getUTCSeconds());
const local = new Date(now_utc).toISOString();
                    return local;               
}


async function addWebinar(a){

    if(a == undefined){
        return null
    }

    if(!a?.title){

        return null
    }

    if(!a?.description){
        return null
    }

    if(!a?.link){
        return null
    }
    if(role == "admin" && !a?.host){
        return null
    }
    if(!a?.date){
        return null
    }
    if(!a?.time){
        return null
    }
    if(!a?.audience){
        return null
    }


    const {error} = await supabase.from('webinars').insert({
title:a?.title,
description:a?.description,
link:a?.link,
datetime:localtoISO(a?.date +  " " + a?.time),
host:role == "teacher" ? data?.email : a?.host,
allowed_to:a?.audience
    })


    if(!error){
        getWebinars(role,data)
    }

}


async function getDis(){

}
async function getTeachers(){

    const {data,error} = await supabase.rpc('get_teacher_rows');

    console.log(data)

    if(data){
        setTeachers(data)
    }
    else{
        
    }
}
function getFiltered(a){
    const currentDate = new Date();



    if(activeFilter == 'all'){
        return a
    }
    if(activeFilter == "upcoming"){
const upcomingEvents = a.filter(item => {
        if (item.datetime) {
            const eventDate = new Date(item.datetime);

            // Check if the event date is today or in the future
            return eventDate >= currentDate;
        }})

return upcomingEvents;



    }

    if(activeFilter == "past"){
        const pastEvents = a.filter(item => {
            if (item.datetime) {
                const eventDate = new Date(item.datetime);
    
                // Check if the event date is today or in the future
                return eventDate < currentDate;
            }})

            return pastEvents;
    }



    else{
        return a
    }

}

async function deleteWebinar(a){


    const {error} = await supabase.from('webinars').delete().eq('id',a);

    if(!error){
        getWebinars(role,data)
    }
    else
    {
        alert('Error Deleting ')
    }
}


const router = useRouter();


return <div className="w-full h-full rounded-md sf p-2 lg:p-4 overflow-hidden relative">
<h2 className="text-left w-full mb-2 text-2xl uppercase font-bold">Webinars</h2>
<div className="w-full flex flex-col justify-start items-center align-top ">
    <div className="flex flex-row justify-start items-start align-top w-full mb-4">
<ButtonGroup>
      <Button color={activeFilter == 'all' ? "primary" : "default"} onPress={()=>{setActiveFilter('all')}}>All</Button>
      <Button color={activeFilter == 'upcoming' ? "primary" : "default"} onPress={()=>{setActiveFilter('upcoming')}}>Upcoming</Button>
      <Button color={activeFilter == 'past' ? "primary" : "default"} onPress={()=>{setActiveFilter('past')}}>Past</Button>
    </ButtonGroup>
    </div>

<div className="w-full flex flex-row flex-wrap justify-start items-stretch align-top -mx-2 overflow-y-auto flex-1">
{webinars != undefined && getFiltered(webinars).map((i,d)=>{

    return <div className={`flex m-0 lg:m-2 relative flex-col bg-white justify-start items-start shadow-sm rounded-md flex-[30%] flex-grow-1 lg:flex-grow-0  px-4 py-2 mb-2 border-1 border-gray-100 ${i?.isActive == true ? "":"opacity-50 pointer-events-none grayscale"}`}>
<div className="w-[5px] rounded-full h-[90%] absolute bg-primary left-1"></div>

<div><h2 className="text-md text-secondary text-left font-bold uppercase">{i?.title}</h2>
<p className="text-left text-gray-500 text-sm">{i?.description}</p>


</div>
<Spacer ></Spacer>
<Spacer ></Spacer>
<Divider></Divider>

<div className="my-2 flex flex-row justify-center items-center">
    <img src={data?.user_metadata?.profilepic || '/teacher_placeholder.jpeg'} className="w-[34px] rounded-full "/>
    <div className="mx-2 text-left">
        <p className="text-sm">This webinar is hosted by:</p>
        <h2 className="text-sm">{i?.host}</h2>
    </div>
</div>
<Divider></Divider>
<div className="flex flex-row my-3 w-full">
<h4 className="text-gray-800 text-sm  flex-1 text-center bg-gray-200 rounded-full p-2 mr-2">{extractDateInfo(i?.datetime).dayName} , {extractDateInfo(i?.datetime).date} {extractDateInfo(i?.datetime).monthName}, {extractDateInfo(i?.datetime).year}</h4>
<h3 className=" flex text-sm flex-1 text-center flex-row justify-center items-center align-middle bg-gray-200 rounded-full p-2"><svg className="mr-2" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.25 13.5h-4a.75.75 0 0 1-.75-.75v-6a.75.75 0 0 1 1.5 0V12h3.25a.75.75 0 0 1 0 1.5ZM12 2C6.478 2 2 6.478 2 12s4.478 10 10 10 10-4.478 10-10S17.522 2 12 2Z" fill="#444"/></svg>{ISOto12Hour(i?.datetime)}</h3>
</div>


<div className="w-full">
<Link href={i?.link || ''} target="_blank"><Button size="xs" fullWidth={true} color="primary">{i?.isActive ? "ATTEND" : "EXPIRED"}</Button></Link></div>
{role == "teacher" || role == "admin" ? 
<div className="w-full my-2">
<Button size="xs" fullWidth={true} onPress={()=>{deleteWebinar(i?.id)}} color="danger">DELETE</Button>
</div>:''}
    </div>
})}</div>

</div>

{role == "admin" || role == "teacher"  ? <Popover placement="top-end" onOpenChange={(e)=>{e == true ? getTeachers():''}}><PopoverTrigger>
<div className={`flex flex-row bg-gray-50 p-5 border-dashed justify-between shadow-sm rounded-md w-full px-4 py-2 mb-2 border-1 border-gray-100 `}>
<h2>Add a Webinar</h2>

</div>
</PopoverTrigger>


<PopoverContent>
    <div className="min-w-[400px] sf py-3">
        <Input label="Webinar Title" placeholder="Enter Webinar Title" className="my-2"  onChange={(e)=>{setWebinarData(res=>({...res,title:e.target.value}))}}></Input>
        <Input label="Webinar Description" placeholder="Enter Webinar Description" className="my-2"  onChange={(e)=>{setWebinarData(res=>({...res,description:e.target.value}))}}></Input>
        <Input label="Webinar Link" placeholder="Enter Webinar Link" className="my-2"  onChange={(e)=>{setWebinarData(res=>({...res,link:e.target.value}))}}></Input>
        <Input label="Webinar Date" placeholder="Enter Webinar Date" className="my-2" type="date"  onChange={(e)=>{setWebinarData(res=>({...res,date:e.target.value}))}}></Input>
        <Input label="Webinar Time" placeholder="Enter Webinar Time" className="my-2" type="time"  onChange={(e)=>{setWebinarData(res=>({...res,time:e.target.value}))}}></Input>
      {role == "admin" ? 
        <Select label="Select a Host" 
        value={webinarData?.host}
        className="sf mb-3" 
        onChange={(e)=>{setWebinarData(res=>({...res,host:e.target.value}))}} >

{teachers?.map((teacher) => (
   
          <SelectItem className="sf" key={teacher?.email} value={teacher?.id}>
      {`${teacher.raw_user_meta_data?.full_name} < ${teacher.email} >`}
          </SelectItem>
        ))}



        </Select>:''}
        <Select label="Select Audience" 
        value={webinarData?.audience}
        className="sf mb-3" onChange={(e)=>{setWebinarData(res=>({...res,audience:e.target.value}))}} >

{courses?.map((course) => (
          <SelectItem className="sf" key={course.title} value={course.title}>
            {course.title}
          </SelectItem>
        ))}
        </Select>


        <Button color="primary" className="mt-2"  onPress={()=>{addWebinar(webinarData)}}>Add Webinar</Button>
    </div>
</PopoverContent>

</Popover> 

:''}

</div>


}

export default Webinars;