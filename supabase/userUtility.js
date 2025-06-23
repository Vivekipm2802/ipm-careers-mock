import { supabase } from "@/utils/supabaseClient";




export async function logoutUser(router){
    const { error } = await supabase.auth.signOut();
    if(!error){
        router.push('/login')
    }else{
        return null
    }
    
}