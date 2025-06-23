import { supabase } from "@/utils/supabaseClient";
import { Button, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Popover, PopoverContent, PopoverTrigger, Select, SelectItem, Switch } from "@nextui-org/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ImageUploader from "./ImageUploader";
/* import QuillWarapper from "./QuillSSRWrapper"; */
const EditableMathField = dynamic(() => import('react-mathquill'), {
    ssr: false,
  });
  const StaticMathField = dynamic(() => import('react-mathquill'), {
    ssr: false,
  });
  const QuillWarapper = dynamic(() => import('@/components/QuillSSRWrapper'), {
    ssr: false,
  });

function SWOTEditor({userData,role}){
const [views,setViews] = useState(0);
const [activeCourse,setActiveCourse] = useState();
const [activeSWOT,setActiveSWOT] = useState();
const [courses,setCourses] = useState();
const [subjects,setSubjects] = useState();
const [subjectData,setSubjectData]= useState();
const [modules,setModules] = useState();
const [moduleData,setModuleData]= useState();
const [activeModule,setActiveModule]=useState();
const [questions,setQuestions] = useState();
const [editlatex,setEditLatext] = useState();
const [config,setConfig] = useState();
const [activeSubject,setActiveSubject] = useState();
const [questionModal,setQuestionModal] = useState(false);
const [latex,setLatex] = useState();
const [tests,setTests] = useState();
const [editTest,setEditTest] = useState();
const [testData,setTestData] = useState();
const [addNewQuestion,setAddNewQuestion] = useState({type:false,options:[{isCorrect:false},{isCorrect:false},{isCorrect:false},{isCorrect:false}]});
const [editQuestionData,setEditQuestionData] = useState();
const [selectedsubjects,setSelectedSubjects] = useState();
const [selectedModules,setSelectedModules] = useState();
const [editModule,setEditModule] = useState();
const [activeSelectedSub,setActiveSelectedSub] = useState()
const headings = ['Select a Test','Select a Subject/Category','Select a Module','Manage Questions'
]

const CustomEditor = dynamic(() => import('@/components/CustomEditor'), {
    ssr: false,
  });

const [editMode,setEditMode] = useState();
const descriptions = ['you must select a course for which you want to create swot test','','','Add,Update or Delete questions for the module you have selected']
async function getCourses(){
    const {data,error} = await supabase.from('courses').select("*").order('id',{ascending:true})
    if(data){
      setCourses(data);
    }
  }
async function getSelectedSubjects(a){
const r= toast.loading('getting subjects')
    const {data,error} = await supabase.from('swot_groups').select("*").match({'type':'subject','test':a})
    if(data){
        toast.success('loaded subjects')
        toast.remove(r)
setSelectedSubjects(data)
    }
    else{
toast.error('failed to get subjects')
        toast.remove(r)
    }
}

async function getSelectedModules(a){
    const r= toast.loading('getting modules')
        const {data,error} = await supabase.from('swot_groups').select("*").match({'type':'module','parent_sub':a}).order('created_at',{ascending:true})
        if(data){
            toast.success('loaded modules')
            toast.remove(r)
    setSelectedModules(data)
        }
        else{
    toast.error('failed to get modules')
            toast.remove(r)
        }
    }
  async function getModules(a,b){
    console.log(arguments)
    if(a == undefined){
        toast.error('No Subject Selected for Modules')
        return null
    }
    const r= toast.loading('loading modules....')
    const {data,error} = await supabase.from('swot').select("*").match({'type':"module",'subject':a}).order('id',{ascending:true})
    if(data){
        toast.success('All Modules Loaded');
        toast.remove(r)
      setModules(data);
    }
    else if(data == []){
        toast.error('No Module Found');
        toast.remove(r)
    }
    else{
        toast.error('Oops Unable to Load Modules');
        toast.remove(r)
    }
  }


  async function setAsPsuedo(a,b){
    
    
    const {data,error} = await supabase.from('swot_groups').update({
      isPsuedo:b
    }).eq('id',a.id).select();

    if(data){
      getSelectedModules(a.parent_sub)
      toast.success('Successfully set as Psuedo')
    }else{}

  }


  async function getSubjects(){
   
    const {data,error} = await supabase.from('subjects').select("*").order('id',{ascending:true})
    if(data){
       
       
      setSubjects(data);
    }
    else if(data == []){
        toast.error('No Subject Found');
        
    }
    else{
        toast.error('Oops Unable to Load Modules');
      
    }
  }


  const updateOrAddOption = (index, value, key) => {
    setAddNewQuestion((prevState) => {
      const updatedOptions = [...prevState.options];
      // Check if the key exists in the sub-array, if not, add it
      if (!updatedOptions[index].hasOwnProperty(key)) {
        updatedOptions[index][key] = value;
      } else {
        // If the key exists, update its value
        updatedOptions[index][key] = value;
      }
      return {
        ...prevState,
        options: updatedOptions,
      };
    });
  };
  const updateOrAddOption2 = (index, value, key) => {
    setEditQuestionData((prevState) => {
      const updatedOptions = [...prevState.options];
      // Check if the key exists in the sub-array, if not, add it
      if (!updatedOptions[index].hasOwnProperty(key)) {
        updatedOptions[index][key] = value;
      } else {
        // If the key exists, update its value
        updatedOptions[index][key] = value;
      }
      return {
        ...prevState,
        options: updatedOptions,
      };
    });
  };
  async function getQuestions(a){
    const {data,error} = await supabase.from('swot_questions').select("*").match({'isActive':true ,'parent':a || modules[activeModule]?.id}).order('created_at',{ascending:true})
    if(data){
        toast.success('Loaded All Questions')
      setQuestions(data)
    }else{
        toast.error('Unable to load questions')
    }
  }

  async function addSubject(a){

    const r= toast.loading('loading subjects....');
    const {data,error} = await supabase.from('subjects').insert({
        title:a?.title
    }).select()

    if(data){
getSubjects();
toast.remove(r)
toast.success('All Subjects Loaded');


    }else{
        toast.remove(r)
        toast.error('Failed to Load Subjects');  
    }

}
  async function addModule(a,b,c){
console.log(arguments)
if(a == undefined){
    toast.error('Please fill all the data')
    return null
}
if(!a?.title){
    toast.error('Title Empty/Invalid')
    return null
}
if(b == undefined){
    toast.error('Subject not specified')
    return null
}
if(c == undefined){
    toast.error('Course not specified')
    return null
}
const r = toast.loading(`adding ${a?.title} to modules....`)

const {data,error} = await supabase.from('swot').insert({
    title:a?.title,
    description:a?.description,
    type:"module",
subject:b,
course:c
}).select()


if(data){
    toast.success('Added Successfully')
    toast.remove(r)
    
    getModules(b,c);
}else{
    toast.error('Error Adding module')
    toast.remove(r)    
}

  }
  async function deleteModule(a){

    const r = toast.loading(`Deleting Module`)
    const {error} = await supabase.from('swot').delete().eq('id',a);

    if(!error){
        toast.remove(r);
        getModules(subjects[activeSubject]?.id,courses[activeCourse]?.id)
        toast.success('Successfully Deleted')
    }
    else{
        toast.remove(r)
        toast.error("Error Deleting")
    }
  }


  async function deleteSubject(a){

    const r = toast.loading(`Deleting Subject`)
    const {error} = await supabase.from('subjects').delete().eq('id',a);

    if(!error){
        toast.remove(r);
        getSubjects();
        toast.success('Successfully Deleted')
    }
    else{
        toast.remove(r)
        toast.error("Error Deleting")
    }
  }

  async function deleteQuestion(a){

    const r = toast.loading(`Deleting Subject`)
    const {error} = await supabase.from('swot_questions').delete().eq('id',a);

    if(!error){
        toast.remove(r);
        getQuestions(modules[activeModule]?.id);
        toast.success('Successfully Deleted')
    }
    else{
        toast.remove(r)
        toast.error("Error Deleting")
    }
  }

  async function getTests(){

    const {data,error} = await supabase.from('swot_test').select("*");

    if(data){
        toast.success('Tests have been successfully loaded')
        setTests(data)
    }else{
        toast.error('Error loading tests.')
    }

  }

useEffect(()=>{
    getCourses();getSubjects();
    getTests();

},[])
async function addTest(a){

    const r= toast.loading('Adding Test....')
    const {data,error} = await supabase.from('swot_test').insert({
        title:a?.title,
        course:a?.course,
        description:a?.description,
        image:a?.image || null
    }).select();

    if(data){
        toast.remove(r);
        toast.success('Successfully Added Test')
        getTests()
    }
    else{
        toast.error(`Error Adding Test : ${error && error?.code == 23505?  'You cannot add more than 1 test to a course':''}`)
        toast.remove(r)
    }

}





async function updateTest(a,b){

    const r= toast.loading('Updating Test....')
    const {data,error} = await supabase.from('swot_test').update({
        title:a?.title,
        course:a?.course,
        description:a?.description,
        image:a?.image || null
    }).eq('id',b).select();

    if(data){
        toast.remove(r);
        toast.success('Successfully Updated Test')
        getTests()
    }
    else{
        toast.error('Error Updating Test')
        toast.remove(r)
    }

}

async function addQuestion(a){

    const {data,error} = await supabase.from('swot_questions').insert({
        question:addNewQuestion?.question,
        title:addNewQuestion?.title,
        type:addNewQuestion.type == false ? "options":"input",
        video:addNewQuestion?.video || "",
        explanation : addNewQuestion?.explanation || "",
        correct : addNewQuestion.type == true ? 0 :addNewQuestion?.correct || 0,
        isActive:true,
        slug:a+"aiex",
        answerimage:addNewQuestion?.answerimage || "",
        questionimage:addNewQuestion?.questionimage || "",
        options:addNewQuestion?.options,
        parent:a,
        hint:addNewQuestion?.hint || "",
        explanation:addNewQuestion?.explanation || "",
        explanationimage:addNewQuestion?.explanationimage || '',
        equation:latex || ''
    }).select();

if(data){
    toast.success('Question has been successfuly added')
    getQuestions(a);
    setQuestionModal(false);
    setAddNewQuestion();
}

else{
    toast.error('Error Adding Question')
}

}
async function getData(table,select,key,value,handler,handler2){
    const {data,error} = await supabase.from(table).select(select || "*").eq(key,value).order('created_at',{ascending:true});
    if(data != undefined){
handler(data)
    }
    else{
      handler2({errortext:"Unable to Fetch",errormsg:error})
    }
  }

  async function updateData(table,dataToInsert,value,hand,hand2){
    const {data,error} = await supabase.from(table).update(dataToInsert).eq('id',value).select();
    if(data != undefined){
hand(data)
    }
    else{
      hand2({errortext:"Unable to Fetch",errormsg:error})
    }
  }


function extractSubject(a){
    const z = subjects.filter(item=>item.id ==a )[0]
    return z.title
}
function extractModule(a){
    const z= modules.filter(item=>item.id == a)[0]
    
    return  z?.title
}
async function addToTest(a,b){

    const {data,error} = await supabase.from('swot_groups').insert({
        test:b,
        subject:a,
        type:'subject'
    }).select()

    if(data){
        toast.success('successfully added to test');
        getSelectedSubjects(b);
    }

    else{
        toast.error('error adding to Test')
    }
}
async function addModuletoTest(a,b){

    const {data,error} = await supabase.from('swot_groups').insert({
        parent_sub:a,
        module:b,
        type:'module'
    }).select()

    if(data){
        toast.success('successfully added to test');
       getSelectedModules(a)
    }

    else{
        toast.error('error adding to Test')
    }
}
async function removeFromTest(a,b){

    const {error} = await supabase.from('swot_groups').delete().eq('id',a);
    if(!error){
        toast.success('Removed the Subject');
        getSelectedSubjects(b)
    }else{
        toast.error('Error Removing Subject')
    }
}
async function removeFromModule(a,b){

    const {error} = await supabase.from('swot_groups').delete().eq('id',a);
    if(!error){
        toast.success('Removed the Subject');
       getSelectedModules(b)
    }else{
        toast.error('Error Removing Subject')
    }
}

async function updateModule(a,b){

const {data,error} =await supabase.from('swot').update({
title:a?.title,
description:a?.description,
image:a?.image,


}).eq('id',b).select();

if(data){
    getModules(a?.subject)
toast.error('updated module')
}
else{
    toast.error('unable to update module')
}

}


function filterModules(a) {
  if (selectedModules == undefined || selectedModules?.length == 0) {
    return a;
  }
  
  if (selectedModules != undefined && selectedModules?.length > 0) {
    // Filter out modules that have matching IDs in selectedModules
    return a.filter(itemA => !selectedModules.some(module => module.module === itemA.id));
  }
}
function filterSubjects(a) {
  if (selectedsubjects == undefined || selectedsubjects?.length == 0) {
    return a;
  }
  
  if (selectedsubjects != undefined && selectedsubjects?.length > 0) {
    // Filter out modules that have matching IDs in selectedModules
    return a.filter(itemA => !selectedsubjects.some(subject => subject.subject === itemA.id));
  }
}
    return <div className="text-left sf">
        {views > 0 ? 
        <Button size="sm" color="primary" className="text-white my-2"  onPress={()=>{setViews(res=>res-1)}}>{"< "}Go Back </Button>:''}
      
<h2 className="w-full text-left font-bold text-2xl ">{headings[views] || ''}</h2>
<h4 className="w-full text-left text-gray-500 font-normal text-sm ">{descriptions[views] || ''}</h4>
{/* Course Selector */}

{views == 0 && tests != undefined ? 
<div className="flex flex-col mt-4">
    {tests && tests?.length ==0 ? 'No Test Found , Please try adding one':''}
{tests && tests.map((i,d)=>{
    return <div className="w-full rounded-md border-1 border-gray-100 flex flex-row justify-between py-2 px-2 shadow-sm items-center my-1">
       <div className="flex flex-col text-left">
        <p>{i?.title}</p> 
        <p className="text-sm text-gray-500">{i?.description}</p></div>
    <div className="flex flex-row">
   <Popover onOpenChange={(e)=>{e == true ? setEditTest(i):''}}>
    <PopoverTrigger>
    <Button size="sm" className="ml-2" color="success" >Edit Test</Button> 
    </PopoverTrigger>
    
    
    <PopoverContent className="sf min-w-[300px] p-3 flex flex-col justify-start items-start">
<Input value={editTest?.title} label="Test Title" placeholder="Enter Test Title" onChange={(e)=>{setEditTest(res=>({...res,title:e.target.value}))}}></Input>
<Input value={editTest?.description} className="my-2" label="Test Description" placeholder="Enter Test Description" onChange={(e)=>{setEditTest(res=>({...res,description:e.target.value}))}}></Input>
    <p>Image(optional)</p>
    <ImageUploader data={{image:editTest?.image}} onUploadComplete={(e)=>{setEditTest(res=>({...res,image:e}))}}></ImageUploader>
    <Select className="sf"
     label="Select a Course" 
     selectedKeys={[editTest?.course?.toString()]}
     onChange={(e)=>{setEditTest(res=>({...res,course:e.target.value}))}}
     >
    {courses && courses.map((coursez) => (
          <SelectItem key={coursez.id} value={coursez.id}>
            {coursez.title}
          </SelectItem>
          
        ))}
    </Select>
<Button className="mt-2 text-white" color="primary" size="sm" onPress={(e)=>{updateTest(editTest,i?.id)}}>Update Test</Button>
    </PopoverContent>


      </Popover> 
    <Button size="sm" className="ml-2 text-white" color="primary" onPress={()=>{setViews(1),setActiveCourse(d),getSelectedSubjects(i.id)}}>Select Test</Button></div>
    </div>
})}
<Popover>
    <PopoverTrigger>
<Button className="w-auto mr-auto my-4 text-white" color="primary" size="sm"  onPress={()=>{courses? '':toast.error('Courses are not loaded , please try refresing')}}>Add a Test</Button></PopoverTrigger>
<PopoverContent className="sf">
    <Input className="my-2" label="Test Title" placeholder="Enter Test Title" onChange={(e)=>{setTestData(res=>({...res,title:e.target.value}))}}></Input>
    <Input className="my-2" label="Test Description" placeholder="Enter Test Description" onChange={(e)=>{setTestData(res=>({...res,description:e.target.value}))}}></Input>
    <p>Image(optional)</p>
    <ImageUploader data={{image:testData?.image}} onUploadComplete={(e)=>{setTestData(res=>({...res,image:e}))}}></ImageUploader>
    <Select className="sf"
     label="Select a Course" 
     onChange={(e)=>{setTestData(res=>({...res,course:e.target.value}))}}
    >
    {courses && courses.map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.title}
          </SelectItem>
          
        ))}
    </Select>
    <Button color="primary" className="mt-2 text-white" onPress={()=>{addTest(testData)}}>Add Test</Button>
</PopoverContent>
</Popover>
</div>:''}

{/* Module Selector */}
{views == 1 && activeCourse != undefined && subjects != undefined ? 
<div>

    <div className="bg-gray-200 rounded-md p-3 mb-4">
        <h2>Selected Subjects</h2>
{selectedsubjects && selectedsubjects.map((i,d)=>{
    return <div className="flex flex-row w-full justify-between bg-white border-1 rounded-md p-2 items-center align-middle">
        <div className="flex flex-col">
            <p>{extractSubject(i?.subject)}</p>
            
        </div>
        <div className="flex flex-row">
        <Button className="ml-2 text-white" color="primary" size="sm" onPress={()=>{setViews(2),setActiveSubject(subjects.findIndex(item => item.id === i.subject)),setActiveSelectedSub(i.id),getSelectedModules(i?.id),getModules(i?.subject,courses[activeCourse]?.id)}}>Manage Modules</Button>
        <Button className="ml-2 text-white" onPress={()=>{removeFromTest(i?.id,i?.test)}} color="danger" size="sm">Remove from Test</Button></div>
    </div>
})}
{selectedsubjects && selectedsubjects?.length ==0 ?<p>No Subject found in this Test</p> :''}</div>
<h2>List of Subjects</h2>
{subjects && filterSubjects(subjects).map((i,d)=>{
    return <div className="w-full rounded-md border-1 border-gray-200 flex flex-row justify-between p-1 px-2 shadow-md items-center my-2"><p>{i?.title}</p> 
    <div className="flex flex-row">
    <Button size="sm" className="text-white" color="primary" onClick={()=>{addToTest(i?.id,tests[activeCourse]?.id)}}>Add to Test</Button>
    <Button className="ml-2" size="sm" color="danger" onClick={()=>{deleteSubject(i?.id)}}>Delete</Button>
    </div>
    </div>
})}

<Popover>
    <PopoverTrigger>
<div className="w-full rounded-md border-1 border-gray-200 border-dashed flex flex-row justify-between p-2 px-2 bg-gray-50 items-center my-2"> Add a Subject

    </div></PopoverTrigger>

    <PopoverContent className="sf p-2 text-left flex flex-col justify-start items-start align-top">
<Input label="Subject Title" placeholder="Enter Subject Title" size="sm" onChange={(e)=>{setSubjectData(res=>({...res,title:e.target.value}))}}></Input>
<Button color="primary" className="my-2 text-white" size="sm" onPress={()=>{addSubject(subjectData)}}>Add Subject</Button>
    </PopoverContent>
    </Popover> 


</div>


:""}
{views == 2 && activeCourse != undefined && modules != undefined ? 
<div>
    
<h2>Selected Modules</h2>
<div className="w-full p-3 rounded-md border-1 border-gray-100 bg-gray-100 mb-6 shadow-md">
{selectedModules && selectedModules.map((i,d)=>{
    return <div className="flex flex-row w-full justify-between bg-white border-1 rounded-md p-2 items-center align-middle">
        <div className="flex flex-col">
            <p>{extractModule(i?.module)}</p>
            
        </div>
        <div className="flex flex-row">
        {/* <Button className="ml-2" color="primary" size="sm" onPress={()=>{setViews(2),setActiveSubject(d),getModules(i?.id,courses[activeCourse]?.id)}}>Manage Modules</Button> */}
        <Button size="sm" color="primary" className="ml-1 text-white" onClick={()=>{getQuestions(i?.module),setViews(3),setActiveModule(modules.findIndex(item => item.id === i.module))}}>Manage Questions</Button>
        
        <Button className="ml-2" onPress={()=>{removeFromModule(i?.id,i?.parent_sub)}} color="danger" size="sm">Remove from Test</Button>
        
        <Switch className="ml-2" isSelected={i?.isPsuedo} onValueChange={(e)=>{setAsPsuedo(i,e)}}></Switch>
        </div>
    </div>
})}

{selectedModules && selectedModules?.length == 0 ? <p className="text-center">No Module Selected</p>:''}
</div>
<h2>List of Modules</h2>
{modules && filterModules(modules).map((i,d)=>{
    return <div className="w-full rounded-md border-1 border-gray-200 flex flex-row justify-between p-1 px-2 shadow-md items-center my-2"><p>{i?.title}</p> 
   <div>
    <Button size="sm" color="primary" className="ml-1 text-white" onClick={()=>{addModuletoTest(activeSelectedSub,i?.id)}}>Add Module to Test</Button>
    <Button size="sm" color="primary" className="ml-1 text-white" onClick={()=>{getQuestions(i?.id),console.log(i),setViews(3),setActiveModule(modules.findIndex(item => item.id === i.id))}}>Manage Questions</Button>
    {role == "admin" ? <>
    <Popover onOpenChange={(e)=>{e == true ? setEditModule(i):''}}><PopoverTrigger>
    <Button size="sm" color="success" className="ml-1" >Edit</Button></PopoverTrigger>
    <PopoverContent>

    <Input value={editModule?.title} className="my-1" label="Module Title" placeholder="Enter Module Title" size="sm" onChange={(e)=>{setEditModule(res=>({...res,title:e.target.value}))}}></Input>
<Input value={editModule?.description} className="my-1" label="Module Description" placeholder="Enter Module Description" size="sm" onChange={(e)=>{setEditModule(res=>({...res,description:e.target.value}))}}></Input>
<Button color="primary" className="my-2" size="sm" onPress={()=>{updateModule(editModule,i?.id)}}>Update Module</Button>

    </PopoverContent>
    </Popover>
    <Button size="sm" color="danger" className="ml-1" onClick={()=>{deleteModule(i?.id)}}>Delete</Button>
    </>:''}
    </div>
    </div>
})}
<Popover>
    <PopoverTrigger>
<div className="w-full rounded-md border-1 border-gray-200 border-dashed flex flex-row justify-between p-2 px-2 bg-gray-50 items-center my-2"> Add a Module 
to {subjects[activeSubject]?.title} of {courses[activeCourse]?.title}
    </div></PopoverTrigger>

    <PopoverContent className="sf">
<Input className="my-1" label="Module Title" placeholder="Enter Module Title" size="sm" onChange={(e)=>{setModuleData(res=>({...res,title:e.target.value}))}}></Input>
<Input className="my-1" label="Module Description" placeholder="Enter Module Description" size="sm" onChange={(e)=>{setModuleData(res=>({...res,description:e.target.value}))}}></Input>
<Button color="primary" className="my-2 text-white" size="sm" onPress={()=>{addModule(moduleData,subjects[activeSubject].id,courses[activeCourse]?.id)}}>Add Module</Button>
    </PopoverContent>
    </Popover>  
</div>
:''}

{views == 3 && activeCourse != undefined && modules != undefined && activeModule != undefined ? 
<div>

{questions != undefined && questions.map((i,d)=>{

    return <div className="p-3 shadow-md flex flex-row justify-between items-center align-middle rounded-md my-2 border-1 border-gray-100">
        <p>Question {d+1}</p>
        {role == "admin" ? <div className="flex flex-row ">
            <Button className="ml-2" color="success" size="sm" onPress={()=>{
             setQuestionModal(true),   setEditMode(true),getData('swot_questions','*','id',i.id,(e)=>{setEditQuestionData(e[0])})
            }}>Edit Question</Button>
            <Button className="ml-2" color="danger" size="sm" onPress={()=>{deleteQuestion(i?.id)}}>Delete Question</Button>
        </div>:''}
        </div>
})}


{role == "admin" ?

 <div className="w-full cursor-pointer border-dashed border-1 rounded-md border-gray-200 p-2" onClick={()=>{setQuestionModal(true)}}>
    Add a Question
    </div>
: ''}
</div>
:''}



{/* QUestions Modal */}


<Modal scrollBehavior={"outside"} isDismissable={false} size='3xl' className="flex mdl flex-col gap-1 text-center items-center" onClose={()=>{setQuestionModal(false),setEditMode(),setEditQuestionData()}} placement="bottom-center"  isOpen={questionModal} >
<ModalContent className='sf'>
  {(onClose) => 
  (<>
  <ModalBody className='w-full mt-5'>

{editMode == true ? <>
{editQuestionData != undefined ? <div>
<Button className='mr-auto text-white' color='primary' onPress={()=>{setEditMode(false),setEditQuestionData()}}>Back to Questions</Button>

</div>:''}
</>:<>
{/* {questions == undefined || questions?.length == 0 ? <div className='p-2 border-1 border-gray-300 rounded-xl w-auto'>No Question Found, Add</div>:<div className='text-left font-bold'>All Questions in this Level</div>} */}

{questions != undefined && questions.map((i,d)=>{
  return <div className='w-full text-left flex flex-row align-middle justify-start items-center'><h2 className='font-bold'>{d+1}){i.title}</h2> <p onClick={()=>{setEditMode(true),getData('swot_questions','*','id',i.id,(e)=>{setEditQuestionData(e[0])})}} className="rounded-full bg-blue-300 font-medium text-xs mx-1 ml-3 cursor-pointer px-2 py-0.5">Edit Question</p> </div>
})}</>}
  </ModalBody>
  <ModalFooter className='text-left justify-start flex flex-col w-full'>

  {editMode == true && editQuestionData != undefined ? <div key={editQuestionData.id}>
  
    <Input label="Question Title" placeholder='Enter Title' value={editQuestionData?.title || ""} onChange={(e)=>{setEditQuestionData(res=>({...res,title:e.target.value}))}}></Input>
    <h2>Question Content</h2>
    <QuillWarapper value={editQuestionData?.question} onChange={(e)=>{setEditQuestionData(res=>({...res,question:e}))}}></QuillWarapper>
    {/* <CustomEditor label="Question Title" placeholder='Enter Question Title' data={editQuestionData?.question} value={editQuestionData?.question || ""} onChange={(e)=>{setEditQuestionData(res=>({...res,question:e}))}}></CustomEditor> */}

    <h2>Question Image (if any)</h2>
    <ImageUploader data={{image:editQuestionData?.questionimage}} size="small" onUploadComplete={(e)=>{setEditQuestionData(res=>({...res,questionimage:e}))}}></ImageUploader>
    <Input label="Video(optional)" placeholder='Enter YT Embed or Video URL' value={editQuestionData?.video || ""} onChange={(e)=>{setEditQuestionData(res=>({...res,video:e.target.value}))}}>
      
    </Input>
    <Popover><PopoverTrigger>
    <Button isDisabled={editQuestionData?.video != undefined && editQuestionData?.video?.length > 2 ? false : true} className='w-auto mr-auto text-white' color='primary'><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.5 9.38455V14.6162C9.5 15.1858 10.1099 15.5475 10.6097 15.2743L15.3959 12.6582C15.9163 12.3737 15.9162 11.6263 15.3958 11.3419L10.6097 8.72641C10.1099 8.45328 9.5 8.81499 9.5 9.38455ZM5.25 3C3.45507 3 2 4.45507 2 6.25V17.75C2 19.5449 3.45507 21 5.25 21H18.75C20.5449 21 22 19.5449 22 17.75V6.25C22 4.45507 20.5449 3 18.75 3H5.25ZM3.5 6.25C3.5 5.2835 4.2835 4.5 5.25 4.5H18.75C19.7165 4.5 20.5 5.2835 20.5 6.25V17.75C20.5 18.7165 19.7165 19.5 18.75 19.5H5.25C4.2835 19.5 3.5 18.7165 3.5 17.75V6.25Z" fill="currentColor"/>
</svg>
Preview Video</Button></PopoverTrigger>
<PopoverContent>
  {editQuestionData?.video != undefined ? 
  <iframe
  width="560"
  height="315"
  src={editQuestionData?.video}
  frameborder="0"
  allowfullscreen
></iframe>
  :''}
</PopoverContent>
</Popover>

   

   {editQuestionData?.type == "options"? <><h2>Options/Correct Answer</h2>
   {editQuestionData != undefined && editQuestionData?.options?.map((i,d)=>{
    return <div className='flex flex-col my-5 border-1 border-gray-300 p-5 rounded-xl'>
      <h2 className='font-bold text-xl'>Option Number {d}</h2>
    <div className='flex flex-row flex-wrap'><Switch isSelected={editQuestionData?.options[d]?.isCorrect} onValueChange={(e)=>{updateOrAddOption2(d,e,'isCorrect')}}></Switch>
   <div className='max-w-[200px] w-full border-1 border-gray-200 rounded-xl max-h-[90px] my-5 h-full flex overflow-hidden' >
   <ImageUploader data={{image:i?.image}}  size="small" onUploadComplete={(e)=>{updateOrAddOption2(d,e,'image')}}></ImageUploader></div>
    <Input label={`Option ${d+1}`} placeholder={`Enter Option ${d+1} Text`} value={i?.title} onChange={(e)=>{updateOrAddOption2(d,e.target.value,'title')}}>
      
      </Input>
    </div>
    <h2>Popup Image (Win/Lose Image)</h2>
    <ImageUploader data={{image:editQuestionData?.options[d]?.popupimage}} size="small" onUploadComplete={(e)=>{updateOrAddOption2(d,e,'popupimage')}}></ImageUploader>
    <Popover>
      <PopoverTrigger>
    <Button size="sm" color="primary" className="text-white mr-auto">Select from Uploads</Button>
    </PopoverTrigger>
    <PopoverContent>
      {editQuestionData?.options && editQuestionData?.options?.filter(item=>item.popupimage).map((v,z)=>{
return <div className=" aspect-square w-[120px] rounded-lg"><img src={v.popupimage}/><Button size="sm" color="primary" onPress={()=>{updateOrAddOption2(d,v.popupimage,'popupimage')}}>Select this</Button></div>
      })}
    </PopoverContent>
    </Popover>
    <h2>Popup Text</h2>
    <QuillWarapper value={editQuestionData?.options[d]?.text || "<strong>Write your Win/Lose Here...</strong>"} onChange={(e)=>{updateOrAddOption2(d,e,'text')}}></QuillWarapper>
  {/*   <CustomEditor 
    data={editQuestionData?.options[d]?.text || "<strong>Write your Win/Lose Here...</strong>"} value={editQuestionData?.options[d]?.text || ""} onChange={(e)=>{updateOrAddOption2(d,e,'text')}}
    ></CustomEditor> */}
    
    </div>
   })}</> :
   <><h2>Correct Answer Text</h2>
   <Input label="Answer" placeholder='Enter Correct Answer Text' value={editQuestionData?.options?.answer || ""} onChange={(e)=>{setEditQuestionData(res => ({
  ...res,
  options: { ...res.options, answer: e.target.value }
}));}}>
      
      </Input>
      <h2>Enter Winning Text</h2>
      <QuillWarapper value={editQuestionData?.options?.wintext || "<p>Your Win Text Here</p>"} onChange={(e)=>{setEditQuestionData(res => ({
  ...res,
  options: { ...res.options, wintext: e }
}));}}></QuillWarapper>
     {/*  <CustomEditor data={editQuestionData?.options?.losetext || "<p>Your Win Text Here</p>"} value={editQuestionData?.options?.wintext || ""} onChange={(e)=>{setEditQuestionData(res => ({
  ...res,
  options: { ...res.options, wintext: e }
}));}}>
      
      </CustomEditor> */}


      <h2>Enter Lose Text</h2>
      <QuillWarapper value={editQuestionData?.options?.losetext || "<p>Your Lose Text Here</p>"} onChange={(e)=>{setEditQuestionData(res => ({
  ...res,
  options: { ...res.options, losetext: e }
}));}}></QuillWarapper>
     {/*  <CustomEditor data={editQuestionData?.options?.losetext || "<p>Your Lose Text Here</p>"} value={editQuestionData?.options?.losetext || ""} onChange={(e)=>{setEditQuestionData(res => ({
  ...res,
  options: { ...res.options, losetext: e }
}));}}>
      
      </CustomEditor>
 */}
   </>
   }
   
    
    {/* <h2>Explanation Image (if any)</h2>
    <ImageUploader size="small" onUploadComplete={(e)=>{setAddNewQuestion(res=>({...res,answerimage:e}))}}></ImageUploader> */}
    <Divider className='my-5'></Divider>
    <h2>Explanation</h2>
    
    <h2>Explanation Image</h2>
    <ImageUploader size="small" data={{image:editQuestionData?.explanationimage}} onUploadComplete={(e)=>{setEditQuestionData(res=>({...res,explanationimage:e}))}}></ImageUploader>
    <h2>Explanation Maths</h2>
   <div className='h-auto'> {editlatex == true ? 
     <EditableMathField mathquillDidMount={mathField => {
          editlatex == true ? mathField.focus() :''
        }} latex={editQuestionData?.equation} onChange={(mathField) => {
          setEditQuestionData(res=>({...res,equation:mathField.latex()}))
        }}></EditableMathField>:<div className='w-full pointer-events-none opacity-50'><StaticMathField className="w-full" latex={editQuestionData?.equation}></StaticMathField></div>}
        <Button color='primary' className="text-white" onClick={()=>{setEditLatext(!editlatex)}}>{editlatex ? 'Save Edit' : 'Edit Now'}</Button>
        </div>
    <h2>Hint</h2>
    <QuillWarapper value={editQuestionData?.hint || "<strong>Write your Hint Here...</strong>"} onChange={(e)=>{setEditQuestionData(res=>({...res,hint:e}))}}></QuillWarapper>
   {/*  <CustomEditor data={editQuestionData?.hint || "<strong>Write your Hint Here...</strong>"} value={editQuestionData?.hint || ""} onChange={(e)=>{setEditQuestionData(res=>({...res,hint:e}))}}></CustomEditor> */}
    <Button onClick={()=>{
      updateData('swot_questions',{
        question:editQuestionData?.question,
        title:editQuestionData?.title,
        
        video:editQuestionData?.video || "",
        explanation : editQuestionData?.explanation || "",
        
       
        
        answerimage:editQuestionData?.answerimage || "",
        questionimage:editQuestionData?.questionimage || "",
        options:editQuestionData?.options,
        
        hint:editQuestionData?.hint || "",
        explanation:editQuestionData?.explanation || "",
        explanationimage:editQuestionData?.explanationimage || '',
        equation:editQuestionData?.equation || ''

      },editQuestionData?.id,()=>{setEditMode(false),
        getData('swot_questions','*','parent',editQuestionData?.parent,(e)=>{setQuestions(e),setQuestionModal(false)},({errortext})=>{console.log(errortext)})
      },()=>{})
    }} className='text-left w-auto mr-auto mt-2 text-white' color='primary'>
 Update Question</Button>
  </div>:
  
  
  
  <>
    <Input label="Question Title" placeholder='Enter Title' value={addNewQuestion?.title || ""} onChange={(e)=>{setAddNewQuestion(res=>({...res,title:e.target.value}))}}></Input>
    <h2>Question Content</h2>
    <QuillWarapper value={addNewQuestion?.question} onChange={(e)=>{setAddNewQuestion(res=>({...res,question:e}))}}></QuillWarapper>

    <h2>Question Image (if any)</h2>
    <ImageUploader size="small" onUploadComplete={(e)=>{setAddNewQuestion(res=>({...res,questionimage:e}))}}></ImageUploader>
    <Input label="Video(optional)" placeholder='Enter YT Embed or Video URL' value={addNewQuestion?.video || ""} onChange={(e)=>{setAddNewQuestion(res=>({...res,video:e.target.value}))}}>
      
    </Input>
    <Popover><PopoverTrigger>
    <Button isDisabled={addNewQuestion?.video != undefined && addNewQuestion?.video?.length > 2 ? false : true} className='w-auto mr-auto text-white' color='primary'><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.5 9.38455V14.6162C9.5 15.1858 10.1099 15.5475 10.6097 15.2743L15.3959 12.6582C15.9163 12.3737 15.9162 11.6263 15.3958 11.3419L10.6097 8.72641C10.1099 8.45328 9.5 8.81499 9.5 9.38455ZM5.25 3C3.45507 3 2 4.45507 2 6.25V17.75C2 19.5449 3.45507 21 5.25 21H18.75C20.5449 21 22 19.5449 22 17.75V6.25C22 4.45507 20.5449 3 18.75 3H5.25ZM3.5 6.25C3.5 5.2835 4.2835 4.5 5.25 4.5H18.75C19.7165 4.5 20.5 5.2835 20.5 6.25V17.75C20.5 18.7165 19.7165 19.5 18.75 19.5H5.25C4.2835 19.5 3.5 18.7165 3.5 17.75V6.25Z" fill="currentColor"/>
</svg>
Preview Video</Button></PopoverTrigger>
<PopoverContent>
  {addNewQuestion?.video != undefined ? 
  <iframe
  width="560"
  height="315"
  src={addNewQuestion?.video}
  frameborder="0"
  allowfullscreen
></iframe>
  :''}
</PopoverContent>
</Popover>

   <h2>Type of Question (Options/Input)</h2>
   <Switch onValueChange={(e)=>{setAddNewQuestion(res=>({...res,type:e,options:e == false ? [{isCorrect:false},{isCorrect:false},{isCorrect:false},{isCorrect:false}]:setAddNewQuestion({})}))}}></Switch>

   {addNewQuestion?.type == false? <><h2>Options/Correct Answer</h2>
   {Array(4).fill().map((i,d)=>{
    return <div className='flex flex-col my-5 border-1 border-gray-300 p-5 rounded-xl'>
      <h2 className='font-bold text-xl'>Option Number {d}</h2>
    <div className='flex flex-row flex-wrap'><Switch isSelected={addNewQuestion?.options[d]?.isCorrect} onValueChange={(e)=>{updateOrAddOption(d,e,'isCorrect')}}></Switch>
   <div className='max-w-[200px] w-full border-1 border-gray-200 rounded-xl max-h-[90px] my-5 h-full flex overflow-hidden' >
   <ImageUploader  size="small" onUploadComplete={(e)=>{updateOrAddOption(d,e,'image')}}></ImageUploader></div>
    <Input label={`Option ${d+1}`} placeholder={`Enter Option ${d+1} Text`} onChange={(e)=>{updateOrAddOption(d,e.target.value,'title')}}>
      
      </Input>
    </div>
    <h2>Popup Image (Win/Lose Image)</h2>
    <ImageUploader data={{image:addNewQuestion?.options[d]?.popupimage}} size="small" onUploadComplete={(e)=>{updateOrAddOption(d,e,'popupimage')}}></ImageUploader>
    <Popover>
      <PopoverTrigger>
    <Button size="sm" color="primary" className="text-white mr-auto">Select from Uploads</Button>
    </PopoverTrigger>
    <PopoverContent>
      {addNewQuestion?.options && addNewQuestion?.options?.filter(item=>item.popupimage).map((v,z)=>{
return <div className=" aspect-square w-[120px] rounded-lg"><img src={v.popupimage}/><Button size="sm" onPress={()=>{updateOrAddOption(d,v.popupimage,'popupimage')}}>Select this</Button></div>
      })}
    </PopoverContent>
    </Popover>
    <h2>Popup Text</h2>

    <QuillWarapper value={addNewQuestion?.options[d]?.text || "<strong>Write your Win/Lose Here...</strong>"} onChange={(e)=>{updateOrAddOption(d,e,'text')}}></QuillWarapper>
   {/*  <CustomEditor 
    data={addNewQuestion?.options[d]?.text || "<strong>Write your Win/Lose Here...</strong>"} value={addNewQuestion?.options[d]?.text || ""} onChange={(e)=>{updateOrAddOption(d,e,'text')}}
    ></CustomEditor> */}
    
    </div>
   })}</> :
   <><h2>Correct Answer Text</h2>
   <Input label="Answer" placeholder='Enter Correct Answer Text' value={addNewQuestion?.options?.answer || ""} onChange={(e)=>{setAddNewQuestion(res => ({
  ...res,
  options: { ...res.options, answer: e.target.value }
}));}}>
      
      </Input>
      <h2>Enter Winning Text</h2>
      <QuillWarapper value={addNewQuestion?.options?.losetext || "<p>Your Win Text Here</p>"} onChange={(e)=>{setAddNewQuestion(res => ({
  ...res,
  options: { ...res.options, wintext: e }
}));}}></QuillWarapper>
     {/*  <CustomEditor data={addNewQuestion?.options?.losetext || "<p>Your Win Text Here</p>"} value={addNewQuestion?.options?.wintext || ""} onChange={(e)=>{setAddNewQuestion(res => ({
  ...res,
  options: { ...res.options, wintext: e }
}));}}>
      
      </CustomEditor> */}


      <h2>Enter Lose Text</h2>
      <QuillWarapper value={addNewQuestion?.options?.losetext || "<p>Your Lose Text Here</p>"} onChange={(e)=>{setAddNewQuestion(res => ({
  ...res,
  options: { ...res.options, losetext: e }
}));}}></QuillWarapper>
     {/*  <CustomEditor data={addNewQuestion?.options?.losetext || "<p>Your Lose Text Here</p>"} value={addNewQuestion?.options?.losetext || ""} onChange={(e)=>{setAddNewQuestion(res => ({
  ...res,
  options: { ...res.options, losetext: e }
}));}}>
      
      </CustomEditor> */}

   </>
   }
   
    
    {/* <h2>Explanation Image (if any)</h2>
    <ImageUploader size="small" onUploadComplete={(e)=>{setAddNewQuestion(res=>({...res,answerimage:e}))}}></ImageUploader> */}
    <Divider className='my-5'></Divider>
    <h2>Explanation</h2>
    <QuillWarapper value={addNewQuestion?.explanation || "<strong>Write your Explanation Here...</strong>"} onChange={(e)=>{setAddNewQuestion(res=>({...res,explanation:e}))}}></QuillWarapper>
    {/* <CustomEditor data={addNewQuestion?.explanation || "<strong>Write your Explanation Here...</strong>"} value={addNewQuestion?.explanation || ""} onChange={(e)=>{setAddNewQuestion(res=>({...res,explanation:e}))}}></CustomEditor> */}
    <h2>Explanation Image</h2>
    <ImageUploader size="small"  onUploadComplete={(e)=>{setAddNewQuestion(res=>({...res,explanationimage:e}))}}></ImageUploader>
    <h2>Explanation Maths</h2>
    {editlatex == true ? 
     <EditableMathField mathquillDidMount={mathField => {
          editlatex == true ? mathField.focus() :''
        }} latex={latex} onChange={(mathField) => {setLatex(mathField.latex())}}></EditableMathField>:<div className='w-full pointer-events-none opacity-50'><StaticMathField className="w-full" latex={latex}></StaticMathField></div>}
        <Button color='primary' className="text-white" onClick={()=>{setEditLatext(!editlatex)}}>{editlatex ? 'Save Edit' : 'Edit Now'}</Button>
        
    <h2>Hint</h2>
    <QuillWarapper value={addNewQuestion?.hint || "<strong>Write your Hint Here...</strong>"} onChange={(e)=>{setAddNewQuestion(res=>({...res,hint:e}))}}></QuillWarapper>
   {/*  <CustomEditor data={addNewQuestion?.hint || "<strong>Write your Hint Here...</strong>"} value={addNewQuestion?.hint || ""} onChange={(e)=>{setAddNewQuestion(res=>({...res,hint:e}))}}></CustomEditor> */}
    <Button onClick={()=>{addQuestion(modules[activeModule]?.id)}} className='text-left w-auto mr-auto text-white' color='primary'><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.7498 3C12.1295 3 12.4434 3.28201 12.4931 3.64808L12.5 3.74985L12.5012 11H19.7543C20.1685 11 20.5043 11.3358 20.5043 11.75C20.5043 12.1297 20.2221 12.4435 19.8561 12.4932L19.7543 12.5H12.5012L12.5032 19.7491C12.5033 20.1633 12.1676 20.4993 11.7534 20.4993C11.3737 20.4993 11.0598 20.2173 11.0101 19.8512L11.0032 19.7494L11.0012 12.5H3.7522C3.33798 12.5 3.0022 12.1642 3.0022 11.75C3.0022 11.3703 3.28435 11.0565 3.65043 11.0068L3.7522 11H11.0012L11 3.75015C10.9999 3.33594 11.3356 3 11.7498 3Z" fill="currentColor"/>
</svg>
 Add Question</Button>
 
 </>}

 </ModalFooter></>)}</ModalContent>
 </Modal>
 
 {/* End of Question Editor */}


    </div>
}

export default SWOTEditor;