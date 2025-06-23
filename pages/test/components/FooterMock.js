
import { Button, Checkbox, Spacer } from "@nextui-org/react"
import { useState } from "react"
import { toast } from "react-hot-toast";
import { useMediaQuery } from "react-responsive";
export default function FooterMock({state,isLoading,onNext,onInstruct,onPrev,onSubmit,onClear,onReview,onStart,index,config }){
 

const [checked,setChecked] = useState(false);

const isMobile = useMediaQuery({ query: '(max-width: 768px)' })

    return <div className="p-2 bg-primary-200 border-t-1 border-primary w-full flex-grow-0 flex-shrink-0 fixed left-0 bottom-0 md:relative">
        
        
        <div className='w-full flex flex-row items-center justify-start'>
        {state == 0 ? <div className="flex flex-col lg:flex-row items-center justify-center w-full">
        {index ==0 ? <>
            <Button endContent={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z" fill="#000"/></svg>} className="bg-gradient-to-r flex-shrink-0 from-secondary to-secondary-500 text-black shadow-md border-white border-1 shadow-secondary" onPress={()=>{onInstruct(1)}}>Next
            
            </Button>
        </>:''}
        {index ==1 ? <>
        <div className="flex flex-row items-center justify-start text-xs"><Checkbox size="md" color="success" className="bg-white rounded-xl mx-2 shadow-md"  isSelected={checked} onValueChange={(e)=>{setChecked(e)}}></Checkbox>I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of /not wearing /not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to a disciplinary action, which may include ban from future Tests/Examinations.</div>
        <Spacer y={1} x={1}></Spacer>
        <Button className="bg-gradient-to-r flex-shrink-0 from-primary to-primary-500 text-white shadow-md border-white border-1 shadow-primary mr-2" onPress={()=>{onInstruct(0)}} startContent={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#fff"/></svg>}>Prev</Button>
        <Spacer y={2} x={1}></Spacer>
        <Button className="bg-gradient-to-r flex-shrink-0 from-secondary to-secondary-500 text-black shadow-md border-white border-1 shadow-secondary" onPress={()=>{checked == true ? onStart():toast.error('Please Accept the Terms & Conditions before proceeding.')}}>I am ready to begin</Button>
        <Spacer y={1}></Spacer>
       
        </>:''}
        </div>:''}

           {state > 0 ?  <>{(config?.switch_questions && config?.switch_section) ?? false ? <div className="flex flex-row">
        <Button size='md' color='primary' className='text-white'onPress={()=>{onPrev()}}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="#fff"/></svg>
            Previous</Button>
       <Spacer x={2} y={2}></Spacer>
        <Button size='md' color='primary' className='text-white'onPress={()=>{onNext()}}>Next
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z" fill="#fff"/></svg>
        </Button></div>: ''}
        <div className={"flex-1 flex px-2 flex-row items-center justify-center" + ((config?.switch_questions && config?.switch_section)  ?? false ? '' : '!justify-start')}>
        <Button isIconOnly={isMobile} size={isMobile ?'sm' :'md'} color='default' className='text-black from-gray-50 to-gray-200 bg-gradient-to-t border-1 border-gray-400'onPress={()=>{onReview()}}>{isMobile ? <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6a2 2 0 0 0 2 2h6v10a2 2 0 0 1-2 2h-6.81A6.5 6.5 0 0 0 4 11.498V4a2 2 0 0 1 2-2h6Zm1.5.5V8a.5.5 0 0 0 .5.5h5.5l-6-6ZM1 17.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 0 0-11 0Zm4.75 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM4.5 16a2 2 0 1 1 4 0c0 .73-.212 1.14-.754 1.708l-.264.27-.116.124C7.083 18.421 7 18.63 7 19a.5.5 0 0 1-1 0c0-.73.212-1.14.754-1.708l.264-.27.116-.124c.283-.319.366-.527.366-.898a1 1 0 1 0-2 0 .5.5 0 0 1-1 0Z"  className="fill-neutral-500"/></svg>:'Mark for Review'}</Button>
        <Spacer x={2} y={2}></Spacer>
        <Button size={isMobile ?'sm' :'md'} color='default' className='text-black from-gray-50 to-gray-200 bg-gradient-to-t border-1 border-gray-400'onPress={()=>{onClear()}}>Clear {isMobile == false ? 'Response':''}</Button>
        <Spacer x={2} y={2}></Spacer>
        {config?.switch_questions && config?.switch_section  ?  '' :<Button size={isMobile ?'sm' :'md'}  color='primary' className='text-white' onPress={()=>{onNext()}}>Save & Next
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z" fill="#fff"/></svg>
        </Button>}
        </div>
        <div>
        <Button isLoading={isLoading} size={isMobile ?'sm' :'md'} color='default' className='text-white from-primary-600 shadow-md border-1 border-white to-primary bg-gradient-to-r px-3 lg:px-8' onPress={()=>{onSubmit()}}>Finish Test</Button></div>
        </>
:''}

      </div>
    </div>
}