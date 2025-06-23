import { useNMNContext } from "@/components/NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient"
import { Button, CircularProgress, Spacer } from "@nextui-org/react";
import _ from "lodash";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useCountdown } from "react-countdown-circle-timer";
import { toast } from "react-hot-toast";

export default function Classroom({data,notFound,isLive}){

    
    const t = useMemo(() => timeDifferenceInSeconds(data?.start_time), [data?.start_time]);
    const {remainingTime} = useCountdown({duration:t,key:"fejak",isPlaying:isLive == false,colors:"#abc"})
    function isExpired(a){

        const current = new Date();
        const end = new Date(a);
      console.log(current,end)
        return current > end
      }
    function timeDifferenceInSeconds(futureTime) {
        const futureDate = new Date(futureTime);
        const currentDate = new Date();
        
        const differenceInMillis = futureDate - currentDate;
        const differenceInSeconds = Math.floor(differenceInMillis / 1000);
        
        return differenceInSeconds;
      }
      const {userDetails} = useNMNContext() 
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

      const et = data;
async function sendEvent(){

    const r = toast.loading('Loading Class')
    const {data,error} = await supabase.from('class_events').insert({
        type:'open-class',
        class_id:et.id
    }).select()
if(error){
    toast.error('Error Redirecting')
}
    if(data){

        toast.remove(r)
        
        et?.url  ? router.push(et.url): toast.error('URL not found')

        toast.success('Redirected successfully')
    }

}

useEffect(()=>{
if(isLive == true && userDetails != undefined){

    sendEvent()
}

},[isLive,userDetails])




if(userDetails == undefined){

<Head>
    <title>Please Login/Signup</title>
    <meta name="description" content="Please login before you can access classes"/>

</Head>
    return <div className="w-full font-sans h-screen bg-gray-50 flex flex-col text-center items-center justify-center">

<h2>Please login to access this class.</h2>
<Spacer y={4}></Spacer>
         <Button color="primary" size="sm" as={Link} href={'/login'}>Login / SignUp</Button>
    </div>
}

    if(notFound == true){

        return <div className="w-full h-screen flex flex-col bg-gray-50 justify-center items-center">

<div>
            <Button color="primary" size="sm">Go Back to Dashboard</Button></div>
        </div>
    }

    return <div className="w-full flex flex-col h-screen justify-center items-center bg-gray-50">
<Head>
    <title>{data.batch_id?.title}</title>
    <meta name="description" content={data?.batch_id?.title}/>

</Head>

<div className='flex flex-col w-full h-screen fixed left-0 top-0 justify-start  md:justify-center items-center p-0 md:p-8 bg-gray-50'>
<div className='w-full max-w-[800px] mx-auto'>
    {isLive == false ? <>
<div className='w-full h-auto overflow-hidden rounded-none md:rounded-xl shadow-md border-1 border-gray-300'><img className='w-full h-full object-cover' src={data?.batch_id?.image??'/defaultbatch.svg'}/></div>
<div className='w-full bg-white shadow-md rounded-xl p-2 my-2 text-center '>
{/* <h3 className='text-xl font-semibold text-primary'>Test Date :  {CtoLocal(data.start_time).date} {CtoLocal(data.start_time).monthName} {CtoLocal(data.start_time).year} </h3>
<h3 className='text-xl font-semibold text-secondary'>Test Time : {CtoLocal(data.start_time).time} {CtoLocal(data.start_time).amPm} Onwards</h3> */}
{data?.end_time && isExpired(data?.end_time) ? <>
<p className='p-2 rounded-xl mt-4 bg-red-50 border-1 border-red-300 text-red-600'>Class has ended</p>
</>: <>
<p className='text-sm my-2'>Class is not yet started ,<br/> Please wait till class start time</p>
<p className='border-primary border-1 bg-primary-50 rounded-xl text-primary py-2 font-semibold'>Remaining Time : {convertSeconds(remainingTime)}</p></>}
</div>
</>:''}

{isLive == true ? 
<div className="text-center flex flex-col items-center justify-center">
    <p>
    You are being redirected to classroom</p>

    <CircularProgress></CircularProgress>

</div>
:''}

</div>
</div>

      
    </div>
}

export async function getServerSideProps(context) {
    const { data: is } = await supabase.rpc('is_within_time', { uuid_check: context.query.uuid });
  
    const { data: dat, error } = await serversupabase.from('classes').select('*,batch_id(image,id,created_at,title)').eq('uuid', context.query.uuid);
  
    if (error || dat?.length == 0) {
      return { notFound: true };
    }
  
    const isLive = is ?? false;
    const classData = isLive == true ? (dat && dat[0]) : { start_time: dat[0].start_time, end_time: dat[0].end_time };
  
    return {
      props: {
        
        data: classData,
        isLive: isLive,
      },
    };
  }
  