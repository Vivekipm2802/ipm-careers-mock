import React from 'react';
import { Tooltip } from '@nextui-org/react';
import { STATUS_COLORS } from '../utils/gridHelpers';

const QuestionGridConcept = ({ result, questions, filter,openQuestion }) => {
  function getStatus(question) {
    const reportItem = result.report?.find((item) => item.id === question.id);
    const isReviewed = result?.data?.filter(item => item.status === "review")?.some(item => item.id === question?.id);

    if (!reportItem) {
      return {
        status: isReviewed ? 'Marked for Review' : 'Not Answered',
        color: isReviewed ? 'bg-yellow-600' : 'bg-gray-300'
      };
    }

    if (isReviewed) {
      return {
        status: 'Answered & Marked for Review',
        color: 'bg-purple-600'
      };
    }

    return {
      status: reportItem.isCorrect ? 'Correct Answer' : 'Not Correct',
      color: reportItem.isCorrect ? 'bg-green-500' : 'bg-red-500'
    };
  }

  // Group questions by subject for display
  const groupedQuestions = questions?.reduce((acc, question) => {
    const subject = result?.test_uuid?.title || 'Default';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(question);
    return acc;
  }, {});

  return (
    <div className="bg-white w-full">
      <h2 className="text-2xl font-bold mb-0 text-primary">Your Answer Streak</h2>
      <p className='mb-2 text-sm text-gray-500'>Observe your Answer Streak to determine your performance</p>
      <div className="flex flex-col">
        <div className="overflow-x-auto">
          <div className="flex flex-row flex-wrap gap-1 my-6" style={{ gridAutoFlow: 'column' }}>
            {Object.entries(groupedQuestions || {}).map(([subject, subjectQuestions], index) => (
              <div key={subject} className='p-2 rounded-xl border-1'>
                <div className='text-lg font-medium mb-2 w-full rounded-lg bg-gradient-purple text-white text-center p-2'>
                  {subject}
                </div>
                <div className='grid grid-cols-6 md:grid-cols-8 grid-rows-3 gap-2 md:gap-1 mb-4 mr-4'>
                  {subjectQuestions.map((question, q_ind) => (
                    <Tooltip 
                      key={question.id}
                      content={
                        <div className='flex flex-col items-start justify-start' onClick={()=>{openQuestion(question)}}>
                          <p>Status: {getStatus(question).status}</p>
                          <p>Question Number: {q_ind + 1}</p>
                          <span className='text-sm text-primary font-semibold' >Click to View</span>
                        </div>
                      }
                    >
                      <div onClick={()=>{openQuestion(question)}} className={`w-9 md:w-6 rounded-lg h-9 md:h-6 text-[8px] hover:scale-110 border-2 border-white hover:shadow-md hover:brightness-90 transition-all flex flex-col items-center justify-center ${getStatus(question).color}`}>
                        <p className='md:hidden text-sm flex flex-col items-center justify-center font-semibold'>
                          {q_ind + 1}
                        </p>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-start md:justify-end">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Tooltip key={status} content={status.replace('_', ' ')} placement="top">
            <div className='flex flex-row items-center justify-start'>
              <div className={`w-3 h-3 rounded-sm ${color} mr-1`} />
              <p className='capitalize mr-2 text-xs'>{status.replace(/_/g, ' ')}</p>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default QuestionGridConcept;