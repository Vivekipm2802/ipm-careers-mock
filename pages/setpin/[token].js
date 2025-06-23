import Loader from "@/components/Loader";
import {  serversupabase, supabase } from "@/utils/supabaseClient";


import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";


const Button = ({color,children,onPress}) =>{

    return <div className={`bg-${color} text-white font-sans font-medium rounded-lg sf px-5 py-2 cursor-pointer`} onClick={()=>{onPress()}}>{children}</div>
}


function setPIN({isExpired}){

const [pin,setPIN] = useState();
const [userData,setUserData] = useState();
const [loading,setLoading] = useState(true);
const [isTokenExpired,setTokenExpired] = useState(false)
const inputRefs = useRef([]);
const [isSet,setIsSet] = useState(false);



async function getUserData(){
    const {data} = await supabase.auth.getUser();
    
    if(data && data.user != undefined){
      setUserData(data.user)
      setLoading(false)
    }
    else{
      setUserData(undefined);
      setLoading(false)
    }
  }

  useEffect(()=>{
    getUserData();
    setTokenExpired(isExpired)
  },[])

function getPin(pin){

    return parseInt(Object.values(pin).join(''), 10) || 0
}


async function setPINCode(){

if(pin == undefined){
    alert('Please Enter 4 Digit PIN')
return null
}

const final = getPin(pin);

if (final == undefined || (final?.toString().length !== 4)) {
    alert('Please Enter 4 Digit PIN')
    return null;
}

console.log(final)

const {data,error} = await supabase.rpc('set_pin_hash',{pin_arg:final.toString(),email_arg:userData?.email})
if(data){
    /* console.log(data) */
    if(data == 'done'){
setIsSet(true)
setTimeout(()=>{
    router.push('/teacher')
},1200)
    }
}else{
    console.log(error)
}

}
const router = useRouter();

  const handleInputChange = (index, e) => {
    // Allow only single-digit numbers
    const inputValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);

    setPIN((prevPIN) => ({ ...prevPIN, ["p" + index]: inputValue }));

    // Focus on the next input if available
    const nextIndex = index + 1;
    if (nextIndex < inputRefs.current.length) {
      inputRefs.current[nextIndex].focus();
      
    }
  };

if(isTokenExpired){

    return <div className="w-full font-sans h-full min-h-[100vh] bg-white text-center flex flex-col align-middle items-center justify-center">Token Expired</div>
}

return <div className="w-full sf h-full min-h-[100vh] bg-gray-100 p-5 flex flex-row justify-center items-stretch align-middle">
    <div className="w-full max-w-[800px] bg-white shadow-md rounded-lg p-5 flex flex-col justify-start items-center align-top">
<img src="/newlog.svg" className="w-full max-w-[100px] my-3"/>

{loading == true ? 
<div className="flex flex-col w-full h-full justify-center align-middle items-center">
<Loader></Loader>

</div>
:<>
{userData != undefined? <> {isSet ? <div className="w-full h-full flex flex-col text-center justify-center align-middle items-center">
<h2 className="text-2xl font-bold text-black">
PIN has been set successfully

</h2></div>

: <>
<div className="flex flex-col font-sans justify-center align-middle items-center w-full h-full">
    <h2>Hi, {userData?.user_metadata?.full_name}</h2>
    <h2>Set your PIN</h2>
<div className="flex flex-row justify-center align-middle -mx-2">
{Array(4)
        .fill()
        .map((item, index) => (
          <input
        
          max={1}
          maxLength={1}
            key={index}
            value={pin?.["p"+index] || ""}
            ref={(el) => (inputRefs.current[index] = el)}
            className="flex w-[44px] text-center h-[44px] m-2 my-5 rounded-md border-1 border-[#aaa]"
            onChange={(e) => handleInputChange(index, e)}
          />
        ))}
        
        </div>

<Button color="primary" className="text-white" onPress={()=>{setPINCode()}}>SET PIN</Button>

</div></>}</>
:<div className="w-full">
    <h2>Not Logged In</h2>
    <Button color="primary" onPress={()=>{router.push(`/teacher-login?redirect_to=${router.asPath}`)}}>Login & Try Again</Button>
    </div>}</>}
</div>
</div>

}

export default setPIN;

export async function getServerSideProps(context){
    /*  const {req} = context;
     
    
      console.log(req,user,error)
   */
   
  

  
  const token = context?.query?.token;
  console.log(token)
  const { data,error } = await serversupabase
  .from('update_pin')
  .select("*")
  .match({ 'token': token }).is("pin_hash",null);
  
  

  
  
  return { props:{
      
      isExpired:data != undefined && data?.length > 0 ? false : true
  }
}
  
  }