import { Spinner } from "@nextui-org/react";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

function VideoUploader(props){

const [loading,setLoading] = useState(false)
const [video,setVideo] = useState()


useEffect(()=>{

   props?.value != undefined  ? setVideo(props?.value) : ''
},[props?.value])

function getFileTitle(fileName) {
    // Split the file name by dot to separate the name and extension
    const parts = fileName.split('.');
    
    // Join all parts except the last one to get the title
    const title = parts.slice(0, -1).join('.');
    
    return title;
}
async function uploadVideo(videoFile) {
    console.log('Testing')
    setLoading(true);

    if (!videoFile) {
        alert('File Empty');
        setLoading(false);
        return;
    }
const fileTitle = getFileTitle(videoFile.name);
    const formData = new FormData();
    formData.append('data', videoFile);

    const libraryId = 222139;
    const uploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos`;

    try {
        const response = await axios.post(uploadUrl, {
            title:fileTitle
        }, {
            headers: {
                'AccessKey': process.env.NEXT_PUBLIC_BUNNYCDN_KEY,
                'Content-Type': 'application/json'
            }
        });

        const videoGuid = response.data.guid;
        const videoUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoGuid}`;
           await axios.put(videoUrl,videoFile,{
            headers: {
                'AccessKey': '7e64539e-50c4-4276-9e444f0c639a-8783-45bf',
                'Content-Type': 'application/octet-stream',
                "Accept":'application/json'
            }
        })
        const videoUrlFinal  = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoGuid}?autoplay=false`;
        toast.success('Uploaded')
        setVideo(videoUrlFinal);
        props.onComplete(videoUrlFinal);

        setLoading(false);
    } catch (error) {
        setLoading(false);
        console.error('Error uploading video:', error);
        // Handle error as needed
    }
}
    return <div>
        
        <div className="flex flex-row items-center justify-center sf relative hover:bg-green-200 transition-all">
            <input onChange={(e)=>{uploadVideo(e.target.files[0])}} type="file" placeholder="Upload Video" className="absolute w-full h-full left-0 top-0 opacity-0 cursor-pointer" accept="video/*"></input>
      {loading ? <div className="w-full justify-start flex flex-row"><Spinner size="sm" className="mr-4"></Spinner> Uploading....</div> :  <>    
        <svg className="mr-2 pointer-events-none" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.25 4h11.5a3.25 3.25 0 0 1 3.245 3.066L21 7.25v9.5a3.25 3.25 0 0 1-3.066 3.245L17.75 20H6.25a3.25 3.25 0 0 1-3.245-3.066L3 16.75v-9.5a3.25 3.25 0 0 1 3.066-3.245L6.25 4h11.5-11.5Zm11.5 1.5H6.25a1.75 1.75 0 0 0-1.744 1.606L4.5 7.25v9.5a1.75 1.75 0 0 0 1.606 1.744l.144.006h11.5a1.75 1.75 0 0 0 1.744-1.607l.006-.143v-9.5a1.75 1.75 0 0 0-1.607-1.744L17.75 5.5Zm-7.697 4.085a.5.5 0 0 1 .587-.256l.084.033 4.382 2.19a.5.5 0 0 1 .076.848l-.076.047-4.382 2.191a.5.5 0 0 1-.716-.357L10 14.19V9.809a.5.5 0 0 1 .053-.224Z" fill="#222F3D"/></svg> <p className="pointer-events-none">Click here to Upload your Video</p> </> }
        </div>
    </div>
}
export default VideoUploader;