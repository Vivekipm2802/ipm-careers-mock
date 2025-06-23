import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import styles from './Navbar.module.css'

import { useRouter } from 'next/router';
import { logoutUser } from '@/supabase/userUtility';
import { Accordion, AccordionItem, Button, Divider } from '@nextui-org/react';
import { useNMNContext } from './NMNContext';
import { toast } from 'react-hot-toast';
import { Lock } from 'lucide-react';
const Navbar = ({  type , changePage, accordian , currentSlug }) => {
  const [showAdminItems, setShowAdminItems] = useState(type === 'admin' || type === "teacher");
const [active,setActive] = useState('dashboard');
const [isActive,setIsActive] = useState(false)

const router = useRouter();
  const handleItemClick = (action) => {
    // Perform the action based on the item's "action" property
    switch (action) {
      case 'logout':
        logoutUser(router);
        break;
      case 'profile':
        // Handle profile page navigation
        break;
      // Add more cases for other actions
      default:
        break;
    }
  };
/* 
useEffect(()=>{
  console.log(currentSlug,items)
},[
  currentSlug
]) */
const {setProfileModal,setCoursesModal,setRedeemActive,userDetails,ctxSlug,setCTXSlug,sk,setSK,isDemo}  = useNMNContext()
function convertToWebP(url) {
 
  if(url == undefined){
    return null
  }
 
 
  

  // Insert transformation options into the URL
  const parts = url.split("/");
  const uploadIndex = parts.indexOf("upload") + 1;
  const transformation = "c_fill,w_256,h_256,f_webp";

  // Insert the transformation
  parts.splice(uploadIndex, 0, transformation);

  // Reconstruct the URL
  const transformedUrl = parts.join("/");
  return transformedUrl;
}
const profile=[
  {
    title:'Profile Details',
    action:()=>{setProfileModal(true)},
    itemClass:""
  },
  {
    title:'Courses Enrolled',
    action:()=>{setCoursesModal(true)},
    itemClass:""
  },
  {
    title:'Redeem Code',
    action:()=>{setRedeemActive(true)},
    itemClass:""
  },
  {
    title:'Report an Issue',
    action:()=>{setRedeemActive(true)},
    itemClass:""
  },
  {
    title:'Logout',
    action:()=>{logoutUser(router)},
    itemClass:"!text-red-500"
  }
]



  return (
    <nav className={styles.nav}>

      <div onClick={()=>{setIsActive(!isActive)}} className={styles.navopener +  " transition-all z-10 rounded-full bg-primary fixed bottom-[25px] left-[25px] lg:hidden p-3 shadow-md hover:shadow-primary" + ` ${isActive ? styles.activeButton: ''}`}>
      <svg className={styles.ham} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.75254 17.9997H21.2525C21.6668 17.9997 22.0025 18.3355 22.0025 18.7497C22.0025 19.1294 21.7204 19.4432 21.3543 19.4928L21.2525 19.4997H2.75254C2.33832 19.4997 2.00254 19.1639 2.00254 18.7497C2.00254 18.37 2.28469 18.0562 2.65077 18.0065L2.75254 17.9997H21.2525H2.75254ZM2.75254 11.5027H21.2525C21.6668 11.5027 22.0025 11.8385 22.0025 12.2527C22.0025 12.6324 21.7204 12.9462 21.3543 12.9959L21.2525 13.0027H2.75254C2.33832 13.0027 2.00254 12.6669 2.00254 12.2527C2.00254 11.873 2.28469 11.5592 2.65077 11.5095L2.75254 11.5027H21.2525H2.75254ZM2.75168 5.00293H21.2517C21.6659 5.00293 22.0017 5.33872 22.0017 5.75293C22.0017 6.13263 21.7195 6.44642 21.3535 6.49608L21.2517 6.50293H2.75168C2.33746 6.50293 2.00168 6.16714 2.00168 5.75293C2.00168 5.37323 2.28383 5.05944 2.64991 5.00978L2.75168 5.00293H21.2517H2.75168Z" fill="white"/>
</svg>

<svg className={styles.close} width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.883 3.007 12 3a1 1 0 0 1 .993.883L13 4v7h7a1 1 0 0 1 .993.883L21 12a1 1 0 0 1-.883.993L20 13h-7v7a1 1 0 0 1-.883.993L12 21a1 1 0 0 1-.993-.883L11 20v-7H4a1 1 0 0 1-.993-.883L3 12a1 1 0 0 1 .883-.993L4 11h7V4a1 1 0 0 1 .883-.993L12 3l-.117.007Z" fill="white"/></svg>

      </div>
      <div className={`${styles.navslide} ${isActive ? styles.activeNav: ''} lg:hidden  fixed flex flex-row left-0  bottom-0 w-full  h-full z-0 backdrop-blur-sm ${isActive ? "pointer-events-all" : "pointer-events-none"}`}>
<div className='w-full max-w-[90%] flex flex-col bg-white lg:p-0 p-3 shadow-lg h-full'>
<div className='flex flex-row justify-start p-2 align-bottom items-center mt-2'>
<svg className='hover:bg-gray-200 transition-all cursor-pointer mr-4 rounded-full' onClick={()=>{setIsActive(false)}} width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#222F3D"/></svg>
<img src='/newlog.svg' width={150} className='flex object-cover'/>

</div>

<Divider className='my-4'></Divider>
<h2 className='px-2 text-sm mb-0 bg-gradient-purple text-white p-2 font-bold rounded-lg'>Hi, Welcome back {userDetails?.user_metadata?.full_name}</h2>
      <Accordion itemClasses={{subtitle:"text-xs text-gray-400"}}  className='flex lg:hidden max-h-[90vh] overflow-auto w-full p-2 flex-col flex-nowrap' selectedKeys={sk} onSelectionChange={(e)=>{setSK(new Set(e))}} fullWidth showDivider={false} isCompact>
      <AccordionItem key={'User Profile'} className='w-full font-sans' title={'Your Profile'} subtitle={'Manage your Profile'} startContent={<img src={convertToWebP(userDetails?.user_metadata?.profile_pic) ?? '/defprofile.svg'} className='w-8 h-8 rounded-full object-cover'/>}>


      <ul className={"flex-col flex w-full overflow-hidden text-sm " + " " + (isActive ? styles.activeMain : '')}>
            {profile && profile.map((z,v)=>{
              
             
        return <li  key={v} onClick={()=>{z.action(),setIsActive(false)}} className={(ctxSlug == z.action ? styles.active : '') + " relative !mx-0 !my-1 border-t-1 !rounded-none hover:bg-yellow-100" + " " + z.itemClass} style={{animationDelay:(v + 1)*30 + "ms"}}>
        <>
          <div className={styles.clickable} >
           <a> {z.icon}</a>
          </div>
          <p className=' text-center rounded-xl w-full '>{z.title}</p></>
        
        </li>
            
        })}
          </ul>


      </AccordionItem>


        {accordian && accordian?.map((i,d)=>{
          return <AccordionItem key={i.title} startContent={i.icon || ''} className='w-full font-sans' title={i.title} subtitle={i?.subtitle}>
          <ul className={"lg:hidden flex-col flex w-full overflow-hidden border-1 p-5 rounded-lg !px-1 border-gray-200 bg-gray-200" + " " + (isActive ? styles.activeMain : '')}>
            {i?.items && i?.items?.map((z,v)=>{
              
              if (z.type === 'admin' && !showAdminItems) {
                return null;
              }
        return <li  key={v} onClick={()=>{setCTXSlug(z.action),setIsActive(false)}} className={(ctxSlug == z.action ? styles.active : '') + " relative !mx-0 !my-1"} style={{animationDelay:(v + 1)*30 + "ms"}}>
        <>
          <div className={styles.clickable} onClick={() => handleItemClick(z.action)}>
           <a> {z.icon}<p className='hidden md:block'>{z.title}</p></a>
          </div>
          <p className='md:hidden  text-center rounded-xl w-full '>{z.title}</p></>
        
        </li>
            
        })}
          </ul>
          </AccordionItem>
        })}

        

        
              </Accordion>
              <div className='flex mt-auto flex-row items-center justify-around flex-shrink-0 max-h-[200px] w-full p-4 text-white font-bold text-xl  bg-primary rounded-xl'>

                Have a <br/>doubt ?
                <Button color='secondary' size='sm' as={Link} href='tel:+918299470392'>Connect with Us</Button>
              </div>
             


<div className={`lg:hidden block bottom-1 text-xs w-full  font-sans text-gray-500 text-center p-2 ${styles.bottom}`}>© 2024 IPM Careers. All rights reserved</div>
        
</div>
<div className='flex flex-1 h-full bg-transparent cursor-pointer' onClick={()=>{setIsActive(false)}}></div>
      </div>
      

      <Accordion itemClasses={{subtitle:"text-xs text-gray-400",title:"text-sm font-medium"}} selectedKeys={sk} onSelectionChange={(e)=>{setSK(new Set(e))}} showDivider={true} className='hidden lg:flex w-full p-2 flex-col flex-nowrap max-h-[70vh] overflow-y-auto' fullWidth isCompact>
        
{accordian && accordian?.map((i,d)=>{
  return <AccordionItem isDisabled={isDemo && i.demo === false} startContent={isDemo && i.demo === false ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 16 16" id="Lock-Fill--Streamline-Mingcute-Fill" height="32" width="32"><desc>Lock Fill Streamline Icon: https://streamlinehq.com</desc><g fill="none" fill-rule="evenodd"><path d="M15 0v15H0V0h15ZM7.870625 14.536249999999999l-0.006874999999999999 0.00125 -0.044375 0.021875000000000002 -0.0125 0.0025 -0.00875 -0.0025 -0.044375 -0.021875000000000002c-0.00625 -0.0025 -0.011875 -0.000625 -0.015 0.003125l-0.0025 0.00625 -0.010625 0.2675 0.003125 0.0125 0.00625 0.008125 0.065 0.04625 0.009375 0.0025 0.0075 -0.0025 0.065 -0.04625 0.0075 -0.01 0.0025 -0.010625 -0.010625 -0.266875c-0.00125 -0.00625 -0.005625 -0.010625 -0.010625 -0.01125Zm0.16562500000000002 -0.07062500000000001 -0.008125 0.00125 -0.115625 0.058124999999999996 -0.00625 0.00625 -0.001875 0.006874999999999999 0.01125 0.26875 0.003125 0.0075 0.005 0.004375 0.12562500000000001 0.058124999999999996c0.0075 0.0025 0.014374999999999999 0 0.018125000000000002 -0.005l0.0025 -0.00875 -0.02125 -0.38375c-0.001875 -0.0075 -0.00625 -0.0125 -0.0125 -0.013749999999999998Zm-0.44687499999999997 0.00125a0.014374999999999999 0.014374999999999999 0 0 0 -0.016875 0.00375l-0.00375 0.00875 -0.02125 0.38375c0 0.0075 0.004375 0.0125 0.010625 0.015l0.009375 -0.00125 0.12562500000000001 -0.058124999999999996 0.00625 -0.005 0.0025 -0.006874999999999999 0.010625 -0.26875 -0.001875 -0.0075 -0.00625 -0.00625 -0.11499999999999999 -0.057499999999999996Z" stroke-width="1"></path><path fill="#5b5b5b" d="M3.75 5a3.75 3.75 0 1 1 7.5 0h0.625a1.25 1.25 0 0 1 1.25 1.25v6.25a1.25 1.25 0 0 1 -1.25 1.25H3.125a1.25 1.25 0 0 1 -1.25 -1.25V6.25a1.25 1.25 0 0 1 1.25 -1.25h0.625Zm3.75 -2.5a2.5 2.5 0 0 1 2.5 2.5H5a2.5 2.5 0 0 1 2.5 -2.5Zm1.25 6.25a1.25 1.25 0 0 1 -0.625 1.0825V10.625a0.625 0.625 0 1 1 -1.25 0v-0.7925A1.25 1.25 0 0 1 7.5 7.5a1.25 1.25 0 0 1 1.25 1.25Z" stroke-width="1"></path></g></svg> : i.icon || ''} key={d} className='w-full font-sans' title={i.title} subtitle={i?.subtitle}>
  <ul className={"lg:flex flex-col hidden w-full overflow-hidden   p-2 border-gray-200  rounded-md !px-1" + " " + (isActive ? styles.activeMain : '')}>
    {i?.items && i?.items?.map((z,v)=>{
      
      if (z.type === 'admin' && !showAdminItems) {
        return null;
      }
      if(isDemo && z.demo != undefined && z?.demo == false){

       return  <li  key={v} onClick={()=>{toast.error('Purchase a Course to Unlock')}} className={"opacity-70 border-t-1 relative grayscale !rounded-none transition-all !mx-0 !my-0 hover:brightness-95"} style={{animationDelay:(v + 1)*30 + "ms"}}>
       <>
         <div className={styles.clickable} onClick={() => {}}>
          <a> <Lock size={16}></Lock><p className='hidden md:block'>{z.title}</p></a>
         </div>
         <p className='md:hidden absolute left-[70px] text-left top-[50%] bg-white rounded-xl shadow-md p-2 w-auto -translate-y-[50%]'>{z.title}</p></>
       
       </li>
      }

return <li  key={v} onClick={()=>{setCTXSlug(z.action)}} className={(ctxSlug == z.action ? styles.active : ' border-t-1 border-gray-300 ') + " relative !rounded-none transition-all !mx-0 !my-0 hover:brightness-95"} style={{animationDelay:(v + 1)*30 + "ms"}}>
<>
  <div className={styles.clickable} onClick={() => handleItemClick(z.action)}>
   <a> {z.icon}<p className='hidden md:block'>{z.title}</p></a>
  </div>
  <p className='md:hidden absolute left-[70px] text-left top-[50%] bg-white rounded-xl shadow-md p-2 w-auto -translate-y-[50%]'>{z.title} test</p></>

</li>
    
})}
  </ul>
  </AccordionItem>
})}
      </Accordion>
    </nav>
  );
};

export default Navbar;
