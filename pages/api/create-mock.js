// TEMPORARY — create IPMAT Indore Full-Length Mock Test
import { serversupabase } from "../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "createMock2026") return res.status(403).json({ error: "bad token" });

  // GET = diagnostic
  if (req.method === "GET") {
    const { data: cats } = await serversupabase.from("mock_categories").select("*").order("id");
    const { data: tests } = await serversupabase.from("mock_test").select("id,uid,title,category,course,config").order("id",{ascending:false}).limit(5);
    const { data: subjects } = await serversupabase.from("mock_subjects").select("*").order("id");
    const { data: courses } = await serversupabase.from("courses").select("id,title").order("id").limit(10);

    // Get groups for latest test in category 39 (IPMAT Indore 2026)
    let groups = null, sampleQ = null;
    if (tests?.length) {
      const t = tests.find(t => t.category === 39) || tests[0];
      const { data: g } = await serversupabase.from("mock_groups").select("*").eq("test", t.id).order("seq");
      groups = g;
      if (g?.length) {
        const mod = g.find(x => x.type === "module");
        if (mod) {
          const { data: qs } = await serversupabase.from("mock_questions").select("id,parent,type,question,options,seq").eq("parent", mod.module).order("seq").limit(2);
          if (qs) sampleQ = qs.map(q => ({...q, question: q.question?.substring(0,100)}));
        }
      }
    }
    return res.status(200).json({ cats, tests, subjects, courses, groups, sampleQ });
  }

  // POST = create the full mock
  if (req.method === "POST") {
    const log = [];

    try {
      // Step 1: Create the mock_test entry
      const { data: testData, error: testErr } = await serversupabase
        .from("mock_test")
        .insert({
          title: "IPMAT Indore Full-Length Mock 1",
          description: "Full-length IPMAT Indore mock test with 90 questions across 3 sections. Duration: 120 minutes.",
          category: 39, // IPMAT Indore 2026
          course: 1, // IPMAT
          config: {
            switch_section: true,
            switch_questions: true,
            calculator_allowed: false,
            is_scientific: false,
            allow_retests: false,
            public_access: false,
            send_email: false,
            timeout: 7200, // 120 minutes in seconds
            instructions: `<h2>IPMAT Indore Full-Length Mock Test</h2><p><strong>Duration:</strong> 120 Minutes | <strong>Total Questions:</strong> 90 | <strong>Maximum Marks:</strong> 360</p><h3>General Instructions</h3><ol><li>This test consists of three sections with a total of 90 questions.</li><li><strong>Section 1: Quantitative Aptitude (Short Answer)</strong> – 15 questions × 4 marks each = 60 marks. No negative marking.</li><li><strong>Section 2: Quantitative Aptitude (MCQ)</strong> – 30 questions × 4 marks each = 120 marks. Negative marking: –1 mark for each incorrect answer.</li><li><strong>Section 3: Verbal Ability (MCQ)</strong> – 45 questions × 4 marks each = 180 marks. Negative marking: –1 mark for each incorrect answer.</li><li>Total duration: 120 minutes. There is no sectional time limit.</li><li>Use of calculators is NOT permitted.</li><li>There is no penalty for unattempted questions.</li></ol>`,
            instructions2: "<p>Click 'Start Test' to begin. Good luck!</p>"
          }
        })
        .select()
        .single();

      if (testErr) throw new Error("Failed to create test: " + testErr.message);
      log.push({ step: "test_created", id: testData.id });
      const testId = testData.id;

      // Step 2: Create 3 subjects (following naming convention of other mocks)
      const mockLabel = "IPMAT Indore Full-Length Mock 1";

      const { data: subj1 } = await serversupabase.from("mock_subjects").insert({
        title: "SA (IPMAT Indore FL Mock 1) 2026",
        label: mockLabel,
      }).select().single();

      const { data: subj2 } = await serversupabase.from("mock_subjects").insert({
        title: "MCQ (IPMAT Indore FL Mock 1) 2026",
        label: mockLabel,
      }).select().single();

      const { data: subj3 } = await serversupabase.from("mock_subjects").insert({
        title: "VA (IPMAT Indore FL Mock 1) 2026",
        label: mockLabel,
      }).select().single();

      log.push({ step: "subjects", sa: subj1?.id, mcq: subj2?.id, va: subj3?.id });

      // Step 3: Create 3 modules in the `mock` table
      const { data: mod1 } = await serversupabase.from("mock").insert({
        title: "QA Short Answer",
        type: "module",
        subject: subj1.id,
        course: 1,
      }).select().single();

      const { data: mod2 } = await serversupabase.from("mock").insert({
        title: "QA MCQ",
        type: "module",
        subject: subj2.id,
        course: 1,
      }).select().single();

      const { data: mod3 } = await serversupabase.from("mock").insert({
        title: "VA MCQ",
        type: "module",
        subject: subj3.id,
        course: 1,
      }).select().single();

      log.push({ step: "modules", mod1: mod1?.id, mod2: mod2?.id, mod3: mod3?.id });

      // Step 4: Create mock_groups
      // Subject groups (sections visible in test)
      const { data: sg1 } = await serversupabase.from("mock_groups").insert({
        test: testId,
        subject: subj1.id,
        type: "subject",
        seq: 1,
      }).select().single();

      const { data: sg2 } = await serversupabase.from("mock_groups").insert({
        test: testId,
        subject: subj2.id,
        type: "subject",
        seq: 2,
      }).select().single();

      const { data: sg3 } = await serversupabase.from("mock_groups").insert({
        test: testId,
        subject: subj3.id,
        type: "subject",
        seq: 3,
      }).select().single();

      log.push({ step: "subject_groups", sg1: sg1?.id, sg2: sg2?.id, sg3: sg3?.id });

      // Module groups under each subject group
      const { data: mg1 } = await serversupabase.from("mock_groups").insert({
        parent_sub: sg1.id,
        module: mod1.id,
        type: "module",
        seq: 1,
        pos: 4,
        neg: 0,
      }).select().single();

      const { data: mg2 } = await serversupabase.from("mock_groups").insert({
        parent_sub: sg2.id,
        module: mod2.id,
        type: "module",
        seq: 2,
        pos: 4,
        neg: 1,
      }).select().single();

      const { data: mg3 } = await serversupabase.from("mock_groups").insert({
        parent_sub: sg3.id,
        module: mod3.id,
        type: "module",
        seq: 3,
        pos: 4,
        neg: 1,
      }).select().single();

      log.push({ step: "module_groups", mg1: mg1?.id, mg2: mg2?.id, mg3: mg3?.id });

      // Step 5: Insert all 90 questions
      // SA Questions (Q1-Q15) — type: "input"
      const saQuestions = [
        { q: `<p>If f(x) = x<sup>3</sup> – 6x<sup>2</sup> + 11x – 6, then find the sum of all real roots of f(x) = 0.</p>`, ans: "6" },
        { q: `<p>The 5th term of an arithmetic progression is 23 and the 12th term is 65. Find the 20th term.</p>`, ans: "113" },
        { q: `<p>Find the number of trailing zeros in 80!</p>`, ans: "19" },
        { q: `<p>If log<sub>2</sub>(x) + log<sub>4</sub>(x) + log<sub>8</sub>(x) = 11, find the value of x.</p>`, ans: "64" },
        { q: `<p>A committee of 5 is to be formed from 6 men and 4 women such that at least 2 women are included. In how many ways can this be done?</p>`, ans: "186" },
        { q: `<p>If the angles of a triangle are in the ratio 1 : 2 : 3, and the longest side is 10 cm, find the length of the shortest side.</p>`, ans: "5" },
        { q: `<p>Find the remainder when 7<sup>2024</sup> is divided by 5.</p>`, ans: "1" },
        { q: `<p>A shopkeeper marks up the price of an item by 60% above cost price and then offers two successive discounts of 10% and 15%. Find the profit percentage (rounded to the nearest integer).</p>`, ans: "22" },
        { q: `<p>How many 4-digit numbers are divisible by both 3 and 7 (i.e., divisible by 21)?</p>`, ans: "429" },
        { q: `<p>In a class of 60 students, 35 play cricket, 28 play football, and 15 play both. How many students play neither cricket nor football?</p>`, ans: "12" },
        { q: `<p>A and B together can complete a piece of work in 12 days. B and C together can complete it in 15 days. A and C together can complete it in 20 days. In how many days can A, B and C together complete the work?</p>`, ans: "10" },
        { q: `<p>If the determinant of the matrix [[2, 3], [4, k]] equals 10, find the value of k.</p>`, ans: "11" },
        { q: `<p>Two trains are moving in opposite directions at speeds of 60 km/h and 90 km/h. Their lengths are 150 m and 200 m respectively. Find the time (in seconds) they take to cross each other. If the answer is p/q in lowest terms, enter p + q.</p>`, ans: "47" },
        { q: `<p>Find the sum of all two-digit numbers that leave a remainder of 3 when divided by 7.</p>`, ans: "676" },
        { q: `<p>If sin(θ) = 3/5 and θ is in the first quadrant, find the value of tan(2θ). If the answer is p/q in lowest terms, enter p + q.</p>`, ans: "31" },
      ];

      // MCQ Questions (Q16-Q45) — type: "options"
      const mcqQuestions = [
        { q: `<p>The product of two consecutive positive integers is 7140. What is the sum of the two integers?</p>`, opts: ["167","169","171","173"], correct: 1 },
        { q: `<p>If x + 1/x = 5, what is the value of x<sup>4</sup> + 1/x<sup>4</sup>?</p>`, opts: ["527","522","529","523"], correct: 0 },
        { q: `<p>The sum of an infinite GP is 12 and the sum of the squares of its terms is 48. What is the common ratio?</p>`, opts: ["1/2","1/3","2/3","1/4"], correct: 0 },
        { q: `<p>If log<sub>10</sub>(2) = 0.301 and log<sub>10</sub>(3) = 0.477, then the number of digits in 6<sup>20</sup> is:</p>`, opts: ["14","15","16","17"], correct: 2 },
        { q: `<p>If f(x) = 2x – 1 and g(x) = x<sup>2</sup> + 3, then g(f(3)) is equal to:</p>`, opts: ["25","28","22","30"], correct: 1 },
        { q: `<p>The area of a rhombus whose diagonals are 16 cm and 30 cm is:</p>`, opts: ["120 cm²","240 cm²","360 cm²","480 cm²"], correct: 1 },
        { q: `<p>In how many ways can the letters of the word 'ARRANGEMENT' be arranged?</p>`, opts: ["2494800","4989600","1247400","831600"], correct: 0 },
        { q: `<p>A bag contains 5 red, 4 blue, and 3 green balls. Two balls are drawn at random. What is the probability that both are of different colours?</p>`, opts: ["47/66","19/66","38/66","41/66"], correct: 0 },
        { q: `<p>A's income is 25% more than B's. By what percent is B's income less than A's?</p>`, opts: ["20%","25%","22.5%","15%"], correct: 0 },
        { q: `<p>If a : b = 2 : 3, b : c = 4 : 5, and c : d = 6 : 7, find a : d.</p>`, opts: ["16 : 35","8 : 35","16 : 21","8 : 21"], correct: 0 },
        { q: `<p>A sum of money doubles itself in 8 years at simple interest. In how many years will it triple itself?</p>`, opts: ["12","14","16","20"], correct: 2 },
        { q: `<p>What is the largest 4-digit number that is a perfect square?</p>`, opts: ["9801","9604","9900","9996"], correct: 0 },
        { q: `<p>Two vessels contain milk and water in the ratios 3:1 and 5:3 respectively. In what ratio should the contents of the two vessels be mixed to get a mixture with milk and water in the ratio 2:1?</p>`, opts: ["1 : 2","2 : 1","1 : 3","3 : 1"], correct: 0 },
        { q: `<p>A chord of length 24 cm is at a distance of 5 cm from the centre of a circle. What is the radius of the circle?</p>`, opts: ["12 cm","13 cm","14 cm","15 cm"], correct: 1 },
        { q: `<p>If α and β are the roots of x<sup>2</sup> – 7x + 12 = 0, then the value of α<sup>3</sup> + β<sup>3</sup> is:</p>`, opts: ["133","91","117","103"], correct: 1 },
        { q: `<p>How many 5-letter words (with or without meaning) can be formed from the letters A, B, C, D, E such that no letter repeats and vowels occupy only even positions?</p>`, opts: ["6","12","24","36"], correct: 1 },
        { q: `<p>The average of 11 numbers is 36. If the average of the first 6 numbers is 32 and the average of the last 6 numbers is 37, find the 6th number.</p>`, opts: ["15","18","21","24"], correct: 1 },
        { q: `<p>For how many integer values of x does the inequality |x – 3| + |x + 5| &lt; 12 hold?</p>`, opts: ["9","10","11","12"], correct: 2 },
        { q: `<p>A cone has a slant height of 13 cm and the radius of its base is 5 cm. What is its volume?</p>`, opts: ["100π cm³","300π cm³","75π cm³","200π cm³"], correct: 0 },
        { q: `<p>If A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]], what is the element in the first row, second column of the product AB?</p>`, opts: ["19","22","26","31"], correct: 1 },
        // DI Set Q36-Q40
        { q: `<p><strong>Directions (Q36–Q40):</strong> Study the table below and answer the questions that follow.</p><p><strong>Sales of Five Companies (in ₹ Crores)</strong></p><table border="1" cellpadding="5" cellspacing="0"><tr><th>Company</th><th>2019</th><th>2020</th><th>2021</th><th>2022</th><th>2023</th></tr><tr><td>P</td><td>120</td><td>135</td><td>150</td><td>170</td><td>190</td></tr><tr><td>Q</td><td>200</td><td>180</td><td>210</td><td>230</td><td>250</td></tr><tr><td>R</td><td>90</td><td>110</td><td>100</td><td>130</td><td>160</td></tr><tr><td>S</td><td>150</td><td>140</td><td>165</td><td>155</td><td>180</td></tr><tr><td>T</td><td>180</td><td>200</td><td>190</td><td>220</td><td>240</td></tr></table><p>Q36. What is the average sales of Company Q over the five years (in ₹ Crores)?</p>`, opts: ["210","214","218","220"], correct: 1 },
        { q: `<p>Q37. For which company was the percentage increase in sales from 2019 to 2023 the highest?</p>`, opts: ["P","Q","R","T"], correct: 2 },
        { q: `<p>Q38. In which year was the total sales of all five companies the highest?</p>`, opts: ["2020","2021","2022","2023"], correct: 3 },
        { q: `<p>Q39. The sales of Company S in 2023 are what percentage of the total sales of all companies in 2023 (approximately)?</p>`, opts: ["15.7%","16.5%","17.6%","18.2%"], correct: 2 },
        { q: `<p>Q40. How many companies showed a consistent year-on-year increase in sales over the entire period?</p>`, opts: ["0","1","2","3"], correct: 1 },
        { q: `<p>The distance between the points (3, –4) and (–2, 8) is:</p>`, opts: ["12","13","14","15"], correct: 1 },
        { q: `<p>If the sum of the first n terms of an AP is 3n<sup>2</sup> + 5n, then the 10th term of the AP is:</p>`, opts: ["60","62","63","65"], correct: 1 },
        { q: `<p>Three dice are rolled simultaneously. What is the probability that the sum of the numbers on them is 10?</p>`, opts: ["1/8","1/9","1/6","5/36"], correct: 0 },
        { q: `<p>In a survey of 200 people, 120 like tea, 80 like coffee, and 60 like both tea and coffee. How many like only coffee?</p>`, opts: ["20","30","40","50"], correct: 0 },
        { q: `<p>A boat can travel 48 km downstream in 3 hours and 48 km upstream in 4 hours. What is the speed of the boat in still water (in km/h)?</p>`, opts: ["12","14","16","18"], correct: 1 },
      ];

      // VA Questions (Q46-Q90) — type: "options"
      const vaQuestions = [
        // RC1: Nudging (Q46-Q51)
        { q: `<p><strong>Directions (Q46–Q51):</strong> Read the passage below and answer the questions that follow.</p><p>The concept of 'nudging' in behavioural economics has gained significant traction in public policy circles over the past two decades. Pioneered by Richard Thaler and Cass Sunstein, the idea holds that subtle changes in the way choices are presented can dramatically influence human decision-making without restricting freedom of choice. Governments around the world have established 'nudge units' to apply these insights to areas ranging from tax compliance to organ donation.</p><p>Critics, however, argue that nudging represents a form of paternalism that is all the more insidious for being covert. If people are unaware that their choices are being shaped, the argument goes, then the distinction between nudging and manipulation becomes uncomfortably thin. Furthermore, there are concerns about the scalability of nudges: what works in a controlled experiment may fail spectacularly when applied to diverse populations with varying cultural norms and cognitive biases.</p><p>Proponents counter that traditional policy tools—regulation, taxation, outright bans—are far more restrictive. A nudge, by definition, preserves the individual's right to choose differently. The real question, they suggest, is not whether governments should influence behaviour (they inevitably do, through the design of forms, default options, and information architecture), but whether they should do so intentionally and transparently.</p><p>Q46. The primary purpose of the passage is to:</p>`, opts: ["Argue that nudging should replace traditional policy tools","Present the concept of nudging along with its merits and criticisms","Demonstrate that nudging is a form of manipulation","Explain why nudge units have failed globally"], correct: 1 },
        { q: `<p>Q47. According to the critics mentioned in the passage, the key concern with nudging is that:</p>`, opts: ["It is too expensive to implement at scale","It does not work in controlled experiments","It covertly influences choices, blurring the line with manipulation","It restricts the freedom of individuals"], correct: 2 },
        { q: `<p>Q48. The word 'insidious' as used in the passage most nearly means:</p>`, opts: ["Obvious and direct","Proceeding in a gradual, subtle, and harmful way","Bold and aggressive","Well-intentioned but misguided"], correct: 1 },
        { q: `<p>Q49. Proponents of nudging would most likely agree with which of the following statements?</p>`, opts: ["Governments should never attempt to influence individual behaviour","Traditional regulations are less effective than nudges in every scenario","Since governments inevitably shape choices, they should do so deliberately","Nudging eliminates all cognitive biases in decision-making"], correct: 2 },
        { q: `<p>Q50. The concern about 'scalability of nudges' implies that:</p>`, opts: ["Nudges are prohibitively expensive for large populations","Experimental results may not translate effectively across diverse groups","Only small countries can implement nudge policies","Cultural norms are irrelevant to policy design"], correct: 1 },
        { q: `<p>Q51. Which of the following, if true, would most weaken the proponents' argument as presented in the passage?</p>`, opts: ["Some countries have successfully reduced tax evasion through nudge-based interventions","Studies show that even when nudges are transparent, they remain equally effective","Research demonstrates that default options set by governments disproportionately disadvantage vulnerable populations","Regulation has been shown to be less popular among citizens compared to nudge-based policies"], correct: 2 },
        // RC2: Insect decline (Q52-Q57)
        { q: `<p><strong>Directions (Q52–Q57):</strong> Read the passage below and answer the questions that follow.</p><p>The decline of insect populations worldwide has been described by scientists as a 'silent apocalypse.' Unlike the extinction of charismatic megafauna—elephants, rhinos, polar bears—the disappearance of insects rarely captures public attention. Yet insects are the invisible infrastructure of nearly every terrestrial ecosystem. They pollinate roughly 75% of all flowering plants, decompose organic matter, control pest populations, and serve as a critical food source for birds, fish, and amphibians.</p><p>A landmark 2019 meta-analysis published in <em>Biological Conservation</em> reviewed 73 studies and concluded that over 40% of insect species are declining, with a third classified as endangered. The rate of decline—2.5% per year—suggests that within a century, most insect species could vanish entirely. The primary drivers are habitat loss due to agricultural intensification, pesticide use (particularly neonicotinoids), climate change, and invasive species.</p><p>The consequences of continued insect decline would be catastrophic. Without pollinators, food production would plummet. Without decomposers, nutrient cycling would grind to a halt. Without insect prey, bird populations—already declining in many regions—would collapse further. The interconnectedness of ecological systems means that the loss of insects would trigger cascading failures across multiple trophic levels.</p><p>Q52. The phrase 'silent apocalypse' in the passage most likely refers to:</p>`, opts: ["A catastrophic event that is widely publicised","A devastating decline that is occurring largely unnoticed","A natural disaster caused by climate change","An extinction event affecting only aquatic species"], correct: 1 },
        { q: `<p>Q53. According to the passage, which of the following is NOT listed as a primary driver of insect decline?</p>`, opts: ["Agricultural intensification","Neonicotinoid pesticides","Urbanisation and light pollution","Invasive species"], correct: 2 },
        { q: `<p>Q54. The passage suggests that the ecological role of insects is best described as:</p>`, opts: ["Limited to pollination of flowering plants","Important but easily replaceable by technology","Foundational and multifaceted across ecosystems","Significant only in tropical regions"], correct: 2 },
        { q: `<p>Q55. The term 'cascading failures' as used in the passage implies:</p>`, opts: ["A series of simultaneous but unrelated events","A chain reaction where one failure triggers subsequent failures across interconnected systems","A gradual decline that can be easily reversed","An isolated collapse confined to one trophic level"], correct: 1 },
        { q: `<p>Q56. Based on the data cited in the passage, in approximately how many years could most insect species vanish at the current rate of decline?</p>`, opts: ["50 years","75 years","100 years","200 years"], correct: 2 },
        { q: `<p>Q57. The author's tone in the passage can best be described as:</p>`, opts: ["Indifferent and detached","Alarmed and informative","Optimistic and reassuring","Sarcastic and dismissive"], correct: 1 },
        // RC3: AI in judicial settings (Q58-Q63)
        { q: `<p><strong>Directions (Q58–Q63):</strong> Read the passage below and answer the questions that follow.</p><p>Artificial intelligence systems are increasingly being deployed in judicial settings to assist with bail decisions, sentencing recommendations, and parole assessments. Proponents argue that algorithmic tools can reduce human biases—judges, after all, are influenced by factors as arbitrary as whether they have eaten recently. By processing vast amounts of data, AI can identify patterns that humans miss and deliver more consistent outcomes.</p><p>However, a growing body of research has exposed serious flaws in these systems. The algorithms are trained on historical data that reflects existing inequalities in the criminal justice system. If certain communities have been disproportionately policed, arrested, and convicted, the algorithm learns to associate membership in those communities with higher risk. The result is a feedback loop: biased data produces biased predictions, which in turn generate more biased data.</p><p>The most famous example is COMPAS, a risk assessment tool used across the United States. A 2016 investigation by ProPublica found that COMPAS was nearly twice as likely to falsely flag Black defendants as future criminals compared to white defendants, while also being more likely to incorrectly label white defendants as low risk. Despite these findings, COMPAS continues to be used in courtrooms, raising fundamental questions about accountability, transparency, and justice in the age of algorithmic governance.</p><p>Q58. The reference to judges and 'whether they have eaten recently' serves to:</p>`, opts: ["Mock the judicial system","Illustrate that human decision-making can be influenced by irrelevant factors","Argue that judges should be replaced by AI entirely","Show that AI systems are infallible"], correct: 1 },
        { q: `<p>Q59. The 'feedback loop' described in the passage refers to:</p>`, opts: ["A system where AI continuously improves its accuracy over time","A cycle where biased historical data leads to biased predictions that further reinforce the original bias","A technical process for updating algorithmic parameters","A mechanism for collecting user feedback on AI decisions"], correct: 1 },
        { q: `<p>Q60. According to the passage, the COMPAS investigation revealed that the tool:</p>`, opts: ["Was equally accurate across all racial groups","Showed systematic racial disparities in its risk assessments","Was more accurate than human judges in all cases","Had been deliberately programmed to discriminate"], correct: 1 },
        { q: `<p>Q61. The passage implies that the continued use of COMPAS despite known flaws raises concerns primarily about:</p>`, opts: ["The cost-effectiveness of AI systems","The speed at which AI processes data","Accountability and transparency in algorithmic governance","The technical complexity of risk assessment tools"], correct: 2 },
        { q: `<p>Q62. Which of the following best captures the central tension described in the passage?</p>`, opts: ["AI is too expensive for use in the judicial system","While AI promises to reduce human bias, it may instead systematize and amplify existing inequalities","Judges unanimously support the use of AI in courtrooms","Historical data is always accurate and unbiased"], correct: 1 },
        { q: `<p>Q63. The author's attitude toward the use of AI in judicial settings can best be described as:</p>`, opts: ["Uncritically enthusiastic","Cautiously sceptical","Completely opposed","Neutral and disinterested"], correct: 1 },
        // Fill-in-blanks (Q64-Q69)
        { q: `<p>Q64. The diplomat's __________ response to the accusations managed to __________ the growing tensions between the two nations.</p>`, opts: ["belligerent ... escalate","measured ... defuse","tepid ... ignite","vociferous ... amplify"], correct: 1 },
        { q: `<p>Q65. The professor's lectures, though __________ in content, were delivered with such __________ that students often struggled to stay awake.</p>`, opts: ["superficial ... enthusiasm","erudite ... monotony","elementary ... vivacity","engaging ... tedium"], correct: 1 },
        { q: `<p>Q66. Despite the __________ of evidence against the theory, a small but __________ group of researchers continued to champion it.</p>`, opts: ["abundance ... tenacious","dearth ... reluctant","paucity ... vocal","surfeit ... diffident"], correct: 0 },
        { q: `<p>Q67. The artist's latest work was __________ by critics as a masterpiece, though the general public found it utterly __________.</p>`, opts: ["condemned ... captivating","lauded ... incomprehensible","dismissed ... remarkable","celebrated ... enchanting"], correct: 1 },
        { q: `<p>Q68. The new regulation was intended to __________ corporate malpractice, but its __________ provisions made enforcement nearly impossible.</p>`, opts: ["encourage ... stringent","curb ... ambiguous","promote ... clear","permit ... vague"], correct: 1 },
        { q: `<p>Q69. Her __________ demeanour at the funeral was at odds with her __________ reputation for being emotional and expressive.</p>`, opts: ["stoic ... well-known","exuberant ... widespread","composed ... undeserved","grief-stricken ... established"], correct: 0 },
        // Word usage (Q70-Q74)
        { q: `<p>Q70. Choose the sentence in which the word 'sanction' is used INCORRECTLY.</p>`, opts: ["The committee gave its sanction to the proposed amendments.","Several nations imposed economic sanctions on the rogue state.","The teacher sanctioned the students for their excellent performance.","The government refused to sanction the use of military force."], correct: 2 },
        { q: `<p>Q71. Choose the sentence in which the word 'precipitate' is used CORRECTLY.</p>`, opts: ["The doctor prescribed a precipitate to treat the infection.","His precipitate decision to resign shocked everyone in the boardroom.","She used a precipitate to climb the steep mountain trail.","The precipitate weather made it a perfect day for a picnic."], correct: 1 },
        { q: `<p>Q72. Choose the sentence in which the word 'cardinal' is used CORRECTLY.</p>`, opts: ["He committed a cardinal sin by revealing the company's trade secrets.","The cardinal weather conditions disrupted all travel plans.","She bought a cardinal dress for the formal dinner.","The team's cardinal approach to negotiations led to a breakdown."], correct: 0 },
        { q: `<p>Q73. In which of the following sentences is the word 'temper' used as a VERB meaning to moderate or mitigate?</p>`, opts: ["He has a terrible temper and often shouts at colleagues.","The blacksmith tempered the steel blade in cold water.","She tried to temper her criticism with some words of encouragement.","The child threw a temper tantrum in the supermarket."], correct: 2 },
        { q: `<p>Q74. Choose the sentence in which the word 'volatile' is used INCORRECTLY.</p>`, opts: ["The volatile political situation made foreign investors nervous.","Petrol is a highly volatile substance that evaporates quickly.","His volatile temperament made him unpredictable in negotiations.","The volatile garden produced a bountiful harvest of vegetables."], correct: 3 },
        // Para jumbles (Q75-Q79)
        { q: `<p>Q75. Arrange the following sentences to form a coherent paragraph:</p><p>(P) However, this convenience comes at a significant environmental cost.</p><p>(Q) Single-use plastics have become ubiquitous in modern life, from grocery bags to food packaging.</p><p>(R) Consequently, governments worldwide are now implementing bans and levies on single-use plastic items.</p><p>(S) Every year, approximately 8 million tonnes of plastic waste end up in the world's oceans, devastating marine ecosystems.</p>`, opts: ["QPSR","PQRS","SQRP","QSPR"], correct: 0 },
        { q: `<p>Q76. Arrange the following sentences to form a coherent paragraph:</p><p>(P) The result is a generation of workers who are skilled but lack the critical thinking abilities needed for leadership roles.</p><p>(Q) Education systems in many developing countries prioritise rote memorisation over analytical reasoning.</p><p>(R) This approach, while effective for standardised testing, fails to prepare students for real-world problem-solving.</p><p>(S) Reforming curricula to emphasise inquiry-based learning could address this growing skills gap.</p>`, opts: ["QRPS","PQRS","RQPS","QPRS"], correct: 0 },
        { q: `<p>Q77. Arrange the following sentences to form a coherent paragraph:</p><p>(P) These bacteria, in turn, produce compounds that influence mood, immunity, and even cognitive function.</p><p>(Q) The human gut is home to trillions of microorganisms, collectively known as the gut microbiome.</p><p>(R) Understanding this gut-brain axis could revolutionise the treatment of mental health disorders.</p><p>(S) Recent research has revealed a remarkable two-way communication system between the gut and the brain.</p>`, opts: ["QSPR","SQPR","QPSR","SPRQ"], correct: 0 },
        { q: `<p>Q78. Arrange the following sentences to form a coherent paragraph:</p><p>(P) Despite its name, the 'Dark Ages' in Europe were not devoid of intellectual and cultural achievement.</p><p>(Q) The Islamic Golden Age, occurring simultaneously, preserved and expanded upon classical Greek and Roman knowledge.</p><p>(R) Monasteries across Europe served as centres of learning, meticulously copying and preserving ancient manuscripts.</p><p>(S) Thus, characterising the entire medieval period as a time of stagnation is a gross oversimplification.</p>`, opts: ["PRQS","QRPS","RPQS","PQRS"], correct: 0 },
        { q: `<p>Q79. Arrange the following sentences to form a coherent paragraph:</p><p>(P) This has led to concerns about the erosion of local cultures and languages.</p><p>(Q) Globalisation has connected economies and societies in unprecedented ways.</p><p>(R) Others contend that cultural exchange enriches rather than diminishes local traditions.</p><p>(S) However, the flow of cultural influence has been largely unidirectional, from the West to the rest of the world.</p>`, opts: ["QSPR","QPSR","SQPR","PQSR"], correct: 0 },
        // Grammar (Q80-Q84)
        { q: `<p>Q80. Choose the grammatically correct sentence:</p>`, opts: ["Neither the teacher nor the students was aware of the schedule change.","Neither the teacher nor the students were aware of the schedule change.","Neither the teacher nor the students is aware of the schedule change.","Neither the teacher nor the students has been aware of the schedule change."], correct: 1 },
        { q: `<p>Q81. Identify the sentence with a grammatical error:</p>`, opts: ["The data suggest that the treatment is effective.","Each of the participants has submitted their report.","He is one of those people who always speak their mind.","The committee has reached its decision unanimously."], correct: 1 },
        { q: `<p>Q82. Choose the sentence that uses the correct form of the verb:</p>`, opts: ["If I was you, I would accept the offer immediately.","If I were you, I would accept the offer immediately.","If I am you, I would accept the offer immediately.","If I be you, I would accept the offer immediately."], correct: 1 },
        { q: `<p>Q83. Choose the correct sentence:</p>`, opts: ["The reason for his absence is because he is unwell.","The reason for his absence is that he is unwell.","The reason for his absence is due to he is unwell.","The reason for his absence is since he is unwell."], correct: 1 },
        { q: `<p>Q84. Identify the sentence with NO error:</p>`, opts: ["He is more smarter than his elder brother.","She has been working here since the past five years.","The news of the merger were announced yesterday.","Had I known about the delay, I would have taken a different route."], correct: 3 },
        // Para completion (Q85-Q87)
        { q: `<p>Q85. Choose the sentence that best completes the paragraph:</p><p>The rise of remote work has fundamentally altered the dynamics of urban planning. With fewer people commuting to city centres daily, the demand for commercial office space has plummeted. Simultaneously, suburban and rural areas have experienced a surge in demand for residential properties with home office spaces. __________</p>`, opts: ["This shift suggests that the traditional model of cities as primarily commercial hubs may need to be reimagined.","However, most employees prefer working from the office every day.","Urban planners have always been opposed to remote work policies.","The rise of remote work has had no impact on real estate markets."], correct: 0 },
        { q: `<p>Q86. Choose the sentence that best completes the paragraph:</p><p>Sleep deprivation has been linked to a wide range of health problems, including cardiovascular disease, obesity, and impaired cognitive function. Despite this, modern lifestyles increasingly prioritise productivity over rest, with many people viewing sleep as expendable. __________</p>`, opts: ["Sleep is generally considered to be a luxury in most cultures.","Ironically, chronic sleep deprivation actually reduces productivity, creating a vicious cycle of diminishing returns.","Most people sleep exactly eight hours every night without any difficulty.","Scientists have found that sleep has no measurable impact on memory consolidation."], correct: 1 },
        { q: `<p>Q87. Choose the sentence that best completes the paragraph:</p><p>The discovery of antibiotics in the early 20th century was hailed as one of the greatest achievements in medical history. Infections that had once been death sentences became easily treatable. However, the indiscriminate overuse of antibiotics in both medicine and agriculture has led to the emergence of antibiotic-resistant 'superbugs.' __________</p>`, opts: ["Antibiotics remain equally effective against all known bacterial strains.","The World Health Organisation has identified antimicrobial resistance as one of the top ten global public health threats.","Most bacteria are beneficial to human health and do not cause disease.","The discovery of antibiotics predates the development of modern surgical techniques."], correct: 1 },
        // Idioms (Q88-Q90)
        { q: `<p>Q88. 'To burn the midnight oil' means:</p>`, opts: ["To waste resources on unnecessary activities","To work or study late into the night","To start a fire accidentally","To arrive late for an appointment"], correct: 1 },
        { q: `<p>Q89. Choose the correct meaning of the idiom: 'A storm in a teacup'</p>`, opts: ["A major catastrophe that affects everyone","A great fuss or commotion over a trivial matter","An unexpected weather event","A secret meeting of important people"], correct: 1 },
        { q: `<p>Q90. The idiom 'to have an axe to grind' means:</p>`, opts: ["To have a dangerous weapon","To have a hidden personal motive or grievance","To be preparing for a physical fight","To be working as a woodcutter"], correct: 1 },
      ];

      // Insert SA questions
      const saInserts = saQuestions.map((q, i) => ({
        parent: mod1.id,
        type: "input",
        question: q.q,
        options: { answer: q.ans },
        seq: i + 1,
        isActive: true,
      }));

      const { data: saData, error: saErr } = await serversupabase
        .from("mock_questions")
        .insert(saInserts)
        .select("id,seq");
      log.push({ step: "sa_questions", count: saData?.length, error: saErr?.message });

      // Insert MCQ questions
      const mcqInserts = mcqQuestions.map((q, i) => ({
        parent: mod2.id,
        type: "options",
        question: q.q,
        options: q.opts.map((opt, j) => ({
          title: opt,
          text: "<p><strong>Write your Win/Lose Here...</strong></p>",
          isCorrect: j === q.correct,
        })),
        seq: i + 1,
        isActive: true,
      }));

      const { data: mcqData, error: mcqErr } = await serversupabase
        .from("mock_questions")
        .insert(mcqInserts)
        .select("id,seq");
      log.push({ step: "mcq_questions", count: mcqData?.length, error: mcqErr?.message });

      // Insert VA questions
      const vaInserts = vaQuestions.map((q, i) => ({
        parent: mod3.id,
        type: "options",
        question: q.q,
        options: q.opts.map((opt, j) => ({
          title: opt,
          text: "<p><strong>Write your Win/Lose Here...</strong></p>",
          isCorrect: j === q.correct,
        })),
        seq: i + 1,
        isActive: true,
      }));

      const { data: vaData, error: vaErr } = await serversupabase
        .from("mock_questions")
        .insert(vaInserts)
        .select("id,seq");
      log.push({ step: "va_questions", count: vaData?.length, error: vaErr?.message });

      return res.status(200).json({
        message: "Mock test created successfully!",
        testId,
        testUid: testData.uid,
        modules: { sa: mod1.id, mcq: mod2.id, va: mod3.id },
        questionCounts: { sa: saData?.length, mcq: mcqData?.length, va: vaData?.length },
        log
      });

    } catch (err) {
      return res.status(500).json({ error: err.message, log });
    }
  }

  return res.status(405).json({ error: "Use GET or POST" });
}
