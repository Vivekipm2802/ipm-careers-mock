import Charts from "@/components/Charts";
import Loader from "@/components/Loader";
import { supabase } from "@/utils/supabaseClient";
import { Button, ButtonGroup, Tab, Tabs } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useMediaQuery } from "react-responsive";

function Results({result_id}){

const [userData,setUserData] = useState();
const [results,setResults] =useState();
const [resultInfo,setResultInfo] =useState();
const [loading,setLoading] = useState(true);
const [loading2,setLoading2] = useState(true);
const [activeButton,setActiveButton] = useState(0)

const isMobile = useMediaQuery({ query: '(min-width:968px)' })


    async function getUserData(){
        const {data} = await supabase.auth.getUser();
        
        if(data && data.user != undefined){
          setUserData(data.user)
          console.log(data.user)
        }
        else{
          setUserData('no data')
        }
      }

useEffect(()=>{


if(userData != undefined){
getResults(result_id,userData?.email)
}

},[userData])
useEffect(()=>{
    getUserData()
},[])

async function getResults(a,b){

    const {data,error} = await supabase.from('results').select('*,test(title,description,id)').match({'id':a,'email':b});
if(data){
    setResultInfo(data[0]);
    getResultDetails(result_id)
    setLoading(false)
}else{

    setLoading(false)
    toast.error('Error Loading Result Data')
}
}

async function getResultDetails(a){

    const {data,error} = await supabase.from('scores').select('*,module(title,id,subject(title))').match({'result_id':a});
    if(data){
        setResults(data);
        toast.success('😄 Loaded Results....')
        setLoading2(false)
    }else{
    
        setLoading2(false)
        toast.error('Error Loading Result Data')
    }
}

function calculateLevel(total, score) {
    // Calculate the range of each level
    const range = total / 4;

    // Determine which level the score falls into
    if (score <= range) {
        return 1;
    } else if (score <= range * 2) {
        return 2;
    } else if (score <= range * 3) {
        return 3;
    } else {
        return 4;
    }
}
const levels = [
    {
        title:'High Priority',
        priority:0,
        color:'bg-red-500 text-white'

    },
    {
        title:'Medium Priority',
        priority:1,
        color:'bg-yellow-300 '
        
    },
    {
        title:'Low Priority',
        priority:2,
        color:'bg-green-500 text-white'
        
    }
 
]

if( loading || loading2 || userData == undefined || resultInfo == undefined ){
    return <div className='w-full h-full min-h-[100vh] bg-white flex flex-col justify-center items-center align-middle'>
    <Loader></Loader>
    
      </div>
}
    return <div className="sf bg-gray-200 w-full h-full min-h-[100vh] flex flex-col items-stretch align-middle justify-center p-5">


       
<div className="w-full h-full absolute left-0 top-0 z-0 bg-repeat bg-[size:400px] mix-blend-multiply opacity-20" style={{backgroundImage:'url(/grid.jpg)'}}></div>

<div className="w-full z-10 max-w-[800px] mx-auto bg-white h-full min-h-[95vh] rounded-3xl shadow-md p-8 flex flex-col items-center align-middle justify-center">
<div className="flex-0 w-full flex flex-row justify-between">
<img src="/newlog.svg" width={250}/>
<div></div>
</div>
<div className="flex-1 w-full flex flex-col items-center align-middle justify-center">
    <p>Hi , {userData?.user_metadata?.full_name}</p>
<h2 className="text-xl font-bold mb-4">Your Personalized Result for {resultInfo.test.title} is Here</h2>
<Tabs isVertical={!isMobile} key={['SWOT Analysis','Analysis']} onSelectionChange={(e)=>{setActiveButton(e)}}>
    <Tab key={0} title="SWOT Analysis"></Tab>
    <Tab key={1} title="Sectional Performance"></Tab>
    <Tab key={2} title="Bar Graph Analysis"></Tab>
</Tabs>
<div className="min-h-[60vh] overflow-y-auto w-full flex flex-col justify-center items-center flex-wrap">
{activeButton == 0 ? 
 <div class="relative w-72 rounded-xl overflow-hidden h-72 bg-blue-200 flex mt-4">
 
 <div class="absolute w-1/2 h-1/2 bg-secondary flex flex-col justify-start items-start p-3 text-black">
    <h2 className="font-bold text-md">Strengths</h2>
    <p className="absolute right-0 -bottom-10 w-auto h-auto flex-col flex text-[100px] opacity-20 text-white">S</p>
    <div className="flex flex-col text-left text-sm justify-start max-h-[90%] overflow-y-auto">
{results && results.filter(item=> calculateLevel(item.total,item.score) == 4).map((i,d)=>{
    return <div>{i.module.title}</div>
})}</div>
 </div>
 <div class="absolute top-0 right-0 w-1/2 h-1/2 bg-[#fc3503] flex flex-col justify-start items-start p-3 text-white">
    <h2 className="font-bold text-md">Weaknesses</h2>
    <p className="absolute right-0 -bottom-10 w-auto h-auto flex-col flex text-[100px] opacity-10 text-black">W</p>


    <div className="flex flex-col text-left text-sm justify-start max-h-[90%] overflow-y-auto">
{results && results.filter(item=> calculateLevel(item.total,item.score) == 2).map((i,d)=>{
    return <div>{i.module.title}</div>
})}</div>

 </div>
 <div class="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#9fe007] flex flex-col justify-start items-start p-3 text-white">
    <h2 className="font-bold text-md">Opportunities</h2>
    <p className="absolute right-0 -bottom-10 w-auto h-auto flex-col flex text-[100px] opacity-10 text-black">O</p>

    <div className="flex flex-col text-left text-sm justify-start max-h-[90%] overflow-y-auto">
{results && results.filter(item=> calculateLevel(item.total,item.score) == 3).map((i,d)=>{
    return <div>{i.module.title}</div>
})}</div>

 </div>
 <div class="absolute right-0 bottom-0 w-1/2 h-1/2 bg-[#07c3e0] flex flex-col justify-start items-start p-3 text-black">
    <h2 className="font-bold text-md">Threats</h2>
    <p className="absolute right-0 -bottom-10 w-auto h-auto flex-col flex text-[100px] opacity-20 text-white">T</p>

    <div className="flex flex-col text-left text-sm justify-start max-h-[90%] overflow-y-auto">
{results && results.filter(item=> calculateLevel(item.total,item.score) == 1).map((i,d)=>{
    return <div>{i.module.title}</div>
})}</div>

 </div>
</div>
:''}

{activeButton == 1 ? 
<div className="w-full flex flex-col bg-white  flex-wrap">
{levels && levels.map((i,d)=>{
    return <div className="flex-0 w-full lg:flex-1 sf p-2 rounded-xl shadow-md my-2">
        <p className={`w-full p-1 text-center my-2 text-sm rounded-md ${i.color || 'bg-primary'}`}>{i?.title}</p>
      <div className="w-full flex flex-row flex-wrap justify-center">  {results && results.filter(item=>item.priority == i.priority).map((z,v)=>{
            return <div className="border-1 m-1 border-black rounded-full text-sm p-1 pl-4 mx-2">{z?.module?.title} <span className=" bg-secondary px-2 p-1 rounded-full text-black">Score :{z.score}/{z.total}</span></div>
        })} </div>
        
        </div>
})}</div>:''}
{activeButton == 2 ? 

<div className="w-full mx-auto rounded-lg mt-4 h-auto bg-white">
<Charts value={{
    height:"300px",
    width:"100%",
    type:"bar",
    bars:[
       
        {
            name:"Total",
            key:"b",
            color:"#e3cb32"
        },
        {
            name:"Score",
            key:"a",
            color:"#32bde3"
        }
    ],
data:results && results.map((i,d)=>{return {name:i?.module?.title , a : i.score , b : i.total}})

}}></Charts></div>


:""}
</div>

</div>
<div className="flex-1 w-full"></div>

</div>



    </div>
}

export default Results;

export async function getServerSideProps(context){

    const result_id = context.query.id;

    return {props:{result_id:result_id || null}}
}