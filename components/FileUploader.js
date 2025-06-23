import axios from 'axios';
import { useEffect, useState } from 'react'
import styles from './ImageUploader.module.css'
import { toast } from 'react-hot-toast';

function FileUploader(props) {

const [file,setFile] =useState(props?.data?.file ? props.data.file  : undefined);
const [loading,setLoading] = useState(false)



useEffect(()=>{

    if(props?.data?.file && props?.data?.file != file){
        setFile(props?.data?.file)
    }
},[props?.data?.file])



async function uploadFile(a){

setFile(undefined)


  
    setLoading(true)
    if(!a){
        toast.error('File Empty')
        setLoading(false)
return 
    }
    if (a.size > 55548576) {
        toast.error('File size exceeds the limit of 55.5MB');
        setLoading(false)
        return; // Stop executing the function
      }


     

     

     
    const imageData = new FormData;
    
    
    imageData.append('file',a);
    
 
    
    axios.post('https://supabase.pockethost.io/api/collections/study_material/records',imageData,{
        headers: {
            
            'Content-Type': 'multipart/form-data'
          }
    }).then(resa=>{
        setLoading(false)
        const r = resa.data;
        props?.onUploadComplete(`https://supabase.pockethost.io/api/files/${r.collectionId}/${r.id}/${r.file}`)
        
      
    }).catch(res=>{
        setLoading(false)
    })
    
    
    
    }

    return <div className={" rounded-full relative p-2 m-2 border-1 border-primary bg-gray-200 !text-black opacity-100 " + (file != undefined ? 'bg-green-500 text-white':'')} >
<input type={"file"} className=' opacity-0 absolute left-0 top-0 w-full h-full ' onChange={(e)=>{uploadFile(e.target.files[0])}}></input>
<div className='flex flex-row items-center justify-center'>
{file == undefined ? <div className="text-xs p-2 flex flex-row items-center">
<svg className='mr-2' width="18" height="18" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.25 3.495h13.498a.75.75 0 0 0 .101-1.493l-.101-.007H5.25a.75.75 0 0 0-.102 1.493l.102.007Zm6.633 18.498L12 22a1 1 0 0 0 .993-.884L13 21V8.41l3.294 3.292a1 1 0 0 0 1.32.083l.094-.083a1 1 0 0 0 .083-1.32l-.083-.094-4.997-4.997a1 1 0 0 0-1.32-.083l-.094.083-5.004 4.996a1 1 0 0 0 1.32 1.499l.094-.083L11 8.415V21a1 1 0 0 0 .883.993Z" fill="#444"/></svg>
    Click Here to Upload/Update File</div>:
    ''
    }

{!loading && file != undefined? 
    <div className={'flex flex-row items-center justify-center ' + (file != undefined ? 'text-white':'')}><svg className='mr-2' width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6a2 2 0 0 0 2 2h6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6Z" fill="#222F3D"/><path d="M13.5 2.5V8a.5.5 0 0 0 .5.5h5.5l-6-6Z" fill="#222F3D"/></svg>
    {file.split('/')[7]||'file.png'}
    </div>
:''}</div>
{loading? <div className={styles.loader}>

<svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
<path opacity="0.2" fill-rule="evenodd" clip-rule="evenodd" d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#000000"/>
<path d="M2 12C2 6.47715 6.47715 2 12 2V5C8.13401 5 5 8.13401 5 12H2Z" fill="#fff"/>
</svg>
</div>:''}


    </div>
}

export default FileUploader;