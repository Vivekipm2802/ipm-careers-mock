import styles from './TypeSpace.module.css';
import {useState,useEffect} from 'react';

function TypeSpace(props) {

const [active,setActive] = useState(false);
const [text,setText] = useState('');



    return(<div className={styles.inputholder}>

        <input onClick={()=>{setActive(true)}} readOnly={!active} pattern="[0-9]*" type={"number"} className={styles.input} value={text} onBlur={()=>{setActive(false)}} onChange={(e)=>{setText(e.target.value)}}></input>
        
        <div className={styles.texthold}>{text && text.split('').map((i,d)=>{return <span className={styles.letter}>{i}</span>})}{!text && text.length == 0 && !active ? <p className={styles.instruct}>Click to Type Here...</p>:''}{active?<div className={styles.blinker}></div>:''}</div>
   <button onClick={()=>{props.handleSubmit(text),setText('')}} className={styles.submit}>SUBMIT</button>
    </div>)
}

export default TypeSpace;