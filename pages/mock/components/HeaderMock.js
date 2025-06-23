import { Avatar, Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Popover, Spacer } from "@nextui-org/react";
import _ from "lodash";
import { useRouter } from "next/router";
import { useState } from "react";

import { toast } from "react-hot-toast";

export default function HeaderMock({title,state,userData,openCalculator,remainingTime,calc}){

const[text,SetText] = useState('')
const [textToEnter,setTextToEnter] = useState("Cancel");
function convertSeconds(totalSeconds) {
    // Ensure the input is a positive integer
    totalSeconds = _.toInteger(totalSeconds);
    
    // Calculate hours, minutes and seconds
    const hours = _.floor(totalSeconds / 3600);
    const minutes = _.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Add zero padding
    const paddedHours = _.padStart(hours, 2, '0');
    const paddedMinutes = _.padStart(minutes, 2, '0');
    const paddedSeconds = _.padStart(seconds, 2, '0');

    return `${paddedHours} : ${paddedMinutes} : ${paddedSeconds}`
}
const router = useRouter()
    return <><div className='w-full bg-primary-50 p-2 border-b-1 border-primary-400 flex flex-row items-center justify-between px-6'>
    <img src='/newlog.svg' className='bg- p-2 rounded-xl w-[200px]'/>
    
    <div className="flex flex-row items-center justify-end">
       
       
       {state == 1 && calc == true ? <Button key={'calc'} size="sm" onPress={()=>{openCalculator()}} color="secondary" className="flex-shrink-0" isIconOnly><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 5.25A3.25 3.25 0 0 1 7.25 2h9.5A3.25 3.25 0 0 1 20 5.25v13.5A3.25 3.25 0 0 1 16.75 22h-9.5A3.25 3.25 0 0 1 4 18.75V5.25ZM9 5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9Zm.5 8.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0ZM8.25 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM17 13.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0Zm-1.25 5.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm-2.5-5.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0ZM12 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="#222F3D"/></svg></Button>:''}
    <Spacer x={4} y={4}></Spacer>
    <Dropdown> 
        <DropdownTrigger>
    <Button color="primary" size="sm" className="z-0">
      <p className="hidden md:block">Back to Dashboard</p>
      <p className="block md:hidden">Exit</p>
    </Button>
    </DropdownTrigger>
    <DropdownMenu className="max-w-[200px]">
    <DropdownItem isReadOnly>
        Are you sure?<br/> Type <span className="text-danger font-bold">"{textToEnter}"</span> in box
        </DropdownItem>
        <DropdownItem isReadOnly>
            <Input label="Confirm Text" placeholder="Enter text here" onChange={(e)=>{SetText(e.target.value)}} size="sm"></Input>
        </DropdownItem>
        <DropdownItem>
          <Button color="danger" size="sm" onPress={()=>{textToEnter == text ? router.back():toast.error('Incorrect Confirmation Text')}}>
            Confirm, Cancel Test
            </Button>
            </DropdownItem>
    </DropdownMenu>
    </Dropdown>
    <Spacer x={4}></Spacer>
    <div className="w-auto md:flex flex-row items-center justify-end hidden">
        <div className="flex flex-row items-center">
            <Avatar src={userData?.user_metadata?.profile_pic || null}></Avatar>
            <div className='flex flex-col p-2 px-4'>
    <h2 className='text-md font-medium text-primary'>{userData?.user_metadata?.full_name}</h2>
  </div>
        </div>
    </div>
    </div>
  </div>
  <div className="flex flex-row from-secondary-400 to-secondary bg-gradient-to-r p-2">
    {title != undefined ? <p className="px-4 font-semibold">{title}</p>:''}
    <div className="ml-auto px-4">Time Left : {convertSeconds(remainingTime)}</div>
  </div>
  </>
}