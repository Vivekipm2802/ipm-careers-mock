import TeacherLayout from '@/layouts/TeacherLayout';
import styles from './Teacher.module.css'
import { useEffect, useState } from 'react';
import Webinars from '@/components/Webinars';
import { supabase } from '@/utils/supabaseClient';
import { Accordion, Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger, Spacer } from '@nextui-org/react';
import Tutorials from '@/components/Tutorials';
import Attendance from '@/components/Attendance';
import TeacherConfig from '@/components/TeacherConfig';
import { useRouter } from 'next/router';
import SWOTEditor from '@/components/SWOTEditor';
import Scheduler from '@/components/Scheduler';
import { logoutUser } from '@/supabase/userUtility';
import { useNMNContext } from '@/components/NMNContext';
import Concept from '@/components/ConceptTest';
import BatchCreator from '@/components/BatchCreator';
import Classes from '@/components/Classes';
import AccountManager from './components/AccountManager';
import Loader from '@/components/Loader';



function Teacher(props){


    
const [userData,setUserData] = useState()
const [isPIN,setIsPin] = useState();
const [configuration,setConfiguration] = useState();
    async function getUserData(){
        const {data} = await supabase.auth.getUser();
        
        if(data && data.user != undefined){
          setUserData(data.user)
          const role = await getRole(data?.user?.email);
          if(role == "teacher"){
           return null
          }
          if(role == "user"){
           router.push('/')
          }
        }
       

        else{
          setUserData('no data');
          router.push('/teacher-login')
        }
      }
useEffect(()=>{
    getUserData();
   
},[])
async function getRole(a){
  console.log(a)
  const {data,error} = await supabase.rpc('get_user_role_by_email',{email_address:a})
  if(data){
      console.log(data);
      return data
  }
  else{
      console.log(error)
  }
}



/* useEffect(() => {
  // Check if either config or isPin is undefined or an empty array
  if (!configuration || configuration.length === 0 || !isPIN || isPIN.length === 0) {
    // Revert the slug state to the default value
    setCTXSlug('config');
  }
}, [configuration, isPIN]); */

const {ctxSlug,setCTXSlug}= useNMNContext();
const slug = ctxSlug;

async function getConfiguration(){


  const {data,error} = await supabase.from('teacher_data').select("*").eq('email',userData?.email).limit(1)

  if(data && data?.length > 0){
    setConfiguration(data)
  }

  else{
    /* setCTXSlug('config') */
    
  }
}
async function getPIN(){


  const {data,error} = await supabase.from('update_pin').select("*").eq('email',userData?.email).limit(1)

  if(data && data?.length > 0){
    setIsPin(data)
  }

  else{
   /*  setCTXSlug('config') */
  }
}

const router= useRouter();
    useEffect(()=>{

      if(userData != undefined){
        getConfiguration();
        getPIN();
      }
      


    },[userData])
const handleItemClick = (action) => {
    // Perform the action based on the item's "action" property
    switch (action) {
     
        case 'dashboard':
            break;
      case 'profile':
      
      break;
          case 'prv':
       break;
        case 'config':
       getConfiguration();
       getPIN();
          break;
          case 'tutorial':
          /*   getTutorials();
            getTutorialCategories(); */
            break
          
      // Add more cases for other actions
      default:
        break;
    }
  };

if(userData == undefined){

  return <div className='w-full h-full min-h-[100vh] bg-white flex flex-col justify-center items-center align-middle'>
<Loader></Loader>

  </div>
}

  
    return <TeacherLayout type="teacher" currentSlug={ctxSlug} changePage={(e)=>{setCTXSlug(e),handleItemClick(e),console.log(e)}}>


<Dropdown className={styles.dropdown} placement="bottom-end">
      <DropdownTrigger>
      <div className={"fixed sf top-3 right-3 z-20 w-[44px] h-[44px] rounded-full shadow-lg overflow-hidden"}>
        <img src='https://t3.ftcdn.net/jpg/00/53/01/86/360_F_53018621_KQbIttjKsgF4LIH6JwpACBSdTHgepTLz.jpg'/>
      </div></DropdownTrigger>
       <DropdownMenu className='sf'>
        <DropdownSection>
        <DropdownItem showDivider={true} isReadOnly>
      
        {props?.type == "admin"  ? <div className='font-bold flex flex-row'><img className='mr-1' src='/crown.png' width={14}/>Admin</div>:''}
     <h2 style={{fontWeight:"500"}}> {userData?.user_metadata?.full_name}</h2>
     <p style={{color:"#666"}}> {userData?.email}</p>   
              
        </DropdownItem></DropdownSection>
        <DropdownSection>
        <DropdownItem onPress={()=>{setCTXSlug('config')}}>
        Profile Details
         </DropdownItem>
   
         
         
          <DropdownItem onPress={()=>{setCTXSlug('config')}}>
          Settings
         </DropdownItem>
         <DropdownItem onPress={()=>{logoutUser(router)}}>
        <p style={{color:"#f00"}}>Logout</p>
         </DropdownItem></DropdownSection>
       </DropdownMenu>
      </Dropdown>

      



<div className='p-4 relative rounded-lg bg-gray-50 h-full w-full overflow-hidden'>
{slug == "dashboard" ?  
<div className='w-full text-left sf'>
<h1 className='text-2xl from-primary to-primary-400 bg-gradient-to-r text-white p-4 rounded-xl font-semibold'>Hi {userData?.user_metadata?.full_name} ,<br/> Welcome Back</h1>

<div className='w-full flex flex-row items-start justify-center'>


<AccountManager></AccountManager>
<Spacer x={8}></Spacer>
<div className='flex-1'>
<Attendance userData={userData}></Attendance></div>
</div>
</div>

:''}
{slug == "webinars" ? <div className='h-full relative flex flex-col overflow-hidden'>
{/* <h2 className='text-left font-bold text-2xl'>Webinars</h2> */}

<Webinars data={userData} role={'admin'}></Webinars>

</div>:''}
{slug == "play" ? <div className='h-full relative flex flex-col overflow-hidden'>
{/* <h2 className='text-left font-bold text-2xl'>Webinars</h2> */}

<Concept userData={userData} role={'admin'}></Concept>

</div>:''}
{slug == "swot" ? <div className='w-full h-full'>
<SWOTEditor userData={userData} role={'admin'}></SWOTEditor>
</div>:""}
{slug == "tutorial" ? 
<Tutorials userData={userData} type={props?.type || "user"}></Tutorials>

:''}
{slug == "schedules" ? 
<Scheduler userData={userData} role={"teacher"}></Scheduler>

:''}
{slug == "batch-creator" ? 
<BatchCreator role='teacher'></BatchCreator>
:''}
{slug == "batch-wise" ? 
<Classes role="teacher"></Classes>
:''}

{slug == "config" ?  
<TeacherConfig getConfig={()=>{getConfiguration()}} userData={userData} config={configuration} pin={isPIN}></TeacherConfig>
:""}
{slug == "performance" ? <div className='w-full sf  h-full flex flex-col justify-center align-middle items-center'>
<h2 className='w-auto p-3 rounded-xl text-center font-bold bg-gray-200 flex flex-row'><svg className='mr-2' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C17.523 2 22 6.478 22 12C22 17.522 17.523 22 12 22C6.477 22 2 17.522 2 12C2 6.478 6.477 2 12 2ZM12 3.667C7.405 3.667 3.667 7.405 3.667 12C3.667 16.595 7.405 20.333 12 20.333C16.595 20.333 20.333 16.595 20.333 12C20.333 7.405 16.595 3.667 12 3.667ZM11.25 6C11.6295 6 11.9435 6.28233 11.9931 6.64827L12 6.75V12H15.25C15.664 12 16 12.336 16 12.75C16 13.1295 15.7177 13.4435 15.3517 13.4931L15.25 13.5H11.25C10.8705 13.5 10.5565 13.2177 10.5069 12.8517L10.5 12.75V6.75C10.5 6.336 10.836 6 11.25 6Z" fill="currentColor"/>
</svg>
Your Stats will be available soon</h2>

</div>:''}

{slug == "booking" ? <div className='w-full sf  h-full flex flex-col justify-center align-middle items-center'>
<h2 className='w-auto p-3 rounded-xl text-center font-bold bg-gray-200 flex flex-row'><svg className='mr-2' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C17.523 2 22 6.478 22 12C22 17.522 17.523 22 12 22C6.477 22 2 17.522 2 12C2 6.478 6.477 2 12 2ZM12 3.667C7.405 3.667 3.667 7.405 3.667 12C3.667 16.595 7.405 20.333 12 20.333C16.595 20.333 20.333 16.595 20.333 12C20.333 7.405 16.595 3.667 12 3.667ZM11.25 6C11.6295 6 11.9435 6.28233 11.9931 6.64827L12 6.75V12H15.25C15.664 12 16 12.336 16 12.75C16 13.1295 15.7177 13.4435 15.3517 13.4931L15.25 13.5H11.25C10.8705 13.5 10.5565 13.2177 10.5069 12.8517L10.5 12.75V6.75C10.5 6.336 10.836 6 11.25 6Z" fill="currentColor"/>
</svg>
Bookings will be available soon , We are on it 😄</h2>

</div>:''}

</div>
    </TeacherLayout>
}

export default Teacher;