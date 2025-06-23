import dynamic from 'next/dynamic'

import QuillBetterTable from 'quill-better-table'

import { useEffect, useRef, useState } from 'react';
import ReactQuill , {Quill} from 'react-quill';

const QuillNoSSRWrapper = dynamic(import('react-quill'), {	
	ssr: false,
	loading: () => <p>Loading ...</p>,
	})


  
 



    export default function QuillWarapper({value,onChange}) {
      
     
     


const [isClient,setIsClient] = useState(false)
        const modules = {
         
            toolbar: [
              [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
              [{size: []}],
              ['bold', 'italic', 'underline', 'strike', 'blockquote'],
              [{'list': 'ordered'}, {'list': 'bullet'}, 
               {'indent': '-1'}, {'indent': '+1'}],
              ['link'],
              ['clean']
            
            ],
          };


useEffect(()=>{
    setIsClient(true)
},[])

        return <>{ReactQuill != undefined && <QuillNoSSRWrapper modules={modules} value={value} onChange={(e)=>{onChange(e)}}  theme="snow" />}</>
      }

