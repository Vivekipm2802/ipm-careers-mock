import { supabase } from "@/utils/supabaseClient"
import { Chip, Divider, Select, SelectItem, Spacer, Tooltip } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function TeacherManager(){



    const [permissions,setPermissions] = useState();
    const [teachers,setTeachers] = useState()
    const [activeTeachers,setActiveTeachers] = useState()
    const [currentTeacher,setCurrentTeacher] = useState()
    const [centres,setCentres] = useState();
async function getPermissions(a){
    const {data,error}= await supabase.from('permissions').select('*').eq('user_id',a);
    if(error){
       toast.error('Unable to load permissions')
       return null
    }
    if(data){
        setPermissions(data)
    }
}
async function getCentres(){
    const {data,error}= await supabase.from('centres').select('*')
    if(error || data?.length == 0){
       toast.error('Unable to load centres')
       return null
    }
    if(data){
        setCentres(data)
    }
}
async function getTeachers(){
    const {data,error}= await supabase.rpc('get_teachers')
    if(error || data?.length == 0){
       toast.error('Unable to load permissions')
       return null
    }
    if(data){
        setTeachers(data)
    }
}
async function getActiveTeachers(){
    const {data,error}= await supabase.rpc('get_active_teachers')
    if(error || data?.length == 0){
       toast.error('Unable to load permissions')
       return null
    }
    if(data){
        setActiveTeachers(data)
    }
}
useEffect(()=>{
    getTeachers()
   /*  getPermissions() */
   getCentres()
    getActiveTeachers()
},[])

async function approveTeacher(a){

    const {data,error} = await supabase.from('roles').insert({
        userEmail:a,
        role:'teacher'
    }).select()
    if(error){
        toast.error('Unable to approve teacher')
    }
    if(data){
        toast.success("Successfully Approved this Teacher")
        getTeachers()
        getActiveTeachers()

    }
}
async function addCentre(a,b){

    const {data,error} = await supabase.from('permissions').insert({
        user_id:b,
        centre:a
    }).select()
    if(error){
        toast.error('Unable to add centre')
    }
    if(data){
        toast.success("Successfully Added Centre")
       getPermissions(currentTeacher)

    }
}
async function removeCentre(a){

    const {data,error} = await supabase.from('permissions').delete().eq('id',a)
    
    if(!error){
        toast.success("Successfully Deleted Centre")
       getPermissions(currentTeacher)
return null;
    }
    if(error){
        toast.error('Unable to add centre')
    }
   
}
async function removeTeacher(a){

    const {error} = await supabase.from('roles').delete().eq('userEmail',a)
    if(error){
        toast.error('Unable to approve teacher')
    }
    if(!error){
        toast.success("Successfully Approved this Teacher")
        getTeachers()
        getActiveTeachers()

    }
}

useEffect(()=>{
    getPermissions(currentTeacher)
},[currentTeacher])

    return <div className="w-full flex flex-col overflow-y-auto items-start justify-start overflow-hidden h-full flex-1">
<div className="w-full h-full flex flex-col items-start justify-start">
<div className=" flex-1 w-full flex-shrink-0 rounded-xl bg-gray-50 p-4 my-2 flex flex-col justify-start items-start">
        <h2 className="text-2xl font-bold text-primary">Active Teachers</h2>
        <Spacer y={2}></Spacer>
        <div className="flex flex-row flex-wrap items-center justify-start">
        {activeTeachers && activeTeachers.map((z,v)=>{
            return <Chip className="mr-1 mb-1" color="primary" endContent={
                <Tooltip content={"Delete this teacher from roles"} size="sm">
                <svg onClick={()=>{removeTeacher(z.userEmail)}} className="rotate-45 bg-white rounded-full cursor-pointer" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z" className="fill-red-500"/></svg></Tooltip>
            }>{z.userEmail}</Chip>
        })}</div>
    </div>
    <div className=" rounded-xl w-full flex-1 h-full bg-gray-50 p-4 my-2 flex flex-col justify-start items-start">
        <h2 className="text-2xl font-bold text-secondary">Pending Teacher Approvals</h2>
        <Spacer y={2}></Spacer>
        {teachers && teachers.filter(item=> !activeTeachers?.some(i=>i.userEmail == item.email)).map((z,v)=>{
            return <Chip endContent={
                <Tooltip size="sm" color="success" content="Approve Teacher">
                <svg onClick={()=>{approveTeacher(z.email)}} className=" cursor-pointer" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z" fill="#2ECC70"/></svg>
                </Tooltip>
            } color="secondary" variant="dot">{z.email}</Chip>
        })}
        {teachers && teachers?.filter(item=> !activeTeachers?.some(i=>i.userEmail == item.email))?.length == 0 ? <p>There's no pending teacher requests</p>:''}
    </div>

</div>

<Divider>

</Divider>

<div className=" rounded-xl bg-gray-50 p-4 my-2 flex flex-col justify-start items-start">
    <h2 className="text-2xl font-bold">Manage Teacher Privileges</h2>
    <Spacer y={2}></Spacer>
    <Select selectedKeys={[currentTeacher]} onChange={(e)=>{setCurrentTeacher(e.target.value)}} placeholder="Select a Teacher" label="Teacher" items={activeTeachers}>
    {activeTeachers && activeTeachers.map((z,v)=>{
            return <SelectItem key={z.userEmail} value={z.userEmail}>{z.userEmail}</SelectItem>
        })}
    </Select>
    <div className=" rounded-xl bg-gray-50 p-4 my-2 flex flex-col justify-start items-start">
        <h2 className="text-2xl font-bold text-primary">Allowed Centres</h2>
        <Spacer y={2}></Spacer>
        <div className="flex flex-row flex-wrap items-center justify-start">
        {permissions && permissions.map((z,v)=>{
            return <Chip className="mr-1 mb-1" color="primary" endContent={
                <Tooltip content={"Delete this teacher from roles"} size="sm">
                <svg onClick={()=>{removeCentre(z.id)}} className="rotate-45 bg-white rounded-full cursor-pointer" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z" className="fill-red-500"/></svg></Tooltip>
            }>{centres?.find(item=>item.id == z.centre).title ?? 'Unknown'}</Chip>
        })}</div>
    </div>
    <div className=" rounded-xl bg-gray-50 p-4 my-2 flex flex-col justify-start items-start">
        <h2 className="text-2xl font-bold text-primary">Available Centres</h2>
        <Spacer y={2}></Spacer>
        <div className="flex flex-row flex-wrap items-center justify-start">
        {centres && centres.filter(item=> !permissions?.some(i=>i.centre == item.id)).map((z,v)=>{
            return <Chip variant="dot" color="secondary" className="mr-1 mb-1"  endContent={
                <Tooltip content={"Add this centre"} size="sm">
                <svg onClick={()=>{addCentre(z.id,currentTeacher)}} className=" cursor-pointer" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z" fill="#2ECC70"/></svg>
                </Tooltip>
            }>{z.title}</Chip>
        })}</div>
    </div>
</div>
    </div>
}
