import { Reorder, useDragControls } from "framer-motion"

export default function DraggableItem({children,className,key,value,gripItem}){

    const controls = useDragControls()

    return <Reorder.Item dragListener={false} dragControls={controls} key={key} value={value} className={className}> {gripItem(controls)} {children}</Reorder.Item>
}