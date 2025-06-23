import 'katex/dist/katex.min.css';

import ImageBlock from './ImageBlock';
import { BlockMath } from 'react-katex';
const CustomRenderMethod = (props) => {

    function identifyDataType(data) {
      
      try {
        const parsedJson = data;
        
        if (typeof parsedJson === 'object' || typeof parsedJson == 'array') {
        
          return true;
        }

        console.log(typeof parsedJson)

      } catch (error) {
        console.log(error)
        // Not a valid JSON
      }
    
      const htmlTags = /<([a-z][a-z\d]*)\b[^>]*>/gi;
      if (htmlTags.test(data)) {
        return false;
      }
    
      return false;
    }
  return<>
    {identifyDataType(props.data) ? <>
    {props.data && props?.data?.map((i,d)=>{
     
  if(i.type == "equation"){
    return <BlockMath >{i.latex}</BlockMath>
  }
  
  if(i.type == "lite"){
  
    return <div className='text-left text-sm' dangerouslySetInnerHTML={{__html:i.value}}></div>
  }
  if(i.type == "complex"){
    return <div className='text-left text-sm' dangerouslySetInnerHTML={{__html:i.value}}></div>
  }
  if(i.type == "image"){
    return <ImageBlock src={i.value}/>
  }
    })}
    </>:
    <div dangerouslySetInnerHTML={{__html:props.data}}></div>
  }</>
  
  }

  export default CustomRenderMethod;