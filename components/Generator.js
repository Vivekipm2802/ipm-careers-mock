import {  extractDateInfo } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { Button, Input, Popover, PopoverContent, PopoverTrigger,Modal,ModalBody,ModalFooter,ModalHeader,ModalContent, Switch,Select,SelectItem, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Spacer, Divider, Pagination, Textarea, Chip } from "@nextui-org/react";
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast";
import _, { set } from "lodash";
import FileUploader from "./FileUploader";
import Link from "next/link";
import PlanViewer from "./PlanViewer";
import dynamic from "next/dynamic";

const QuillWrapper = dynamic(() => import("@/components/QuillSSRWrapper"), { ssr: false })



function Generator({userData,role,enrolled}){

const [view,setView] =useState(0);
const [plans,setPlans] = useState();
const [generated,setGenerated] = useState()
const [planData,setPlanData] = useState();
const [subjects,setSubjects] = useState();
const [courses,setCourses] = useState();
const [generateData,setGenerateData] = useState();
const [modal,setModal] = useState();
const [startDate,setStartDate] = useState();
const [activePlan,setActivePlan] = useState();
const [activeDate,setActiveDate] = useState(0);
const [page,setPage] = useState(0);
const [currentData,setCurrentData] = useState();
const [currentPage,setCurrentPage] = useState(0);
const [dayModal,setDayModal] = useState(false);
const [currentModalData,setCurrentModalData] = useState();
const [viewModal,setViewModal] = useState(false);
const [editModal,setEditModal] = useState(false);
const Paginate = ({data,page,proponChange})=>{
    const perPage= 7;
const [current,setCurrent] = useState(0)

const count = data?.length/perPage || 0;
const text = "Week"

useEffect(()=>{
    proponChange(current)
},[current])


    return <div className="flex flex-row justify-start items-center align-middle">
        {Array(Math.ceil(count) || 1).fill().map((i,d)=>{
            return <div onClick={()=>{setCurrent(d)}}  className={`${current == d ? "bg-primary" :'bg-default'} text-xs rounded-full px-5 py-2`}>{text} {d + 1}</div>
        })}
    </div>
}
async function getCourses(){
    const {data,error} = await supabase.from('courses').select("*").order('id',{ascending:true})
    if(data){
      setCourses(data);
    }
  }



function activateView(a,b,c){
  const start_date =  c.filter((item)=> item.plan == a.id)[0].start_date;
setView(1)
setStartDate(start_date);

a?.data?.map((i,d)=>{
    extractDateInfo(startDate,d).isToday == true  ? setActiveDate(d):""
  })

    setActivePlan({...a,start_date:start_date});

}

const types = [ 
  {
    title:'Section',
    description:'section to accomodate more than one childs',
    type:'section',
  },
  {
    title:'Text',
    description:'allows simple text to be added',
    type:'text',
  },
  {
    title:'HTML',
    description:'allows adding html type content',
    type:'html',
  },
  {
    title:'File',
    description:'allows a file to be accessed in plan',
    type:'file',
    allowed:'pdf,xls,doc,docx,mp4,mp3,txt,jpg,png'
  }
  
]



async function getSubjects(){

    const {data,error} = await supabase.from('subjects').select("*")

    if(data){
        setSubjects(data)
    }
    else{}
}

async function getGenerated(){

    const {data,error} = await supabase.from('study_plan').select("*").eq('email',userData?.email);

    if(data && data?.length > 0){
        setGenerated(data)
    }
    else{}


}

async function getPlans(){

    const {data,error} = await supabase.from('plans').select("*,subject(id,title),course(id,title)").order('title',{ascending:true});

    if(data && data?.length > 0){
        setPlans(data)
    }
    else{}


}
async function deletePlan(a,b){

    const {error} = await supabase.from('plans').update({
        isActive:b
    }).eq('id',a);

    if(!error){
        getPlans();
    }
    else{

    }


}



useEffect(()=>{
    getGenerated();
    getPlans();
    getSubjects();
    getCourses();
},[])


async function addNewPlan(a){

    const r = toast.loading('Sit Back !Generating your Plan !!')
const {data,error} = await supabase.from('plans').insert({
title:a?.title,
description:a?.description,
subject:a?.subject,
course:a?.course,
isActive:true
}).select();

if(data){
getPlans();
toast.success('Yay ! your plan is generated')
}else{

    toast.remove(r)
    toast.error('Oops !! Something went wrong')
}
}


const updateSchemaz = (schema, path, newChild) => {
  if (path?.length === 0) return schema;

  const [currentIndex, ...restPath] = path;

  return schema.map((item, index) =>
    index === currentIndex
      ? {
          ...item,
          child: restPath.length > 0
            ? updateSchemaz(item.child || [], restPath, newChild)
            : [
                ...(item.child || []),
                newChild
              ]
        }
      : item
  );
};
const deleteSchemaz = (schema, path) => {
  if (!path?.length) return schema;

  const [currentIndex, ...restPath] = path;

  return schema.map((item, index) => {
    if (index === currentIndex) {
      if (restPath.length === 0) {
        // Remove the item at the current index if restPath is empty
        return null;
      } else {
        // Recursively call deleteSchemaz on the child
        return {
          ...item,
          child: deleteSchemaz(item.child || [], restPath)
        };
      }
    }
    return item;
  }).filter(item => item !== null); // Filter out the null items
};

const updateTitle = (schema, path, newTitle) => {
  if (!path?.length) return schema;

  const [currentIndex, ...restPath] = path;

  return schema.map((item, index) =>
    index === currentIndex
      ? {
          ...item,
          child: restPath.length > 0
            ? updateTitle(item.child || [], restPath, newTitle)
            : item.child,
          title: restPath.length === 0 ? newTitle : item.title
        }
      : item
  );
};
function renderComponent(a,b,c,depth){
  
    return <><div className={"font-medium my-2 text-md text-left flex flex-row items-center "} style={{marginLeft:b == true ? (depth?.length *2) + (depth.length * 15) + "px":'0px'}}>
      
      {b== true ?<svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 21a1 1 0 0 1-.883.993L19 22h-6.5a3.5 3.5 0 0 1-3.495-3.308L9 18.5V5.415L5.707 8.707a1 1 0 0 1-1.32.083l-.094-.083a1 1 0 0 1-.083-1.32l.083-.094 5-5a1.01 1.01 0 0 1 .112-.097l.11-.071.114-.054.105-.035.118-.025.058-.007L10 2l.075.003.126.017.111.03.111.044.098.052.092.064.094.083 5 5a1 1 0 0 1-1.32 1.497l-.094-.083L11 5.415V18.5a1.5 1.5 0 0 0 1.355 1.493L12.5 20H19a1 1 0 0 1 1 1Z" fill="#666"/></svg>:''}
      <Popover className="p-2">
      
      <PopoverTrigger>
      <p>


      {a.title}</p></PopoverTrigger>
      <PopoverContent>
        <Input label={a?.type + " title"} size="sm" value={a?.title} 
        onChange={(e)=>{
          setCurrentData(res => ({
            ...res,
            schema: updateTitle(res?.schema || [], depth,e.target.value)
          })); 
        }}
        ></Input>
      </PopoverContent>
      </Popover> {a?.child ? <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" fill="#212121"/></svg>:''} 
   
   
   {a?.type == "section" ?  <Dropdown className={a.type == "section" ? '':'hidden'}><DropdownTrigger>
    <svg className="ml-2 hover:scale-105"  width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path className="hover:fill-primary transition-all" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z" fill="#212121"/></svg>
    </DropdownTrigger>
    <DropdownMenu>
    {types && types?.map((i,d)=>{
  return <DropdownItem onPress={()=>{

    setCurrentData(res => ({
      ...res,
      schema: updateSchemaz(res?.schema || [], depth, { type: i.type, title: i.title, depth:depth })
    }));
    

  }}>
   <h2 className="text-sm font-bold text-primary">{i.title}</h2>
    <p className="text-gray-600 text-xs">{i.description}</p>
    </DropdownItem>
})}
    </DropdownMenu>
    </Dropdown>:''}

    <div className="text-danger ml-2 text-xs cursor-pointer hover:bg-danger rounded-full hover:text-white p-1 px-2 transition-all" onClick={()=>{

setCurrentData(res => ({
  ...res,
  schema: deleteSchemaz(res?.schema || [], depth)
}));

    }}>Remove</div>
    
    </div>
    {a?.child && a?.child?.length > 0 ? a?.child?.map((z,v)=>{
      return renderComponent(z,true,v,Array.isArray(depth) ? [...depth, v] : [depth, v])
    }):''}
    </>
  


}


function filterPlans(a){

    if(role == "admin"){
        return a
    }
    if(role == "user" || role == undefined){
        return a.filter(item=>item.isActive == true && enrolled.some(enrollment => enrollment?.course?.id === item?.course?.id))
    }
}
async function schemaToData(a){
if(a == undefined){
  toast.error('Schema Undefined')
}

return {}

}
async function updateSchema(a){

  const r = toast.loading('Updating')
  const {data,error} = await supabase.from('plans').update({
    schema:a?.schema
  }).eq('id',a?.id).select();
  if(data){
    toast.success('Updated Successfully')
    setCurrentData(data[0])
    getPlans()
    toast.remove(r);
  }
  if(error){
    toast.error('Update failed , Try Again')
    toast.remove(r);
  }
}


async function updateData(a){

  const r = toast.loading('Updating Data')
  const {data,error} = await supabase.from('plans').update({
    data:a?.data
  }).eq('id',a?.id).select();
  if(data){
    toast.success('Updated Successfully')
    setCurrentData(data[0])
    getPlans()
    toast.remove(r);
  }
  if(error){
    toast.error('Update failed , Try Again')
    toast.remove(r);
  }
}

async function generatePlan(a){

    const day  = extractDateInfo(a?.start_date).day;
    if(day != 1){
        toast.error('Selected Date must be Monday')
        return null
    }
    
    const r = toast.loading('Sit Back !Generating your Plan !!')
   
    const {data,error} = await supabase.from('study_plan').insert({
        email:userData?.email,
        start_date:a.start_date,
        plan:a?.plan
        
        }).select();
        
        if(data){
        toast.success('Yay ! your plan is generated')
        getGenerated();
        toast.remove(r)
        setModal(false)
        } else{
            toast.remove(r)
            toast.error('Oops !! Something went wrong')
        }
}

function visualizeSchema(item,depth){

  if(item.type == "section"){
    return <><div key={depth.toString()} className={"flex text-primary font-bold flex-1 flex-row text-center items-center justify-center mb-2 " + (_.last(depth) > 0 ? ' border-l-[1px] border-gray-300':'' )}>
      {item.title}</div>
    <div className="flex w-full h-[1px] bg-gray-300"></div>
    <div className="flex text-center justify-center flex-row w-full items-center">
    {item?.child? item?.child?.map((i,d)=>{
      return <div className={"flex flex-col flex-1 " + (_.last(depth) > 0 ? ' border-l-[1px] border-gray-300':'' )}>{ visualizeSchema(i,Array.isArray(depth) ?[...depth,d] :[depth,d])}</div>
    }):''}</div>
    </>
  }
  if(item.type == "text"){
    return <><div  className="flex flex-1 flex-col text-center items-center justify-center mb-2 text-sm text-gray-600">
      <h2 className="font-medium text-sm text-black">{item.title}</h2>
      {item?.content||'Your content here'}
      
      </div>
    
    
    </>
  }
  if(item.type == "html"){
    return <><div className="flex flex-1 flex-col text-center items-center justify-center mb-2 text-sm text-gray-600">
      <h2 className="font-medium text-sm text-black">{item.title}</h2>
      <div dangerouslySetInnerHTML={{__html:'<p>Your HTML Here</p>'}}>
      </div>
      </div>
    
    
    </>
  }
  if(item.type == "file"){
    return <><div className="flex flex-1 flex-col text-center items-center justify-center mb-2 text-sm text-gray-600">
 <h2 className="font-medium text-sm text-black">{item.title}</h2>
<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6a2 2 0 0 0 2 2h6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6Z" fill="#212121"/><path d="M13.5 2.5V8a.5.5 0 0 0 .5.5h5.5l-6-6Z" fill="#212121"/></svg>

<Button size="sm" className="text-white" color="primary" target="_blank" isDisabled={item?.content == undefined} as={Link} href={item?.content || '#'}>Download</Button>
    </div>
    
    
    </>
  }


  
}


const updateContent = (va,depth) => {
  console.log(va,depth)
  const newValue = va;
  
  const path = [depth[0], ...depth.slice(1,depth?.length).map(index => `child[${index}]`), 'content'].join('.');

  setCurrentModalData(prevState => {
    const newState = { ...prevState };
    
    set(newState, path, newValue);
    return newState;
  });
  
};
const insertDataToIndex = (data, index) => {

  const path = `data[${index}]`;

  setCurrentData(prevState => {
    const newState = { ...prevState };

    // Retrieve the existing array at the specified index, or initialize it if it doesn't exist
    const existingArray = newState.data[index] || [];
if(existingArray?.length >= 7){ toast.error('Cannot Add More than 7 days');
return newState

}
    // Concatenate the new data with the existing array
    const updatedArray = existingArray?.concat([data[0]??{}]);

    // Set the updated array at the specified path
    set(newState, path, updatedArray);

    return newState;
  });

setDayModal(false)

};

const deleteDataAtIndex = (index, itemIndex) => {
  const path = `data[${index}]`;

  setCurrentData(prevState => {
    const newState = { ...prevState };

    // Retrieve the existing array at the specified index
    const existingArray = newState.data[index] || [];

    // Remove the item at the specified itemIndex
    const updatedArray = existingArray.filter((_, i) => i !== itemIndex);

    // Set the updated array at the specified path
    set(newState, path, updatedArray);

    return newState;
  });
};
function visualizeSchemaEditor(item,depth){

  
  if(item.type == "section"){
    return <><div className={"flex text-xs font-regular flex-1 flex-row text-center items-center justify-center p-2 " + (_.last(depth) > 0 ? ' border-[1px] border-gray-300':'' )}>
      {item.title}</div>
    <div className="flex w-full h-[1px] bg-gray-300"></div>
    <div className="flex text-center justify-center flex-col w-full items-center">
    {item?.child? item?.child?.map((i,d)=>{
      return <div className={"flex flex-col w-full flex-1 " + (_.last(depth) > 0 ? ' border-l-[1px] border-gray-300':'' )}>{ visualizeSchemaEditor(i,Array.isArray(depth) ?[...depth,d] :[depth,d])}</div>
    }):''}</div>
    </>
  }
  if(item.type == "text"){
    return <><div className="flex flex-1 p-2 flex-col text-center items-center justify-center mb-2 text-sm text-gray-600">
      
     
     <Textarea onChange={(e)=>{updateContent(e.target.value,depth)}} type="text" size="sm" label={item?.title} placeholder={item?.type} value={item?.content || ''}>
     </Textarea>
      
      
      </div>
    
    
    </>
  }
  if(item.type == "html"){
    return <><div className="flex flex-1 flex-col text-center items-center justify-center mb-2 text-sm text-gray-600">
      <h2 className="font-medium text-sm text-black">{item.title}</h2>
     <QuillWrapper value={item?.content} onChange={(e)=>{updateContent(e,depth)}}></QuillWrapper>
      </div>
    
    
    </>
  }
  if(item.type == "file"){
    return <><div className="flex flex-1 flex-col text-center items-center justify-center mb-2 text-sm text-gray-600">
 <h2 className="font-medium text-sm text-black">{item.title}</h2>
 <FileUploader data={{file:item?.content||null}} onUploadComplete={(e)=>{updateContent(e,depth)}}></FileUploader>

    </div>
    
    
    </>
  }


  
}

if(view == 0)
return <div>

<Modal isOpen={modal}  onClose={()=>{setModal(false)}}>
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Select Start Date</ModalHeader>
              <ModalBody>
           <Input placeholder="Enter Start Date" type="date" label="Start Date" onChange={(e)=>{setGenerateData(res=>({...res,start_date:e.target.value}))}}></Input>     
           <h2>Make sure to select Monday as Start Date</h2>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button className="text-white" color="primary" onPress={()=>{generatePlan(generateData)}}>
                  Generate
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

<h2 className="text-left font-bold text-2xl mb-3 text-primary">Study Plan Generator</h2>
    <div className="flex flex-col">
        {plans && filterPlans(plans)?.length == 0 ? <div>No Plan Available yet. Check back again.</div>:''}
{plans && filterPlans(plans)?.map((i,d)=>{
    return <div className="flex flex-row bg-white items-center justify-between border-1 shadow-md my-2 p-3 rounded-lg">
        <div className="text-left ">
        <h2 className="font-bold text-md text-secondary">{i?.title}</h2>
        <p className="text-gray-400">{i?.description}</p>
        </div>

        <div className="flex flex-row items-center">
          <Chip size="sm" className="mr-4">Coming Soon</Chip>
{generated && generated.filter((item)=> item.plan == i.id)?.length > 0 ?  <Button color="primary" className="text-white" size="sm" onPress={()=>{activateView(i,d,generated)}}>View</Button>:
        <Button color="primary" className="text-white" size="sm" onPress={()=>{setModal(true),setGenerateData(res=>({...res,plan:i.id}))}}>Generate</Button>}

        {role == "admin" ? <>
        <Button size="sm" className="ml-2 text-white" color="success" onPress={()=>{setView(3),setCurrentData(i)}}>Edit Plan</Button>
        {/* <Button size="sm" className="ml-2 text-white" color="danger" onPress={()=>{deletePlan(i.id)}}>Delete</Button> */}
        <Switch className="ml-2" isSelected={i?.isActive} onValueChange={(e)=>{deletePlan(i.id,e)}}></Switch>
</>

        :''}</div>
         </div>
})}

{role == "admin" ? 
<Popover>
    <PopoverTrigger>
    <div className="flex flex-row cursor-pointer bg-white items-center text-center align-middle justify-center border-1 border-dashed shadow-md my-2 p-3 rounded-lg text-[#999]">ADD NEW PLAN</div>
    </PopoverTrigger>

    <PopoverContent className="sf min-w-[300px] p-3 text-left">
        <Input className="mb-2" label="Plan Title" placeholder="Enter Plan Title" onChange={(e)=>{setPlanData(res=>({...res,title:e.target.value}))}}></Input>
        <Input className="mb-2" label="Plan Description" placeholder="Enter Plan Description" onChange={(e)=>{setPlanData(res=>({...res,description:e.target.value}))}}></Input>
        <Select label="Select Subject" 
selectedKeys={[planData?.subject?.toString()]}
        
        className="sf mb-3" onChange={(e)=>{setPlanData(res=>({...res,subject:e.target.value}))}} >

{subjects != undefined && [...subjects]?.map((subject) => (
          <SelectItem className="sf" key={subject.id} value={subject.id} >
            {subject.title}
          </SelectItem>
        ))}
        </Select>
        
        <Select label="Select Course" 
selectedKeys={[planData?.course?.toString()]}
        
        className="sf mb-3" onChange={(e)=>{setPlanData(res=>({...res,course:e.target.value}))}} >

{courses != undefined && [...courses]?.map((course) => (
          <SelectItem className="sf" key={course.id} value={course.id} >
            {course.title}
          </SelectItem>
        ))}
        </Select>

        <Button color="primary" onPress={()=>{addNewPlan(planData)}}>Add Plan</Button>
    </PopoverContent>
</Popover>
:''}
    </div>
</div>

if(view == 1)  
return <PlanViewer onBack={()=>{setView(0),setActiveDate()}} fullData={activePlan} rawData={activePlan?.data}></PlanViewer>


if(view == 3){

  return <div className="flex flex-col w-full overflow-hidden flex-nowrap h-full">
    <Modal isOpen={dayModal} onClose={()=>{setDayModal(false),setCurrentModalData()}}>
      <ModalContent className="min-w-[800px]">
      {(onClose) => (<>
      <ModalHeader>
        Add Day {currentData?.data[currentPage]?.length  + 1} to Week {currentPage + 1}
      </ModalHeader>
      <ModalBody>
        {/* <Switch onValueChange={(e)=>{e==true ? (insertDataToIndex(currentModalData,currentPage)):''}}>Set as Holiday/Blank</Switch> */}
      <div className="w-full border-1 rounded-xl shadow-md bg-white p-2">
    {currentData?.schema && currentData?.schema?.map((i,d)=>{
      return visualizeSchemaEditor(i,[d])
    })}
  </div>
      </ModalBody>
      <ModalFooter className="flex flex-row justify-start">
      <Button size="sm" color="danger"  variant="ghost" onPress={()=>{setDayModal(false)}}>Cancel</Button>
        <Button size="sm" color="primary" className="text-white" onPress={()=>{insertDataToIndex(currentModalData,currentPage)}}>Add</Button>

      </ModalFooter>
      </>)}
      </ModalContent>
    </Modal>


    <Modal isOpen={viewModal} onClose={()=>{setViewModal(false),setCurrentModalData()}}>
      <ModalContent className="min-w-[800px]">
      {(onClose) => (<>
      <ModalHeader>
        View Data
      </ModalHeader>
      <ModalBody>
      <div className="w-full border-1 rounded-xl shadow-md bg-white p-2">
    {currentModalData && currentModalData?.map((i,d)=>{
      return visualizeSchema(i,[d])
    })}
  </div>
      </ModalBody>
     
      </>)}
      </ModalContent>
    </Modal>
    <Modal isOpen={editModal} onClose={()=>{setEditModal(false),setCurrentModalData()}}>
      <ModalContent className="min-w-[800px]">
      {(onClose) => (<>
      <ModalHeader>
        Update Data
      </ModalHeader>
      <ModalBody>
      <div className="w-full border-1 rounded-xl shadow-md bg-white p-2">
    {currentModalData && Array.isArray(currentModalData) && currentModalData?.map((i,index)=>{
      return visualizeSchemaEditor(i,[index])
    })}
  </div>
      </ModalBody>
      <ModalFooter className="flex flex-row justify-start">
      <Button size="sm" color="danger"  variant="ghost" onPress={()=>{setDayModal(false)}}>Cancel</Button>
        <Button size="sm" color="primary" className="text-white" onPress={()=>{editDataToIndex(currentModalData,currentPage)}}>Update</Button>

      </ModalFooter>
      </>)}
      </ModalContent>
    </Modal>



<Button color="primary" variant="faded" size="sm" className="text-black flex mr-auto flex-shrink-0 flex-grow-1" onPress={()=>{setCurrentData(),setView(0)}}>
<svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.733 19.79a.75.75 0 0 0 1.034-1.086L5.516 12.75H20.25a.75.75 0 0 0 0-1.5H5.516l6.251-5.955a.75.75 0 0 0-1.034-1.086l-7.42 7.067a.995.995 0 0 0-.3.58.754.754 0 0 0 .001.289.995.995 0 0 0 .3.579l7.419 7.067Z" fill="#212121"/></svg>
  Back to Main Screen</Button>
  <div className="overflow-y-auto w-full">
<div className="border-1 my-2 rounded-xl p-4 flex flex-col">
<h2 className="font-bold font-sans text-primary text-xl text-left">
  Schema
</h2>

{currentData?.schema != undefined ? <div className="flex flex-row justify-start items-start">
<div className="flex flex-col flex-1">
{currentData && currentData?.schema?.map((i,d)=>{
  return renderComponent(i,false,d,[d]);

})}
<Spacer y={4}></Spacer>
<Button className="flex flex-row text-white mr-auto" onPress={()=>{updateSchema(currentData)}} color="primary" size="sm" >Update Schema</Button>
<Spacer y={4}></Spacer>
<Dropdown ><DropdownTrigger><Button color="secondary" size="sm" className="flex flex-row items-center mr-auto justify-center">
     Add New Item</Button>
    </DropdownTrigger>
    <DropdownMenu>
    {types && types?.map((i,d)=>{
  return <DropdownItem onPress={()=>{setCurrentData(res=>({...res,schema:[...res?.schema || '',{type:i.type,title:i.title}]}))}}>
   <h2 className="text-sm font-bold text-primary"> {i.title}</h2>
    <p className="text-gray-600 text-xs">{i.description}</p>
    </DropdownItem>
})}
    </DropdownMenu>
    </Dropdown>


</div>

<div className="flex flex-col flex-1">
  <h2 className="font-sans text-md font-medium text-left">Schema Visualizer</h2>
  <div className="w-full border-1 rounded-xl shadow-md bg-white p-2">
    {currentData?.schema && currentData?.schema?.map((i,d)=>{
      return visualizeSchema(i,[d])
    })}
  </div>
  </div></div>

:
<Dropdown>
  <DropdownTrigger>
    
<Button size="sm" color="primary" className="text-white flex" >Add First Element</Button></DropdownTrigger>
<DropdownMenu>
{types && types?.map((i,d)=>{
  return <DropdownItem onPress={()=>{setCurrentData(res=>({...res,schema:[...res?.schema || '',{type:i.type,title:i.title}]}))}}>
   <h2 className="text-sm font-bold text-primary"> {i.title}</h2>
    <p className="text-gray-600 text-xs">{i.description}</p>
    </DropdownItem>
})}
</DropdownMenu>
</Dropdown>}
</div>
<div className="border-1 my-2 rounded-xl p-4 flex flex-col">
<h2 className="font-bold font-sans text-primary text-xl text-left">
  Plan Data
</h2>

<Weekly deleteItem={(e)=>{
   setCurrentData((prevState) => {
    const newData = _.cloneDeep(prevState.data);
    _.pullAt(newData, e);
    return { ...prevState, data: newData };
  });
}} page={currentPage} items={currentData?.data || []} addNew={()=>{
setCurrentData(res=>({...res,data:[...res?.data || [] ,[] ]  }))

}} onChange={(e)=>{setCurrentPage(e)}}></Weekly>


{currentData?.data != undefined && currentData?.data?.length > 0 ? 
<div className="flex flex-row flex-wrap items-center justify-start border-1 my-4 p-4 rounded-xl">
  {currentData?.data[currentPage]?.map((item,index)=>{
    return <div className="flex-[16.5%] !flex-grow-0 flex-col border-1 border-gray-300 p-2 rounded-xl mx-1 bg-gray-50 border-dashed ">
      <h2 className="font-medium text-md">Day {index + 1}</h2>
      {currentData?.data[currentPage][index] ? <>
<Spacer y={2} x={2}></Spacer>
<div className="flex flex-row items-center justify-center">
      <Button color="success" size="sm" className="text-white" onPress={()=>{setCurrentModalData([item]),setViewModal(true)}}>View Data</Button>
      <Spacer x={2} y={2}></Spacer>
      <Button color="primary" size="sm" className="text-white" onPress={()=>{setEditModal(true),setCurrentModalData([item])}}>Edit Data</Button>
      <Spacer x={2} y={2}></Spacer>
      <Dropdown><DropdownTrigger>
        
      <Button color="danger" size="sm" className="text-white ">Delete Day</Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownItem>
          <Button size="sm" color="danger" variant="solid" onPress={()=>{deleteDataAtIndex(currentPage,index)}}>Delete? Sure !</Button>
          <Spacer x={2} y={2}></Spacer>
          <Button size="sm" color="default" variant="faded">Cancel</Button>
          </DropdownItem>
      </DropdownMenu>
      </Dropdown>
      </div>
      </>:<><h2 className="text-sm text-gray-400">Day has no data</h2>
      <Spacer y={2} x={2}></Spacer>
      <Button color="primary" size="sm" className="text-white">Add Data</Button></>}
    </div>
  })}

<div className="flex-1 flex-col border-1 border-gray-300  p-2 cursor-pointer hover:bg-gray-200 transition-all rounded-xl mx-1 bg-gray-50 border-dashed" onClick={()=>{setDayModal(true),setCurrentModalData(currentData?.schema)}}>
      <h2 className="font-medium text-md">Add Day</h2>
      
    </div>


  
{/* <Button>Add Day</Button> */}
</div>

:''}
{currentData?.data != undefined && currentData?.data?.length > 0?
<div className="flex flex-row">
  <Button size="sm" className="flex mr-auto text-white" color="primary" onPress={()=>{updateData(currentData)}}>Update Data </Button>
</div>
:""}

</div></div>
  </div>
}


}
const Weekly = ({onChange,items,page,addNew,deleteItem})=>{

return <div className="flex flex-row flex-wrap my-4 items-center">{
  items && items.map((i,d)=>{
    return <div className="p-1 group relative flex flex-row items-center justify-center"><div onClick={()=>{onChange(d)}} className={"text-black bg-gray-200 transition-all group-hover:mr-6 shadow-[inset_2px_2px_6px_-5px_#000f] cursor-pointer hover:bg-secondary rounded-full border-1 p-1 px-4 text-sm"+ (page == d ? ' bg-gradient-purple text-white shadow-md':'')}>Week {d+1}
    
    </div>
    <div className="ml left-0 absolute group-hover:opacity-100 opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:left-[80%] text-red-500 cursor-pointer">
    <Popover>
      <PopoverTrigger>
    <svg className=" rotate-45" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path className="fill-danger" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 5a.75.75 0 0 0-.743.648l-.007.102v3.5h-3.5a.75.75 0 0 0-.102 1.493l.102.007h3.5v3.5a.75.75 0 0 0 1.493.102l.007-.102v-3.5h3.5a.75.75 0 0 0 .102-1.493l-.102-.007h-3.5v-3.5A.75.75 0 0 0 12 7Z" fill="#212121"/></svg>
    </PopoverTrigger>
    <PopoverContent>
      <h2>Delete Week {d+1}</h2>
      <div className="flex flex-row items-center">
      <Button color="primary" size="sm" className="text-xs text-white pointer-events-none" >Cancel</Button>
      <Spacer x={2} y={2}></Spacer>
      <Button color="danger" size="sm" className="text-xs" onPress={()=>{deleteItem(d)}}>Delete</Button></div>
    </PopoverContent>
    </Popover>
    </div>
    </div>
  })
  }
  <div className={"text-black bg-gray-50 hover:bg-gray-200 cursor-pointer transition-all mx-2 rounded-full border-1 border-dashed p-1 px-4 text-sm"} onClick={()=>{addNew()}}>Add a Week</div>
  </div>
}

export default Generator;