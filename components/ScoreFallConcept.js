"use client";

import React from "react";
import {
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Cell,
} from "recharts";
import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

function convertSeconds(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export default function ScoreFall({ report, questions, testData }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 text-sm border border-gray-200 rounded shadow-md">
          <p>Question Number: {questions.findIndex((item) => item.id === data.id) + 1}</p>
          <p>
            Change in Score:{" "}
            {payload[0].payload.isCorrect ? (
              <span className="text-green-600 font-medium">{payload[0]?.payload?.scoreChange}</span>
            ) : (
              <span className="text-red-500 font-semibold">{payload[0]?.payload?.scoreChange}</span>
            )}
          </p>
          <p className={payload[0].payload.isCorrect ? "text-green-600" : "text-red-500"}>
            Score: {payload[0].payload.totalScore}
          </p>
        </div>
      );
    }
    return null;
  };

  // Sort the data by 'at' property and calculate cumulative score
  const chartData = report
    .sort((a, b) => a.at - b.at)
    .reduce((acc, answer, index) => {
      const prevTotal = index > 0 ? acc[index - 1].totalScore : 0;
      const scoreChange = answer.isCorrect ? 4 : -1; // Default scoring system (e.g., +4 for correct, -2 for incorrect)

      return [
        ...acc,
        {
          ...answer,
          scoreChange: scoreChange,
          totalScore: prevTotal + scoreChange,
        },
      ];
    }, []);

  const maxScore = Math.max(...chartData.map((d) => d.totalScore));
  const minScore = Math.min(...chartData.map((d) => d.totalScore));
  const absMax = Math.max(Math.abs(maxScore), Math.abs(minScore));

  return (
    <Card shadow="none" className="w-full border-1 my-4 border-gray-200 shadow-md">
      <CardHeader className="flex flex-col items-start px-6 py-4">
        <h4 className="text-2xl font-bold text-primary">Correct vs Wrong Answers</h4>
        <p className="text-sm text-foreground-500">Score progression throughout the test</p>
        <Chip color="primary" size="sm" className="my-2">
          Final Score: {testData?.score?.value}
        </Chip>
      </CardHeader>
      <CardBody className="overflow-hidden">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 95 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="at"
                tickFormatter={(value) => convertSeconds(value)}
                style={{ fontSize: "12px" }}
                label={{
                  value: "Time (seconds)",
                  position: "insideBottom",
                  offset: -15,
                  style: { fontSize: "14px" },
                }}
              />
              <YAxis
                style={{ fontSize: "12px" }}
                domain={[-absMax, absMax]}
                label={{
                  value: "Score",
                  angle: -90,
                  offset: 20,
                  position: "insideLeft",
                  style: { fontSize: "14px" },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="scoreChange"
                barSize={10}
                shape={(props) => {
                  const { x, y, width, height, fill } = props;
                  return (
                    <rect
                      x={x}
                      y={height < 0 ? y + height : y} // Adjust for negative values to go below the axis
                      width={width}
                      height={Math.abs(height)} // Ensure height is always positive
                      fill={fill}
                      rx={2}
                      ry={2}
                    />
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.scoreChange >= 0 ? "#4caf50" : "#f44336"} // Green for positive, red for negative
                  />
                ))}
              </Bar>
              <Line type="monotone" dataKey="totalScore" stroke="#8884d8" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
