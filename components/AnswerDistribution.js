import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const SectionPieChart = ({ 
  sections, 
  getQuestionCount, 
  getAttemptedQuestionCount, 
  getSectionalScores 
}) => {
  // Color palette for the charts
  const COLORS = {
    correct: '#84ba0f',    // green
    incorrect: '#f03046',  // red
    unattempted: '#fcba03' // slate
  };

  // Prepare data for each section
  const getSectionData = (index) => {
    const sectionScores = getSectionalScores(index);
    return [
      { name: 'Correct', value: sectionScores?.counts?.correct || 0 },
      { name: 'Incorrect', value: sectionScores?.counts?.incorrect || 0 },
      { name: 'Unattempted', value: sectionScores?.counts?.unattempted || 0 }
    ];
  };

  // Prepare total data
  const getTotalData = () => {
    const totals = sections?.reduce((acc, _, index) => {
      const sectionScores = getSectionalScores(index);
      acc.correct += sectionScores?.counts?.correct || 0;
      acc.incorrect += sectionScores?.counts?.incorrect || 0;
      acc.unattempted += sectionScores?.counts?.unattempted || 0;
      return acc;
    }, { correct: 0, incorrect: 0, unattempted: 0 });

    return [
      { name: 'Correct', value: totals.correct },
      { name: 'Incorrect', value: totals.incorrect },
      { name: 'Unattempted', value: totals.unattempted }
    ];
  };

  const ChartCard = ({ title, data }) => (
    <div className="bg-white p-2 rounded-lg border-1 shadow-md shadow-gray-500/5">
      <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={50}
            innerRadius={10}
            style={{fontSize:"12px"}}
            label={({ name, value, percent }) => 
              `${name} (${value}) ${(percent * 100).toFixed(1)}%` 
            }
          >
            {data.map((entry) => (
              <Cell 
                key={entry.name} 
                fill={COLORS[entry.name.toLowerCase()]}
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [`${value} questions`, name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="w-full grid text-xs grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-0">
      {/* Individual section charts */}
      {sections?.map((section, index) => (
        <ChartCard
          key={section.id}
          title={`${section.subject.title}`}
          data={getSectionData(index)}
        />
      ))}
      
      {/* Total chart */}
      <ChartCard
        title="Total"
        data={getTotalData()}
      />
    </div>
  );
};

export default SectionPieChart;