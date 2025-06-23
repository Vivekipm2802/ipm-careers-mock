import { Avatar, Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Popover, Spacer } from "@nextui-org/react";
import _ from "lodash";
import { useRouter } from "next/router";
import { useState } from "react";

import { toast } from "react-hot-toast";
import { useMediaQuery } from "react-responsive";

export default function HeaderMock({title,isHintVisible,onSetVisible,setIsHintAvailable,
  state,userData,openCalculator,level,questions,isHintAvailable,remainingTime,calc}){

const[text,SetText] = useState('')
const [textToEnter,setTextToEnter] = useState("Cancel");
const isMobile = useMediaQuery({maxWidth:767})
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
       
       
       {state == 1 && calc == true ? <Button key={'calc'} size="sm" onPress={()=>{openCalculator()}} color="secondary" className="flex-shrink-0 mr-4" isIconOnly><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 5.25A3.25 3.25 0 0 1 7.25 2h9.5A3.25 3.25 0 0 1 20 5.25v13.5A3.25 3.25 0 0 1 16.75 22h-9.5A3.25 3.25 0 0 1 4 18.75V5.25ZM9 5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9Zm.5 8.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0ZM8.25 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM17 13.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0Zm-1.25 5.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm-2.5-5.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0ZM12 18.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="#222F3D"/></svg></Button>:''}
       
      {state == 1 && <Dropdown onClose={()=>{onSetVisible(false)}}>
            <DropdownTrigger>
          <Button size="sm" onPress={()=>{showHint(questions[level].hint),generateRandomKey(),onSetVisible(true),setIsHintAvailable(false)}} isDisabled={!isHintAvailable} className='my-2 text-black' color='secondary' isIconOnly={isMobile}><span className="hidden sm:block">See Hint</span> <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.538 18.999L15.2473 20.2575C15.0241 21.2208 14.2013 21.9184 13.2285 21.993L13.0554 21.9996H10.9437C9.95426 21.9996 9.0885 21.3547 8.79678 20.4232L8.75135 20.2559L8.461 18.999H15.538ZM12 2.00098C16.0041 2.00098 19.25 5.24691 19.25 9.25098C19.25 11.3875 18.3144 13.3443 16.4846 15.0917C16.4493 15.1254 16.4247 15.1687 16.4137 15.2162L15.886 17.499H8.114L7.58801 15.2164C7.57702 15.1688 7.55234 15.1255 7.51701 15.0917C5.68616 13.3443 4.75 11.3875 4.75 9.25098C4.75 5.24691 7.99593 2.00098 12 2.00098Z" fill="currentColor"/>
</svg>
</Button></DropdownTrigger>
<DropdownMenu>
    <DropdownItem>
        <div dangerouslySetInnerHTML={{__html:questions && level && questions[level]?.hint}}></div>
    </DropdownItem>
</DropdownMenu>
</Dropdown>}
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
  <div className="flex flex-row from-secondary-400 to-secondary w-full bg-gradient-to-r p-2">
    {title != undefined ? <p className="px-4 font-semibold">{title}</p>:''}
   {state == 1 &&  <div className="ml-auto px-4">Time Left : {convertSeconds(remainingTime)}</div>}
  </div>
  </>
}