"use client"

import React from 'react'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react"

function convertSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
  
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
    return parts.join(' ');
}

export default function TimeGapChart({report, sections, modules, questions, filter}) {
    const CustomTooltip = ({ active, payload, label, question }) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-white p-4 border border-gray-300 rounded shadow-md">
              <p>Question Number : {questions.findIndex(item=>item.id == payload[0]?.payload?.id)}</p>
              <p className="text-sm font-semibold">Answered at: {convertSeconds(label)} seconds</p>
              <p className="text-sm">Time Taken: {convertSeconds(payload[0].value)} seconds</p>
            </div>
          )
        }
        return null
    }

    // Sort the data by 'at' property
    const sortedData = [...report?.filter(item => filter > 0 ? sections.filter((item,index) => index + 1 == filter):true)].sort((a, b) => a.at - b.at)

    // Calculate time gaps and determine colors with correct second bar color
    const chartData = sortedData.map((item, index, array) => {
        const timeGap = index === 0 ? item.at : item.at - array[index - 1].at
        let color;
        
        if (index === 0) {
            color = '#4caf50'; // First bar is always green
        } else {
            const prevTimeGap = array[index - 1].at - (index > 1 ? array[index - 2].at : 0);
            color = timeGap > prevTimeGap ? '#f44336' : '#4caf50';
        }

        return {
            id: item.id,
            at: item.at,
            timeGap,
            color
        }
    })

    return (
        <Card shadow='none' className="w-full border-1 border-gray-200 shadow-md">
            <CardHeader className="flex flex-col items-start px-6 py-4">
                <h4 className="text-2xl font-bold text-primary">Your Time Analysis</h4>
                <p className="text-sm text-foreground-500">Time difference between consecutive answers (first from start)</p>
                <Chip color='primary' size='sm' className='my-2'>You took {convertSeconds(chartData[0]?.at)} seconds to answer first question</Chip>
            </CardHeader>
            <CardBody className="overflow-hidden">
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart style={{fontSize:'0.9rem'}} data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <XAxis 
                                dataKey="at" 
                                tickFormatter={(value) => convertSeconds(value)}
                                style={{fontSize:'0.7rem'}}
                                label={{ value: 'Event Time (seconds)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                                style={{fontSize:'0.7rem'}}
                                label={{ value: 'Time Gap (seconds)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="timeGap"
                                fill="#8884d8"
                                barSize={10}
                                shape={(props) => {
                                    const { x, y, width, height, payload } = props;
                                    return (
                                        <rect
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            rx="2"
                                            ry="2"
                                            fill={payload.color || '#8884d8'}
                                        />
                                    );
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardBody>
        </Card>
    )
}