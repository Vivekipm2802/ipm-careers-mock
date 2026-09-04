// ============================================================
// Gulp Protocol passage library.
// IPMAT-VA-style passages (~130–170 words) with 5 comprehension
// MCQs each. The trainer picks one at random per run.
// a = index of the correct option. e = brief explanation (shown in
// the end-of-run summary; the 2026-09 authored questions carry it).
// ============================================================

const PASSAGES = [
  {
    id: "ipm-history",
    title: "The IPM Experiment",
    text: "The Indian Institutes of Management were established with a clear mandate: to professionalise Indian business through rigorous management education. What began in 1961 with campuses at Calcutta and Ahmedabad has grown into a network of twenty institutes. The five-year Integrated Programme in Management, pioneered by IIM Indore in 2011, marked a radical departure from tradition. Instead of recruiting engineers in their twenties, the IPM admits students straight after Class 12, blending liberal arts, mathematics, and economics in its first three years before merging students into the flagship MBA. Critics initially questioned whether seventeen-year-olds could handle a management curriculum. A decade of placement data has answered them: IPM graduates routinely match or outperform their older MBA peers, and the programme's entrance exam, IPMAT, now attracts tens of thousands of aspirants for a few hundred seats.",
    questions: [
      { q: "When and where was the IPM programme pioneered?", o: ["2011, IIM Indore", "1961, IIM Calcutta", "2011, IIM Ahmedabad", "1961, IIM Indore"], a: 0 },
      { q: "What does the IPM blend in its first three years?", o: ["Engineering, law and medicine", "Liberal arts, mathematics and economics", "Physics, chemistry and biology", "Accounting, marketing and finance"], a: 1 },
      { q: "What did a decade of placement data show?", o: ["IPM graduates underperform MBA peers", "The programme was discontinued", "IPM graduates match or outperform older MBA peers", "Seats increased to tens of thousands"], a: 2 },
      { q: "Why did critics initially question the IPM?", o: ["The fees were too high", "They doubted seventeen-year-olds could handle a management curriculum", "IIM Indore lacked faculty", "The MBA was being phased out"], a: 1, e: "The passage says critics questioned whether seventeen-year-olds could handle a management curriculum." },
      { q: "How does the IPM differ from the traditional IIM intake?", o: ["It admits students straight after Class 12 rather than engineers in their twenties", "It recruits only working engineers", "It skips the MBA entirely", "It runs for two years"], a: 0, e: "Instead of recruiting engineers in their twenties, the IPM admits students right after Class 12 and later merges them into the flagship MBA." },
    ],
  },
  {
    id: "attention-economy",
    title: "The Attention Economy",
    text: "Economists have long treated attention as limitless, but psychologists know better. Every notification, headline, and autoplay video competes for a resource that is strictly finite: human focus. The term attention economy, coined by Herbert Simon in the 1970s, captures this scarcity. Simon observed that a wealth of information creates a poverty of attention, an insight that predates the smartphone by three decades. Modern platforms have industrialised the capture of attention, employing teams of engineers to maximise time on screen. The consequences reach beyond distraction. Studies link fragmented attention to shallower reading, weaker memory consolidation, and a measurable decline in the ability to follow long arguments. Some researchers now argue that sustained attention should be taught in schools as deliberately as arithmetic, treating deep focus not as a personality trait but as a trainable skill.",
    questions: [
      { q: "Who coined the term 'attention economy'?", o: ["A team of platform engineers", "Herbert Simon", "Modern psychologists", "The author of the passage"], a: 1 },
      { q: "What does a wealth of information create, per Simon?", o: ["A wealth of knowledge", "A poverty of attention", "Better memory", "Longer arguments"], a: 1 },
      { q: "What do some researchers propose about sustained attention?", o: ["It cannot be trained", "It should be taught in schools like arithmetic", "It only matters for reading", "It is a fixed personality trait"], a: 1 },
      { q: "When did Simon make his observation relative to the smartphone?", o: ["Three decades before it", "Three years after it", "At its launch", "A decade after it"], a: 0, e: "The passage notes that Simon's insight predates the smartphone by three decades." },
      { q: "Which consequences does the passage link to fragmented attention?", o: ["Faster reading and sharper memory", "Shallower reading, weaker memory consolidation and trouble following long arguments", "Only momentary distraction", "Improved multitasking"], a: 1, e: "Studies cited in the passage link fragmented attention to shallower reading, weaker memory consolidation and a decline in the ability to follow long arguments." },
    ],
  },
  {
    id: "compounding",
    title: "The Quiet Power of Compounding",
    text: "Albert Einstein is often said to have called compound interest the eighth wonder of the world. The attribution is doubtful, but the mathematics is not. Money that grows at ten percent a year does not merely add a tenth each year; it builds on every previous gain, doubling roughly every seven years. The principle extends far beyond finance. A student who improves one percent daily is not slightly better after a year but roughly thirty-seven times better, because each day's gain multiplies the last. This is why toppers rarely credit heroic all-nighters. Their advantage accumulates invisibly, through daily problem sets and consistent revision, until it suddenly looks like talent. The corollary is uncomfortable: small daily neglect also compounds. Skipping practice for a week does not cost seven days of progress; it costs the growth that those days would have multiplied.",
    questions: [
      { q: "At ten percent annual growth, money doubles roughly every:", o: ["Ten years", "Seven years", "Five years", "Twelve years"], a: 1 },
      { q: "A student improving 1% daily is how much better after a year?", o: ["About 3.65 times", "About 37 times", "About 100 times", "Twice"], a: 1 },
      { q: "Why do toppers rarely credit all-nighters?", o: ["They hide their methods", "Their advantage compounds through daily consistency", "All-nighters are secretly common", "Talent replaces practice"], a: 1 },
      { q: "What is the uncomfortable corollary the passage ends on?", o: ["Talent cannot be built", "Small daily neglect also compounds", "Interest rates always fall", "All-nighters are essential after all"], a: 1, e: "The passage closes with the corollary that small daily neglect compounds too — a skipped week costs the growth those days would have multiplied." },
      { q: "How is the Einstein attribution described?", o: ["Well documented", "Doubtful, though the mathematics is not", "Invented by bankers", "Proven by placement data"], a: 1, e: "The passage calls the attribution doubtful while insisting the mathematics behind compounding is not." },
    ],
  },
  {
    id: "monsoon-economy",
    title: "The Monsoon and the Market",
    text: "No single weather event moves the Indian economy like the southwest monsoon. Arriving over Kerala in early June and retreating from Rajasthan by late September, it delivers nearly three-quarters of the country's annual rainfall. Roughly half of India's farmland lacks irrigation and depends directly on these rains. A strong monsoon lifts rural incomes, boosts demand for everything from tractors to televisions, and softens food prices. A failed one forces the central bank into an awkward corner: food inflation rises just as rural spending collapses, making interest-rate decisions unusually difficult. Economists therefore watch the June forecast of the India Meteorological Department almost as closely as the national budget. Yet the relationship is weakening. As services and manufacturing expand their share of output, the monsoon's grip on GDP has loosened, even while its grip on rural distress remains firm.",
    questions: [
      { q: "What share of India's annual rainfall does the monsoon deliver?", o: ["About one quarter", "About half", "Nearly three-quarters", "Almost all"], a: 2 },
      { q: "Why does a failed monsoon complicate central bank decisions?", o: ["Banks close in rural areas", "Food inflation rises while rural spending collapses", "The budget must be rewritten", "Irrigation costs fall"], a: 1 },
      { q: "How is the monsoon's economic relationship changing?", o: ["Its grip on GDP is loosening as services grow", "It now controls GDP entirely", "It no longer affects rural incomes", "Its rainfall share is increasing"], a: 0 },
      { q: "Roughly what share of India's farmland lacks irrigation?", o: ["A tenth", "A quarter", "Half", "Nearly all of it"], a: 2, e: "The passage says roughly half of India's farmland lacks irrigation and depends directly on the monsoon rains." },
      { q: "What does a strong monsoon do, according to the passage?", o: ["Raises food prices sharply", "Lifts rural incomes, boosts demand and softens food prices", "Forces the central bank to raise rates", "Delays the national budget"], a: 1, e: "A strong monsoon lifts rural incomes, boosts demand for everything from tractors to televisions, and softens food prices." },
    ],
  },
  {
    id: "deliberate-practice",
    title: "Why Practice Isn't Enough",
    text: "The popular claim that ten thousand hours of practice guarantees mastery misreads the research it cites. Anders Ericsson, whose studies of violinists launched the idea, spent years correcting it. What separates experts, he argued, is not hours logged but the character of those hours. Deliberate practice targets a specific weakness, operates just beyond current ability, and demands immediate feedback. A chess player who casually plays hundreds of games improves far less than one who spends the same time analysing lost positions. The distinction matters for exam preparation. Solving fifty comfortable questions produces the sensation of work without its effect. Attempting fifteen problems slightly beyond one's level, reviewing every error, and re-attempting the failures a week later builds measurably more skill. Comfort, Ericsson warned, is precisely the signal that learning has stopped.",
    questions: [
      { q: "According to Ericsson, what separates experts?", o: ["Total hours logged", "The character of practice hours", "Natural talent", "Starting young"], a: 1 },
      { q: "Which chess player improves more, per the passage?", o: ["One who plays hundreds of casual games", "One who analyses lost positions", "One who memorises openings", "One who plays faster"], a: 1 },
      { q: "What does comfort signal, per Ericsson?", o: ["Mastery achieved", "That learning has stopped", "Readiness for the exam", "Efficient practice"], a: 1 },
      { q: "Which three features define deliberate practice in the passage?", o: ["Long hours, repetition and rest", "Targeting a weakness, working just beyond current ability, and immediate feedback", "Comfortable problem sets and revision", "Group study, notes and mock tests"], a: 1, e: "Deliberate practice targets a specific weakness, operates just beyond current ability, and demands immediate feedback." },
      { q: "What does solving fifty comfortable questions produce?", o: ["The sensation of work without its effect", "Measurable skill gains", "Immediate feedback", "Exam-day temperament"], a: 0, e: "The passage says comfortable questions produce the sensation of work without its effect — unlike harder problems reviewed and re-attempted." },
    ],
  },
  {
    id: "urbanisation",
    title: "Cities as Engines",
    text: "For most of history, cities were demographic sinks: disease killed urban dwellers faster than births could replace them, and only constant migration kept populations stable. Modern sanitation reversed the equation, and cities became the engines of economic growth. Economists estimate that doubling a city's population raises its productivity per person by five to ten percent, an effect called agglomeration. Ideas move faster when people share pavements, cafés, and train compartments. India's urban story, however, is distinctive. Its largest cities generate a disproportionate share of GDP while housing a minority of the population, and its urbanisation rate lags well behind China's. Some scholars argue this represents an enormous unclaimed dividend: each percentage point of urbanisation, managed well, could add measurably to national growth. Managed badly, the same migration produces congestion, sprawl, and strained services instead.",
    questions: [
      { q: "Why were historical cities 'demographic sinks'?", o: ["People refused to have children", "Disease killed faster than births replaced", "Migration was banned", "Food was scarce"], a: 1 },
      { q: "What is the agglomeration effect?", o: ["Cities doubling in area", "Doubling population raises per-person productivity 5–10%", "Sanitation reversing disease", "GDP concentrating in villages"], a: 1 },
      { q: "What is distinctive about India's urbanisation?", o: ["It exceeds China's rate", "Large cities produce outsized GDP but house a minority", "Cities generate little GDP", "Migration has stopped"], a: 1 },
      { q: "What reversed cities' status as demographic sinks?", o: ["Modern sanitation", "Constant migration", "Faster trains", "Economic planning"], a: 0, e: "The passage says modern sanitation reversed the equation, after which cities became engines of growth." },
      { q: "How do some scholars view India's lagging urbanisation?", o: ["As a permanent handicap", "As an enormous unclaimed dividend if managed well", "As proof that cities no longer matter", "As a completed process"], a: 1, e: "Scholars in the passage call it an enormous unclaimed dividend: each well-managed percentage point of urbanisation could add measurably to growth." },
    ],
  },
];

export default PASSAGES;
