import { CtoLocal } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { Button, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spacer , Slider, Select, SelectItem, SelectSection, Popover, PopoverTrigger, PopoverContent, ButtonGroup} from "@nextui-org/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {  toast } from "react-hot-toast";
function Scheduler({userData,role}){
   
const [addModal,setAddModal] = useState(false);
const [scheduleData,setScheduleData] = useState();
const [mySchedules,setMySchedules] = useState()
const [useMe,setUseMe] = useState(true)
const [teachers,setTeachers] = useState();
const [modules,setModules] = useState();
const [subjects,setSubjects] = useState();
const [schedules,setSchedules] = useState();
const [selectedHost,setSelectedHost] = useState();
const [entries,setEntries] = useState();
const [entryModal,setEntryModal] = useState(false);
const [editClassData,setEditClass] = useState();
const [docManager,setDocManager] = useState(false);
const [activeDocs,setActiveDocs] = useState();
const [docs,setDocs] = useState();
const [editDoc,setEditDoc] = useState();
const [addDoc,setAddDoc] = useState();
const [activeAssignments, setActiveAssignments] = useState();
const [assignmentModal,setAssignmentModal] = useState(false);
const [parentcategory,setParentCategory] = useState();
const [subCategory,setSubCategory] = useState();
const [levels,setLevels] = useState();
const [assignments,setAssignments] = useState();
const [assignmentData,setAssignmentData] = useState();
const [centres,setCentres] = useState();
const [activeFilter,setActiveFilter] = useState('all');

async function getTeachers(){

    const {data,error} = await supabase.rpc('get_teacher_rows')
    if(data){
        console.log(data)
        setTeachers(data)
    }
    else{

    }
 } 


 const icons = {
    pdf: <svg
    xmlns="http://www.w3.org/2000/svg"
    height="24px"
    width="24px"
    viewBox="0 0 309.267 309.267"
    xmlSpace="preserve"
    
  >
    <path
      d="M38.658 0h164.23l87.049 86.711v203.227c0 10.679-8.659 19.329-19.329 19.329H38.658c-10.67 0-19.329-8.65-19.329-19.329V19.329C19.329 8.65 27.989 0 38.658 0z"
      fill="#e2574c"
    />
    <path
      d="M289.658 86.981h-67.372c-10.67 0-19.329-8.659-19.329-19.329V.193l86.701 86.788z"
      fill="#b53629"
    />
    <path
      d="M217.434 146.544c3.238 0 4.823-2.822 4.823-5.557 0-2.832-1.653-5.567-4.823-5.567h-18.44c-3.605 0-5.615 2.986-5.615 6.282v45.317c0 4.04 2.3 6.282 5.412 6.282 3.093 0 5.403-2.242 5.403-6.282v-12.438h11.153c3.46 0 5.19-2.832 5.19-5.644 0-2.754-1.73-5.49-5.19-5.49h-11.153v-16.903h13.24zm-62.327-11.124h-13.492c-3.663 0-6.263 2.513-6.263 6.243v45.395c0 4.629 3.74 6.079 6.417 6.079h14.159c16.758 0 27.824-11.027 27.824-28.047-.009-17.995-10.427-29.67-28.645-29.67zm.648 46.526h-8.225v-35.334h7.413c11.221 0 16.101 7.529 16.101 17.918 0 9.723-4.794 17.416-15.289 17.416zM106.33 135.42H92.964c-3.779 0-5.886 2.493-5.886 6.282v45.317c0 4.04 2.416 6.282 5.663 6.282s5.663-2.242 5.663-6.282v-13.231h8.379c10.341 0 18.875-7.326 18.875-19.107.001-11.529-8.233-19.261-19.328-19.261zm-.222 27.738h-7.703v-17.097h7.703c4.755 0 7.78 3.711 7.78 8.553-.01 4.833-3.025 8.544-7.78 8.544z"
      fill="#fff"
    />
  </svg>,
  xl: <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24px"
  height="24px"
  viewBox="-4 0 64 64"
  
>
  <path
    d="M5.112.006A5.074 5.074 0 00.039 5.08v53.841a5.073 5.073 0 005.073 5.074h45.774a5.074 5.074 0 005.074-5.074V20.316L37.058.006H5.112z"
    fillRule="evenodd"
    clipRule="evenodd"
    fill="#45B058"
  />
  <path
    d="M19.429 53.938a.64.64 0 01-.54-.27l-3.728-4.97-3.745 4.97a.641.641 0 01-.54.27.71.71 0 01-.72-.72c0-.144.035-.306.144-.432l3.89-5.131-3.619-4.826a.722.722 0 01-.145-.414c0-.342.288-.72.721-.72.216 0 .432.108.576.288l3.438 4.628 3.438-4.646a.643.643 0 01.541-.27c.378 0 .738.306.738.72a.695.695 0 01-.127.414l-3.619 4.808 3.891 5.149a.7.7 0 01.125.414c0 .396-.324.738-.719.738zm9.989-.126h-5.455a1.083 1.083 0 01-1.081-1.08V42.415c0-.396.324-.72.774-.72.396 0 .721.324.721.72V52.48h5.041c.359 0 .648.288.648.648 0 .396-.289.684-.648.684zm6.982.216c-1.782 0-3.188-.594-4.213-1.495a.71.71 0 01-.234-.54c0-.36.27-.756.702-.756.144 0 .306.036.433.144.828.738 1.98 1.314 3.367 1.314 2.143 0 2.826-1.152 2.826-2.071 0-3.097-7.111-1.386-7.111-5.672 0-1.98 1.764-3.331 4.123-3.331 1.548 0 2.881.468 3.853 1.278a.73.73 0 01.253.54c0 .36-.307.72-.703.72a.676.676 0 01-.432-.162c-.883-.72-1.98-1.044-3.079-1.044-1.44 0-2.467.774-2.467 1.909 0 2.701 7.112 1.152 7.112 5.636 0 1.748-1.188 3.53-4.43 3.53z"
    fill="#fff"
  />
  <path
    d="M55.953 20.352v1H43.152s-6.312-1.26-6.127-6.707c0 0 .207 5.707 6.002 5.707h12.926z"
    fillRule="evenodd"
    clipRule="evenodd"
    fill="#349C42"
  />
  <path
    d="M37.049 0v14.561c0 1.656 1.104 5.791 6.104 5.791h12.801L37.049 0z"
    opacity={0.5}
    fillRule="evenodd"
    clipRule="evenodd"
    fill="#fff"
  />
</svg>,
doc: <svg
xmlns="http://www.w3.org/2000/svg"
width="24px"
height="24px"
viewBox="-4 0 64 64"

>
<g fillRule="evenodd">
  <path
    d="M5.11 0A5.07 5.07 0 000 5v53.88A5.07 5.07 0 005.11 64h45.78A5.07 5.07 0 0056 58.88v-38.6L37.06 0z"
    fill="#107cad"
  />
  <path
    d="M56 20.35v1H43.18s-6.31-1.26-6.13-6.71c0 0 .21 5.71 6 5.71z"
    fill="#084968"
  />
  <path
    d="M37.07 0v14.56a5.78 5.78 0 006.11 5.79H56z"
    fill="#90d0fe"
    opacity={0.5}
  />
</g>
<path
  d="M14.24 53.86h-3a1.08 1.08 0 01-1.08-1.08v-9.85a1.08 1.08 0 011.08-1.08h3a6 6 0 110 12zm0-10.67h-2.61v9.34h2.61a4.41 4.41 0 004.61-4.66 4.38 4.38 0 00-4.61-4.68zm14.42 10.89a5.86 5.86 0 01-6-6.21 6 6 0 1111.92 0 5.87 5.87 0 01-5.92 6.21zm0-11.09c-2.7 0-4.41 2.07-4.41 4.88s1.71 4.88 4.41 4.88 4.41-2.09 4.41-4.88S31.35 43 28.66 43zm18.45.38a.75.75 0 01.2.52.71.71 0 01-.7.72.64.64 0 01-.51-.24 4.06 4.06 0 00-3-1.38 4.61 4.61 0 00-4.63 4.88 4.63 4.63 0 004.63 4.88 4 4 0 003-1.37.7.7 0 01.51-.24.72.72 0 01.7.74.78.78 0 01-.2.51 5.33 5.33 0 01-4 1.69 6.22 6.22 0 010-12.43 5.26 5.26 0 014 1.72z"
  fill="#fff"
/>
</svg>
}

 async function getEntries(a){
if(a == undefined){
    toast.error('Class not selected')
} 
    const {data,error} = await supabase.from('entries').select("*").eq('schedules',a)
    if(data){
        setEntries(data)
        toast.success('Loaded All Entries')
    }else{
        toast.success('Unable to Loaded Selected Class Entries')
    } 
 }
 async function getModules(a){

    const {data,error} = await supabase.from('swot').select("*").eq('type',"module")
    if(data){
        setModules(data)
    }else{} 
 }
 async function getSubjects(a){

    const {data,error} = await supabase.from('subjects').select("*")
    if(data){
        setSubjects(data)
    }else{} 
 }
async function getMySchedules(){
   
const query = supabase.from('schedules').select("*,module(*)").order('datetime',{ascending:true});

if(role == 'admin'){
    
}else{
    query.eq('host',userData?.email);
}
 const {data,error} = await query.order('datetime',{ascending:false});

if(data){
    setMySchedules(data)
}
else{

}

}


async function loadDocuments(a){

    const {data,error} = await supabase.from('class_docs').select('*').eq('class_id',a)

    if(data){
        toast.success('Loaded All Study Materials')
       
        setDocs(data)
        setDocManager(true)
    }

    else{
        toast.error('Error Loading Documents')
    }
}

async function loadAssignments(a){

    const {data,error} = await supabase.from('assignments').select('*,level(title)').eq('module',a)

    if(data){
        toast.success('Loaded all assignments')
       
       setAssignments(data)
        setAssignmentModal(true);

    }

    else{
        toast.error('Error Loading Assignments')
    }
}
async function getSchedules(a){
    const query = supabase.from('schedules').select("*,module(*)");
if(a != undefined){
    query.eq('host',a).gte('datetime',new Date().toISOString().split('T')[0])
}else{
query.neq('host',userData?.email).gte('datetime',new Date().toISOString().split('T')[0])
}
    const {data,error} = await query;

    if(data){
        setSchedules(data)
    }
    else{
    
    }
    
    }
useEffect(()=>{
    getTeachers();
    getSubjects();
    getModules();
    getMySchedules();
    getCentres();
},[])

async function getCentres(){
    const{data,error} = await supabase.from('centres').select('*');
    if(data){
        setCentres(data)
    }else{}
}
async function addSchedule(a){

if(a == undefined){
    toast.error('Please fill the details');
    return null
}
if(!a?.title){
    toast.error('Please fill Title')
    return null
}
if(!a?.date){
    toast.error('Please select Class Date')
    return null
}
if(!a?.time){
    toast.error('Please select Class Time')
    return null
}
if(!a?.regdate){
    toast.error('Please select Registration Start date')
    return null
}
if(new Date() > new Date(a.date + " " + a.time)){
toast.error('Class date must be in future')
}
if(new Date(a.date) < new Date(a?.regdate)){
    toast.error('Registration date must be before class date or on the same day')
    return null
}
if(useMe == false && !a?.host){
    toast.error('Please select a Host/Teacher/Faculty')
    return null
}
if(!a?.seats){
    toast.error('Please enter number of aviailable seats');
    return null
}
if(!a?.module){
    toast.error('Please Select Module')
    return null
}
if(!a?.location){
    toast.error('Please Enter Location')
    return null
}

const r= toast.loading('Adding Schedule to Calendar')

const {data,error} = await supabase.from('schedules').insert({
    regstart:getLocalDateTime(a?.regdate,'12:00'),
    title:a?.title,
    host:role == "admin" || useMe == false ? a?.host: userData?.email ,
    seats:a?.seats,
    available:a?.seats,
    module:a?.module,
    location:a?.location,
    datetime:getLocalDateTime(a?.date,a?.time),
}).select()
if(data){
    toast.remove(r);
    setAddModal(false)
    toast.success('Successfully Added Class');
    getMySchedules();
    getSchedules()
}
else{
    toast.error('Failed to add class');
    toast.remove(r)
}
}
async function updateData(a,b){

const r  = toast.loading('Updating Meeting Link')

const {data,error} = await supabase.from('schedules').update({
    meeting_link:a?.meeting_link
}).eq('id',b).select();

if(data){
    getMySchedules();
    toast.success('Updated Meeting Link')
   toast.remove(r)
}
else{
    toast.error('Error Updating Meeting Link')
    toast.remove(r)
}

}

async function updatePin(a,b){

    const r  = toast.loading('Updating Class PIN')
    
    const {data,error} = await supabase.from('schedules').update({
       pin:a?.pin
    }).eq('id',b).select();
    
    if(data){
        getMySchedules();
        toast.success('Updated Class PIN')
       toast.remove(r)
    }
    else{
        toast.error('Error Updating Class PIN')
        toast.remove(r)
    }
    
    }

    async function updateRec(a,b){

        const r  = toast.loading('Updating Recording')
        
        const {data,error} = await supabase.from('schedules').update({
           recording:a?.recording
        }).eq('id',b).select();
        
        if(data){
            getMySchedules();
            toast.success('Updated Recording')
           toast.remove(r)
        }
        else{
            toast.error('Error Updating Recording')
            toast.remove(r)
        }
        
        }


        async function updateSeats(a,b){

            const r  = toast.loading('Updating Seats')
            
            const {data,error} = await supabase.from('schedules').update({
               seats:a?.seats
            }).eq('id',b).select();
            
            if(data){
                getMySchedules();
                toast.success('Updated Seats')
               toast.remove(r)
            }
            else{
                toast.error('Error Updating Seats')
                toast.remove(r)
            }
            
            }

function getLocalDateTime(a,b){
    
    const date = new Date(`${a} ${b}`)
    return date.toISOString(); 
}

async function updateEntry(a,b,c){
  const r =  toast.loading('Updating Entry');
    const {data,error} = await supabase.from('entries').update({
        status:b
    }).eq('id',a).select();

    if(data){
        getEntries(c);
        getMySchedules();
        toast.remove(r)
        toast.success('Successfully marked as' + b)
    }else{
        toast.remove(r)
        toast.error('Error Marking as' + b)
    }
}

async function updateDoc(a,b){
    const {data,error} = await supabase.from('class_docs').update({
        doc_link:b?.doc_link,
        doc_type:b?.doc_type,
        title:b?.title
    }).eq('id',a).select();

    if(data){
       loadDocuments(b.class_id)
       
        toast.success('Updated')
    }else{
        toast.error('Error Updating')
    }
}

async function addNewDoc(a,b){

const {data,error } = await supabase.from('class_docs').insert({
    class_id:a,
    doc_type:b?.doc_type,
    doc_link:b?.doc_link,
    title:b?.title
}).select();

if(data){
    toast.success('Added New Document');
    loadDocuments(a)
}else{
    toast.error('Error Adding New Document')
}

}
async function AddtoTest(a){
    
const {data,error} = await supabase.from('assignments').insert({
    level:a.id,
    module:activeAssignments,
    type:'linked'
}).select()

if(data){
    loadAssignments(activeAssignments)
}else{}
}

async function getParentCategory(){

    const{data,error} = await supabase.from('categories').select('*');
    if(data){
        setParentCategory(data)
    }else{}
}
async function deleteAssignments(a){

    const {error} = await supabase.from('assignments').delete().eq('id',a);

    if(!error){
        loadAssignments(activeAssignments)
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
async function getSubCategories(a){
    const{data,error} = await supabase.from('mock_categories').select('*').eq('parent',a);
    if(data){
        setSubCategory(data)
    }else{} 
}
async function getLevels(a){
    const{data,error} = await supabase.from('levels').select('*').eq('parent',a);
    if(data){
        setLevels(data)
    }else{} 
}

async function deleteMySchedule(a){
if(a == undefined){
    toast.error('No ID Selected')
}
const {error} = await supabase.from('schedules').delete().eq('id',a)
if(!error){
    toast.success('Deleted Successfully')
    getMySchedules()
}else{
    toast.error('Oops ! unable to delete')
}
}
async function deleteDoc(a){
    if(a == undefined){
        toast.error('No ID Selected')
    }
    const {error} = await supabase.from('class_docs').delete().eq('id',a)
    if(!error){
        toast.success('Deleted Successfully')
       loadDocuments(activeDocs)
    }else{
        toast.error('Oops ! unable to delete')
    }
    }


    return <div className="w-full sf text-left  h-full overflow-y-auto rounded-md">
       

<Modal className="sf"  isDismissable={false} isOpen={assignmentModal} onClose={()=>{setAssignmentModal(false),setAssignments()}}>
    <ModalContent className="w-full max-w-[700px]">
{(onClose)=>(<>

    <ModalHeader>
        <h2 className="font-bold text-xl text-left">Manage Assignments</h2>
        
    </ModalHeader>
    <ModalBody>
        
{assignments && assignments.map((i,d)=>{
    return <div className="p-2 border-1 rounded-md flex flex-row justify-between items-center align-middle border-gray-200">{i.type == 'linked' ?  i.level.title : i.title}
    <Button className="ml-auto" size="sm" color="danger" onPress={()=>{deleteAssignments(i.id)}}>Delete</Button>
    </div>
})}

<Popover>
    <PopoverTrigger>
<div className="border-dashed border-1 border-gray-200">Add New Assignment</div></PopoverTrigger>

<PopoverContent className="w-full min-w-[500px] sf">


<Select label="Select Parent Category" onChange={(e)=>{getSubCategories(e.target.value)}}>
{parentcategory && parentcategory.map((i,d)=>{
    return <SelectItem value={i.id} key={i.id}>{i.title}</SelectItem>
})}
</Select>
{subCategory != undefined && subCategory?.length > 0 ? 
    <Select label="Select Sub Category" onChange={(e)=>{getLevels(e.target.value)}}>
{subCategory && subCategory.map((i,d)=>{
    return <SelectItem value={i.id} key={i.id}>{i.title}</SelectItem>
})}
</Select>

:''}


{levels != undefined && levels?.length > 0 ? 
    <Select label="Select Sub Category" onChange={(e)=>{setAssignmentData(res=>({...res,id:e.target.value}))}}>
{levels && levels.map((i,d)=>{
    return <SelectItem value={i.id} key={i.id}>{i.title}</SelectItem>
})}
</Select>

:''}

<Button color="primary" onPress={()=>{AddtoTest(assignmentData)}}>Add to Test</Button>

</PopoverContent>
</Popover>

        </ModalBody>
        <ModalFooter>
        
        </ModalFooter>
         </>)}
</ModalContent></Modal>

<Modal className="sf"  isDismissable={false} isOpen={docManager} onClose={()=>{setDocManager(false),setActiveDocs()}}>
    <ModalContent className="w-full max-w-[700px]">
{(onClose)=>(<>

    <ModalHeader>
        <h2 className="font-bold text-xl text-left">Manage Class Documents</h2>
        
    </ModalHeader>
    <ModalBody>
        
        
{docs != undefined && docs.map((i,d)=>{

return <div className="w-full p-2 border-1 border-gray-200 rounded-md shadow-md text-left flex flex-row items-center align-middle">
   
   <div className="flex-1 flex flex-row">
    {i.doc_type == "pdf" ? icons.pdf:''}
    {i.doc_type == "doc" ? icons.doc:''}
    {i.doc_type == "xl" ? icons.xl:''}
    
    <p className="ml-4">{i.title}</p></div>
    <div className="flex flex-row flex-1 justify-end">
        <Popover onOpenChange={(e)=>{e == true ? setEditDoc(i):''}}><PopoverTrigger>
        <Button size="sm" className="ml-1" color="success" >Edit</Button></PopoverTrigger>
        
        <PopoverContent className="sf">
        <Input value={editDoc?.title} className="my-2" label="Doc Title" placeholder="Enter Document Title" onChange={(e)=>{setEditDoc(res=>({...res,title:e.target.value}))}}></Input>
    <Input value={editDoc?.doc_link} className="my-2" label="Doc Link" placeholder="Enter Document Link" onChange={(e)=>{setEditDoc(res=>({...res,doc_link:e.target.value}))}}></Input>
    <Select className="my-2" label="Select Doc Type" defaultSelectedKeys={[editDoc?.doc_type]} value={editDoc?.doc_type} onChange={(e)=>{setEditDoc(res=>({...res,doc_type:e.target.value}))}}>
{[
    {
        title:'PDF',
        value:'pdf'
    },
    {
        title:'Word Document/DOCX',
        value:'doc'
    },
    {
        title:'Excel Sheet/XLS/Google Sheet',
        value:'xl'
    }
].map((z,v)=>{
    return <SelectItem key={z.value} value={z.value}>{z.title}</SelectItem>
})}
    </Select>
    <Button color="primary" onPress={()=>{updateDoc(i.id,editDoc)}}>Update Document</Button>
        </PopoverContent>
        
        </Popover>
        <Button size="sm" className="ml-1" color="danger" onPress={()=>{deleteDoc(i.id)}}>Delete</Button>
    </div>
    </div>
})}
<Popover><PopoverTrigger>
<div className="w-full p-2 border-dashed border-1 border-gray-200 text-center bg-gray-100 rounded-md">Add New Document</div></PopoverTrigger>
<PopoverContent className="sf min-w-[300px]">
    <Input className="my-2" label="Doc Title" placeholder="Enter Document Title" onChange={(e)=>{setAddDoc(res=>({...res,title:e.target.value}))}}></Input>
    <Input className="my-2" label="Doc Link" placeholder="Enter Document Link" onChange={(e)=>{setAddDoc(res=>({...res,doc_link:e.target.value}))}}></Input>
    <Select className="my-2" label="Select Doc Type" value={addDoc?.doc_type} onChange={(e)=>{setAddDoc(res=>({...res,doc_type:e.target.value}))}}>
{[
    {
        title:'PDF',
        value:'pdf'
    },
    {
        title:'Word Document/DOCX',
        value:'doc'
    },
    {
        title:'Excel Sheet/XLS/Google Sheet',
        value:'xl'
    }
].map((z,v)=>{
    return <SelectItem key={z.value} value={z.value}>{z.title}</SelectItem>
})}
    </Select>
    <Button color="primary" onPress={()=>{addNewDoc(activeDocs,addDoc)}}>Add Document</Button>
</PopoverContent>
</Popover>

        </ModalBody> </>)}</ModalContent></Modal>


<Modal className="sf"  isDismissable={false} isOpen={entryModal} onClose={()=>{setEntryModal(false),setEntries()}}>
    <ModalContent className="w-full max-w-[700px]">
{(onClose)=>(<>

    <ModalHeader>
        <h2 className="font-bold text-xl text-left">Manage Class Entries</h2>
        
    </ModalHeader>
    <ModalBody>
        
    <div className="flex flex-col">
        {entries && entries.map((i,d)=>{
            return <div className="w-full flex-wrap lg:flex-nowrap flex flex-row items-center justify-between align-middle rounded-md border-1 border-gray-200 p-2">
                
               <h2><span className="font-bold">{d+1} ) </span> {i?.student_name != undefined ? <p>{i?.student_name}</p>:''} {i?.student_id}</h2>
            
            
            <div className="flex flex-row">
<Button size="sm" className="ml-2" color="success" isDisabled={i?.status == "confirmed" ? true : false} onPress={()=>{updateEntry(i?.id,'confirmed',i?.schedules)}}>
<svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m8.5 16.586-3.793-3.793a1 1 0 0 0-1.414 1.414l4.5 4.5a1 1 0 0 0 1.414 0l11-11a1 1 0 0 0-1.414-1.414L8.5 16.586Z" fill="#222F3D"/></svg>
    Confirm</Button>
<Button size="sm" className="ml-2" color="primary" isDisabled={i?.status == "pending" ? true : false} onPress={()=>{updateEntry(i?.id,'pending',i?.schedules)}}>Pending</Button>
<Button size="sm" className="ml-2" color="danger" isDisabled={i?.status == "rejected" ? true : false} onPress={()=>{updateEntry(i?.id,'rejected',i?.schedules)}}>
<svg className="rotate-45" width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.883 3.007 12 3a1 1 0 0 1 .993.883L13 4v7h7a1 1 0 0 1 .993.883L21 12a1 1 0 0 1-.883.993L20 13h-7v7a1 1 0 0 1-.883.993L12 21a1 1 0 0 1-.993-.883L11 20v-7H4a1 1 0 0 1-.993-.883L3 12a1 1 0 0 1 .883-.993L4 11h7V4a1 1 0 0 1 .883-.993L12 3l-.117.007Z" fill="#fff"/></svg>
    Cancel</Button>

            </div>
            </div>

           
        })}</div>

        </ModalBody> </>)} 
    
    </ModalContent></Modal>



<Modal className="sf" isDismissable={false} isOpen={addModal} onClose={()=>{setAddModal(false)}}><ModalContent>
{(onClose)=>(<>

    <ModalHeader>
        <h2 className="font-bold text-xl text-left">Add a Schedule/Class</h2>
    </ModalHeader>
    <ModalBody>

        <Input label="Title" placeholder="Enter Class Title" onChange={(e)=>{setScheduleData(res=>({...res,title:e.target.value}))}}></Input>
        <Input label="Class Date" type="date" placeholder="Enter Class Date" onChange={(e)=>{setScheduleData(res=>({...res,date:e.target.value}))}}></Input>
        <Input label="Class Time" type="time" placeholder="Enter Class Time" onChange={(e)=>{setScheduleData(res=>({...res,time:e.target.value}))}}></Input>
        <Input label="Registration Starts" type="date" placeholder="Enter Registration Starting Date" onChange={(e)=>{setScheduleData(res=>({...res,regdate:e.target.value}))}}></Input>
        <Input type="number" label="Seats" placeholder="Enter Seats in Number" onChange={(e)=>{setScheduleData(res=>({...res,seats:e.target.value}))}}></Input>
        {role == "teacher" && useMe == true ? <><p>Class Host : You</p><Button color="primary" size="sm" onPress={()=>{setUseMe(false)}}>You are not the host? Click to Change</Button></>:""}

        {useMe == false || role == "admin" ?  
        <Select
        isRequired={true}
        label="Select a Host/Faculty"
        onChange={(e)=>{setScheduleData(res=>({...res,host:e.target.value}))}}
        >
 {teachers && teachers.map((teacher) => (
          <SelectItem key={teacher?.userEmail} value={teacher?.userEmail}>
           {`${teacher?.display_name} <${teacher?.userEmail}>`}
          </SelectItem>
        ))}
        </Select>
        :''}
        <Select
        isRequired={true}
        className="sf"
        label="Select a Module"
        onChange={(e)=>{setScheduleData(res=>({...res,module:e.target.value}))}}
        >
{subjects && subjects.map((i,d)=>{

    return <SelectSection className="sf" showDivider title={i?.title}>

{modules && modules.filter(item=>item.subject == i?.id).map((module) => (
          <SelectItem key={module?.id} value={module?.id}>
          {module.title}
          </SelectItem>
        ))}

    </SelectSection>
})}
        </Select>

        <Select label="Location" placeholder="Select Location of Class(Centre/Online)" onChange={(e)=>{setScheduleData(res=>({...res,location:e.target.value}))}}>
        {centres && centres.map((item) => (
          <SelectItem key={item?.value} value={item?.value}>
          {item.title}
          </SelectItem>
        ))}
        </Select>
    </ModalBody>
    <ModalFooter>
    <Button color="danger" variant="faded" onPress={()=>{setAddModal(false)}}>Cancel</Button>
        <Button color="primary" onPress={()=>{addSchedule(scheduleData)}}>Add Schedule</Button>
    </ModalFooter>

</>)}</ModalContent>
</Modal>
<h2 className="font-bold text-xl text-secondary">Class Schedules</h2>
<div className="flex my-2 flex-row items-center justify-start align-middle max-w-[300px]">
<Select
size="sm"
label="Select Host"
className="mr-2"
onChange={(e)=>{setSelectedHost(e.target.value)}}
>
{teachers && teachers.map((i,d)=>{
    return <SelectItem key={i?.userEmail} value={i?.userEmail}>
        {`${i?.display_name} <${i?.userEmail}>`}
    </SelectItem>
})}
</Select>
<Button color="primary"  onPress={()=>{getSchedules(selectedHost)}}>Apply Filter</Button>
</div>
{schedules && schedules.map((i,d)=>{
    return <ScheduleCard type="other" data={i}></ScheduleCard>
})}
<Spacer y={2} ></Spacer>
<Divider></Divider>
<Spacer y={2} ></Spacer>
<h2 className="font-bold text-xl text-secondary">Manage Schedules</h2>
<ButtonGroup>
      <Button color={activeFilter == 'all' ? "primary" : "default"} onPress={()=>{setActiveFilter('all')}}>All</Button>
      <Button color={activeFilter == 'upcoming' ? "primary" : "default"} onPress={()=>{setActiveFilter('upcoming')}}>Upcoming</Button>
      <Button color={activeFilter == 'past' ? "primary" : "default"} onPress={()=>{setActiveFilter('past')}}>Past</Button>
    </ButtonGroup>
<Spacer y={2} ></Spacer>
<Spacer y={2} ></Spacer>
<Spacer y={2} ></Spacer>
{mySchedules != undefined && getFiltered(mySchedules).map((i,d)=>{
return <ScheduleCard updateSeats={()=>{updateSeats(editClassData,i.id)}} fireRecordings={()=>{updateRec(editClassData,i.id)}} fireAttachment={()=>{setActiveDocs(i.id),loadDocuments(i.id)}} fireAssignments={()=>{loadAssignments(i.module.id),getParentCategory(),setActiveAssignments(i.module.id)}} type="self" onUpdatePress={(a)=>{a == "link" ? updateData(editClassData,i.id)  : updatePin(editClassData,i.id)}} callEntry={()=>{getEntries(i?.id),setEntryModal(true)}} deleteSchedule={()=>{deleteMySchedule(i?.id)}} onChange={(e,b)=>{setEditClass(res=>({...res,[b]:e}))}} data={i}></ScheduleCard>
})}
<div onClick={()=>{setAddModal(true)}} className="w-full rounded-md border-dashed border-1 border-gray-200 cursor-pointer hover:bg-white transition-all hover:scale-[0.99] p-3 bg-gray-100 mt-2">Add a Schedule</div>
    </div>
}

const ScheduleCard = ({data,type,deleteSchedule,callEntry,onChange,onUpdatePress,fireAttachment,fireAssignments,fireRecordings,updateSeats})=>{

const [defaultval,setDefault] = useState()
const [rec,setRec] = useState();
const [seats,setSeats] = useState();
    return <div className="w-full flex flex-row justify-between items-center align-middle p-1 mb-2 border-1 rounded-md border-gray-200 shadow-sm">
      <div className="flex flex-1 flex-row items-stretch">
        <div className="w-[80px] py-1 text-center flex flex-col justify-center items-center align-middle bg-gray-100 mr-2 rounded-md ">

           <h2 className="font-bold text-xl text-gray-500"> {CtoLocal(data?.datetime).date}</h2>
           <p className="text-xs text-gray-500">{CtoLocal(data?.datetime).monthName}</p>
        </div>
        <div className="flex flex-col flex-1">
       <p className="font-bold text-secondary"> {data?.title}</p>
       <p className="text-gray-500 text-sm">Time : {CtoLocal(data?.datetime).time} {CtoLocal(data?.datetime).amPm}</p>
       {data?.module?.title ?  <p className="text-gray-500 text-sm">Module : {data?.module.title}</p>:''}</div>
       </div>
<div className="flex-1 text-center">
{data?.seats && data?.available != undefined ? <p className="font-light text-sm text-gray-500">Seats Available : <span className={`font-bold ${data?.available > data?.seats/2 ? "text-green-500" : ""} ${data?.available < data?.seats/2 ? "text-yellow-500" : ""} ${data?.available < 15 ? "!text-red-500" : ""}`}>{data?.seats}/{data?.available || data?.seats}</span>


 </p>:''}
<p className="font-light text-sm text-red-500">Waitlist : {data?.waitlist || '0'}</p>
    <p className="font-light text-sm text-gray-500">Registration Starts : {new Date(data?.regstart)?.toLocaleString().split(',')[0]}</p>
</div>

    {type == "self" ? 
       <div className="flex-1 flex flex-row justify-end">

<Popover onOpenChange={(e)=>{e ==true ? setSeats(data?.seats):''}}>
    <PopoverTrigger>
    <Button  className="ml-2" size="sm" color="primary" >
         Edit Seats
        </Button>
    </PopoverTrigger>
    <PopoverContent className="sf">
    <Input defaultValue={seats}  className="mt-2" label="Seats" placeholder="Enter Seats" onChange={(e)=>{onChange(e.target.value,'seats')}}></Input>
            <Button className="mt-2" color="primary" onPress={()=>{updateSeats()}}>Update Seats</Button>
    </PopoverContent>
</Popover>


        <Popover onOpenChange={(e)=>{e ==true ? setRec(data?.recording):''}}><PopoverTrigger>
         <Button isIconOnly className="ml-2" size="sm" color="danger" >
         <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 16.25a3.25 3.25 0 0 1-3.25 3.25h-7.5A3.25 3.25 0 0 1 2 16.25v-8.5A3.25 3.25 0 0 1 5.25 4.5h7.5A3.25 3.25 0 0 1 16 7.75v8.5Zm5.762-10.357a1 1 0 0 1 .238.648v10.918a1 1 0 0 1-1.648.762L17 15.37V8.628l3.352-2.849a1 1 0 0 1 1.41.114Z" fill="#fff"/></svg>
        </Button></PopoverTrigger>
        <PopoverContent className="sf">
        <Input defaultValue={rec}  className="mt-2" label="Video Recording Link" placeholder="Enter Recording Link" onChange={(e)=>{onChange(e.target.value,'recording')}}></Input>
            <Button className="mt-2" color="primary" onPress={()=>{fireRecordings()}}>Update Recording Link</Button>
        </PopoverContent>
        </Popover>
        <Button isIconOnly className="ml-2" size="sm" color="primary" onPress={()=>{fireAssignments()}}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6a2 2 0 0 0 2 2h6v10a2 2 0 0 1-2 2h-6.81A6.5 6.5 0 0 0 4 11.498V4a2 2 0 0 1 2-2h6Zm1.5.5V8a.5.5 0 0 0 .5.5h5.5l-6-6Zm-1.5 15a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-2.146-2.354a.5.5 0 0 0-.708 0L5.5 18.793l-1.646-1.647a.5.5 0 0 0-.708.708l2 2a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708Z" fill="#222F3D"/></svg>
        </Button>
        <Button isIconOnly className="ml-2" size="sm" color="primary" onPress={()=>{fireAttachment()}}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6a2 2 0 0 0 2 2h6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6Z" fill="#222F3D"/><path d="M13.5 2.5V8a.5.5 0 0 0 .5.5h5.5l-6-6Z" fill="#222F3D"/></svg>    
        </Button>
        <Button isIconOnly className="ml-2" size="sm" color="primary" onPress={()=>{callEntry()}}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14.754 10c.966 0 1.75.784 1.75 1.75v4.749a4.501 4.501 0 0 1-9.002 0V11.75c0-.966.783-1.75 1.75-1.75h5.502Zm-7.623 0c-.35.422-.575.95-.62 1.53l-.01.22v4.749c0 .847.192 1.649.534 2.365A4.001 4.001 0 0 1 2 14.999V11.75a1.75 1.75 0 0 1 1.606-1.744L3.75 10h3.381Zm9.744 0h3.375c.966 0 1.75.784 1.75 1.75V15a4 4 0 0 1-5.03 3.866c.3-.628.484-1.32.525-2.052l.009-.315V11.75c0-.665-.236-1.275-.63-1.75ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm6.5 1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-13 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" fill="#222F3D"/></svg> 
        </Button>
        
        {data?.location == "online" ? 
        <Popover onOpenChange={(e)=>{e == true ? setDefault(data.meeting_link) :''}}><PopoverTrigger>
        <Button isIconOnly className="ml-2" size="sm" color="success" >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 7a1 1 0 0 1 .117 1.993L9 9H7a3 3 0 0 0-.176 5.995L7 15h2a1 1 0 0 1 .117 1.993L9 17H7a5 5 0 0 1-.217-9.995L7 7h2Zm8 0a5 5 0 0 1 .217 9.995L17 17h-2a1 1 0 0 1-.117-1.993L15 15h2a3 3 0 0 0 .176-5.995L17 9h-2a1 1 0 0 1-.117-1.993L15 7h2ZM7 11h10a1 1 0 0 1 .117 1.993L17 13H7a1 1 0 0 1-.117-1.993L7 11h10H7Z" fill="#fff"/></svg>
            </Button></PopoverTrigger>
        <PopoverContent className="flex flex-col justify-start align-top items-start sf p-5">
 
            <Input defaultValue={defaultval}  className="mt-2" label="Class/Meeting Link" placeholder="Enter Class/Meeting Link" onChange={(e)=>{onChange(e.target.value,'meeting_link')}}></Input>
            <Button className="mt-2" color="primary" onPress={()=>{onUpdatePress('link')}}>Update Class Link</Button>
           
        </PopoverContent>
        </Popover>:
         <Popover onOpenChange={(e)=>{e == true ? setDefault(data.pin) :''}}><PopoverTrigger>
         <Button isIconOnly className="ml-2" size="sm" color="success" >
         <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.985 3.165a1 1 0 0 0-1.973-.33l-.86 5.163L3.998 8a1 1 0 1 0 .002 2l3.817-.002-.667 4L3 14a1 1 0 1 0 0 2l3.817-.002-.807 4.838a1 1 0 1 0 1.973.329l.862-5.167 4.975-.003-.806 4.84a1 1 0 1 0 1.972.33l.862-5.17L20 15.992a1 1 0 0 0 0-2l-3.819.001.667-4.001L21 9.99a1 1 0 0 0 0-2l-3.818.002.804-4.827a1 1 0 1 0-1.972-.33l-.86 5.159-4.975.003.806-4.832Zm-1.14 6.832 4.976-.003-.667 4.001-4.976.002.667-4Z" fill="#fff"/></svg>
            </Button></PopoverTrigger>
         <PopoverContent className="flex flex-col justify-start align-top items-start sf p-5">
  
             <Input defaultValue={defaultval} type="number" max={4} maxLength={4}  className="mt-2" label="Class PIN" placeholder="Enter Class PIN" onChange={(e)=>{onChange(e.target.value,'pin')}}></Input>
             <Button className="mt-2" color="primary" onPress={()=>{onUpdatePress('pin')}}>Update Class PIN</Button>
            
         </PopoverContent>
         </Popover>
        }
        <Button className="ml-2" size="sm" color="danger" onPress={()=>{deleteSchedule()}}>Delete</Button>
       </div>:''}
    </div>

}

export default Scheduler;