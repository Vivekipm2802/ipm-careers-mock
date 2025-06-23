function ImageBlock(props){


    return <img style={styles.image} src={props.src}/>
}

const styles = {
    image:{
        maxWidth:"100%",
        maxHeight:"800px",
        objectFit:"cover",
        height:"auto",
        objectPosition:"left",
        borderRadius:"20px"
    }
}

export default ImageBlock;