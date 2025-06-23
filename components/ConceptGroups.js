import { supabase } from "@/utils/supabaseClient"
import { Button, CircularProgress, PopoverTrigger, Spacer,Popover,PopoverContent, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Select, SelectItem, Switch } from "@nextui-org/react"
import { ChevronRight, EditIcon, MoreVertical, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import ImageUploader from "./ImageUploader"

export default function ConceptGroups({type,children,role,title}){

const [selectedGroup,setSelectedGroup] = useState()


function clearSelection(){

setSelectedGroup()
}


    return selectedGroup ? children({group:selectedGroup,clearSelection}) :<Selector title={title} role={role} type={type} onSelect={(e)=>{setSelectedGroup(e)}}></Selector>

}

const Selector = ({type,onSelect,role,title}) =>{


    const [groups,setGroups] = useState()
    const [loading,setLoading] = useState(true)
    const [groupData,setGroupData] = useState()
    const [courses,setCourses] = useState()
    const [editGroupdata,setEditGroupData] = useState()

async function getGroups(){
    const {data,error}= await supabase.from('test_groups').select('*').eq('type',type)
    if(data){
        setGroups(data)
        setLoading(false)
    }
    if(error){
        toast.error('Unable to Load Content')
        setLoading(false)
    }



}
async function deleteGroupbyId(a){
    const {data,error}= await supabase.from('test_groups').delete().eq('id',a).select()
    if(data){
        toast.success('Deleted Successfully')
        getGroups()
    }
    if(error){
        toast.error('Unable to Delete')
        
    }



}
async function addGroup(a){


    if(a == undefined){
        toast.error('Data Empty')
        return;
    }
    if(a?.title == undefined|| a?.description == undefined|| a?.image == undefined){
        toast.error('Please fill all the fields')
        return;
    }
    const {data,error} = await supabase.from('test_groups').insert({...a,type:type}).select()
    if(data){
        getGroups()
    }
    if(error){
        toast.error('Unable to Add')
    }
}
async function getCourses(){

    const {data,error}= await supabase.from('courses').select('*')
    if(data){
        setCourses(data)
       
    }
    if(error){
        toast.error('Unable to Load Content')
       
    }
}
async function toggleDemo(a,b){


    const {data,error} = await supabase.from('test_groups').update({
        demo:a
    }).eq('id',b).select()
    if(data){
        getGroups()
        toast.success('Updated Successfully')
    }
    if(error){
        toast.error('Unable to Update')
    }
}

async function updateGroup(a){

    const{data,error} = await supabase.from('test_groups').update(a).eq('id',a?.id).select()
    if(data){
        getGroups()
        toast.success('Successfully Updated')
    }
    if(error){
        toast.error('Unable to Update')
    }
}
useEffect(()=>{
    getGroups()
},[type])


if(loading){
    return <div className="w-full h-full flex flex-col items-center justify-center">
      <CircularProgress size="sm"></CircularProgress>
    </div>
  }
  
    return <div className="w-full flex flex-col items-start justify-start">
<h2 className="text-2xl font-bold">{title}</h2>
<Spacer y={4}></Spacer>
        <div className="w-full flex flex-row flex-wrap items-stretch justify-start">

{(groups == undefined || groups?.length == 0) && !loading ? <><p className="w-full p-3 rounded-xl px-4 border-dashed bg-gray-50">No Content is Available here , Please check back later</p>
</>:''}
            {groups && groups.map((i,d)=>{
                return <div /* onClick={()=>{onSelect(i.id)}} */ className="flex mr-4 relative shadow-md rounded-md overflow-hidden flex-col !flex-grow-0 flex-[100%] sm:flex-[50%] lg:flex-[300px]">
                    <img className="w-full aspect-video object-cover" src={i.image}/>
                    {role == "admin" ? 
                    <Dropdown size="sm" placement="bottom-start">
                        <DropdownTrigger>
                    <MoreVertical size={16}  className="bg-white w-12 p-4 h-12 absolute right-4 top-4 rounded-full "></MoreVertical></DropdownTrigger>
                    <DropdownMenu>
                       
                        <DropdownItem startContent={<Trash2></Trash2>} color="danger" onPress={()=>{deleteGroupbyId(i.id)}}>Delete</DropdownItem>
                    </DropdownMenu>
                    </Dropdown>
                    :''}
                    <div className="p-4 flex flex-col items-start justify-start">
                    <h2 className="text-left text-primary text-lg font-bold">{i.title}</h2>
                    <p className="text-xs text-left">{i.description}</p>
                    
                    <Spacer y={2}></Spacer>
                    <div className="flex flex-row items-center justify-start w-full">
                    <Button onPress={()=>{onSelect(i.id)}} color="primary" className=" rounded-none flex-shrink-0">Access Now <ChevronRight></ChevronRight></Button>
                    <Spacer x={2}> </Spacer>
                    {role == "admin" ? <Switch isSelected={i.demo} onValueChange={(e)=>{toggleDemo(e,i.id)}} className="ml-auto text-xs"> Demo </Switch>:''} 
                    
                    </div>

                    {role == "admin" ?  
                    <Popover placement="bottom-start" onOpenChange={(e)=>{e == true ?(setEditGroupData(i),getCourses()):setEditGroupData()}}>
                        <PopoverTrigger >
                      <Button size="sm" color="success" fullWidth className="my-2" endContent={<EditIcon></EditIcon>}>Edit</Button>
                        </PopoverTrigger>
                        <PopoverContent>
                        <ImageUploader data={{image:editGroupdata?.image}} onUploadComplete={(e)=>{setEditGroupData(res=>({...res,image:e}))}}></ImageUploader>
                <Input className="my-2" value={editGroupdata?.title} size="sm" label="Title" placeholder="Enter Title" onChange={(e)=>{setEditGroupData(res=>({...res,title:e.target.value}))}}></Input>
                <Input className="my-2" value={editGroupdata?.description} size="sm" label="Description" placeholder="Enter Description" onChange={(e)=>{setEditGroupData(res=>({...res,description:e.target.value}))}}></Input>
                <Select label="Course" selectedKeys={[editGroupdata?.course_id?.toString()]} placeholder="Select Course" onSelectionChange={(e)=>{setEditGroupData(res=>({...res,course_id:e.anchorKey}))}}>
                    {courses && courses.map((i,d)=>{
                        return <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                    })}
                </Select>
                <Button size="sm" color="primary" className="mr-auto flex-shrink-0" onPress={()=>{updateGroup(editGroupdata)}}>Add Collection</Button> 
                        </PopoverContent>
                        </Popover>
                    :''}
                    </div>
                </div>
            })}
            {role == "admin" ?
<Popover onOpenChange={(e)=>{e==true ? getCourses():''}}>
    <PopoverTrigger>
            <div className="flex-[25%] text-center flex text-gray-500 flex-col items-center justify-center flex-grow-0 aspect-square p-4 border-dashed border-1 border-gray-200 rounded-xl shadow-md cursor-pointer">
                <Plus size={48} color="#ddd"></Plus>
                <p>Add New Collection</p>
            </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px]">
                <ImageUploader data={{image:groupData?.image}} onUploadComplete={(e)=>{setGroupData(res=>({...res,image:e}))}}></ImageUploader>
                <Input className="my-2" value={groupData?.title} size="sm" label="Title" placeholder="Enter Title" onChange={(e)=>{setGroupData(res=>({...res,title:e.target.value}))}}></Input>
                <Input className="my-2" value={groupData?.description} size="sm" label="Description" placeholder="Enter Description" onChange={(e)=>{setGroupData(res=>({...res,description:e.target.value}))}}></Input>
                <Select label="Course" placeholder="Select Course" onSelectionChange={(e)=>{setGroupData(res=>({...res,course_id:e.anchorKey}))}}>
                    {courses && courses.map((i,d)=>{
                        return <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                    })}
                </Select>
                <Button size="sm" color="primary" className="mr-auto flex-shrink-0" onPress={()=>{addGroup(groupData)}}>Add Collection</Button>
            </PopoverContent>
            </Popover> :''}
        </div>
    </div>
}