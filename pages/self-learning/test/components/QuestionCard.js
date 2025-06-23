import { Button, Divider, Input, Radio, RadioGroup, ScrollShadow, Spacer } from "@nextui-org/react";
import { useState } from "react";

export default function QuestionCard  ({question,onSelect,index,onReview }) {
    if (!question) {
      return <div>Question Undefined</div>;
    }
    const { id, title, type, questionimage, options, label } = question;
    const [selectedAnswer,setSelectedAnswer] = useState()
    const isDevelopment = process.env.NODE_ENV === 'development';
  

    
    return (
      <div className="font-sans w-full flex-1 flex flex-col text-left overflow-hidden">
        <div className="rounded-xl w-full h-full flex flex-col items-start justify-start  relative overflow-y-auto">
          <div className='w-full flex-1 h-full flex flex-col items-start justify-start p-4 lg:p-8'>
          <h2 className="font-medium text-md text-primary">Question {index}</h2>
          <Divider className="my-2" />
          <h2 className="font-bold text-2xl text-primary">
            {title} {isDevelopment && `Question ID ${id}`}
          </h2>
          <Spacer y={4} />
          <div className="w-full flex flex-col flex-1 mb-auto">
            <ScrollShadow 
              className="font-medium [&_*]:sm:!text-sm [&_*]:!text-xs [&_*]:!font-normal [&_*]:!font-sans text-sm qcontent overflow-y-auto max-h-[40vh] lg:max-h-[40vh]" 
              dangerouslySetInnerHTML={{ __html: question.question }}
            />
            <Spacer y={4} />
            <Divider />
            <Spacer y={4} />
            {questionimage && <img className="max-h-[30vh]" src={questionimage} alt="Question" />}
            <ul className="p-0">
              {type === "options" && (
                <RadioGroup 
                  label={label || 'Select the correct option'}
                  classNames={{label:"gradtext text-md font-bold"}}
                  
                  onValueChange={(e) => onSelect({  selectedOption: e , ...question })}
                >
                  {options.map((option, index) => (
                    <Radio className="flex flex-row items-center justify-start" value={index + 1} key={index}>
                      {option.image ? (
                        <img src={option.image} className="w-auto h-[64px] object-contain" alt={`Option ${index + 1}`} />
                      ) : (
                        <>
                          <p className="text-sm">{option.title}</p>
                          {isDevelopment && option.isCorrect && <div className="rounded-full w-1 h-1 bg-green-500" />}
                        </>
                      )}
                    </Radio>
                  ))}
                </RadioGroup>
              )}
              {type === "input" && (
                <>
                  <Spacer y={4} />
                  <Input
                    value={selectedAnswer}
                    onChange={(e) => onSelect({ id, value: e.target.value })}
                    placeholder="Enter your Answer Here"
                    label="Answer"
                  />
                  {isDevelopment && <div>Answer: {options.answer}</div>}
                  <Spacer y={4} />
                </>
              )}
            </ul>
          </div></div>
          <div className='sticky bg-white border-t-1 w-full bottom-0 p-4'>
  
            <Button color='primary' size='sm' onPress={()=>{onReview(question.id)}}>Mark this question for Review</Button>
          </div>
        </div>
      </div>
    );
  };
  