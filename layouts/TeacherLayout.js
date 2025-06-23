import Navbar from '@/components/Navbar';
import styles from './DefaultLayout.module.css'
import { useNMNContext } from '@/components/NMNContext';





function TeacherLayout(props){


    const {navitems} = useNMNContext()
    
    return <div className={styles.main}>
        <div className={styles.left +" " + styles.gamecontainer +  " border-r-1"}>
        <img className={styles.logo + " px-8"} width={300} src='/newlog.svg'/>
        <Navbar  currentSlug={props?.currentSlug} changePage={(e)=>{props?.changePage  ? props.changePage(e) : ''}} accordian={

navitems
.filter(item => item.teacher === true) 
.map(item => ({
  ...item, 
  items: item.items ? item.items.filter(subItem => subItem.teacher === true) : [] 
}))
.filter(item => item.items.length > 0)
        } type={props.type || "user"}></Navbar></div>
        <div className={`${styles.right} `}>
            
            {props.children}
        </div>
    </div>
}
export default TeacherLayout;