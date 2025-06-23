import { useEffect } from "react";


function Caller(props){

useEffect(()=>{
    props?.onLoad()
},[])

    return <span></span>

}

export default Caller;