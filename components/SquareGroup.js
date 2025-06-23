
import { useEffect, useState } from 'react'
import styles from './SquareGroup.module.css'
import { Tooltip } from '@nextui-org/react';
import { useNMNContext } from './NMNContext';
import { toast } from 'react-hot-toast';
import { Lock } from 'lucide-react';

function SquareGroup({data,onClick,status,counts,entries,available}){







const [total,setTotal] = useState(data?.length || 0)
const [px,setPx] = useState(120);
const margin = 10;
const mode = "html";
const halfX = px/2 + margin;
const halfY = px/2 + margin/2;
const {isDemo} = useNMNContext()
useEffect(()=>{
    setTotal(Math.ceil(data?.length/3))
},[data])

if(mode == 'html'){

return<div>
<div className='flex flex-row w-full'>
{Array(Math.min(total,10)).fill().map((z,v)=>{

return <div className="flex flex-col">{data && data.slice(v*3,(v+1)*3).map((i,d)=>{
    return <div
    
    className={`${styles.square} ${d == 2 ? `-translate-y-[160px] lg:-translate-y-[205px] translate-x-[55px] lg:translate-x-[70px]`:''} ${isDemo ? 'grayscale opacity-80':''} sf w-[90px] lg:w-[120px] h-[90px] lg:h-[120px] m-2 flex relative flex-col text-center justify-center items-center align-middle text-white cursor-pointer`}
    onClick={()=>{isDemo ? toast.error('You must purchase a course to unlock'):onClick(i.module.id)}}
  >


    {counts != undefined && counts?.length > 0 && counts?.filter(item=> item.assignment_id == i.module.id)?.length > 0 ? 
    <Tooltip className='sf' content={`This module contains ${counts.filter(item=> item.assignment_id == i.module.id)[0]?.assignment_count} assignments`}> 
    <div className='bg-red-500 absolute z-10 rounded-full top-0 w-[24px] h-[24px] text-sm flex flex-col text-center align-middle items-center justify-center'>
        
     <span>{counts.filter(item=> item.assignment_id == i.module.id)[0]?.assignment_count}</span>
     </div></Tooltip>
    :''}
   
    <div className={`bg-secondary border-5 rounded-2xl border-primary w-full h-full absolute rotate-45 z-0 scale-[0.7] ${styles.bg}`} data-status={
    entries !== undefined && entries?.find(item => item.schedules.module === i.module.id)
    ? entries.filter(item => item.schedules.module === i.module.id)[0]?.status
    : available.find(item => item.module === i.module.id)
    ? 'available'
    : 'null'
}>

    </div>
<p className='z-10 relative text-white flex flex-col items-center justify-center p-5 text-xs'>{i.module.title}
{isDemo && <Lock className='text-white z-10'></Lock>}
</p>


  </div>
})}</div>
})}</div>


</div>

}


return <div>
    <div className='flex flex-row'>
{Array(Math.min(total,10)).fill().map((z,v)=>{

    return <div className="flex flex-col">{data && data.slice(v*3,(v+1)*3).map((i,d)=>{
        return <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 568.76 568.76"
        height={px + "px"}
        width={px + "px"}
        {...i?.props}
        className={`${styles.square} ${d == 2 ? ` -translate-y-[${halfX}px] translate-x-[${halfY}px]`:''} sf`}
        onClick={()=>{onClick(i.link)}}
      >
    
        <path
          transform="rotate(45 284.375 284.382)"
          fill="#283972"
          stroke="#ffd35b"
          strokeMiterlimit={10}
          strokeWidth="22px"
          d="M89.29 89.29H479.46000000000004V479.46000000000004H89.29z"
        />
        
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="86px" fontFamily='SF Pro Display' >
            
        {/*  {i.title != undefined && i.title.split(' ').join('\n').map((line, index) => (
          <tspan key={index}>{line}</tspan>
        ))} */}
        {i.title.split(' ').join('\n')}

      </text>
      </svg>
    })}</div>
})}</div>


</div>

}

export default SquareGroup;