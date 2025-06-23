import Navbar from '@/components/Navbar';
import styles from './DefaultLayout.module.css'
import { useNMNContext } from '@/components/NMNContext';
import { Button, Chip, Modal, ModalBody, ModalContent, ModalHeader } from '@nextui-org/react';
import ReportIssueForm from '@/components/ReportAnIssue';
import Link from 'next/link';



  




function DefaultLayout(props){

const {sideBar,setSideBar,sideBarContent,navitems,userCourses,isDemo,reportActive,setReportActive} = useNMNContext()
const accordian = navitems;


if(isDemo == true && userCourses?.length > 0){
    return <div className="w-full h-screen flex flex-col items-center justify-center">

<p  className='text-center text-lg'>
<svg className=' rotate-45 mx-auto' width="48" height="48" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 12 7Z" className='fill-red-500 '/></svg>
You have already enrolled in a course.<br/>
You cannot access demo mode.
</p>
<Button as={Link} href='/' className=' bg-gradient-purple text-white mt-4' size='sm'>Go to Back to Study Panel</Button>     
    </div>
}

    return <div className={styles.main}>
        <Modal isOpen={reportActive} onClose={()=>{setReportActive(false)}}>
            <ModalContent>
             
                <ModalBody>
                    <ReportIssueForm onClose={()=>{setReportActive(false)}}></ReportIssueForm>
                </ModalBody>
            </ModalContent>
        </Modal>
<div className={'w-full max-w-[800px] bg-white shadow-lg h-full fixed right-0 top-0 translate-x-full opacity-0 transition-all duration-250 z-50 '+ (sideBar == true ? ' !translate-x-0 !opacity-100':'')}>
<Button className='absolute top-1/2 rounded-r-none -left-8' isIconOnly color="primary" size='sm' onPress={()=>{setSideBar(false)}}><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z" fill="#ffffff"/></svg></Button>
    {sideBarContent}
</div>
        <div className={styles.left +" " + styles.gamecontainer + " bg-white shadow-xl px-2"}>
        <Chip size='sm' className='top-3 absolute left-1/2 -translate-x-1/2 ' color='success' classNames={{content:'text-[10px]'}} variant="flat">Beta Version : 0.9.0</Chip>
        <img className={styles.logo + " px-6"} width={300} src='/newlog.svg'/>
        
       
        <Navbar currentSlug={props?.currentSlug} changePage={(e)=>{props?.changePage  ? props.changePage(e) : ''}}  accordian={accordian} type={props.type || "user"}></Navbar>
        <div className={`lg:block hidden w-full absolute sf text-gray-500 text-center p-2 ${styles.bottom}`}>© 2024 IPM Careers. All rights reserved</div>
        </div>
        <div className={`${styles.right} bg-gray-200 p-2`}>
            
            {props.children}
        </div>

       
    </div>
}
export default DefaultLayout;