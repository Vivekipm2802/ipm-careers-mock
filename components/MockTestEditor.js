import { supabase } from "@/utils/supabaseClient";
import { Button, DatePicker, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Popover, PopoverContent, PopoverTrigger, Select, SelectItem, Slider, Spacer, Switch } from "@nextui-org/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import ImageUploader from "./ImageUploader";
import _ from "lodash";
import CustomEditor from "@/components/CustomEditor";
import {  now, parseAbsoluteToLocal} from "@internationalized/date";
import {useDateFormatter} from "@react-aria/i18n";
import { useNMNContext } from "./NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import Link from "next/link";

const EditableMathField = dynamic(() => import('react-mathquill'), {
    ssr: false,
  });
  const StaticMathField = dynamic(() => import('react-mathquill'), {
    ssr: false,
  });

  const QuillWarapper = dynamic(() => import('@/components/QuillSSRWrapper'), {
    ssr: false,
  });
  
function MockTestEditor({userData,role}){
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
const [categories,setCategories] = useState();
const [activeSelectedSub,setActiveSelectedSub] = useState();
const [categoryData,setCategoryData] = useState();
const [optionsLength,setOptionsLength] = useState(4);
const [bgLoading,setBGLoading] = useState(false);
const [countLoading,setCountLoading] = useState(false)
const [subCount,setSubCount] = useState('....Loading');
const [currentSections,setCurrentSections] = useState()
const [currentModules,setCurrentModules] = useState();
const [currentQuestions,setCurrentQuestions] = useState();
const headings = ['Manage Mock Tests','Select a Subject/Section','Select a Module','Manage Questions'
]


const {setSideBar,setSideBarContent} = useNMNContext()

function getParsedDate(a){
if(a == null){
  return null
}
console.log(a)
  const d = new Date(a).toISOString()
  return parseAbsoluteToLocal(d);


}
const [editMode,setEditMode] = useState();
const descriptions = ['you must select a course for which you want to create mock test','','','Add,Update or Delete questions for the module you have selected']
async function getCourses(){
    const {data,error} = await supabase.from('courses').select("*").order('id',{ascending:true})
    if(data){
      setCourses(data);
    }
  }


  async function getMockResults(a){

    const {data,error} = await supabase.rpc('get_mock_results',{p_test_id:a})
    
  if(data){
    

    const content = <div className="flex p-4 flex-col items-start justify-start">
<h2 className="mb-4 text-lg font-semibold">Total Submissions : {data?.length}</h2>
<div className="flex flex-col overflow-auto w-full max-h-[80vh] pr-4">
      {data && data?.length > 0  && data?.map((i,d)=>{
        return <div className="flex border-1 p-2 rounded-lg mb-2 w-full text-sm flex-row items-center justify-between">
         <div className="mr-2 bg-primary-200 rounded-xl p-2 text-primary-800">
          {CtoLocal(i.created_at)?.time} {CtoLocal(i.created_at)?.amPm}
        </div>
        <div className="mr-2 bg-gray-200 rounded-xl p-2 text-gray-600">
          {CtoLocal(i.created_at)?.date} {CtoLocal(i.created_at)?.monthName} {CtoLocal(i.created_at)?.year}
        </div>
         <div className="flex flex-col items-start justify-start">
          <h2>{i?.name}</h2>
          <p className="text-xs text-gray-500">{i?.user}</p></div>
          <div className="flex-1 flex flex-row items-center justify-end">
          <p className="h-8 w-auto p-4 bg-lime-200 border-lime-500  rounded-lg flex flex-col items-center justify-center font-bold text-center text-lime-800">Score : {i?.score}</p>
          <Spacer x={2}></Spacer>
          <Button as={Link} href={`/mock/result/${i?.uid}`} target="_blank" size="sm" color="success" >Result</Button>
          <Spacer x={2}></Spacer>
          <Button as={Link} href={`/mock/analytics/${i?.uid}`} target="_blank" size="sm"  className="bg-gradient-purple text-white">Analytics</Button>
          </div>
        </div>
      })}</div>
    </div>

    setSideBar(true)
    setSideBarContent(content)
   
  }
  else{
   
   
  }
  }
  
  async function getSubmissionCount(a){
    setSubCount(true)
    const {data,error} = await supabase.rpc('count_mock_submissions',{test_id_value:a})
    if(data){
      setSubCount(data)
      setCountLoading(false)
    }else{
      setSubCount('Unable to Count')
      setCountLoading(false)
    }
  }
async function getSelectedSubjects(a){
const r= toast.loading('getting subjects')
    const {data,error} = await supabase.from('mock_groups').select("*").match({'type':'subject','test':a}).order('seq',{ascending:true})
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
async function getCategories(a){
    const r= toast.loading('getting categories')
        const {data,error} = await supabase.from('mock_categories').select("*")
        if(data){
            toast.success('loaded subjects')
            toast.remove(r)
    setCategories(data)
        }
        else{
    toast.error('failed to get categories')
            toast.remove(r)
        }
    }

const controls =[
    
    {
        type:"switch",
        key:"switch_section",
        default:true,
        label:'Allow Section Jumping'
    },
    {
        type:"switch",
        key:"switch_questions",
        default:true,
        label:'Allow Question Jumping'
    },
    {
      type:"switch",
      key:"calculator_allowed",
      default:false,
      label:'Allow Calculator Usage'
  },
  {
    type:"switch",
    key:"allow_retests",
    default:false,
    label:'Allow Multiple Test Attempts'
},

{
  type:"switch",
  key:"is_scientific",
  default:false,
  label:'Allow Scientific Calculator'
},
{
  type:"switch",
  key:"public_access",
  default:false,
  label:'Access Test via Link without Enroll'
},
{
  type:"switch",
  key:"send_email",
  default:false,
  label:'Send Email on Test Completiton'
},
    {
        type:"slider",
        key:"timeout",
        default:1800,
        label:'Total Test Time'
    },
    {
        type:"input",
        key:"timeout",
        default:1800,
        label:'Total Test Time (Manual)'
    },
    {
        type:"richtext",
        key:"instructions",
        default:"<p>Enter Instructions Here</p>",
        label:'Instructions for Test'
    },
    {
        type:"richtext",
        key:"instructions2",
        default:"<p>Enter Second Page Instruction</p>",
        label:'Instructions for Page 2'
    }
    
]

async function getSelectedModules(a){
    const r= toast.loading('getting modules')
        const {data,error} = await supabase.from('mock_groups').select("*").match({'type':'module','parent_sub':a}).order('created_at',{ascending:true})
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
    const {data,error} = await supabase.from('mock').select("*").match({'type':"module",'subject':a}).order('id',{ascending:true})
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
    
    
    const {data,error} = await supabase.from('mock_groups').update({
      isPsuedo:b
    }).eq('id',a.id).select();

    if(data){
      getSelectedModules(a.parent_sub)
      toast.success('Successfully set as Psuedo')
    }else{}

  }


  async function getSubjects(){
   
    const {data,error} = await supabase.from('mock_subjects').select("*").order('id',{ascending:true})
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
    const {data,error} = await supabase.from('mock_questions').select("*").match({'isActive':true ,'parent':a || modules[activeModule]?.id}).order('seq',{ascending:true})
    if(data){
        toast.success('Loaded All Questions')
      setQuestions(data)
    }else{
        toast.error('Unable to load questions')
    }
  }
async function handleLoadSideBar(a){
  getMockResults(a)
  
}
 
  async function updateOrder(a,b){

   
    setBGLoading(true)
    const {data,error} = await supabase.from('mock_questions').update({seq:a}).eq('id',b).select()
    if(data){
        toast.success('Updated Sequence')
        setBGLoading(false)
      getQuestions(modules[activeModule]?.id)
    }else{
       setBGLoading(false)
    }
  }
  async function updateSectionOrder(a,b,c){

   
    setBGLoading(true)
    const {data,error} = await supabase.from('mock_groups').update({seq:a}).eq('id',b).select()
    if(data){
        toast.success('Updated Sequence')
        setBGLoading(false)
      getSelectedSubjects(c)
    }else{
       setBGLoading(false)
    }
  }
  async function updateSectionTime(a,b,c){

   
    setBGLoading(true)
    const {data,error} = await supabase.from('mock_groups').update({time:a}).eq('id',b).select()
    if(data){
        toast.success('Updated Time')
        setBGLoading(false)
      getSelectedSubjects(c)
    }else{
       setBGLoading(false)
    }
  }
  async function addSubject(a,b){

    const r= toast.loading('loading subjects....');
    const {data,error} = await supabase.from('mock_subjects').insert({
        title:a?.title,
        label:a?.label ?? b
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

async function addCategory(a){
if(a == null || a?.length < 2){
toast.error('Undefined or Short category title')
    return null
}
    const r= toast.loading('adding category....');
    const {data,error} = await supabase.from('mock_categories').insert({
        title:a
    }).select()

    if(data){
getCategories()
toast.remove(r)
toast.success('Added Category');


    }else{
        toast.remove(r)
        toast.error('Failed to Add Category');  
    }

}
  async function addModule(a,b,c){


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

const {data,error} = await supabase.from('mock').insert({
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

function getSubjectIndex(a){

  return tests.findIndex(item=>item.id == a)
}

  async function deleteModule(a){

    const r = toast.loading(`Deleting Module`)
    const {error} = await supabase.from('mock').delete().eq('id',a);

    if(!error){
        toast.remove(r);
        getModules(subjects[activeSubject]?.id,courses[getSubjectIndex(activeCourse)]?.id)
        toast.success('Successfully Deleted')
    }
    else{
        toast.remove(r)
        toast.error("Error Deleting")
    }
  }


  async function deleteSubject(a){

    const r = toast.loading(`Deleting Subject`)
    const {error} = await supabase.from('mock_subjects').delete().eq('id',a);

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
    const {error} = await supabase.from('mock_questions').delete().eq('id',a);

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

    const {data,error} = await supabase.from('mock_test').select("*");

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
    getCategories();

},[])
async function addTest(a,b){

    const r= toast.loading('Adding Test....')
    const {data,error} = await supabase.from('mock_test').insert({
        title:a?.title,
        course:a?.course,
        description:a?.description,
        image:a?.image || null,
        category:b,
        config:controls.reduce((acc, control) => {
            acc[control.key] = a[control.key] ?? control.default;
            return acc;
        }, {})
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

async function deleteTest(a){

    const r= toast.loading('Adding Test....')
    const {error} = await supabase.from('mock_test').delete().eq('id',a);

    if(!error){
        toast.remove(r);
        toast.success('Successfully Deleted Test')
        getTests()
    }
    else{
       
        toast.remove(r)
    }

}



async function updateTest(a,b){

    const r= toast.loading('Updating Test....')
    const {data,error} = await supabase.from('mock_test').update({
        title:a?.title,
        course:a?.course,
        description:a?.description,
        image:a?.image || null,
        category:a?.category,
        start_time:a?.start_time,
        end_time:a?.end_time,
        config:controls.reduce((acc, control) => {
            acc[control.key] = a?.config[control.key] ?? control.default;
            return acc;
        }, {})
    }
            
    ).eq('id',b).select();

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

    const {data,error} = await supabase.from('mock_questions').insert({
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
function extractLabel(a){
  const z = subjects.filter(item=>item.id ==a )[0]
  return z.label
}
function extractModule(a){
    const z= modules.filter(item=>item.id == a)[0]
    
    return  z?.title
}
async function addToTest(a,b){

    const {data,error} = await supabase.from('mock_groups').insert({
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

    const {data,error} = await supabase.from('mock_groups').insert({
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

    const {error} = await supabase.from('mock_groups').delete().eq('id',a);
    if(!error){
        toast.success('Removed the Subject');
        getSelectedSubjects(b)
    }else{
        toast.error('Error Removing Subject')
    }
}
async function removeFromModule(a,b){

    const {error} = await supabase.from('mock_groups').delete().eq('id',a);
    if(!error){
        toast.success('Removed the Subject');
       getSelectedModules(b)
    }else{
        toast.error('Error Removing Subject')
    }
}

async function updateModule(a,b){

const {data,error} =await supabase.from('mock').update({
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

async function updateMarking(a,b,c){

  const {data,error} = await supabase.from('mock_groups').update({

    ...(b == "pos" ? {pos:a}:{}),
...(b == "neg" ? {neg:a}:{})
  }).eq('id',c).select();
  if(data){
getSelectedSubjects(tests[getSubjectIndex(activeCourse)].id)
  }
  if(error){
    toast.error('Unable to Update')
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
    return <div className="text-left sf w-full flex h-full flex-col overflow-hidden">
        {views > 0 ? 
        <div className="flex flex-row items-center justify-start"><Button size="sm" color="primary" className="text-white my-2"  onPress={()=>{setViews(res=>res-1)}}>{"< "}Go Back </Button></div>:''}
      
<h2 className="w-full text-left font-bold text-2xl ">{headings[views] || ''}</h2>

<h4 className="w-full text-left text-gray-500 font-normal text-sm ">{descriptions[views] || ''}</h4>
{/* Course Selector */}

{views == 0 && tests != undefined ? 
<div className="pr-2 mt-4 overflow-y-auto">
   
<h2 className="font-bold text-lg">Categories</h2>
{categories && categories?.length ==0 ? 'No Category Found , Please try adding one':''}
<Popover><PopoverTrigger>
<Button className="mr-auto" size="sm" color="primary">Add a Category</Button>
</PopoverTrigger>
<PopoverContent className="p-2">
    <Input value={categoryData?.title} size="sm" placeholder="Category Title" label="Title" onChange={(e)=>{setCategoryData(res=>({...res,title:e.target.value}))}}></Input>
    <Button size="sm" color="primary" className="mr-auto mt-2" onPress={()=>{addCategory(categoryData?.title)}}>Add Category</Button>
</PopoverContent>
</Popover>

{tests && tests?.length ==0 ? 'No Test Found , Please try adding one':''}
<Spacer y={4} x={4}></Spacer>
{categories && categories?.map((z,v)=>{
    return <><div className="font-sans font-medium">{z.title}</div>
    <Divider className="my-1"></Divider>
    {tests == undefined ||  tests?.filter(item=>item.category == z.id) == 0? <div className="rounded-xl border-gray-300 border-1 text-gray-600 my-2 p-2 text-center bg-gray-50">No Test Found in this Category</div>:''}
    {tests && tests?.filter(item=>item.category == z.id)?.map((i,d)=>{
    return <div className="w-full rounded-md border-1 border-gray-100 flex flex-row justify-between py-2 px-2 shadow-sm items-center my-1">
       <div className="flex flex-col text-left">
        <p>{i?.title}</p> 
        <p className="text-sm text-gray-500">{i?.description}</p></div>
    <div className="flex flex-row">
   <Popover onOpenChange={(e)=>{e== true ? getSubmissionCount(i.id):setSubCount()}}><PopoverTrigger>
   <Button size="sm" color="primary" isLoading={countLoading}>View Count</Button></PopoverTrigger>
   <PopoverContent>
    {subCount}
   </PopoverContent>
   </Popover>
    <Button size="sm" className="ml-2" color="success" onPress={()=>{handleLoadSideBar(i.id)}}>View Submissions</Button>
   <Popover shouldCloseOnBlur={false} onOpenChange={(e)=>{e == true ? setEditTest(i):setEditTest()}}>
    <PopoverTrigger>
    
    <Button size="sm" className="ml-2" color="success" >Edit/Configure Test</Button> 
    </PopoverTrigger>
    
    
    <PopoverContent className="sf min-w-[300px] max-w-[500px] max-h-[50vh] overflow-y-scroll p-3 flex flex-col justify-start items-start">
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

    <Select className="sf mt-2"
     label="Select a Category" 
     selectedKeys={[editTest?.category?.toString()]}
     onChange={(e)=>{setEditTest(res=>({...res,category:e.target.value}))}}
     >
    {categories && categories?.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.title}
          </SelectItem>
          
        ))}
    </Select>
    
    <DatePicker
    className="mt-2"
    description="If left empty , test will start from the time you upload it"
        granularity="minute"
        label="Start Date (optional)"
        
        value={editTest?.start_time ?  getParsedDate(editTest?.start_time) : null}
        onChange={(e)=>{ setEditTest(res=>({...res,start_time:typeof e.toAbsoluteString === 'function' ? e.toAbsoluteString() : e.toString()}))}}
        
      />
      <DatePicker
      description="If left empty test will never be expired"
      className="mt-2"
      granularity="minute"
     label="End Date (optional)"
     value={editTest?.end_time ?  getParsedDate(editTest?.end_time) : null}
     onChange={(e)=>{ setEditTest(res=>({...res,end_time:typeof e.toAbsoluteString === 'function' ? e.toAbsoluteString() : e.toString()}))}}
      />

    {controls && controls.map((i,d)=>{
        if(i.type == "switch"){
return <Switch className="my-1" size="sm" isSelected={editTest?.config[i?.key]} onValueChange={(e)=>{setEditTest((prevState) => _.set({ ...prevState }, `config.${i.key}`, e))}} >{i.label}</Switch>
        }
        if(i.type == "slider"){
            return <Slider getValue={(value)=>{return <p>{value/60} minutes</p>}} maxValue={18000} value={editTest?.config[i?.key]} onChange={(e)=>{setEditTest((prevState) => _.set({ ...prevState }, `config.${i.key}`, e))}} minValue={0} step={60} defaultValue={i?.default} size="sm" label={i.label}>

            </Slider>
                    }
                    if(i.type == "input"){
                        return <Input value={editTest && editTest?.config[i?.key]} onChange={(e)=>{setEditTest((prevState) => _.set({ ...prevState }, `config.${i.key}`, e.target.value))}}  size="sm" label={i.label}></Input>
            
                        
                        
                                }
                                if(i.type == "richtext"){
                                    return <><Spacer y={4}></Spacer><p className="text-md font-medium">{i.label}</p><CustomEditor key={i?.key} data={editTest && editTest?.config[i?.key]} onChange={(e)=>{setEditTest((prevState) => _.set({ ...prevState }, `config.${i.key}`, e))}}></CustomEditor></>
                        
                                    
                                    
                                            }
                    
    })}
<Button className="mt-2 text-white flex-shrink-0" color="primary" size="sm" onPress={(e)=>{updateTest(editTest,i?.id)}}>Update Test</Button>
    </PopoverContent>


      </Popover> 
    <Button size="sm" className="ml-2 text-white" color="primary" onPress={()=>{setViews(1),setActiveCourse(i.id),getSelectedSubjects(i.id)}}>Manage Test Content</Button>
    
    <Popover>
        <PopoverTrigger>
    <Button size="sm" className="ml-2 p-1.5 text-white" color="danger"  isIconOnly><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z" fill="#fff"/></svg></Button>
    </PopoverTrigger>
    <PopoverContent>
        <div className="flex flex-row items-center p-2">
        <Button size="sm" color="success">Cancel</Button>
        <Spacer x={2} y={2}></Spacer>
        <Button size="sm" color="danger" onPress={()=>{deleteTest(i.id)}}>Delete</Button></div>
    </PopoverContent>
    </Popover>
    </div>
    </div>
})}
<Popover>
    <PopoverTrigger>
<Button className="w-auto mr-auto my-4 text-black" color="secondary"  size="sm"  onPress={()=>{courses? '':toast.error('Courses are not loaded , please try refresing')}}>Add a Test to this Category</Button></PopoverTrigger>
<PopoverContent className="sf max-w-[500px] max-h-[60vh] overflow-y-auto flex flex-col items-start justify-start">
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
    <Spacer y={2}></Spacer>
    <div className="flex flex-col items-start justify-start">
    {controls && controls.map((i,d)=>{
        if(i.type == "switch"){
return <Switch className="my-1" size="sm" isSelected={testData && testData[i?.key] || false} onValueChange={(e)=>{setTestData(res=>({...res,[i.key]:e}))}} >{i.label}</Switch>
        }
        if(i.type == "slider"){
            return <Slider getValue={(value)=>{return <p>{value/60} minutes</p>}} maxValue={18000} value={testData && testData[i?.key]} onChange={(e)=>{setTestData(res=>({...res,[i.key]:e}))}} minValue={0} step={60} defaultValue={i?.default} size="sm" label={i.label}>

            </Slider>
                    }
                    if(i.type == "input"){
                        return <Input value={testData && testData[i?.key]} onChange={(e)=>{setTestData(res=>({...res,[i.key]:e.target.value}))}}  size="sm" label={i.label}></Input>
            
                        
                                }

                                if(i.type == "richtext"){
                                    return <><Spacer y={4}></Spacer><p className="text-md font-medium">{i.label}</p><CustomEditor value={(testData && testData[i?.key]) ?? i.default} onChange={(e)=>{setTestData(res=>({...res,[i.key]:e}))}}></CustomEditor></>
                        
                                    
                                    
                                            }
                    
    })}</div>
    <Button color="primary" className="mt-2 text-white flex-shrink-0" onPress={()=>{addTest(testData,z.id)}}>Add Test </Button>
</PopoverContent>
</Popover>

    </>
})}


</div>:''}

{/* Module Selector */}
{views == 1 && activeCourse != undefined && subjects != undefined ? 
<div>

    <div className="bg-gray-200 rounded-md p-3 mb-4">
    <h3>{tests[getSubjectIndex(activeCourse)].title}</h3>
        <h2>Selected Subjects</h2>
{selectedsubjects && selectedsubjects.map((i,d)=>{
    return <div className="flex flex-row w-full justify-between bg-white border-1 rounded-md p-2 items-center align-middle">
        <div className="flex flex-row items-center justify-start">
        <div className="flex flex-row items-center justify-start">
      
      <Input type="number" label="Serial Number" value={i?.seq ?? ''} onChange={(e)=>{setSelectedSubjects(prevData => _.set([...prevData], `[${d}].seq`, e.target.value))}} endContent={<Button className="p-2" onPress={()=>{updateSectionOrder(i?.seq,i.id,i.test)}} size="sm" color="primary" isLoading={bgLoading} isIconOnly>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Check--Streamline-Sharp" height="24" width="24"><desc>Check Streamline Icon: https://streamlinehq.com</desc><g id="check--check-form-validation-checkmark-success-add-addition-tick"><path id="Vector 2356 (Stroke)" fill="#fff" fill-rule="evenodd" d="M23.76 5.7883L8.5452 21.0031L0.24 12.6979L3.0315 9.9064L8.5452 15.4202L20.9686 2.9969L23.76 5.7883Z" clip-rule="evenodd" stroke-width="1"></path></g></svg>
      </Button>} size="sm" className="w-auto h-12"></Input>
      <Spacer x={4}></Spacer>
        <p>{i?.title}</p></div>


        <div className="flex flex-row items-center justify-start">
      
      <Input type="number" label="Time in Seconds" value={i?.time ?? ''} onChange={(e)=>{setSelectedSubjects(prevData => _.set([...prevData], `[${d}].time`, e.target.value))}} endContent={<Button className="p-2" onPress={()=>{updateSectionTime(i?.time,i.id,i.test)}} size="sm" color="primary" isLoading={bgLoading} isIconOnly>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Check--Streamline-Sharp" height="24" width="24"><desc>Check Streamline Icon: https://streamlinehq.com</desc><g id="check--check-form-validation-checkmark-success-add-addition-tick"><path id="Vector 2356 (Stroke)" fill="#fff" fill-rule="evenodd" d="M23.76 5.7883L8.5452 21.0031L0.24 12.6979L3.0315 9.9064L8.5452 15.4202L20.9686 2.9969L23.76 5.7883Z" clip-rule="evenodd" stroke-width="1"></path></g></svg>
      </Button>} size="sm" className="w-auto h-12"></Input>
      <Spacer x={4}></Spacer>
        <p>{i?.title}</p></div>

        <p>{extractSubject(i?.subject)}</p>
      <p className="bg-primary text-white text-xs px-4 py-1 rounded-full mx-2">{extractLabel(i?.subject) ?? 'No Label'}</p> 
    </div>
    <div className="flex flex-row items-center justify-start">
      <div className="flex flex-row items-center text-xs">Correct Answer Marks : <Button className="p-1" color="danger" onPress={()=>{updateMarking((i.pos - 1) ?? -1,'pos',i.id)}} isIconOnly size="sm">
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg>
        </Button><input type="number" className="bg-gray-200 rounded-md text-black w-8 text-center flex flex-col" value={i.pos ?? 0}></input>
        
        <Button className="p-1" color="danger" onPress={()=>{updateMarking((i.pos + 1) ?? 1,'pos',i.id)}} isIconOnly size="sm">
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg>
        </Button>
        </div>
      <Spacer x={2}></Spacer>
      <div className="flex flex-row text-xs items-center">Wrong Answer Marks : <Button className="p-1" color="danger" onPress={()=>{updateMarking((i.neg - 1) ?? -1,'neg',i.id)}} isIconOnly size="sm">
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg>
        </Button><input type="number" className="bg-gray-200 rounded-md text-black w-8 text-center flex flex-col" value={i.neg ?? 0}></input>
        
        <Button className="p-1" color="danger" onPress={()=>{updateMarking((i.neg + 1) ?? 1,'neg',i.id)}} isIconOnly size="sm">
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg>
        </Button>
        </div>
    </div>
        <div className="flex flex-row">
        <Button className="ml-2 text-white" color="primary" size="sm" onPress={()=>{setViews(2),setActiveSubject(subjects.findIndex(item => item.id === i.subject)),setActiveSelectedSub(i.id),getSelectedModules(i?.id),getModules(i?.subject,courses[getSubjectIndex(activeCourse)]?.id)}}>Manage Modules</Button>
        <Button className="ml-2 text-white" onPress={()=>{removeFromTest(i?.id,i?.test)}} color="danger" size="sm">Remove from Test</Button></div>
    </div>
})}
{selectedsubjects && selectedsubjects?.length ==0 ?<p>No Subject found in this Test</p> :''}</div>
<h2>List of Subjects</h2>
{subjects && filterSubjects(subjects).map((i,d)=>{
    return <div className="w-full rounded-md border-1 border-gray-200 flex flex-row justify-between p-1 px-2 shadow-md items-center my-2">
      <div className="flex flex-row items-center justify-start">
      <p>{i?.title}</p>
      <p className="bg-primary text-white text-xs px-4 py-1 rounded-full mx-2">{i?.label ?? 'No Label'}</p> 
    </div>
    <div className="flex flex-row">
    <Button size="sm" className="text-white" color="primary" onClick={()=>{addToTest(i?.id,tests[getSubjectIndex(activeCourse)]?.id)}}>Add to Test</Button>
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
<Input label="Subject Label" placeholder="Enter Subject Label" size="sm" onChange={(e)=>{setSubjectData(res=>({...res,label:e.target.value}))}}></Input>
<Button color="primary" className="my-2 text-white" size="sm" onPress={()=>{addSubject(subjectData,tests[getSubjectIndex(activeCourse)].title)}}>Add Subject</Button>
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
to {subjects[activeSubject]?.title} of {courses[getSubjectIndex(activeCourse)]?.title}
    </div></PopoverTrigger>

    <PopoverContent className="sf">
<Input className="my-1" label="Module Title" placeholder="Enter Module Title" size="sm" onChange={(e)=>{setModuleData(res=>({...res,title:e.target.value}))}}></Input>
<Input className="my-1" label="Module Description" placeholder="Enter Module Description" size="sm" onChange={(e)=>{setModuleData(res=>({...res,description:e.target.value}))}}></Input>
<Button color="primary" className="my-2 text-white" size="sm" onPress={()=>{addModule(moduleData,subjects[activeSubject].id,tests[getSubjectIndex(activeCourse)]?.course)}}>Add Module</Button>
    </PopoverContent>
    </Popover>  
</div>
:''}

{views == 3 && activeCourse != undefined && modules != undefined && activeModule != undefined ? 
<div className="flex flex-col justify-start items-start w-full overflow-y-auto pr-2">

{questions != undefined && questions.map((i,d)=>{

    return <div className="p-3 w-full shadow-md flex flex-row justify-between items-center align-middle rounded-md my-2 border-1 border-gray-100">
      <div className="flex flex-row items-center justify-start">
      
      <Input type="number" label="Serial Number" value={i?.seq ?? ''} onChange={(e)=>{setQuestions(prevData => _.set([...prevData], `[${d}].seq`, e.target.value))}} endContent={<Button className="p-2" onPress={()=>{updateOrder(i?.seq,i.id)}} size="sm" color="primary" isLoading={bgLoading} isIconOnly>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Check--Streamline-Sharp" height="24" width="24"><desc>Check Streamline Icon: https://streamlinehq.com</desc><g id="check--check-form-validation-checkmark-success-add-addition-tick"><path id="Vector 2356 (Stroke)" fill="#fff" fill-rule="evenodd" d="M23.76 5.7883L8.5452 21.0031L0.24 12.6979L3.0315 9.9064L8.5452 15.4202L20.9686 2.9969L23.76 5.7883Z" clip-rule="evenodd" stroke-width="1"></path></g></svg>
      </Button>} size="sm" className="w-auto h-12"></Input>
      <Spacer x={4}></Spacer>
        <p>{i?.title}</p></div>
        {role == "admin" ? <div className="flex flex-row ">
            <Button className="ml-2" color="success" size="sm" onPress={()=>{
             setQuestionModal(true),   setEditMode(true),getData('mock_questions','*','id',i.id,(e)=>{setEditQuestionData(e[0])})
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
  return <div className='w-full text-left flex flex-row align-middle justify-start items-center'><h2 className='font-bold'>{d+1}){i.title}</h2> <p onClick={()=>{setEditMode(true),getData('mock_questions','*','id',i.id,(e)=>{setEditQuestionData(e[0])})}} className="rounded-full bg-blue-300 font-medium text-xs mx-1 ml-3 cursor-pointer px-2 py-0.5">Edit Question</p> </div>
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
      <h2 className='font-bold text-xl'>Option Number {d + 1}</h2>
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
   })}
   <Button size="sm" className="mr-auto" color="secondary" onPress={()=>{setEditQuestionData(res=>({...res,options: Array(editQuestionData?.options?.length +1).fill().map((i,d)=>({isCorrect:false}))}))}}>Add Option</Button>
   </> :
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
      updateData('mock_questions',{
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
        getData('mock_questions','*','parent',editQuestionData?.parent,(e)=>{setQuestions(e),setQuestionModal(false)},({errortext})=>{console.log(errortext)})
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
   <Switch onValueChange={(e)=>{setAddNewQuestion(res=>({...res,type:e,options:e == false ? Array(4).fill().map((i,d)=>({isCorrect:false})):setAddNewQuestion({})}))}}></Switch>

   {addNewQuestion?.type == false? <><h2>Options/Correct Answer</h2>
   {Array(addNewQuestion.options?.length ?? 4).fill().map((i,d)=>{
    return <div className='flex flex-col my-5 border-1 border-gray-300 p-5 rounded-xl'>
      <h2 className='font-bold text-xl'>Option Number {d+1}</h2>
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
   })}
   
   <Button size="sm" className="mr-auto" color="secondary" onPress={()=>{setAddNewQuestion(res=>({...res,options: Array(addNewQuestion?.options?.length +1).fill().map((i,d)=>({isCorrect:false}))}))}}>Add Option</Button>
   </> :
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

export default MockTestEditor;