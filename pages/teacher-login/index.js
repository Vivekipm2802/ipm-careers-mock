import Notifications from '@/components/Notification';
import { supabase } from '@/utils/supabaseClient';

import { useRouter } from 'next/router';

import { useEffect, useState } from 'react'
import styles from './Login.module.css'
import { Button, Spacer, CircularProgress, Spinner, Modal, ModalBody, ModalContent, ModalHeader, Input, ModalFooter } from '@nextui-org/react';
import axios from 'axios';



function TeacherLogin(){

const [isSignUp,setIsSignUp] = useState(true);
const [formData,setFormData] = useState();
const [isPasswordVisible,setIsPasswordVisible] = useState();
const [loading,setLoading] = useState(false);
const [isChanging,setIsChanging] = useState(false);
const [notificationText,setNotificationText] = useState();
const [fpModal,setFPModal] = useState(false);
const [fpData,setFPData] = useState();
const [fpUpdate,setFPUpdate] = useState();
const [passwordModal,setPasswordModal] = useState(false);
const router = useRouter();

function setNotification(de){

    setNotificationText(de);
    setTimeout(()=>{setNotificationText()},2500);
  }
  
async function getRole(a){
    const {data,error} = await supabase.rpc('get_user_role_by_email',{email_address:a})
    if(data){
        console.log(data);
        return data
    }
    else{
        console.log(error)
    }
}

async function handleSignUp(){
    setLoading(true)
    const { data, error } = await supabase.auth.signUp(
        {
          email: formData.email,
          password: formData.password,
        
        options:{
          data: {
            full_name: formData.fullname,
            role:"teacher",
            city : formData.city,
            phone:formData.phone,
           
            
          }}
        }
      )
  
      if(data){
        setLoading(false)
        setNotification('Confirmation Email Sent',false);
        setIsSignUp(false)
        
        }
  
        else if(error){
            setLoading(false)
          
            if(error.status == 400){
                setLoading(false)
                setNotification('User Already Registered',true)
            }else{
  
  setNotification(error.message,true)
                
            }
        }
        
        else{
            setLoading(false)
        }
  }
function Switch(){

    setIsChanging(true);

    setTimeout(()=>{
        isSignUp ? setIsSignUp(false) : setIsSignUp(true);
        setIsChanging(false)
    },500)
}
useEffect(()=>{

  if(router.query.s && router.query.s == 1 ){
    setIsSignUp(true)
  } else if(router.query.s && router.query.s == 0 ){
    setIsSignUp(false)
  }
},[router])


async function getUser(){
    const {data} = await supabase.auth.getUser();
   
    if(data && data?.user != undefined){
        console.log(data?.user)
        const role = await getRole(data?.user?.email);
       if(role == "teacher"){
        router.push('/teacher')
       }
       if(role == "user"){
        router.push('/')
       }
       }

   if(!data || data?.user == undefined){
return null
   }
   
 
   
}
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
useEffect(()=>{
   getUser();
   
},[])

async function handleSignIn(){

    if(formData == undefined){
        setNotification('Empty Login Details')
        return null
    }

    if(formData?.email == undefined){
        setNotification('Email Empty or Invalid')
        return null
    }
    if(formData?.password== undefined){
        setNotification('Password Empty or Invalid')
        return null
    }
    if(await getRole(formData?.email) != "teacher"){
        setNotification("this account doesn't belong to a teacher")
        return null
    }
    setLoading(true)
    const {data,error} = await supabase.auth.signInWithPassword({
        email: formData.email,
        password:  formData.password,
      },
        {
            redirectTo: '/'
          }
      )
  
    if(data && data.user && data.session){
    
        console.log(router)
if(router.query.redirect_to != undefined){

    router.push(router.query.redirect_to)
}

else{
    router.push('/teacher')
   
}
        setNotification('Logged in Successfully',false);
       
           
       
        setLoading(false)
    }
  
    else if(error){
      
        setNotification(error.message,true);
        
        setLoading(false)
    }
  
    
  }


  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

async function forgotPassword(a){
  if(a == null || !validateEmail(a) ){
    setNotification('Email Empty or Invalid')
    return null
  }
  const { data, error } = await supabase.auth.resetPasswordForEmail(a,{redirectTo:'https://study.ipmcareer.com/teacher-login'})

if(data){
  setNotification('Sent Reset Link to your Email')
  setFPModal(false)
}
else{
  setNotification('Unable to send reset link')
}

}

useEffect(() => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event == "PASSWORD_RECOVERY") {
     setPasswordModal(true)
     
    }
  })
}, [])

async function updatePassword(a){
if(a == undefined || a?.length < 8){
setNotification('Password Must be atleast 8 characters long')
return null
}


const { data, error } = await supabase.auth
.updateUser({ password: a })

if (data) {
  setNotification('Password Update Now Login')
  setPasswordModal(false)
}
if (error){
  setNotification('Error updating password')
  
}
}


    return <>
    <div className={styles.maincont}>
    {notificationText && notificationText.length > 2 ? <Notifications text={notificationText} /> : ''}
        


    <Modal placement='center' className='sf overflow-hidden' isOpen={passwordModal} backdrop='opaque' onClose={()=>{setPasswordModal(false)}} isDismissable={false}  classNames={{backdrop:"opacity-10 bg-overlay/5"}} scrollBehavior="inside">
<ModalContent>
{(onClose)=>(<>
    <ModalHeader className={`flex flex-col gap-1 justify-start items-start text-black`}>
    <h2 className='text-black'>Enter New Password</h2>
    </ModalHeader>
    <ModalBody> 

<Input label="New Password" placeholder='Enter New Password' onChange={(e)=>{setFPUpdate(e.target.value)}}></Input>

    </ModalBody>
    
    <ModalFooter>
<Button color='danger' variant='faded' onPress={()=>{setPasswordModal(false)}}>Cancel</Button>
<Button color='primary' onPress={()=>{updatePassword(fpUpdate)}}>Update Password</Button>

    </ModalFooter>
     </>)}</ModalContent></Modal>


    <Modal placement='center' className='sf overflow-hidden' isOpen={fpModal} backdrop='opaque' onClose={()=>{setFPModal(true)}} isDismissable={false}  classNames={{backdrop:"opacity-10 bg-overlay/5"}} scrollBehavior="inside">
<ModalContent>
{(onClose)=>(<>
    <ModalHeader className={`flex flex-col gap-1 justify-start items-start text-black`}>
    <h2 className='text-black'>Enter your Email to Reset Password</h2>
    </ModalHeader>
    <ModalBody> 

<Input label="Your Email" placeholder='Enter your Email' onChange={(e)=>{setFPData(e.target.value)}}></Input>

    </ModalBody>
    
    <ModalFooter>
<Button color='danger' variant='faded' onPress={()=>{setFPModal(false)}}>Cancel</Button>
<Button color='primary' onPress={()=>{forgotPassword(fpData)}}>Send Reset Link</Button>

    </ModalFooter>
     </>)}</ModalContent></Modal> 

        <div className={styles.col1 + " relative"}>
        <img className={styles.logo} width={400} src='/newlog.svg'/>
        <div></div>
            <div className={styles.bgfill}></div>
            <div className={styles.form + " " + (isChanging? styles.hid : '')}>
       <h2 style={{color:'var(--brand-col1)'}}>{isSignUp? "Sign Up as a Teacher Now":"Login as a Teacher"}</h2>
       <p className={styles.txt}>{isSignUp? "Already have an Account ? ":"Haven't Signed Up Yet ? "}<span className={styles.log} onClick={(e)=>{Switch() }}>{isSignUp? "Sign In":"Sign Up Now"}</span></p>
       <Spacer y={1}></Spacer>
    {isSignUp ?  <input name={"name"} className={styles.input} placeholder={"Enter your Full Name"} type={"text"} value={formData && formData.fullname} onChange={(e)=>{setFormData(res=>({...res,fullname:e.target.value})) }}/>:''}
     <input name={"email"} className={styles.input} placeholder={"Enter your Email Address"} type={"text"} value={formData && formData.email} onChange={(e)=>{setFormData(res=>({...res,email:e.target.value})) }}/>
     {isSignUp ?<input name={"phone"} className={styles.input} placeholder={"Enter your Phone Number"} type={"text"} maxLength={10} value={formData && formData.phone} onChange={(e)=>{setFormData(res=>({...res,phone:e.target.value})) }}/>:''}
     {isSignUp ?<input name={"city"} className={styles.input} placeholder={"Enter your City"} type={"text"} value={formData && formData.city} onChange={(e)=>{setFormData(res=>({...res,city:e.target.value})) }}/>:''}
     {/* {isSignUp ?<input name={"date"} className={styles.input} placeholder={"Enter Date of Birth"} type={"date"}  value={formData && formData.dob} onChange={(e)=>{setFormData(res=>({...res,dob:e.target.value})) }}/>:''} */}
    <div className={styles.password}><div className={styles.tog} onClick={()=>{isPasswordVisible?setIsPasswordVisible(false):setIsPasswordVisible(true)}}>{!isPasswordVisible?<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 9.005a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 5.5c4.613 0 8.596 3.15 9.701 7.564a.75.75 0 1 1-1.455.365 8.503 8.503 0 0 0-16.493.004.75.75 0 0 1-1.455-.363A10.003 10.003 0 0 1 12 5.5Z" fill="#BDC3C8"/></svg>:<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.22 2.22a.75.75 0 0 0-.073.976l.073.084 4.034 4.035a9.986 9.986 0 0 0-3.955 5.75.75.75 0 0 0 1.455.364 8.49 8.49 0 0 1 3.58-5.034l1.81 1.81A4 4 0 0 0 14.8 15.86l5.919 5.92a.75.75 0 0 0 1.133-.977l-.073-.084-6.113-6.114.001-.002-6.95-6.946.002-.002-1.133-1.13L3.28 2.22a.75.75 0 0 0-1.06 0ZM12 5.5c-1 0-1.97.148-2.889.425l1.237 1.236a8.503 8.503 0 0 1 9.899 6.272.75.75 0 0 0 1.455-.363A10.003 10.003 0 0 0 12 5.5Zm.195 3.51 3.801 3.8a4.003 4.003 0 0 0-3.801-3.8Z" fill="#BDC3C8"/></svg>}</div> <input name={"password"} className={styles.input} placeholder={"Enter Password"} type={isPasswordVisible ? "text" : "password"}  value={formData && formData.password} onChange={(e)=>{setFormData(res=>({...res,password:e.target.value})) }}/></div>
<Spacer y={1}></Spacer>
<Button color='primary' auto onClick={()=>{isSignUp?handleSignUp():handleSignIn()}} >{isSignUp? "Sign Up":"Sign In"}{loading? <><Spacer x={0.5}></Spacer><Spinner size="sm"  color={"default"} ></Spinner></>:''}</Button>
<p className='text-blue-500 text-sm my-2 cursor-pointer hover:text-blue-700' onClick={()=>{setFPModal(true)}}>Forgot Password?</p>
{/* <Button color='primary' onClick={()=>{getRole('officialnmn@gmail.com')}}>Get Role</Button> */}
</div>
<div></div>



        </div>
        <div className={styles.col2 + " !p-0"}>
<img className='w-full h-full object-cover' src='/coaching.webp'/>
            
        </div>
    </div>
    </>
}

export default TeacherLogin;