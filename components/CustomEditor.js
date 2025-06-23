import React, { useState, useRef, useMemo, useEffect } from 'react';

import styles from './CustomEditor.module.css'
import dynamic from 'next/dynamic';
const JoditEditor = dynamic(
  () => import('jodit-react'),
  { ssr: false}
)
function CustomEditor(props){
  
    const editor = useRef(null);

/* 
    const handleFocus = () => {
      if (editor.current) {
        editor?.current.focus();
      }
    }; */
	const [content, setContent] = useState(props.data? props.data : '');
    /* const config = useMemo(() => ({
        readonly: false,
        placeholder: props.data || 'Start typings...',
      }), [props.data]); */
	const config= {
    askBeforePasteFromWord: false,
    askBeforePasteHTML: false
  }
	
    return <div className={styles.edit} >
    
    <JoditEditor
			ref={editor}
      key={props?.key}
			value={content}
			config={config}
      onBlur={() => editor.current?.focus()}
			tabIndex={1} // tabIndex of textarea
			/* onBlur={newContent => setContent(newContent)}  */// preferred to use only this option to update the content for performance reasons
			onChange={newContent => {setContent(newContent),props.onChange(newContent)}}
		/>
    
  </div>
}

export default CustomEditor;