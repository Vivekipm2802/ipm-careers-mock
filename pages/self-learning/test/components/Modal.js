import { useEffect, useState,useRef } from 'react'

import styles from './Modal.module.css'
import { motion, useDragControls,AnimatePresence } from 'framer-motion'




export default function DraggableModal(props){
const [fullscreenMode,setFullScreenMode] = useState(false)
const constraintsRef = useRef(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    const updateConstraints = () => {
      if (constraintsRef.current) {
        const rect = constraintsRef.current.getBoundingClientRect();
        setConstraints({
          left: 0,
          right: window.innerWidth - rect.width,
          top: 0,
          bottom: window.innerHeight - rect.height
        });
      }
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);

    return () => {
      window.removeEventListener('resize', updateConstraints);
    };
  }, []);
  
function handleReset(){

}
    
return(<>
    
   
           
           
           <AnimatePresence mode='wait'>
           {props?.open ? 
           <motion.div 
           
           
         key="modal1"
         drag
        dragElastic={0.2}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        
        exit={{ opacity: 0, scale: 0.9 }}
        
          className={styles.modal } 
          >
          
           
           <div
           
          
           className={styles.close} >
            <div className={styles.invisble} id="handle"></div>
            <a className={styles.minbtn} onClick={()=>{props.handleModal(false)}}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.498 12.504a1 1 0 0 1 .993.884l.007.116v7.504a1 1 0 0 1-1.993.117l-.007-.117v-5.093l-5.79 5.792a1 1 0 0 1-1.32.083l-.095-.083a1 1 0 0 1-.083-1.32l.083-.095 5.788-5.788H2.997a1 1 0 0 1-.117-1.993l.117-.007h7.501ZM13.5 2a1 1 0 0 1 .993.883L14.5 3v5.087l5.794-5.793a1 1 0 0 1 1.32-.084l.094.083a1 1 0 0 1 .083 1.32l-.083.095-5.796 5.795H21a1 1 0 0 1 .116 1.994l-.116.007h-7.502a1 1 0 0 1-.993-.883l-.007-.117V2.999a1 1 0 0 1 1-1Z" fill="#fff"/></svg>

            </a>
            <a className={styles.maxbtn} onClick={()=>{setFullScreenMode(fullscreenMode?false: true)}}>

            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.497 3.002 7.555.001.121.014.088.02.104.034.09.04.063.036.063.042.064.05.063.058.094.11.072.11.053.114.035.105.016.065.01.053.01.148v7.504a1 1 0 0 1-1.993.117l-.007-.117v-5.09L6.413 19h5.088a1 1 0 0 1 .993.884L12.5 20a1 1 0 0 1-.884.994l-.116.006L3.94 21l-.096-.01-.077-.015-.077-.022-.07-.026-.09-.042-.089-.053-.091-.07.032.027a1.006 1.006 0 0 1-.166-.166l-.051-.07-.04-.064-.032-.064-.034-.082-.025-.08-.024-.111-.007-.061-.004-.09v-7.503a1 1 0 0 1 1.993-.117l.007.117v5.088L17.583 5.002h-5.086a1 1 0 0 1-.993-.883l-.007-.117a1 1 0 0 1 1-1Z" fill="#fff"/></svg>
            </a>
           <a className={styles.closebtn} onClick={()=>{handleReset(),props.handleModal(false)}}>
           <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.883 3.007 12 3a1 1 0 0 1 .993.883L13 4v7h7a1 1 0 0 1 .993.883L21 12a1 1 0 0 1-.883.993L20 13h-7v7a1 1 0 0 1-.883.993L12 21a1 1 0 0 1-.993-.883L11 20v-7H4a1 1 0 0 1-.993-.883L3 12a1 1 0 0 1 .883-.993L4 11h7V4a1 1 0 0 1 .883-.993L12 3l-.117.007Z" fill="#222F3D"/></svg>
            </a></div> {props.children}</motion.div>:''}
            </AnimatePresence>
    
            </>

   )
}


