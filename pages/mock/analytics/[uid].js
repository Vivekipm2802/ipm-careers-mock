import AnswerDistributionCharts from "@/components/AnswerDistribution";
import Loader from "@/components/Loader";
import { useNMNContext } from "@/components/NMNContext";
import QuestionGrid from "@/components/QuestionGrid";
import ScoreFall from "@/components/ScoreFallChart";
import TimeAnalysis from "@/components/TimeAnalysis";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient"
import { Button, CircularProgress, Divider, Spacer, Tab, TableBody, TableCell, TableColumn, TableHeader,Table, TableRow, Tabs, Modal, ModalFooter, ModalHeader, ModalContent, ModalBody, Chip, RadioGroup, Radio } from "@nextui-org/react";
import { m } from "framer-motion";
import { Award, Crown, Trophy } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast";

export default function MockResult({result}){


  const [sections,setSections] = useState();
  const [modules,setModules] =useState();
  const [questions,setQuestions] = useState();
  const [ats,setAts] = useState({atsRank:'Loading...',totalRank:'Loading...'})
  const [filter,setFilter] = useState(0)
  const [activeQuestion,setActiveQuestion] = useState(undefined)


  


  const {userDetails,isRouting,setIsRouting} = useNMNContext()
  async function getSections(a){

    const {data,error} = await supabase.from('mock_groups').select('*,subject(*)').eq('test',a).order('seq',{ascending:true})
  if(data){
    
    setSections(data)
   getModules(data)
  }
  else{
   
    /* router.push('/login') */
  }
  }
  
  
  async function getModules(a){
  
    const {data,error} = await supabase.from('mock_groups').select('*,module(*)').in('parent_sub',a.map(i=>i.id))
  if(data){
    
    setModules(data)
   getQuestions(data)
  }
  else{
   
    /* router.push('/login') */
  }
  }
  async function getQuestions(a){

    const {data,error} = await supabase.from('mock_questions').select('*').in('parent',a.map(i=>i.module.id)).order('seq',{ascending:true})
if(data){
    
    setQuestions(data)
    /* if(data.length == 0){
        router.push('/404')
    } */
    getATSRank(result?.uid)
}
else{
  
}
}

async function getATSRank(a){

  const {data,error} = await supabase.rpc('get_row_rank',{uid_input:a}
  )

  if(data){
    setAts({atsRank:data[0]?.your_rank,totalRank:data[0]?.total_ats_rank})
  }
  if(error){
    toast.error('Unable to Get ATS Rank')
    setAts({atsRank:'Error',totalRank:'Error'})
    return
  }
}
useEffect(()=>{
  if(result != undefined){
  getSections(result?.test_id.id)}
},[])
function getStatus(a){

const answered = result.report;
const miscData = result.data;

  if(answered?.some(item=>item.id == a.id) && miscData?.filter(item=>item.status == "review").some(item=>item.id == a.id)){
    return 'Answered & Marked for Review'
  }

  if(answered?.some(item=>item.id == a.id)){
    return 'Answered'
  }
  if(miscData?.filter(item=>item.status == "review")?.some(item=>item.id == a.id)){
    return 'Marked for Review'
  }
  if(miscData?.some(item=>item.id == a.id)){
    return 'Not Answered'
  }
  return ''
}

const getQuestionCount = (sectionIndex) => {
  const section = sections[sectionIndex];
  if (!section) return 0;
  
  return modules
    ?.filter(item => item.parent_sub === section.id) // Get modules for this section
    .reduce((total, module) => {
      const questionCount = questions
        ?.filter(item => item.parent === module.module.id)
        ?.length || 0;
      return total + questionCount;
    }, 0);
};


const getAttemptedQuestionCount = (sectionIndex) => {
  const section = sections[sectionIndex];
  if (!section || !result?.report) return 0;
  
  return modules
    ?.filter(item => item.parent_sub === section.id) // Get modules for this section
    .reduce((total, module) => {
      // Get questions for this module
      const moduleQuestions = questions
        ?.filter(item => item.parent === module.module.id);
        
      // Count questions that have a matching report entry
      const attemptedCount = moduleQuestions?.reduce((count, question) => {
        const isAttempted = result.report.some(item => item.id === question.id);
        return count + (isAttempted ? 1 : 0);
      }, 0) || 0;
      
      return total + attemptedCount;
    }, 0);
};
const getSectionalScores = (sectionIndex) => {
  const section = sections && sections[sectionIndex];
  if (!section || !result?.report) {
    return {
      counts: { correct: 0, incorrect: 0, unattempted: 0 },
      scores: { positive: 0, negative: 0, total: 0 },
      maxPossibleScore: 0
    };
  }

  return modules
    ?.filter(item => item.parent_sub === section.id)
    .reduce((sectionTotals, module) => {
      const moduleQuestions = questions
        ?.filter(item => item.parent === module.module.id) || [];

      const moduleAnalysis = moduleQuestions.reduce((analysis, question) => {
        analysis.maxPossibleScore += section.pos;
        
        const reportItem = result.report?.find(item => item.id === question.id);
        
        if (!reportItem) {
          analysis.counts.unattempted++;
          return analysis;
        }

        const reportValue = reportItem.value - 1;
        const isCorrect = question.type === "options"
          ? question.options.findIndex(option => option.isCorrect) === reportValue
          : question.options.answer.trim() === reportItem.value.trim();

        if (isCorrect) {
          analysis.counts.correct++;
          analysis.scores.positive += section.pos;
        } else {
          analysis.counts.incorrect++;
          analysis.scores.negative += section.neg; // Now included in the table
        }

        return analysis;
      }, {
        counts: { correct: 0, incorrect: 0, unattempted: 0 },
        scores: { positive: 0, negative: 0, total: 0 },
        maxPossibleScore: 0
      });

      return {
        counts: {
          correct: sectionTotals.counts.correct + moduleAnalysis.counts.correct,
          incorrect: sectionTotals.counts.incorrect + moduleAnalysis.counts.incorrect,
          unattempted: sectionTotals.counts.unattempted + moduleAnalysis.counts.unattempted
        },
        scores: {
          positive: sectionTotals.scores.positive + moduleAnalysis.scores.positive,
          negative: sectionTotals.scores.negative + moduleAnalysis.scores.negative, // Carrying forward
          total: (sectionTotals.scores.positive + moduleAnalysis.scores.positive) - 
                (sectionTotals.scores.negative - moduleAnalysis.scores.negative)
        },
        maxPossibleScore: sectionTotals.maxPossibleScore + moduleAnalysis.maxPossibleScore
      };
    }, {
      counts: { correct: 0, incorrect: 0, unattempted: 0 },
      scores: { positive: 0, negative: 0, total: 0 },
      maxPossibleScore: 0
    });
};



function getStatusCounts() {
    const answered = result.report;
    const miscData = result.data;
    
  
    // Initialize counters
    let answeredCount = 0;
    let markedForReviewCount = 0;
    let notAnsweredCount = questions?.length - answered?.length;
    let answeredAndMarkedCount = 0;
    let correctAnswersCount = 0;
    let wrongAnswersCount = 0;
    const scores = sections && sections?.reduce(
      (totals, i) => {
        // Initialize sectional score
        const sectionScore = modules && modules
          ?.filter((item) => item.parent_sub === i.id)
          .reduce((moduleTotals, z) => {
           
            moduleTotals.scoreTotal += (questions && questions.filter((item) => item.parent === z.module.id)?.length) * i.pos
            const moduleScore = questions && questions
              ?.filter((item) => item.parent === z.module.id)
              .reduce(
                (questionTotals, question) => {
                  
                  const report = result?.report;
                  const reportItem = report?.find((item) => item.id === question.id);
                  if (!reportItem) return questionTotals; // Skip if no matching report item
    
                  const reportValue = reportItem.value - 1; // Adjust report value for indexing
                  const isCorrect =
                    question.type === "options"
                      ? question.options.findIndex((option) => option.isCorrect) === reportValue
                      : question.options.answer.trim() === reportItem.value.trim();
    
                     
                      
                  if (isCorrect) {
                    questionTotals.positive += i.pos;
                  } else {
                    questionTotals.negative -= i.neg;
                  }
                  return questionTotals;
                },
                { positive: 0, negative: 0 ,scoreTotal:0 } // Initialize question scores
              );
    
            return {
              positive: moduleTotals?.positive + moduleScore?.positive,
              negative: moduleTotals?.negative + moduleScore?.negative,
              scoreTotal: moduleTotals?.scoreTotal + moduleScore?.scoreTotal,
            };
          }, { positive: 0, negative: 0 , scoreTotal:0 });
    
        // Update totals with sectional score
        totals.sectionalScores.push(sectionScore?.positive - sectionScore?.negative);
        totals.totalPositive += sectionScore?.positive;
        totals.totalNegative -= sectionScore?.negative;
        totals.scoreTotal += sectionScore?.scoreTotal;
    
        return totals;
      },
      {
        totalPositive: 0,
        totalNegative: 0,
        sectionalScores: [],
        scoreTotal:0
      }
    );
    
    
    // Extract final scores
    const totalScore = scores?.scoreTotal;
    const negativeScore = scores?.totalNegative;
    const score = scores?.totalPositive + scores?.totalNegative;
    const sectionalScores = scores?.sectionalScores;
  
    // Helper function to check if the answer is correct
    function isAnswerCorrect(answer,question) {
       
        const {value,id} = answer
        const {type,options} = question
      
        if (type === "options") {
            
          // For multiple-choice questions, check if the index of the correct option matches the provided value
          const correctIndex = options.findIndex(option => option.isCorrect);
          
          return correctIndex === answer?.value - 1; // Adjust for 0-based index
        } else if (type === "input") {
          // For text-based answers, compare the trimmed values (ignoring whitespace)
          return question.options?.answer?.trim().toLowerCase() === answer?.value.trim().toLowerCase();
        } else {
          throw new Error("Unsupported question type");
        }
      }
  
    // Iterate over the `answered` data and count statuses
    answered?.forEach(item => {
      const question = questions?.find(q => q.id === item.id);
      if (!question) return; // Skip if no corresponding question found
  
      // Check if answered and marked for review
      if (miscData?.filter(miscItem => miscItem.status === "review").some(miscItem => miscItem.id === item.id)) {
        answeredAndMarkedCount += 1;
      } else {
        answeredCount += 1;
      }
  
      // Check if the answer is correct or incorrect
      if (isAnswerCorrect(item,question)) {
        correctAnswersCount += 1;
      } else {
        wrongAnswersCount += 1;
      }
    });
  
    // Iterate over the `miscData` and count "Marked for Review" and "Not Answered"
    miscData?.forEach(item => {
      if (item.status === "review" && !answered.some(answeredItem => answeredItem.id === item.id)) {
        markedForReviewCount += 1;
      } else if (!answered.some(answeredItem => answeredItem.id === item.id)) {
        notAnsweredCount += 1;
      }
    });
  
    return {
      correctAnswersCount: { name: "Correct", value: correctAnswersCount, fill: "#4caf50" }, // Green for Correct
      wrongAnswersCount: { name: "Wrong", value: wrongAnswersCount, fill: "#f44336" },       // Red for Wrong
      markedForReviewCount: { name: "Marked for Review", value: markedForReviewCount, fill: "#ffeb3b" }, // Yellow for Marked for Review
      answeredAndMarkedCount: { name: "Correct & Marked", value: answeredAndMarkedCount, fill: "#ff9800" }, // Orange for Correct & Marked
      notAnsweredCount: { name: "Unanswered", value: notAnsweredCount, fill: "#9e9e9e" }, 
      totalScore: { name: "Total Marks", value: totalScore, fill: "#000" },
      score: {name:'Score',value:score, fill:'#0ff'},
      negativeScore: {name:'Negative Score',value:negativeScore, fill:'#0ff'}, 
      sectionalScores: {name:'Sectional Scores',value:sectionalScores, fill:'#0ff'}, 
    };
    
  }
  const testData = getStatusCounts()
  
const table = [
  {
    key:'Participant Name',
    value:result?.name
  },
  {
    key:'Test Center Name',
    value:'IPM Careers Online Portal'
  },
  {
    key:'Test Date',
    value:`${CtoLocal(result.created_at).dayName}, ${CtoLocal(result.created_at).date} ${CtoLocal(result.created_at).monthName}, ${CtoLocal(result.created_at).year}`
  },
  
  {
    key:'Subject',
    value:result.test_id.title
  },
]
function printPage() {
  if (window.matchMedia) {
      const mediaQueryList = window.matchMedia('print');
      mediaQueryList.addListener(function(mql) {
          if (!mql.matches) {
              console.log('Print dialog closed');
          }
      });
  }
  window.print();
}
const router = useRouter()
if(userDetails == undefined){
  return <div className="w-full h-screen justify-center items-center flex flex-col ">You cannot access this without logging in 
<Button className="border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank">Login</Button>

  </div>
}
if(questions == undefined || result == undefined ){
  return <div className='flex flex-col relative justify-center align-middle items-center text-center font-sans h-screen w-full'>
    <Loader></Loader>
    Loading...</div>
}



return <div className="p-2 flex flex-col md:flex-row-reverse md:flex-nowrap flex-wrap  md:p-4 lg:p-6">
 
 
 <Modal isOpen={activeQuestion != undefined} onClose={()=>{setActiveQuestion(undefined)}}>
        <ModalContent>
          <ModalHeader>
            Question ID : {activeQuestion?.id}
          </ModalHeader>
          <ModalBody className='max-h-[70vh] overflow-auto'>
            <div className='text-sm' dangerouslySetInnerHTML={{__html:activeQuestion?.question}}></div>
            <Chip color='primary'>Question Type : {activeQuestion?.type == "options" ? 'MCQ':'Answer'}</Chip>
           {activeQuestion?.type =="options" ? 
            <RadioGroup value={result && result?.report?.find(item=>item.id == activeQuestion?.id) && result?.report?.find(item=>item.id == activeQuestion?.id)?.value - 1}>
            {activeQuestion && activeQuestion?.options?.map((option,index)=>{
              return <Radio key={index} value={index} isDisabled >{option.title}</Radio>
            })}</RadioGroup>: <div>
             Correct Answer: {activeQuestion?.type === "options"
  ? activeQuestion?.options?.find(option => option.isCorrect)?.label
  : activeQuestion?.options?.answer}

             <br/>
             Your Answer : {result && result?.report?.find(item=>item.id == activeQuestion?.id) && result?.report?.find(item=>item.id == activeQuestion?.id)?.value}
             
              </div>}
          {activeQuestion?.explanation && activeQuestion?.explanation != '<p><strong>Write your Explanation Here...</strong></p>'  && <>
            <Chip color='success'>Solution</Chip>
            <div dangerouslySetInnerHTML={{__html:activeQuestion?.explanation}} className='border-1 text-sm border-green-400 rounded-xl p-2 bg-green-50'></div></>}
              
            
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" color='danger' onPress={()=>{setActiveQuestion(undefined)}}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

<div className="flex flex-col px-4 md:px-0 items-start justify-start">
  
  <div className="w-full flex sticky top-0 bg-white p-2 z-10 flex-row mb-4 items-center justify-end">
    
    <Button isLoading={isRouting} className="border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" onPress={()=>{router.push(`/mock/result/${router.query.uid}`)}}>View Result</Button>
    <Spacer x={2}></Spacer>
    <Button className=" border-green-700 bg-teal-600 text-white border-1 shadow-md rounded-md" onPress={()=>{printPage()}}>Print</Button>
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
              {table && table.map((item, index) => (
                <tr key={index} className="border-b last:border-b-0">
                  <td className="py-2 px-4 font-medium text-gray-900">{item.key}</td>
                  <td className="py-2 px-4 text-gray-700">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

       {/*  <div className="mt-8 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Notes:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Options shown in green color with a <span className="inline-block w-4 h-4 text-green-500">✓</span> icon are correct.</li>
            <li>Chosen option on the right of the question indicates the option selected by the candidate.</li>
          </ul>
        </div> */}
      </div>
    </div> <div className="w-full max-w-xl my-6 border-1 p-4 rounded-xl shadow-sm">
    <QuestionGrid  openQuestion={(e)=>{setActiveQuestion(e)}} filter={filter} sections={sections} modules={modules} questions={questions} result={result}></QuestionGrid></div>
    {testData?.negativeScore?.value < 0 &&
    <div className="w-full max-w-xl my-6 border-1 p-4 rounded-xl shadow-sm">
      You have got <strong><span className="text-red-500">{testData?.negativeScore?.value} Negative Marks</span></strong>.
      You could have scored <strong className="text-lime-600">{testData?.score?.value - testData?.negativeScore?.value}</strong> without negative marks
    </div>}

    </div>
    <Spacer x={4}></Spacer>
    <div className="mt-6 md:mt-12 px-4 md:px-0 flex-1 flex flex-col items-start justify-start">
    <div className="flex flex-col mr-2 mt-2 space-y-2">
          <Tabs onSelectionChange={(e)=>{setFilter(e)}} size='sm'>
          <Tab key={0} title={'All'} value={0}></Tab>
            {sections && sections.map((section,index)=>{
                return <Tab key={index+1} value={index+1} title={section.subject.title}></Tab>
            })}
          </Tabs>
        </div>
        <Spacer y={4}></Spacer>
     

     
        {ats && ats?.atsRank == 1 && ats?.totalRank > 3 && <div className="bg-gradient-to-r text-sm w-auto text-black animate-pulse font-medium mb-4 rounded-lg mr-auto from-amber-500 to-secondary-500 p-4 text-center flex flex-row items-center justify-center">
        <Trophy className="mr-2"></Trophy>  You are the topper of this test unless someone else breaks your highscore record
    </div>} 
      <div className={"w-full p-4 rounded-lg gap-4 flex flex-row flex-wrap items-center justify-start bg-white shadow-sm border-1 " + (ats?.atsRank == 1 && 'border-secondary bg-yellow-50') }>


      <div className={"bg-gray-100  rounded-xl p-4 relative " + (ats?.atsRank == 1 && 'bg-gradient-purple text-white')}>
        <h2 className="text-sm font-bold">Your Rank</h2>
        <p className="my-2 text-lg"><span className="text-2xl font-bold">{ats?.atsRank}</span></p>
       {ats?.atsRank == 1 && <Crown className="text-secondary fill-secondary absolute right-4 bottom-4"></Crown>}
      </div>
      <div className="bg-gray-100 rounded-xl p-4">
        <h2 className="text-sm font-bold">Your Score</h2>
        <p className="my-2 text-sm"><span className="text-2xl font-bold">{testData?.score?.value}</span>/{testData?.totalScore?.value}</p>
      </div>
      <div className="bg-lime-200 rounded-xl p-4">
        <h2 className="text-sm font-bold">Your Score without Negative Marks</h2>
        <p className="my-2 text-sm"><span className="text-2xl font-bold">{testData?.score?.value - testData?.negativeScore?.value}</span></p>
      </div>
      <div className="bg-red-200 text-red-500 rounded-xl p-4">
        <h2 className="text-sm   font-bold">Negative Marks</h2>
        <p className="my-2 text-sm"><span className="text-2xl font-bold">{testData?.negativeScore?.value}</span></p>
      </div>
    </div>
     

     <div>
     <Table className="mt-4 w-full" layout="fixed">
  <TableHeader>
    {[
      'Item',
      'No of Questions',
      'Attempts',
      'Correct',
      'Incorrect',
      'Unattempted',
      'Score',
      'Negative Marks',
      'Max Score'
    ].map((key) => (
      <TableColumn key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</TableColumn>
    ))}
  </TableHeader>
  <TableBody>
    {sections && sections.map((section, index) => {
      const rowColors = [
        'bg-blue-50',
        'bg-green-50',
        'bg-purple-50',
        'bg-orange-50',
        'bg-pink-50',
        'bg-yellow-50'
      ];
      const rowColor = rowColors[index % rowColors.length];

      return (
        <TableRow key={index} className={rowColor}>
          <TableCell>{section.subject.title}</TableCell>
          <TableCell>{getQuestionCount(index)}</TableCell>
          <TableCell>{getAttemptedQuestionCount(index)}</TableCell>
          <TableCell>{getSectionalScores(index)?.counts?.correct}</TableCell>
          <TableCell>{getSectionalScores(index)?.counts?.incorrect}</TableCell>
          <TableCell>{getSectionalScores(index)?.counts?.unattempted}</TableCell>
          <TableCell>{getSectionalScores(index)?.scores?.total}</TableCell>
          <TableCell>{getSectionalScores(index)?.scores?.negative}</TableCell>
          <TableCell>{getSectionalScores(index)?.maxPossibleScore}</TableCell>
        </TableRow>
      );
    })}

    
    <TableRow className="font-bold bg-gray-50">
      <TableCell>Total</TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getQuestionCount(index) || 0), 0)}
      </TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getAttemptedQuestionCount(index) || 0), 0)}
      </TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getSectionalScores(index)?.counts?.correct || 0), 0)}
      </TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getSectionalScores(index)?.counts?.incorrect || 0), 0)}
      </TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getSectionalScores(index)?.counts?.unattempted || 0), 0)}
      </TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getSectionalScores(index)?.scores?.total || 0), 0)}
      </TableCell>
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getSectionalScores(index)?.scores?.negative || 0), 0)}
      </TableCell> 
      <TableCell>
        {sections?.reduce((sum, _, index) => sum + (getSectionalScores(index)?.maxPossibleScore || 0), 0)}
      </TableCell>
    </TableRow>
  </TableBody>
</Table>

    
    </div> 
    <Spacer y={4}></Spacer>
    <TimeAnalysis filter={filter} questions={questions} sections={sections} modules={modules} report={result?.report}></TimeAnalysis>
    <ScoreFall testData={testData} filter={filter} questions={questions} sections={sections} modules={modules} report={result?.report}></ScoreFall>
    <AnswerDistributionCharts 
    sections={sections}
    getQuestionCount={getQuestionCount}
    getAttemptedQuestionCount={getAttemptedQuestionCount}
    getSectionalScores={getSectionalScores}
    ></AnswerDistributionCharts>
    </div>


  
</div>
}


export async function getServerSideProps(context){


    const {data,error} = await serversupabase.from('mock_plays').select('*,test_id(*)').eq('uid',context.query.uid)
    if(data && data?.length > 0){}
    
    if(data?.length == 0 || error){
      return {notFound:true}
    }
    
      return {props:{result:data[0]}}
    }