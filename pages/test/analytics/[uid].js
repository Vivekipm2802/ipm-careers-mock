import React, { useEffect, useState } from 'react';
import { useNMNContext } from "@/components/NMNContext";
import QuestionGrid from "@/components/QuestionGrid";
import ScoreFall from "@/components/ScoreFallChart";
import TimeAnalysis from "@/components/TimeAnalysis";
import AnswerDistributionCharts from "@/components/AnswerDistribution";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { Button, Spacer, Tab, Tabs, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, RadioGroup, Radio } from "@nextui-org/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import QuestionGridConcept from '@/components/QuestionGridConcept';
import TimeAnalysisConcept from '@/components/TimeAnalysisConcept';
import ScoreFallConcept from '@/components/ScoreFallConcept';
import Loader from '@/components/Loader';

const MockResult = ({ result }) => {
  const [questions, setQuestions] = useState();
  const [ats, setAts] = useState({ atsRank: 'Loading...', totalRank: 'Loading...' });
  const [filter, setFilter] = useState(0);
  const { userDetails, isRouting } = useNMNContext();
  const router = useRouter();
  const [activeQuestion,setActiveQuestion] = useState(undefined)

  useEffect(() => {
    if (result?.test_uuid) {
      getQuestions(result.test_uuid);
      getATSRank(result?.uid);
    }
  }, [result]);

  async function getQuestions(testUuid) {
    const { data, error } = await supabase.from('questions').select('*').eq('parent', testUuid.id);
    if (data) {
      setQuestions(data);
    }
  }

  async function getATSRank(uid) {
    const { data, error } = await supabase.rpc('get_row_rank', { uid_input: uid });
    if (data) {
      setAts({ atsRank: data[0]?.your_rank, totalRank: data[0]?.total_ats_rank });
    }
    if (error) {
      toast.error('Unable to Get ATS Rank');
      setAts({ atsRank: 'Error', totalRank: 'Error' });
    }
  }

  function getStatusCounts() {
    if (!questions || !result?.report) return {};

    let correctAnswersCount = 0;
    let wrongAnswersCount = 0;
    let notAnsweredCount = questions.length;
    let markedForReviewCount = 0;
    let answeredAndMarkedCount = 0;
    let positiveScore = 0;
    let negativeScore = 0;

    const totalScore = questions.length * 4;

    result.report.forEach(answer => {
      notAnsweredCount--;
      
      if (answer.isCorrect) {
        correctAnswersCount++;
        positiveScore += 4;
      } else {
        wrongAnswersCount++;
        negativeScore += 1;
      }

      if (result.data?.some(item => item.status === "review" && item.id === answer.id)) {
        if (answer.isCorrect) {
          answeredAndMarkedCount++;
          correctAnswersCount--;
        } else {
          markedForReviewCount++;
          wrongAnswersCount--;
        }
      }
    });

    const finalScore = positiveScore - negativeScore;

    return {
      correctAnswersCount: { name: "Correct", value: correctAnswersCount, fill: "#4caf50" },
      wrongAnswersCount: { name: "Wrong", value: wrongAnswersCount, fill: "#f44336" },
      markedForReviewCount: { name: "Marked for Review", value: markedForReviewCount, fill: "#ffeb3b" },
      answeredAndMarkedCount: { name: "Correct & Marked", value: answeredAndMarkedCount, fill: "#ff9800" },
      notAnsweredCount: { name: "Unanswered", value: notAnsweredCount, fill: "#9e9e9e" },
      totalScore: { name: "Total Marks", value: totalScore, fill: "#000" },
      score: { name: 'Score', value: finalScore, fill: '#0ff' },
      negativeScore: { name: 'Negative Score', value: negativeScore, fill: '#0ff' }
    };
  }

  function getSectionalScores() {
    if (!questions || !result?.report) {
      return {
        counts: { correct: 0, incorrect: 0, unattempted: 0 },
        scores: { positive: 0, negative: 0, total: 0 },
        maxPossibleScore: 0
      };
    }

    return questions.reduce((analysis, question) => {
      analysis.maxPossibleScore += 4;
      
      const reportItem = result.report?.find(item => item.id === question.id);
      
      if (!reportItem) {
        analysis.counts.unattempted++;
        return analysis;
      }

      if (reportItem.isCorrect) {
        analysis.counts.correct++;
        analysis.scores.positive += 4;
      } else {
        analysis.counts.incorrect++;
        analysis.scores.negative += 1;
      }
      
      analysis.scores.total = analysis.scores.positive - analysis.scores.negative;
      return analysis;
    }, {
      counts: { correct: 0, incorrect: 0, unattempted: 0 },
      scores: { positive: 0, negative: 0, total: 0 },
      maxPossibleScore: 0
    });
  }

  const getAttemptedQuestionCount = () => result?.report?.length || 0;
  const getQuestionCount = () => questions?.length || 0;

  function printPage() {
    window.print();
  }

  const table = [
    { key: 'Participant Name', value: result?.name },
    { key: 'Test Center Name', value: 'IPM Careers Online Portal' },
    {
      key: 'Test Date',
      value: `${CtoLocal(result.created_at).dayName}, ${CtoLocal(result.created_at).date} ${CtoLocal(result.created_at).monthName}, ${CtoLocal(result.created_at).year}`
    },
    { key: 'Subject', value: result?.test_uuid?.title }
  ];

  const testData = getStatusCounts();

  if (userDetails == undefined) {
    return (
      <div className="w-full h-screen justify-center items-center flex flex-col">
        You cannot access this without logging in
        <Button className="border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank">
          Login
        </Button>
      </div>
    );
  }

  if (questions == undefined || result == undefined) {
    return (
      <div className='flex flex-col relative justify-center align-middle items-center text-center font-sans h-screen w-full'>
        
        <Loader></Loader>
        Loading...
      </div>
    );
  }

  return (
    <div className="p-2 flex flex-col md:flex-row-reverse md:flex-nowrap flex-wrap md:p-4 lg:p-6">
      <Modal isOpen={activeQuestion != undefined} onClose={()=>{setActiveQuestion(undefined)}}>
        <ModalContent>
          <ModalHeader>
            Question ID : {activeQuestion?.id}
          </ModalHeader>
          <ModalBody className='max-h-[70vh] overflow-auto'>
            <div className='text-sm' dangerouslySetInnerHTML={{__html:activeQuestion?.question}}></div>
            <Chip color='primary'>Question Type : {activeQuestion?.type == "options" ? 'MCQ':'Answer'}</Chip>
           {activeQuestion?.type =="options" ? 
            <RadioGroup value={result && result?.report?.find(item=>item.id == activeQuestion?.id) && result?.report?.find(item=>item.id == activeQuestion?.id)?.selectedOption - 1}>
            {activeQuestion && activeQuestion?.options?.map((option,index)=>{
              return <Radio key={index} value={index} isDisabled >{option.title}</Radio>
            })}</RadioGroup>: <div>
             Answer : {result && result?.report?.find(item=>item.id == activeQuestion?.id) && result?.report?.find(item=>item.id == activeQuestion?.id)?.answer}
              </div>}
            <Chip color='success'>Solution</Chip>
            <div dangerouslySetInnerHTML={{__html:activeQuestion?.explanation}} className='border-1 text-sm border-green-400 rounded-xl p-2 bg-green-50'>
              
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" color='danger' onPress={()=>{setActiveQuestion(undefined)}}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <div className="flex flex-col px-4 md:px-0 items-start justify-start">
        <div className="w-full flex sticky top-0 bg-white p-2 z-10 flex-row mb-4 items-center justify-end">
        
          <Spacer x={2}/>
          <Button 
            className="border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" 
            onPress={printPage}
          >
            Print
          </Button>
        </div>

        <div className="w-full md:max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-200 text-white p-6">
            <img src="/newlog.svg" alt="Logo" className="w-48 h-auto mb-4" />
            <h2 className="text-2xl text-primary font-bold">Results Summary</h2>
          </div>
          <div className="p-6 text-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold text-gray-700 w-1/2">Key</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-700 w-1/2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-2 px-4 font-medium text-gray-900">{item.key}</td>
                      <td className="py-2 px-4 text-gray-700">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xl my-6 border-1 p-4 rounded-xl shadow-sm">
          <QuestionGridConcept 
            filter={filter} 
            questions={questions} 
            result={result}
            openQuestion={(e)=>{setActiveQuestion(e)}}
          />
        </div>

        {testData?.negativeScore?.value > 0 && (
          <div className="w-full max-w-xl my-6 border-1 p-4 rounded-xl shadow-sm">
            You have got <strong><span className="text-red-500">{testData?.negativeScore?.value} Negative Marks</span></strong>.
            You could have scored <strong className="text-lime-600">{testData?.score?.value + testData?.negativeScore?.value}</strong> without negative marks
          </div>
        )}
      </div>

      <Spacer x={4}/>

      <div className="mt-6 md:mt-12 px-4 md:px-0 flex-1 flex flex-col items-start justify-start">
        <div className="flex flex-col mr-2 mt-2 space-y-2">
       {/*    <Tabs onSelectionChange={(e) => setFilter(e)} size='sm'>
            <Tab key={0} title={'All'} />
            <Tab key={1} title={result?.test_uuid?.title} />
          </Tabs> */}
        </div>

        <Spacer y={4}/>

        <div className="w-full p-4 rounded-lg gap-4 flex flex-row flex-wrap items-center justify-start bg-white shadow-sm border-1">
         {/*  <div className="bg-gray-100 rounded-xl p-4">
            <h2 className="text-sm font-bold">Your ATS Rank</h2>
            <p className="my-2 text-lg">
              <span className="text-2xl font-bold">{ats?.atsRank}</span>/{ats?.totalRank}
            </p>
          </div> */}
          <div className="bg-gray-100 rounded-xl p-4">
            <h2 className="text-sm font-bold">Your Score</h2>
            <p className="my-2 text-sm">
              <span className="text-2xl font-bold">{testData?.score?.value}</span>/{testData?.totalScore?.value}
            </p>
          </div>
          <div className="bg-lime-200 rounded-xl p-4">
            <h2 className="text-sm font-bold">Your Score without Negative Marks</h2>
            <p className="my-2 text-sm">
              <span className="text-2xl font-bold">{testData?.score?.value + testData?.negativeScore?.value}</span>
            </p>
          </div>
          <div className="bg-red-200 text-red-500 rounded-xl p-4">
            <h2 className="text-sm font-bold">Negative Marks</h2>
            <p className="my-2 text-sm">
              <span className="text-2xl font-bold">{testData?.negativeScore?.value}</span>
            </p>
          </div>
        </div>

        <div>
          <Table className="mt-4 w-full" layout="fixed">
            <TableHeader>
              {['Item', 'No of Questions', 'Attempts', 'Correct', 'Incorrect', 'Unattempted', 'Score', "Max Score"].map((key) => (
                <TableColumn key={key}>{key}</TableColumn>
              ))}
            </TableHeader>
            <TableBody>
              <TableRow className="bg-blue-50">
                <TableCell>{result?.test_uuid?.title}</TableCell>
                <TableCell>{getQuestionCount()}</TableCell>
                <TableCell>{getAttemptedQuestionCount()}</TableCell>
                <TableCell>{getSectionalScores().counts.correct}</TableCell>
                <TableCell>{getSectionalScores().counts.incorrect}</TableCell>
                <TableCell>{getSectionalScores().counts.unattempted}</TableCell>
                <TableCell>{getSectionalScores().scores.total}</TableCell>
                <TableCell>{getSectionalScores().maxPossibleScore}</TableCell>
              </TableRow>
             
            </TableBody>
          </Table>
        </div>

        <Spacer y={4}/>
        
        <TimeAnalysisConcept
          filter={filter} 
          questions={questions} 
          report={result?.report}
        />
        <ScoreFallConcept
          testData={testData} 
          filter={filter} 
          questions={questions} 
          report={result?.report}
        />
        {/* <AnswerDistributionCharts 
          getQuestionCount={getQuestionCount}
          getAttemptedQuestionCount={getAttemptedQuestionCount}
          getSectionalScores={getSectionalScores}
        /> */}
      </div>
    </div>
  );
};

export default MockResult;

export async function getServerSideProps(context){


    const {data,error} = await serversupabase.from('plays').select('*,test_uuid(*)').eq('uid',context.query.uid)
    if(data && data?.length > 0){}

    console.log(data,error)
    
    if(data?.length == 0 || error){
      return {notFound:true}
    }
    
      return {props:{result:data[0]}}
    }