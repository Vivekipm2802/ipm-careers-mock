import React, { useState, useEffect } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import { useTimer } from "react-timer-hook";
import CustomEditor from "@/components/CustomEditor";

export default function TimerTest() {
  

    const editor = [
        {
            key:'33'
        },
        {
            key:'33'
        },
        {
            key:'33'
        }
    ]

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen">
    <Popover>
        <PopoverTrigger>
<Button>Open Editor</Button></PopoverTrigger>
<PopoverContent className="overflow-hidden">
{editor && editor.map((i,d)=>{
    return <CustomEditor data={"<p>Start Writing Here...</p>"} onChange={(e)=>{console.log(e)}} key={i.key}></CustomEditor>
})}
</PopoverContent>
</Popover>
    
    </div>
  );
}
