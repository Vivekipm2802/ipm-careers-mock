import { supabase } from "@/utils/supabaseClient";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect } from "react";




function IsAdminCheck(props){

async function checkUser(){
    const { data: { user } } = await supabase.auth.getUser();


    isAdmin(user.email)

    
if(user != undefined ){
    return true
}else {
    return false
}



}

async function isAdmin(a){

    
   await axios.post('/api/isAdmin',{
        
        email:a
    }).then(res=>{
      if(res.data.success){
      }
      else{
        
router.push('/')
      }
    })
}

const router = useRouter();
   useEffect(()=>{

   
    if(checkUser()){
       
    }

    else {
        router.push('/login')
    }

   },[])

    return props.children
}

export default IsAdminCheck;