import { supabase } from "@/utils/supabaseClient";
import { Button, Card, CardBody, Image, Input, Popover, PopoverContent, PopoverTrigger, Spacer, Textarea } from "@nextui-org/react";
import { Edit2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ImageUploader from "./ImageUploader";

export default function CourseManager(){


    const [courses,setCourses] = useState()
    const [activeCourse,setActiveCourse] = useState()
    const [courseData,setCourseData] = useState()
    const [courseEditData,setCourseEditData] = useState() 

async function addCourseToDB(a){

    if(a == undefined){

        toast.error('Empty Data')
        return
    }
    if(!a?.title){

        toast.error('Empty Title')
        return
    }
    if(!a?.description){

        toast.error('Empty Description')
        return
    }
    if(!a?.price){

        toast.error('Empty Price')
        return
    }
    if(!a?.sale_price){

        toast.error('Empty Sale Price')
        return
    }
    if(!a?.image){

        toast.error('Empty Image')
        return
    }
  const {error} = await supabase.from('courses').insert(a)
  if(!error){
    getCourses();
    toast.success('Successfully Added Course')
  }
}

async function deleteCourseById(a){

    const {data,error} = await supabase.from('courses').delete().eq('id',a).select();

    if(data){
        toast.success('Deleted Course')
        getCourses()
    }

    if(error){
        toast.error('Unable to Delete Course')
    }
}

async function updateCourse(a,b){

    const {data,error} = await supabase.from('courses').update(a).eq('id',b).select();
    if(data){
        getCourses()
        toast.success('Updated Course Successfully')
    }
    if(error){
        toast.error('Unable to Update Course')
    }
}

    useEffect(()=>{
        getCourses()
    },[])

    async function getCourses(){
        const {data,error} = await supabase.from('courses').select("*").order('id',{ascending:true})
        if(data){
          setCourses(data);
        }
      }




    return <div className='flex flex-row w-full h-full items-stretch overflow-hidden'>
    <div className='w-full flex flex-col border-1 rounded-xl p-5 justify-start items-start'>
    
      <h2 className='text-2xl font-bold text-secondary'>Courses</h2>
      <div className='flex flex-row flex-wrap overflow-y-auto w-full px-2 space-x-2 space-y-2'>
      {
        courses && courses.map((i,d)=>{
          return <Card shadow="sm" className={`p-2 flex !flex-grow-0 flex-[25%] border-1 flex-col items-start justify-start w-full sf font-bold mt-4 cursor-pointer hover:bg-primary`} >
          
            <Image fetchPriority="high" width={"100%"} className="w-full aspect-video object-cover" src={i?.image ?? 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}></Image>
            
            <CardBody>

          <div className='flex flex-col items-start justify-start'>
          {i.title}
          <p className="text-xs font-extralight text-gray-500 leading-tight my-1">{i?.description}</p>
          <div className="w-full flex flex-row items-center justify-start">
          <Popover onOpenChange={(e)=>{e == true ? setCourseEditData(i):setCourseEditData()}}>
          <PopoverTrigger><Button size='sm' color='success' isIconOnly>
            
            
            <Edit2 size={16}></Edit2>
            
            </Button></PopoverTrigger>
            <PopoverContent className=" max-h-[50vh] overflow-y-auto flex flex-col items-start justify-start w-[300px]">
            <ImageUploader data={{image:courseEditData?.image}} onUploadComplete={(e)=>{setCourseEditData(res=>({...res,image:e}))}}></ImageUploader>
        <Spacer y={2}></Spacer>
        <Input value={courseEditData?.title} onChange={(e)=>{setCourseEditData((res)=>({...res,title:e.target.value}))}} label="Course Title" placeholder='Enter Course Title' ></Input>
        <Spacer y={2}></Spacer>
      
        <Textarea value={courseEditData?.description} placeholder="Enter Course Description" label="Course Description" onChange={(e)=>{setCourseEditData(res=>({...res,description:e.target.value}))}}></Textarea>
        <Spacer y={2}></Spacer>
        <Input value={courseEditData?.price} placeholder="Enter Course Price" label="Course Price"
        onChange={(e)=>{setCourseEditData(res=>({...res,price:e.target.value}))}}
        ></Input>
        <Spacer y={2}></Spacer>
        <Input value={courseEditData?.sale_price} placeholder="Enter Course Sale Price" label="Course Sale Price(optional)" onChange={(e)=>{setCourseEditData(res=>({...res,sale_price:e.target.value}))}}></Input>
        <Spacer y={2}></Spacer>
        <Button className=' flex-shrink-0' color='primary' onClick={()=>{updateCourse(courseEditData,i.id)}}>Update Course</Button>
            </PopoverContent>
            </Popover>
          <Spacer x={2}></Spacer>
          {(new Date() - new Date(i.created_at)) / (1000 * 60 * 60 * 24) <= 10 && (
      <Button size="sm" color="danger" isIconOnly onPress={()=>{deleteCourseById(i.id)}}>
        <Trash2 size={16} />
      </Button>
    )}</div>
          </div>
          </CardBody> </Card>
        })
      }
      </div>


      <Popover className='sf py-4' placement="bottom-start">
        <PopoverTrigger>
      <div className='flex p-2 shadow-md rounded-md w-full sf font-bold mt-2 border-dashed border-1 bg-gray-100 border-secondary cursor-pointer'>Add New Courses</div></PopoverTrigger>
    
      <PopoverContent className='text-left w-[400px] flex flex-col max-h-[50vh] overflow-y-auto justify-start p-4 items-start'>
    
      <ImageUploader data={{image:courseData?.image}} onUploadComplete={(e)=>{setCourseData(res=>({...res,image:e}))}}></ImageUploader>
        <Spacer y={2}></Spacer>
        <Input value={courseData?.title} onChange={(e)=>{setCourseData((res)=>({...res,title:e.target.value}))}} label="Course Title" placeholder='Enter Course Title' ></Input>
        <Spacer y={2}></Spacer>
      
        <Textarea value={courseData?.description} placeholder="Enter Course Description" label="Course Description" onChange={(e)=>{setCourseData(res=>({...res,description:e.target.value}))}}></Textarea>
        <Spacer y={2}></Spacer>
        <Input value={courseData?.price} placeholder="Enter Course Price" label="Course Price"
        onChange={(e)=>{setCourseData(res=>({...res,price:e.target.value}))}}
        ></Input>
        <Spacer y={2}></Spacer>
        <Input value={courseData?.sale_price} placeholder="Enter Course Sale Price" label="Course Sale Price(optional)" onChange={(e)=>{setCourseData(res=>({...res,sale_price:e.target.value}))}}></Input>
        <Spacer y={2}></Spacer>
        <Button className='mt-2 flex-shrink-0' color='primary' onClick={()=>{addCourseToDB(courseData)}}>Add Course</Button>
      </PopoverContent>
      
      </Popover>


    </div>
    <div className='w-2 h-2'></div>
    
    
    </div>
}