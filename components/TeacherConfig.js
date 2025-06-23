import { supabase } from "@/utils/supabaseClient";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch } from "@nextui-org/react";

import { useEffect, useState } from "react";

function TeacherConfig({userData,pin,config,getConfig}){


    const [modal,setModal] = useState(false);
    const [subjectData,setSubjectData]= useState();
const [teacherData,setTeacherData] =  useState({
    shifts:[
        {
            day:0,
            isAvailable:false,
            startTime:null,
            endTime:null
        },
        {
            day:1,
            isAvailable:false,
            startTime:null,
            endTime:null
        },
        
        {
            day:2,
            isAvailable:false,
            startTime:null,
            endTime:null
        },
        {
            day:3,
            isAvailable:false,
            startTime:null,
            endTime:null
        },
        {
            day:4,
            isAvailable:false,
            startTime:null,
            endTime:null
        },
        {
            day:5,
            isAvailable:false,
            startTime:null,
            endTime:null
        },
        {
            day:6,
            isAvailable:false,
            startTime:null,
            endTime:null
        }
    ]
});


const updateKeyAtIndex = (index, key, value) => {
    setTeacherData(prevState => {
      const newShifts = prevState.shifts.map((shift, i) =>
        i === index ? { ...shift, [key]: value } : shift
      );
      return { shifts: newShifts };
    });
  };

const [subjects,setSubjects] = useState();
const [sentPIN,setSendPIN] = useState(false)
    function getDayName(dayIndex) {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return daysOfWeek[dayIndex];
      }

async function getSubjects(){

    const {data,error} = await supabase.from('subjects').select("*")

    if(data){
        setSubjects(data)
    }
    else{}
}
async function sendPIN(a){

    const {error} = await supabase.from('update_pin').insert({
        email:a
    })

    if(!error){
        setSendPIN(true)
    }
    else{}
}


function addNewSubject(){

   setModal(true)
}

useEffect(()=>{
getSubjects()
},[userData])


async function addSubject(a){

    const {data,error} = await supabase.from('subjects').insert({
        title:a?.title
    }).select()

    if(data){
getSubjects();


setModal(false)

    }else{
        
    }

}



async function addConfig(a){

   
const {data,error} = await supabase.from('teacher_data').insert({
    email:a?.email || userData?.email,
    shifts:a?.shifts,
    phone:a?.phone,
    subjects:a?.subjects,
    remote:a?.remote || false,
    centre:a?.centre

}).select();

   
    
   

      
    
    

    if(data){
getConfig()
setTeacherData(data[0])



    }else{
        
    }

}

useEffect(()=>{
    
    if(config?.length > 0){
        console.log('config',config[0])
        setTeacherData(config[0])
    }
},[config])

async function generatePlan(a){
    
}


async function updateConfig(a){

   
    const {data,error} = await supabase.from('teacher_data').update({
           
        shifts:a?.shifts,
        phone:a?.phone,
        subjects:a?.subjects,
        remote:a?.remote || false,
        centre:a?.centre

    }).eq('email',a?.email || userData?.email).select();
    
       
        
       
    
          
        
        
    
        if(data){
    getConfig()
    setTeacherData(data[0])
    
    
    
        }else{
            
        }
    
    }

      return <>
      <Modal isOpen={modal}  onClose={()=>{setModal(false)}}>
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Add a New Subject</ModalHeader>
              <ModalBody>
           <Input placeholder="Enter Subject Title" label="Subject Title" onChange={(e)=>{setSubjectData(res=>({...res,title:e.target.value}))}}></Input>     
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button color="primary" onPress={()=>{addSubject(subjectData)}}>
                  Add Subject
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <h2 className="text-red-500 text-left font-bold sf mb-2 text-xl">Please set your configuration & PIN before you continue</h2>
      <div className="max-w-[500px] sf p-4 rounded-lg shadow-md text-left">
        <h1 className="font-bold text-left">Teacher Configuration</h1>
        {Array(7).fill().map((i,d)=>{

return <div className="w-full flex flex-row  sf my-3">
    <div className="flex flex-row flex-1 justify-start items-center align-middle">
    <h2>{getDayName(d)}</h2>
    <Switch className="ml-2" isSelected={teacherData?.shifts[d]?.isAvailable} onValueChange={(e)=>{
updateKeyAtIndex(d,'isAvailable',e)
    }}></Switch></div>

    <div className="flex flex-row">

<div>
    <Input size="sm" labelPlacement={'outside'} label="Start Time" value={teacherData?.shifts[d]?.startTime} type="time" onChange={(e)=>{updateKeyAtIndex(d,'startTime',e.target.value)}}></Input>
</div>
<div>
    <Input size="sm" labelPlacement={'outside'} label="End Time" value={teacherData?.shifts[d]?.endTime} type="time" onChange={(e)=>{updateKeyAtIndex(d,'endTime',e.target.value)}}></Input>
</div>
    </div>
</div>
        })}

<Input value={teacherData?.phone} className="my-2" placeholder="Enter your Phone" label="Phone Number" type="tel" onChange={(e)=>{setTeacherData(res=>({...res,phone:e.target.value}))}}></Input>
<Input value={teacherData?.email} className="my-2" placeholder="Enter your Email" label="Email Address" type="email" onChange={(e)=>{setTeacherData(res=>({...res,email:e.target.value}))}}></Input>
<Input value={teacherData?.centre} className="my-2" placeholder="Enter your Centre if applicable" label="Teacher's Origin Centre" type="text" onChange={(e)=>{setTeacherData(res=>({...res,centre:e.target.value}))}}></Input>
<Select label="Select Subjects" 
selectedKeys={[teacherData?.subjects?.toString()]}
        
        className="sf mb-3" onChange={(e)=>{setTeacherData(res=>({...res,subjects:e.target.value}))}} >

{subjects != undefined && [...subjects,{id:987,title:'Add New Subject'}]?.map((subject) => (
          <SelectItem className="sf" key={subject.id} value={subject.id} onClick={()=>{subject.id == 987 ? addNewSubject() :'' }}>
            {subject.title}
          </SelectItem>
        ))}
        </Select>
        <div className="flex flex-row my-2 mb-5 justify-start items-center align-middle">
        <Switch isSelected={teacherData?.remote} onValueChange={(e)=>{setTeacherData(res=>({...res,remote:e}))}}> </Switch>   <p>
            Are you a teacher working remotely?</p>


        </div>
        <Button color="primary" onClick={()=>{config == undefined || config.length === 0 ? addConfig(teacherData) : updateConfig(teacherData)}}>{config == undefined || config.length === 0 ? "SAVE" : "UPDATE"}</Button>

      </div>
      {pin == undefined || pin?.length == 0 ? 
      <div className="max-w-[500px] sf p-4 rounded-lg shadow-md bg-white my-2 text-left">
      
      <h1 className="font-bold text-left">SET PIN</h1>
{sentPIN ? <div className="bg-green-100 rounded-md w-full text-center text-sm"><p>A Link has been sent to your email</p></div>:
      <Button color="primary" onPress={()=>{sendPIN(userData?.email)}}>Send Link on Email to Set PIN</Button>}
      
      </div>:''}
      </>
}

export default TeacherConfig;