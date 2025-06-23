import { Button, ButtonGroup, Checkbox, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Popover, PopoverContent, PopoverTrigger, Spacer, Spinner } from '@nextui-org/react';
import { createClient } from '@supabase/supabase-js'
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
export default function PrintManager(){

    const router = useRouter()
    
    const supabaseUrl = "https://gbicgyfhacrwukeszfax.supabase.co"
  
    const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaWNneWZoYWNyd3VrZXN6ZmF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTY2OTI2OCwiZXhwIjoyMDI1MjQ1MjY4fQ.9S-bkpn_fN02g-TRymhsqA97iUcp2qbrLwdkaRF8WgU"
    
    
    const supabase2 = createClient(supabaseUrl, supabaseServiceKey);
const [loading,setLoading] = useState(false)
const [requests,setRequests] = useState()
const [selectedVa,setSelected]= useState([])
const [formData,setFormData] = useState();



async function updateTracking(a,b){

if(a == undefined){
    toast.error('Empty or Invalid Tracking Code')
    return null
}
if(!a?.tracking){
    toast.error('Empty or Invalid Tracking Code')
    return null
}
    setLoading(true)
    const {data,error} = await supabase2.from('print_requests').update({
        tracking:a?.tracking
    }).eq('id',b).select()
    if(data){
        setLoading(false)
        toast.success('Updated Tracking Code')
    }
    if(error){
        setLoading(false)
    }
}

useEffect(()=>{
    getRequests()
},[])
const [selectedOption, setSelectedOption] = useState("processing");
const [selectedBulkOption, setSelectedBulkOption] = useState("processing");

const labelsMap = [
    {
      "label": "Processing",
      "description": "Sets Status as Processing"
    },
    {
      "label": "Printed",
      "description": "Sets Status as Printed"
    },
    {
      "label": "Shipped",
      "description": "Sets Status as Shipped"
    },
    {
      "label": "Delivered",
      "description": "Sets Status as Delivered"
    }
  ]
  
function updateSelection(bo,i){
    console.log(bo,i)
if(bo == true){
setSelected(res=>([...res,i]))}
if(bo == false){
    const newArray = selectedVa.filter(item => item !== i);
    setSelected(newArray);   

}
}

async function getDownload(a){


    setLoading(true)
   

    if(a){
        window.open(`/api/getPDF?pdf=${a}`, '_blank');
        setLoading(false)
    }
}

async function getRequests(){


    const {data,error} = await supabase2.from('print_requests').select('*,uid(*)').order('created_at',{ascending:false})
    if(data){
        setRequests(data)
    }
    if(error){
        toast.error('Error Loading Requests')
    }
}
async function updateSingle(a,b){

    if(a == undefined || b == undefined){
        toast.error('Request ID Missing')
        return null
    }
    const {data,error} = await supabase2.from('print_requests').update({status:b.currentKey}).in('id',[a]).select()

    if(data){
        getRequests()
        toast.success('Updated Successfully')
        
    }
    if(error){
        toast.error('Error Updating Request')
    }
}
async function updateBulk(a,b){

    if(a == undefined || b == undefined){
        toast.error('Request ID Missing')
        return null
    }
    const {data,error} = await supabase2.from('print_requests').update({status:b.currentKey}).eq('id',a).select()

    if(data){
        getRequests()
        toast.success('Updated Successfully')
        
    }
    if(error){
        toast.error('Error Updating Request')
    }
}

    return <div className='flex flex-col w-full h-full '>
<h2 className="text-2xl font-bold text-left text-primary">Print Requests</h2>
<div className='flex flex-col justify-start items-start py-4 flex-1 overflow-y-auto'>
    <div className='w-full rounded-lg shadow-md border-1 p-2 my-1 flex flex-row transition-all px-4'>
    <div className='flex-0 text-left flex flex-row justify-center items-center'>
    <Checkbox onValueChange={(e)=>{e == true ? setSelected(requests.map(i=>i.id)): setSelected([])}} color='secondary'></Checkbox>
    <p className='text-xs'>Select All</p>
 </div>
 {selectedVa != undefined && selectedVa?.length >0 ?  
 <div className='flex-1 flex flex-row ml-4'>
    <ButtonGroup size='sm' variant="solid" color='secondary'>
      <Button onPress={()=>{updateBulk(selectedVa,selectedBulkOption)}}>Set Selected as {selectedBulkOption}</Button>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button isIconOnly>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" fill="#222F3D"/></svg>
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          disallowEmptySelection
          aria-label="Update options"
          selectedKeys={[selectedBulkOption.toString()]}
          selectionMode="single"
          onSelectionChange={(e)=>{setSelectedBulkOption(e)}}
          className="max-w-[300px]"
        >
            {labelsMap.map((i,d)=>{

                return <DropdownItem key={i.label} description={i.description}>
              {i.label}
              </DropdownItem>
            })}
          
         
        </DropdownMenu>
      </Dropdown>
    </ButtonGroup>
 </div>
 :''}
    </div>
    {requests == undefined ?  
    <Spinner className='mx-auto my-auto'></Spinner>
    :''}
{requests && requests.map((i,d)=>{

    return <div className={'w-full rounded-lg shadow-md border-1 p-2 my-1 flex flex-row transition-all px-4 ' +  (selectedVa.some(item=>item == i.id) ? '!border-secondary':'')}>
 <div className='flex-0 text-left flex flex-col justify-center items-center'>
    <Checkbox isSelected={selectedVa.some(item=>item == i.id)} onValueChange={(e)=>{updateSelection(e,i.id)}} color='secondary'></Checkbox>
 </div>
        <div className='flex-1 text-left flex flex-col justify-center'>
            <h2 className='text-md font-medium'>{i.uid.name}</h2>
            <p className='text-xs text-gray-500'>A.No :{i.application_no}</p>
        </div>
        <div className='flex-1 text-left flex flex-col justify-center'>
            <h2 className='text-md font-medium'>Status</h2>
            <p className='text-xs text-gray-500'>{i.status}</p>
        </div>
        <div className='flex-1 text-left flex flex-col items-start justify-center'>
            <h2 className='text-xs !select-text text-gray-500'>Email : {i.uid.email} | Phone :{i.uid.phone}</h2>
            <p className='text-xs !select-text text-gray-500'>Address : {i.address} , {i.city } , {i.state} - {i.pincode}</p>
        </div>
        <div className='flex-1 flex flex-row justify-end items-center'>
{/* <Button color='success' size='sm'>Update</Button> */}
<Spacer x={2}></Spacer>
<Popover onOpenChange={(e)=>{e== true  ? setFormData(res=>({...res,tracking:i?.tracking})):''}}><PopoverTrigger>
<Button className=' bg-success text-white' size='sm' isLoading={loading} >Tracking URL</Button>
</PopoverTrigger>
<PopoverContent className='flex flex-col justify-start items-start p-4'>
    <Input value={formData?.tracking} placeholder='Enter Tracking Code' onChange={(e)=>{setFormData(res=>({...res,tracking:e.target.value}))}}></Input>
    <Spacer y={2}></Spacer>
    <Button size="sm" color='secondary' onPress={()=>{updateTracking(formData,i.id)}}>Update</Button>
</PopoverContent>
</Popover>
<Button className=' bg-gradient-purple text-white ml-2' size='sm' isLoading={loading} onPress={()=>{getDownload(i.uid.url)}}>Download</Button>
<Spacer x={2}></Spacer>
<ButtonGroup size='sm' variant="solid" color='secondary'>
      <Button onPress={()=>{updateSingle(i.id,selectedOption)}}>Set as {selectedOption}</Button>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button isIconOnly>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.293 8.293a1 1 0 0 1 1.414 0L12 14.586l6.293-6.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 0 1 0-1.414Z" fill="#222F3D"/></svg>
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          disallowEmptySelection
          aria-label="Update options"
          selectedKeys={[selectedOption.toString()]}
          selectionMode="single"
          onSelectionChange={(e)=>{setSelectedOption(e)}}
          className="max-w-[300px]"
        >
            {labelsMap.map((i,d)=>{

                return <DropdownItem key={i.label} description={i.description}>
              {i.label}
              </DropdownItem>
            })}
          
         
        </DropdownMenu>
      </Dropdown>
    </ButtonGroup>
    
        </div>
    </div>
})}</div>
    </div>
}