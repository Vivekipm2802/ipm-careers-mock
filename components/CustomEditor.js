import React, { useState, useRef, useMemo } from 'react';

import styles from './CustomEditor.module.css'
import dynamic from 'next/dynamic';
const JoditEditor = dynamic(
  () => import('jodit-react'),
  { ssr: false}
)
function CustomEditor(props){

    const editor = useRef(null);

	const [content, setContent] = useState(props.data? props.data : '');
	const config = useMemo(() => ({
    askBeforePasteFromWord: false,
    askBeforePasteHTML: false,
    readonly: false,
  }), []);

    return <div className={styles.edit} >

    <JoditEditor
			ref={editor}
			value={content}
			config={config}
			tabIndex={1}
			onBlur={newContent => {setContent(newContent); props.onChange(newContent)}}
		/>

  </div>
}

export default CustomEditor;