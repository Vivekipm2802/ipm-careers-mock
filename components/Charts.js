import React, { useEffect, useState, PureComponent } from 'react';
import styles from './Charts.module.css'
import {BarChart,AreaChart,Area, Bar, Cell, XAxis,YAxis, CartesianGrid,Tooltip,Legend, ResponsiveContainer} from 'recharts'
function Charts(props){

    const [data,setData] = useState();
const sampleDatav = 
    {
        
            height:"300px",
            width:"100%",
            type:"bar",
            bars:[
                {
                    name:"React",
                    key:"a",
                    color:"red"
                },
                {
                    name:"Vue",
                    key:"b",
                    color:"green"
                }
            ],
            data:[

                {
                    name:'2020',
                    a:1000,
                    b:2000
                },
                {
                    name:'2021',
                    a:2050,
                    b:1000
                },
                {
                    name:'2022',
                    a:2000,
                    b:3000
                },
                {
                    name:'2022',
                    a:2000,
                    b:3000
                },
                {
                    name:'2022',
                    a:2000,
                    b:3000
                },
                {
                    name:'2022',
                    a:2000,
                    b:3000
                },
                {
                    name:'2022',
                    a:2000,
                    b:3000
                }
            ]
        
           


    }
       
   

    useEffect(()=>{
        setData(props.value)
    },[props?.value])


    return <>{data != undefined ? <div className={styles.parent} style={{height:data.height}}>

{data?.type == "bar" ? 
   <ResponsiveContainer width={data.width} height={"100%"}>
    
<BarChart
data={data.data}
margin={{ top: 10, right: 30, left: 0, bottom: 0 }} style={{fontFamily:'SF Pro Display',fontSize:'12px'}}
>

<CartesianGrid strokeDasharray={"4"}/>
<XAxis dataKey={"name"}/>
<YAxis/>
<Tooltip/>

<Legend/>
{data.bars && data.bars.map((i,d)=>{
    return <Bar dataKey={i.key} name={i.name} fill={i.color}/>
})}


</BarChart>


</ResponsiveContainer>: ''}



<>
{data?.type == "area" ?  <ResponsiveContainer width={data.width} height={"100%"}>
<AreaChart
data={data.data}
margin={{ top: 10, right: 30, left: 0, bottom: 0 }} style={{fontFamily:'SF Pro Display',fontSize:'12px'}}
>

<CartesianGrid strokeDasharray={"4"}/>
<XAxis dataKey={"name"}/>
<YAxis/>
<Tooltip/>
<Legend iconType="circle"/>

{data.bars && data.bars.map((i,d)=>{
    return <Area  dataKey={i.key} name={i.name} stroke={i.color} fill={i.color} fillOpacity={0.5}/>
})}


</AreaChart></ResponsiveContainer>: ''}</>
    </div>:''}</>
}

export default Charts;