// ============================================================
// Gulp Protocol passage library — 2026-09 expanded bank.
// 16 passages across three tiers:
//   · easy     — authored ~150-word warm-ups, 5 recall questions.
//   · moderate — owner-supplied exam RCs, recall-leaning sets.
//   · hard     — owner-supplied exam RCs, inference-heavy sets.
// Shape: { id, title, tier, words, text, questions } with 5–7
// questions per passage — the trainer runs ALL of them. Each
// question: { q, o (4 options), a (correct index), e (explanation
// shown in the end-of-run summary) }.
// The 10 exam passages were extracted from the owner's RC PDFs
// (OCR/ligature damage cleaned). Answers follow the PDF key where
// one existed; the rest were solved from the passage and are
// flagged for owner review in outputs/gulp-bank-expansion.json +
// the Gulp-bank-expansion-review.html walkthrough.
// The trainer picks the day's passage with a no-repeat seeded
// rotation — see passageIndexForDay in GulpProtocol.js.
// ============================================================

const PASSAGES = [
  {
    id: "ipm-history",
    title: "The IPM Experiment",
    tier: "easy",
    words: 134,
    text: "The Indian Institutes of Management were established with a clear mandate: to professionalise Indian business through rigorous management education. What began in 1961 with campuses at Calcutta and Ahmedabad has grown into a network of twenty institutes. The five-year Integrated Programme in Management, pioneered by IIM Indore in 2011, marked a radical departure from tradition. Instead of recruiting engineers in their twenties, the IPM admits students straight after Class 12, blending liberal arts, mathematics, and economics in its first three years before merging students into the flagship MBA. Critics initially questioned whether seventeen-year-olds could handle a management curriculum. A decade of placement data has answered them: IPM graduates routinely match or outperform their older MBA peers, and the programme's entrance exam, IPMAT, now attracts tens of thousands of aspirants for a few hundred seats.",
    questions: [
      { q: "When and where was the IPM programme pioneered?", o: ["2011, IIM Indore", "1961, IIM Calcutta", "2011, IIM Ahmedabad", "1961, IIM Indore"], a: 0, e: "The passage states the five-year IPM was pioneered by IIM Indore in 2011." },
      { q: "What does the IPM blend in its first three years?", o: ["Engineering, law and medicine", "Liberal arts, mathematics and economics", "Physics, chemistry and biology", "Accounting, marketing and finance"], a: 1, e: "The programme blends liberal arts, mathematics and economics in its first three years before merging into the MBA." },
      { q: "What did a decade of placement data show?", o: ["IPM graduates underperform MBA peers", "The programme was discontinued", "IPM graduates match or outperform older MBA peers", "Seats increased to tens of thousands"], a: 2, e: "A decade of placement data showed IPM graduates routinely match or outperform their older MBA peers." },
      { q: "Why did critics initially question the IPM?", o: ["The fees were too high", "They doubted seventeen-year-olds could handle a management curriculum", "IIM Indore lacked faculty", "The MBA was being phased out"], a: 1, e: "The passage says critics questioned whether seventeen-year-olds could handle a management curriculum." },
      { q: "How does the IPM differ from the traditional IIM intake?", o: ["It admits students straight after Class 12 rather than engineers in their twenties", "It recruits only working engineers", "It skips the MBA entirely", "It runs for two years"], a: 0, e: "Instead of recruiting engineers in their twenties, the IPM admits students right after Class 12 and later merges them into the flagship MBA." },
    ],
  },
  {
    id: "attention-economy",
    title: "The Attention Economy",
    tier: "easy",
    words: 134,
    text: "Economists have long treated attention as limitless, but psychologists know better. Every notification, headline, and autoplay video competes for a resource that is strictly finite: human focus. The term attention economy, coined by Herbert Simon in the 1970s, captures this scarcity. Simon observed that a wealth of information creates a poverty of attention, an insight that predates the smartphone by three decades. Modern platforms have industrialised the capture of attention, employing teams of engineers to maximise time on screen. The consequences reach beyond distraction. Studies link fragmented attention to shallower reading, weaker memory consolidation, and a measurable decline in the ability to follow long arguments. Some researchers now argue that sustained attention should be taught in schools as deliberately as arithmetic, treating deep focus not as a personality trait but as a trainable skill.",
    questions: [
      { q: "Who coined the term 'attention economy'?", o: ["A team of platform engineers", "Herbert Simon", "Modern psychologists", "The author of the passage"], a: 1, e: "The term was coined by Herbert Simon in the 1970s." },
      { q: "What does a wealth of information create, per Simon?", o: ["A wealth of knowledge", "A poverty of attention", "Better memory", "Longer arguments"], a: 1, e: "Simon observed that a wealth of information creates a poverty of attention." },
      { q: "What do some researchers propose about sustained attention?", o: ["It cannot be trained", "It should be taught in schools like arithmetic", "It only matters for reading", "It is a fixed personality trait"], a: 1, e: "Some researchers argue sustained attention should be taught in schools as deliberately as arithmetic, a trainable skill, not a personality trait." },
      { q: "When did Simon make his observation relative to the smartphone?", o: ["Three decades before it", "Three years after it", "At its launch", "A decade after it"], a: 0, e: "The passage notes that Simon's insight predates the smartphone by three decades." },
      { q: "Which consequences does the passage link to fragmented attention?", o: ["Faster reading and sharper memory", "Shallower reading, weaker memory consolidation and trouble following long arguments", "Only momentary distraction", "Improved multitasking"], a: 1, e: "Studies cited in the passage link fragmented attention to shallower reading, weaker memory consolidation and a decline in the ability to follow long arguments." },
    ],
  },
  {
    id: "compounding",
    title: "The Quiet Power of Compounding",
    tier: "easy",
    words: 140,
    text: "Albert Einstein is often said to have called compound interest the eighth wonder of the world. The attribution is doubtful, but the mathematics is not. Money that grows at ten percent a year does not merely add a tenth each year; it builds on every previous gain, doubling roughly every seven years. The principle extends far beyond finance. A student who improves one percent daily is not slightly better after a year but roughly thirty-seven times better, because each day's gain multiplies the last. This is why toppers rarely credit heroic all-nighters. Their advantage accumulates invisibly, through daily problem sets and consistent revision, until it suddenly looks like talent. The corollary is uncomfortable: small daily neglect also compounds. Skipping practice for a week does not cost seven days of progress; it costs the growth that those days would have multiplied.",
    questions: [
      { q: "At ten percent annual growth, money doubles roughly every:", o: ["Ten years", "Seven years", "Five years", "Twelve years"], a: 1, e: "Money growing at ten percent a year builds on every previous gain, doubling roughly every seven years." },
      { q: "A student improving 1% daily is how much better after a year?", o: ["About 3.65 times", "About 37 times", "About 100 times", "Twice"], a: 1, e: "Because each day's gain multiplies the last, 1% daily improvement compounds to roughly thirty-seven times in a year." },
      { q: "Why do toppers rarely credit all-nighters?", o: ["They hide their methods", "Their advantage compounds through daily consistency", "All-nighters are secretly common", "Talent replaces practice"], a: 1, e: "Their advantage accumulates invisibly through daily problem sets and consistent revision, compounding, not heroics." },
      { q: "What is the uncomfortable corollary the passage ends on?", o: ["Talent cannot be built", "Small daily neglect also compounds", "Interest rates always fall", "All-nighters are essential after all"], a: 1, e: "The passage closes with the corollary that small daily neglect compounds too, a skipped week costs the growth those days would have multiplied." },
      { q: "How is the Einstein attribution described?", o: ["Well documented", "Doubtful, though the mathematics is not", "Invented by bankers", "Proven by placement data"], a: 1, e: "The passage calls the attribution doubtful while insisting the mathematics behind compounding is not." },
    ],
  },
  {
    id: "monsoon-economy",
    title: "The Monsoon and the Market",
    tier: "easy",
    words: 137,
    text: "No single weather event moves the Indian economy like the southwest monsoon. Arriving over Kerala in early June and retreating from Rajasthan by late September, it delivers nearly three-quarters of the country's annual rainfall. Roughly half of India's farmland lacks irrigation and depends directly on these rains. A strong monsoon lifts rural incomes, boosts demand for everything from tractors to televisions, and softens food prices. A failed one forces the central bank into an awkward corner: food inflation rises just as rural spending collapses, making interest-rate decisions unusually difficult. Economists therefore watch the June forecast of the India Meteorological Department almost as closely as the national budget. Yet the relationship is weakening. As services and manufacturing expand their share of output, the monsoon's grip on GDP has loosened, even while its grip on rural distress remains firm.",
    questions: [
      { q: "What share of India's annual rainfall does the monsoon deliver?", o: ["About one quarter", "About half", "Nearly three-quarters", "Almost all"], a: 2, e: "The southwest monsoon delivers nearly three-quarters of India's annual rainfall." },
      { q: "Why does a failed monsoon complicate central bank decisions?", o: ["Banks close in rural areas", "Food inflation rises while rural spending collapses", "The budget must be rewritten", "Irrigation costs fall"], a: 1, e: "A failed monsoon raises food inflation just as rural spending collapses, making interest-rate decisions unusually difficult." },
      { q: "How is the monsoon's economic relationship changing?", o: ["Its grip on GDP is loosening as services grow", "It now controls GDP entirely", "It no longer affects rural incomes", "Its rainfall share is increasing"], a: 0, e: "As services and manufacturing expand their share of output, the monsoon's grip on GDP has loosened, though its grip on rural distress remains firm." },
      { q: "Roughly what share of India's farmland lacks irrigation?", o: ["A tenth", "A quarter", "Half", "Nearly all of it"], a: 2, e: "The passage says roughly half of India's farmland lacks irrigation and depends directly on the monsoon rains." },
      { q: "What does a strong monsoon do, according to the passage?", o: ["Raises food prices sharply", "Lifts rural incomes, boosts demand and softens food prices", "Forces the central bank to raise rates", "Delays the national budget"], a: 1, e: "A strong monsoon lifts rural incomes, boosts demand for everything from tractors to televisions, and softens food prices." },
    ],
  },
  {
    id: "deliberate-practice",
    title: "Why Practice Isn't Enough",
    tier: "easy",
    words: 131,
    text: "The popular claim that ten thousand hours of practice guarantees mastery misreads the research it cites. Anders Ericsson, whose studies of violinists launched the idea, spent years correcting it. What separates experts, he argued, is not hours logged but the character of those hours. Deliberate practice targets a specific weakness, operates just beyond current ability, and demands immediate feedback. A chess player who casually plays hundreds of games improves far less than one who spends the same time analysing lost positions. The distinction matters for exam preparation. Solving fifty comfortable questions produces the sensation of work without its effect. Attempting fifteen problems slightly beyond one's level, reviewing every error, and re-attempting the failures a week later builds measurably more skill. Comfort, Ericsson warned, is precisely the signal that learning has stopped.",
    questions: [
      { q: "According to Ericsson, what separates experts?", o: ["Total hours logged", "The character of practice hours", "Natural talent", "Starting young"], a: 1, e: "Ericsson argued experts are separated not by hours logged but by the character of those hours." },
      { q: "Which chess player improves more, per the passage?", o: ["One who plays hundreds of casual games", "One who analyses lost positions", "One who memorises openings", "One who plays faster"], a: 1, e: "The player who spends the same time analysing lost positions improves far more than the casual player." },
      { q: "What does comfort signal, per Ericsson?", o: ["Mastery achieved", "That learning has stopped", "Readiness for the exam", "Efficient practice"], a: 1, e: "Comfort, Ericsson warned, is precisely the signal that learning has stopped." },
      { q: "Which three features define deliberate practice in the passage?", o: ["Long hours, repetition and rest", "Targeting a weakness, working just beyond current ability, and immediate feedback", "Comfortable problem sets and revision", "Group study, notes and mock tests"], a: 1, e: "Deliberate practice targets a specific weakness, operates just beyond current ability, and demands immediate feedback." },
      { q: "What does solving fifty comfortable questions produce?", o: ["The sensation of work without its effect", "Measurable skill gains", "Immediate feedback", "Exam-day temperament"], a: 0, e: "The passage says comfortable questions produce the sensation of work without its effect, unlike harder problems reviewed and re-attempted." },
    ],
  },
  {
    id: "urbanisation",
    title: "Cities as Engines",
    tier: "easy",
    words: 134,
    text: "For most of history, cities were demographic sinks: disease killed urban dwellers faster than births could replace them, and only constant migration kept populations stable. Modern sanitation reversed the equation, and cities became the engines of economic growth. Economists estimate that doubling a city's population raises its productivity per person by five to ten percent, an effect called agglomeration. Ideas move faster when people share pavements, cafés, and train compartments. India's urban story, however, is distinctive. Its largest cities generate a disproportionate share of GDP while housing a minority of the population, and its urbanisation rate lags well behind China's. Some scholars argue this represents an enormous unclaimed dividend: each percentage point of urbanisation, managed well, could add measurably to national growth. Managed badly, the same migration produces congestion, sprawl, and strained services instead.",
    questions: [
      { q: "Why were historical cities 'demographic sinks'?", o: ["People refused to have children", "Disease killed faster than births replaced", "Migration was banned", "Food was scarce"], a: 1, e: "Disease killed urban dwellers faster than births could replace them; only migration kept populations stable." },
      { q: "What is the agglomeration effect?", o: ["Cities doubling in area", "Doubling population raises per-person productivity 5–10%", "Sanitation reversing disease", "GDP concentrating in villages"], a: 1, e: "Doubling a city's population raises productivity per person by five to ten percent, the agglomeration effect." },
      { q: "What is distinctive about India's urbanisation?", o: ["It exceeds China's rate", "Large cities produce outsized GDP but house a minority", "Cities generate little GDP", "Migration has stopped"], a: 1, e: "India's largest cities generate a disproportionate share of GDP while housing a minority of the population, and urbanisation lags China's." },
      { q: "What reversed cities' status as demographic sinks?", o: ["Modern sanitation", "Constant migration", "Faster trains", "Economic planning"], a: 0, e: "The passage says modern sanitation reversed the equation, after which cities became engines of growth." },
      { q: "How do some scholars view India's lagging urbanisation?", o: ["As a permanent handicap", "As an enormous unclaimed dividend if managed well", "As proof that cities no longer matter", "As a completed process"], a: 1, e: "Scholars in the passage call it an enormous unclaimed dividend: each well-managed percentage point of urbanisation could add measurably to growth." },
    ],
  },
  {
    id: "peace-construct",
    title: "Constructing Peace",
    tier: "moderate",
    words: 642,
    text: "Most world leaders, international organizations and so-called peace summits tend to define peace in the shadow of war, as 'a situation where there is no war between nations'. By doing so, they are actually taking a negative view. By viewing the positive element in contrast to the negative, we will end up underrating the former's potential. By defining light as the 'absence of darkness' or life as the 'absence of death', we assign greater importance to the powers of darkness and death, or in the case of peace, to war, rather than peace. It is widely acknowledged that it is easier to appreciate what is good when one has already experienced the 'bad'. But the question today is not of 'experiencing'; the challenge today is in creating peace as a concept. And this cannot be done if we keep concentrating on destruction. It is time now to literally construct peace. But peace is intangible. Peace is not just a feeling or a state of being. It is not just something that one would achieve only during long hours of prayers or meditation. And it is certainly not the end of war alone. So what is it? Peace is life itself. It is our original religion. It is like an eternal spring within us. Even a little child likes peaceful surroundings: a child starts crying when he hears violent arguments, even though he is unable to understand the meaning of the words being uttered in anger. Peace, therefore, is a natural instinct and if we wish to construct a peaceful world, then all we've got to do is to let it manifest in our lives. Whatever a peaceful mind comes in contact with undergoes a positive change, be it our family relations, our workplace or even the material things that we use. How does this happen? Let's use the analogy of a tree. If we look upon human life as a tree, then the soul is its seed. The soul comprises three main faculties: the mind, the intellect and the sanskars (the subconscious). The first two determine the quality of our thoughts and actions, and the third one reveals the kind of energies or virtues and powers we have in store. While our actions sprout shoots, becoming branches and leaves, symbolic of the relations and possessions in our lives, it will be the quality of energies supplied to them by the mind that will determine the quality of fruits and flowers the tree shall bear. Thus, if the mind has been conditioned to think positively and peacefully, it will have a similar effect on its connections with others. This explains the tangibility of peace in an individual's life. However, how feasible is peace at the macro level? Can we really create a world of peace? Going by ancient mythology and scriptures worldwide, we are led to believe that there is, indeed, such a world, whether it is the Indian Satyug, the Islamic Jannat, or the Biblical Heaven. All these places have been described variously as the land of peace, the land of happiness and paradise, where inhabitants are free from any kind of worry, aggression or unhappiness. Paradise is called so not just because it is believed to be a place of scenic beauty; it is also where the divine virtues of love and peace prevail. The motto of the Brahma Kumaris is that when we change, the world changes. To achieve peace, three things have to be borne in mind: that peace is our natural religion; that all that we do affects those who surround us; and that to recharge our pure energies, we need to connect to the Supreme Source. A life operating on these three laws of peace will tangibly transform everything to a peaceful state and recreate the one culture that we all wish to re-establish in the world.",
    questions: [
      { q: "The author is of the opinion that", o: ["peace summits achieve less than what they intended to achieve in the first place", "by viewing the positive element in contrast to the negative, we will end up underrating the latter's potential", "one savours the pleasant experiences in life more after experiencing trials and tribulations", "having destruction on top of one's mind is detrimental to understanding the true concept of peace"], a: 3, e: "The author says creating peace as a concept 'cannot be done if we keep concentrating on destruction', so a destruction-first mindset blocks the true concept of peace. Option B inverts the passage (it is the FORMER'S, the positive element's, potential that gets underrated)." },
      { q: "Peace is defined best in the passage as", o: ["a conscious state of being", "something that takes long hours of spiritual effort to recognize", "a natural instinct, and it is within our potential to create a peaceful environment", "something that manifests once we realize the situation is stable and does not warrant tension"], a: 2, e: "The passage states directly: 'Peace, therefore, is a natural instinct and if we wish to construct a peaceful world, then all we've got to do is to let it manifest in our lives.' It explicitly rejects the prayer/meditation-only view." },
      { q: "The author uses the example of a tree to demonstrate all of the below EXCEPT", o: ["the soul is the seed of human life if human life can be related to a tree", "the mind, the intellect and the innate thoughts determine the consequences of our actions", "the quality of our relations and possessions depends on the quality of energies that our mind supplies to our actions", "our actions create our world just as the shoots develop into branches and leaves"], a: 1, e: "The passage assigns the roles differently: the mind and intellect (first two faculties) determine the quality of thoughts and actions, while the sanskars reveal the stored energies. Option B lumps all three as determining consequences, that is not what the analogy says. The other three map to it exactly." },
      { q: "We can infer from the passage that", o: ["peace is intangible but it certainly demonstrates itself through our actions and reactions when we are in a peaceful frame of mind", "it is preposterous to think of peace on a global level", "ancient mythology and scriptures worldwide believe that a peaceful world could exist, not on earth, but in heaven", "the author subscribes to the motto of the Brahma Kumaris, but with reservations"], a: 0, e: "The passage calls peace intangible, then explains 'the tangibility of peace in an individual's life', a peaceful mind positively changes whatever it touches. The author treats world peace as feasible (not preposterous) and cites the motto without any reservation." },
      { q: "A suitable title for this passage could be", o: ["A Confluence of Religions", "The Tree of Peace", "Peace is More Than No War", "The Culture of Peace"], a: 3, e: "The passage moves from redefining peace, to its manifestation in individual life, to a peaceful world, and closes on 'recreate the one culture that we all wish to re-establish'. 'The Culture of Peace' spans that whole arc; 'Peace is More Than No War' covers only the opening argument and the tree is only one analogy." },
      { q: "The author gives the example of the child to illustrate that", o: ["a child likes a peaceful environment", "a child loses its nerve when it is disturbed by loud noises", "an ugly scene is enough to disturb a person's balance", "peace is an intrinsic desire in humans"], a: 3, e: "The child cries at violent arguments without even understanding the words, the point being made is that the preference for peace is innate, not learned. The very next sentence begins 'Peace, therefore, is a natural instinct'." },
    ],
  },
  {
    id: "bilingual-education",
    title: "Language and Assimilation",
    tier: "hard",
    words: 468,
    text: "Immigrants' adoption of English as their primary language is one measure of assimilation into the larger United States society. Generally, languages define social groups and provide justification for social structures. Hence, a distinctive language sets a cultural group off from the dominant language group. Throughout United States history this pattern has resulted in one consistent, unhappy consequence: discrimination against members of the cultural minority. Language differences provide both a way to rationalize subordination and a ready means for achieving it. Traditionally, English has replaced the native language of immigrant groups by the second or third generation. Some characteristics of today's Spanish-speaking population, however, suggest the possibility of a departure from this historical pattern. Many families retain ties in Latin America and move back and forth between their present and former communities. This 'revolving door' phenomenon, along with the high probability of additional immigrants from the south, means that large Spanish-speaking communities are likely to exist in the United States for the indefinite future. This expectation underlies the call for national support for bilingual education in Spanish-speaking communities' public schools. Bilingual education can serve different purposes, however. In the 1960s, such programs were established to facilitate the learning of English so as to avoid disadvantaging children in their other subjects because of their limited English. More recently, many advocates have viewed bilingual education as a means to maintain children's native languages and cultures. The issue is important for people with different political agendas, from absorption at one pole to separatism at the other. To date, the evaluations of bilingual education's impact on learning have been inconclusive. The issue of bilingual education has, nevertheless, served to unite the leadership of the nation's Hispanic communities. Grounded in concerns about status that are directly traceable to the United States history of discrimination against Hispanics, the demand for maintenance of the Spanish language in the schools is an assertion of the worth of a people and their culture. If the United States is truly a multicultural nation, that is, if it is one culture reflecting the contributions of many, this demand should be seen as a demand not for separation but for inclusion. More direct efforts to force inclusion can be misguided. For example, movements to declare English the official language do not truly advance the cohesion of a multicultural nation. They alienate the twenty million people who do not speak English as their mother tongue. They are unnecessary, since the public's business is already conducted largely in English. Further, given the present state of understanding about the effects of bilingual education on learning, it would be unwise to require the universal use of English. Finally, it is for parents and local communities to choose the path they will follow, including how much of their culture they want to maintain for their children.",
    questions: [
      { q: "It can be inferred from the passage that one of the characteristics of immigrant groups to the United States has traditionally been that, after immigration, relatively few members of the group", o: ["became politically active in their new communities", "moved back and forth repeatedly between the United States and their former communities", "used their native languages in their new communities", "suffered discrimination in their new communities at the hands of the cultural majority"], a: 1, e: "The 'revolving door' movement between present and former communities is presented as what makes TODAY'S Spanish-speaking population 'a departure from this historical pattern', implying earlier immigrant groups rarely did it. Native-language use and discrimination, by contrast, are described as the traditional pattern." },
      { q: "The passage suggests that one of the effects of the debate over bilingual education is that it has", o: ["given the Hispanic community a new-found pride in its culture", "hampered the education of Spanish-speaking students", "demonstrated the negative impact of imposing English as the official United States language", "provided a common banner under which the Spanish-speaking communities could rally"], a: 3, e: "The passage says the issue 'has, nevertheless, served to unite the leadership of the nation's Hispanic communities', a common rallying banner. Evaluations of its impact on learning are called inconclusive, so B and C overreach." },
      { q: "The phrase 'different political agendas' refers specifically to conflicting opinions regarding the", o: ["means of legislating the assimilation of minorities into United States society", "methods of inducing Hispanics to adopt English as their primary language", "means of achieving non-discriminatory education for Hispanics", "extent to which Hispanics should blend into the larger United States society"], a: 3, e: "The agendas run 'from absorption at one pole to separatism at the other', that spectrum is precisely about how far Hispanics should blend into the larger society, not about specific legislative or educational methods." },
      { q: "The author says that 'it would be unwise to require the universal use of English.' One reason for this, according to the author, is that", o: ["it is not clear yet whether requiring the universal use of English would promote or hinder the education of children whose English is limited", "the nation's Hispanic leaders have shown that bilingual education is most effective when it includes the maintenance of the Spanish language in the schools", "requiring the universal use of English would reduce the cohesion of the nation's Hispanic communities and leadership", "the question of language in the schools should be answered by those who evaluate bilingual education, not by people with specific political agendas"], a: 0, e: "The sentence is explicitly tied to 'the present state of understanding about the effects of bilingual education on learning', which the passage has just called inconclusive. Since we don't know the educational effect, mandating universal English would be premature." },
      { q: "In the last paragraph, the author of the passage is primarily concerned with discussing", o: ["reasons against enacting a measure that would mandate the forced inclusion of immigrant groups within the dominant United States culture", "the virtues and limitations of declaring English the official language of the United States", "the history of attitudes within the Hispanic community toward bilingual education in the United States", "the importance for immigrant groups of maintaining large segments of their culture to pass on to their children"], a: 0, e: "The paragraph opens 'More direct efforts to force inclusion can be misguided' and then stacks reasons against official-English measures: they alienate, they are unnecessary, and mandating English would be unwise. It lists no virtues, so B fails." },
    ],
  },
  {
    id: "political-offense",
    title: "The Political Offense Exception",
    tier: "hard",
    words: 436,
    text: "The refusal of some countries to extradite persons accused or convicted of terrorist acts has focused attention on the problems caused by the political offense exception to extradition. Extradition is the process by which one country returns an accused or convicted person found within its borders to another country for trial or punishment. Under the political offense exception, the requested state may, if it considers the crime to be a 'political offense', deny extradition to the requesting state. Protection of political offenses is a recent addition to the ancient practice of extradition. It is the result of two fundamental changes that occurred as European monarchies were replaced by representative governments. First, these governments began to reject what had been a primary intent of extradition, to expedite the return of political offenders, and instead sought to protect dissidents fleeing despotic regimes. Second, countries began to contend that they had no legal or moral duty to extradite offenders without specific agreements creating such obligations. As extradition laws subsequently developed through international treaties, the political offense exception gradually became an accepted principle among Western nations. There is no international consensus, however, as to what constitutes a political offense. For analytical purposes, illegal political conduct has traditionally been divided into two categories. 'Pure' political offenses are acts perpetrated directly against the government, such as treason and espionage. These crimes are generally recognized as nonextraditable, even if not expressly excluded from extradition by the applicable treaty. In contrast, common crimes, such as murder, assault, and robbery, are generally extraditable. However, there are some common crimes that are so inseparable from a political act that the entire offense is regarded as political. These crimes, which are called 'relative' political offenses, are generally nonextraditable. Despite the widespread acceptance of these analytic constructs, the distinctions are more academic than meaningful. When it comes to real cases, there is no agreement about what transforms a common crime into a political offense and about whether terrorist acts fall within the protection of the exception. Most terrorists claim that their acts do fall under this protection. Nations of the world must now balance the competing needs of political freedom and international public order. It is time to reexamine the political offense exception, as international terrorism eradicates the critical distinctions between political offenses and nonpolitical crimes. The only rational and attainable objective of the exception is to protect the requested person against unfair treatment by the requesting country. The international community needs to find an alternative to the political offense exception that would protect the rights of requested persons and yet not offer terrorists immunity from criminal liability.",
    questions: [
      { q: "In the passage, the author primarily seeks to", o: ["define a set of terms", "outline a new approach", "describe a current problem", "expose an illegal practice"], a: 2, e: "The passage opens with a problem ('the problems caused by the political offense exception'), explains its origins and confusions, and closes by calling for a rethink. Definitions are only a means to that end, and no concrete new approach is actually outlined." },
      { q: "According to the passage, when did countries begin to except political offenders from extradition?", o: ["when the principle of extraditing accused or convicted persons originated", "when some nations began refusing to extradite persons accused or convicted of terrorist acts", "when representative governments began to replace European monarchies", "when countries began to refuse to extradite persons accused or convicted of common crimes"], a: 2, e: "Stated directly: the protection 'is the result of two fundamental changes that occurred as European monarchies were replaced by representative governments'. It is called a RECENT addition to the ancient practice, ruling out A." },
      { q: "Given the discussion in the passage, which one of the following distinctions does the author consider particularly problematic?", o: ["between common crimes and 'relative' political offenses", "between 'pure' political offenses and common crimes", "between 'pure' political offenses and 'relative' political offenses", "between terrorist acts and acts of espionage"], a: 0, e: "The unsolved question in real cases is 'what transforms a common crime into a political offense', i.e., when a murder or robbery becomes a 'relative' political offense. Pure political offenses (treason, espionage) are described as generally settled." },
      { q: "According to the author, the primary purpose of the political offense exception should be to", o: ["ensure that terrorists are tried for their acts", "ensure that individuals accused of political crimes are not treated unfairly", "distinguish between political and nonpolitical offenses", "limit extradition to those accused of 'pure' political offenses"], a: 1, e: "The author states it outright: 'The only rational and attainable objective of the exception is to protect the requested person against unfair treatment by the requesting country.'" },
      { q: "It can be inferred from the passage that the author would agree with which one of the following statements about the political offense exception?", o: ["The exception is very unpopular.", "The exception is probably illegal.", "The exception is used too little.", "The exception needs rethinking."], a: 3, e: "'It is time to reexamine the political offense exception' and the call to 'find an alternative' both signal that the author thinks the doctrine needs rethinking, not that it is illegal or underused." },
      { q: "When referring to a balance between 'the competing needs of political freedom and international public order', the author means that nations must strike a balance between", o: ["allowing persons to protest political injustice and preventing them from committing political offenses", "protecting the rights of persons requested for extradition and holding terrorists criminally liable", "maintaining the political offense exception to extradition and clearing up the confusion over what is a political offense", "allowing nations to establish their own extradition policies and establishing an agreed-upon international approach to extradition"], a: 1, e: "The final sentence unpacks the balance: an alternative 'that would protect the rights of requested persons and yet not offer terrorists immunity from criminal liability', rights protection on one side, terrorist accountability on the other." },
    ],
  },
  {
    id: "machine-industry",
    title: "The Logic of the Machine",
    tier: "hard",
    words: 468,
    text: "As is well known and has often been described, the machine industry of recent times took its rise by a gradual emergence out of handicraft in England in the eighteenth century. Since then the mechanical industry has progressively been getting the upper hand in all the civilized nations, in much the same degree in which these nations have come to be counted as civilized. This mechanical industry now stands dominant at the apex of the industrial system. The state of the industrial arts, as it runs on the lines of the mechanical industry, is a technology of physics and chemistry. That is to say, it is governed by the same logic as the scientific laboratories. The procedure, the principles, habits of thought, preconceptions, units of measurement and of valuation, are the same in both cases. The technology of physics and chemistry is not derived from established law and custom, and it goes on its way with as nearly complete a disregard of the spiritual truths of law and custom as the circumstances will permit. The realities with which this technology is occupied are of another order of actuality, lying altogether within the three dimensions that contain the material universe, and running altogether on the logic of material fact. In effect it is the logic of inanimate facts. The mechanical industry makes use of the same range of facts, handled in the same impersonal way and directed to the same manner of objective results. In both cases alike it is of the first importance to eliminate the 'personal equation', to let the work go forward and let the forces at work take effect quite objectively, without hindrance or deflection for any personal end, interest, or gain. It is the technician's place in industry, as it is the scientist's place in the laboratory, to serve as an intellectual embodiment of the forces at work, isolate the forces engaged from all extraneous disturbances, and let them take full effect along the lines of designed work. The technician is an active or creative factor in the case only in the sense that he is the keeper of the logic which governs the forces at work. These forces that so are brought to bear in mechanical industry are of an objective, impersonal, unconventional nature, of course. They are of the nature of opaque fact. Pecuniary gain is not one of these impersonal facts. Any consideration of pecuniary gain that may be injected into the technician's working plans will come into the case as an intrusive and alien factor, whose sole effect is to deflect, retard, derange and curtail the work in hand. At the same time, considerations of pecuniary gain are the only agency brought into the case by the businessmen, and the only ground on which they exercise a control of production.",
    questions: [
      { q: "The author of the passage is primarily concerned with discussing", o: ["industrial organization in the eighteenth century", "the motives for pecuniary gain", "the technician's place in mechanical industry", "the impersonal organization of industry"], a: 3, e: "Every paragraph hammers the same theme: mechanical industry runs on the impersonal 'logic of inanimate facts', eliminating the 'personal equation'. The technician and pecuniary gain are discussed only as aspects of that impersonal organization." },
      { q: "The author of the passage suggests that businessmen in the mechanical industry are responsible mainly for", o: ["keeping the logic governing the forces at work", "managing the profits", "directing the activities of the technicians", "employing the technological procedures of physics and chemistry"], a: 1, e: "The closing line: considerations of pecuniary gain 'are the only agency brought into the case by the businessmen, and the only ground on which they exercise a control of production'. Keeping the logic is the technician's role, not the businessman's." },
      { q: "Which one of the following, if true, would contradict the author's belief that the role of the technician is to be 'the keeper of the logic'?", o: ["All technicians are human beings with feelings and emotions.", "An interest in pecuniary gain is the technician's sole motive for participation in industry.", "The technician's working plans do not coincide with the technician's pecuniary interests.", "Technicians are employed by businessmen to oversee the forces at work."], a: 1, e: "The author insists pecuniary gain enters the technician's plans only as 'an intrusive and alien factor'. If gain were the technician's SOLE motive, he could not be the impartial keeper of the impersonal logic, a direct contradiction. Options A, C and D are compatible with the author's picture." },
      { q: "The author would probably most strongly agree with which one of the following statements about the evolution of the industrial system?", o: ["The handicraft system of industry emerged in eighteenth-century England and was subsequently replaced by the machine industry.", "The handicraft system of industrial production has gradually given rise to a mechanistic technology that dominates contemporary industry.", "The handicraft system emerged as the dominant factor of production in eighteenth-century England but was soon replaced by mechanical techniques of production.", "The mechanical system of production that preceded the handicraft system was the precursor of contemporary means of production."], a: 1, e: "The opening sentence: machine industry 'took its rise by a GRADUAL emergence out of handicraft' and now 'stands dominant at the apex of the industrial system'. A and C wrongly date handicraft's emergence to the eighteenth century; D reverses the sequence." },
      { q: "Which one of the following best describes the author's attitude toward scientific techniques?", o: ["critical", "hostile", "idealistic", "neutral"], a: 3, e: "The author describes how the logic of the laboratory operates, its procedures, units, impersonality, without praising or condemning it. The tone is analytical description, i.e., neutral." },
    ],
  },
  {
    id: "two-democracies",
    title: "Two Kinds of Democracy",
    tier: "hard",
    words: 500,
    text: "The word democracy may stand for a natural social equality in the body politic or for a constitutional form of government in which power lies more or less directly in the people's hands. The former may be called social democracy and the latter democratic government. The two differ widely, both in origin and in moral principle. Genetically considered, social democracy is something primitive, unintended, proper to communities where there is general competence and no marked personal eminence. There will be no aristocracy, no prestige, but instead an intelligent readiness to lend a hand and to do in unison whatever is done. In other words, there will be that most democratic of governments, no government at all. But when pressure of circumstances, danger, or inward strife makes recognized and prolonged guidance necessary to a social democracy, the form its government takes is that of a rudimentary monarchy established by election or general consent. A natural leader emerges and is instinctively obeyed. That leader may indeed be freely criticized and will not be screened by any pomp or traditional mystery; he or she will be easy to replace and every citizen will feel essentially his or her equal. Yet such a state is at the beginnings of monarchy and aristocracy. Political democracy, on the other hand, is a late and artificial product. It arises by a gradual extension of aristocratic privileges, through rebellion against abuses, and in answer to restlessness on the people's part. Its principle is not the absence of eminence, but the discovery that existing eminence is no longer genuine and representative. It may retain many vestiges of older and less democratic institutions. For under democratic governments the people have not created the state; they merely control it. Their suspicions and jealousies are quieted by assigning to them a voice, perhaps only a veto, in the administration. The people's liberty consists not in their original responsibility for what exists, but merely in the faculty they have acquired of abolishing any detail that may distress or wound them, and of imposing any new measure, which, seen against the background of existing laws, may commend itself from time to time to their instinct and mind. If we turn from origins to ideals, the contrast between social and political democracy is no less marked. Social democracy is a general ethical ideal, looking to human equality and brotherhood, and inconsistent, in its radical form, with such institutions as the family and hereditary property. Democratic government, on the contrary, is merely a means to an end, an expedient for the better and smoother government of certain states at certain junctures. It involves no special ideals of life; it is a question of policy, namely, whether the general interest will be better served by granting all people an equal voice in elections. For political democracy must necessarily be a government by deputy, and the questions actually submitted to the people can be only very large rough matters of general policy or of confidence in party leaders.",
    questions: [
      { q: "The author suggests that the lack of 'marked personal eminence' is an important feature of a social democracy because", o: ["such a society is also likely to contain the seeds of monarchy and aristocracy", "the absence of visible social leaders in such a society will probably impede the development of a political democracy", "social democracy represents a more sophisticated form of government than political democracy", "the absence of visible social leaders in such a community is likely to be accompanied by a spirit of cooperation"], a: 3, e: "Where there is no marked eminence, the passage says there is instead 'an intelligent readiness to lend a hand and to do in unison whatever is done', cooperation replaces hierarchy. Social democracy is called primitive, not sophisticated." },
      { q: "Which one of the following forms of government does the author say is most likely to evolve from a social democracy?", o: ["monarchy", "government by deputy", "political democracy", "representative democracy"], a: 0, e: "When guidance becomes necessary, 'the form its government takes is that of a rudimentary monarchy established by election or general consent'. Government by deputy belongs to political democracy, which has a different origin (aristocratic privilege extended)." },
      { q: "The author of the passage suggests that a political democracy is likely to have been immediately preceded by which one of the following forms of social organization?", o: ["a social democracy in which the spirit of participation has been diminished by the need to maintain internal security", "an aristocratic society in which government leaders have grown insensitive to people's interests", "a primitive society that stresses the radical equality of all its members", "a state of utopian brotherhood in which no government exists"], a: 1, e: "Political democracy 'arises by a gradual extension of aristocratic privileges, through rebellion against abuses', its trigger is 'the discovery that existing eminence is no longer genuine and representative'. That is an aristocracy grown unrepresentative, not a social democracy." },
      { q: "According to the passage, 'the people's liberty' in a political democracy is best defined as", o: ["a willingness to accept responsibility for existing governmental forms", "a myth perpetrated by aristocratic leaders who refuse to grant political power to their subjects", "the ability to impose radically new measures when existing governmental forms are found to be inadequate", "the ability to secure concessions from a government that may retain many aristocratic characteristics"], a: 3, e: "The people 'have not created the state; they merely control it', their liberty is the acquired faculty of abolishing distressing details and imposing measures against 'the background of existing laws' (which retain 'many vestiges of older and less democratic institutions'). That is securing concessions, not radical reinvention." },
      { q: "According to the author of this passage, a social democracy would most likely adopt a formal system of government when", o: ["recognized leadership becomes necessary to deal with social problems", "people lose the instinctive ability to cooperate in solving social problems", "a ruling monarch decides that it is necessary to grant political concessions to the people", "citizens no longer consider their social leaders essentially equal to themselves"], a: 0, e: "Stated directly: 'when pressure of circumstances, danger, or inward strife makes recognized and prolonged guidance necessary to a social democracy', it takes the form of a rudimentary elected monarchy." },
      { q: "According to the passage, which one of the following is likely to occur as a result of the discovery that 'existing eminence is no longer genuine and representative'?", o: ["Aristocratic privileges will be strengthened, which will result in a further loss of the people's liberty.", "The government will be forced to admit its responsibility for the inadequacy of existing political institutions.", "The remaining vestiges of less democratic institutions will be banished from government.", "People will gain political concessions from the government and a voice in the affairs of state."], a: 3, e: "That discovery is the principle on which political democracy arises, and under it the people's 'suspicions and jealousies are quieted by assigning to them a voice, perhaps only a veto, in the administration'. The old vestiges are retained, not banished, so C fails." },
    ],
  },
  {
    id: "weary-blues",
    title: "Hughes and the Folk Tradition",
    tier: "hard",
    words: 448,
    text: "There is substantial evidence that by 1926, with the publication of The Weary Blues, Langston Hughes had broken with two well-established traditions in African American literature. In The Weary Blues, Hughes chose to modify the traditions that decreed that African American literature must promote racial acceptance and integration, and that, in order to do so, it must reflect an understanding and mastery of Western European literary techniques and styles. Necessarily excluded by this decree, linguistically and thematically, was the vast amount of secular folk material in the oral tradition that had been created by Black people in the years of slavery and after. It might be pointed out that even the spirituals or 'sorrow songs' of the slaves, as distinct from their secular songs and stories, had been Europeanized to make them acceptable within these African American traditions after the Civil War. In 1862 northern White writers had commented favourably on the unique and provocative melodies of these 'sorrow songs' when they first heard them sung by slaves in the Carolina sea islands. But by 1916, ten years before the publication of The Weary Blues, Harry T. Burleigh, the Black baritone soloist at New York's ultrafashionable Saint George's Episcopal Church, had published Jubilee Songs of the United States, with every spiritual arranged so that a concert singer could sing it 'in the manner of an art song'. Clearly, the artistic work of Black people could be used to promote racial acceptance and integration only on the condition that it became Europeanized. Even more than his rebellion against this restrictive tradition in African American art, Hughes's expression of the vibrant folk culture of Black people established his writing as a landmark in the history of African American literature. Most of his folk poems have the distinctive marks of this folk culture's oral tradition: they contain many instances of naming and enumeration, considerable hyperbole and understatement, and a strong infusion of street-talk rhyming. There is a deceptive veil of artlessness in these poems. Hughes prided himself on being an impromptu and impressionistic writer of poetry. His, he insisted, was not an artfully constructed poetry. Yet an analysis of his dramatic monologues and other poems reveals that his poetry was carefully and artfully crafted. In his folk poetry we find features common to all folk literature, such as dramatic ellipsis, narrative compression, rhythmic repetition, and monosyllabic emphasis. The peculiar mixture of irony and humour we find in his writing is a distinguishing feature of his folk poetry. Together, these aspects of Hughes's writing helped to modify the previous restrictions on the techniques and subject matter of Black writers and consequently to broaden the linguistic and thematic range of African American literature.",
    questions: [
      { q: "The author mentions which one of the following as an example of the influence of Black folk culture on Hughes's poetry?", o: ["his exploitation of ambiguous and deceptive meanings", "his care and craft in composing poems", "his use of naming and enumeration", "his use of first-person narrative"], a: 2, e: "Listed explicitly among the 'distinctive marks of this folk culture's oral tradition': 'many instances of naming and enumeration', hyperbole and understatement, and street-talk rhyming. Care and craft are noted, but as a contrast to his claimed artlessness, not as a folk influence." },
      { q: "The author suggests that the 'deceptive veil' in Hughes's poetry obscures", o: ["evidence of his use of oral techniques in his poetry", "evidence of his thoughtful deliberation in composing his poems", "his scrupulous concern for representative details in his poetry", "his incorporation of Western European literary techniques in his poetry"], a: 1, e: "The veil is 'of artlessness'. Hughes insisted his poetry was impromptu, 'yet an analysis... reveals that his poetry was carefully and artfully crafted'. What the veil hides is exactly that deliberate craft." },
      { q: "With which one of the following statements regarding Jubilee Songs of the United States would the author be most likely to agree?", o: ["Its publication marked an advance in the intrinsic quality of African American art.", "It paved the way for publication of Hughes's The Weary Blues by making African American art fashionable.", "It was an authentic replication of African American spirituals and 'sorrow songs'.", "It demonstrated the extent to which spirituals were adapted in order to make them more broadly accepted."], a: 3, e: "Burleigh's book, 'every spiritual arranged so that a concert singer could sing it in the manner of an art song', is the author's proof that Black artistic work was accepted 'only on the condition that it became Europeanized'. That is adaptation for acceptance, the opposite of authentic replication." },
      { q: "The author most probably mentions the reactions of northern White writers to non-Europeanized 'sorrow songs' in order to", o: ["indicate that modes of expression acceptable in the context of slavery in the South were acceptable only to a small number of White writers in the North after the Civil War", "contrast White writers' earlier appreciation of these songs with the growing tendency after the Civil War to regard Europeanized versions of the songs as more acceptable", "show that the requirement that such songs be Europeanized was internal to the African American tradition and was unrelated to the literary standards or attitudes of White writers", "demonstrate that such songs in their non-Europeanized form were more imaginative"], a: 1, e: "The 1862 praise for the raw 'unique and provocative melodies' is set against the 1916 Burleigh arrangements, a before/after contrast showing how Europeanized versions later became the acceptable form." },
      { q: "The passage suggests that the author would be most likely to agree with which one of the following statements about the requirement that Black writers employ Western European literary techniques?", o: ["The requirement was imposed more for social than for aesthetic reasons.", "The requirement was a relatively unimportant aspect of the African American tradition.", "The requirement was the chief reason for Hughes's success as a writer.", "The requirement was appropriate for some forms of expression but not for others."], a: 0, e: "The mastery of European techniques was demanded 'in order to' promote racial acceptance and integration, a social goal. The passage never grounds the requirement in aesthetic merit; Europeanization was the price of social acceptability." },
      { q: "Which one of the following aspects of Hughes's poetry does the author appear to value most highly?", o: ["its novelty compared to other works of African American literature", "its subtle understatement compared to that of other kinds of folk literature", "its virtuosity in adapting musical forms to language", "its expression of the folk culture of Black people"], a: 3, e: "'EVEN MORE than his rebellion against this restrictive tradition, Hughes's expression of the vibrant folk culture of Black people established his writing as a landmark', the author's own ranking of what mattered most." },
    ],
  },
  {
    id: "bureaucracy-rise",
    title: "Why Bureaucracies Grow",
    tier: "moderate",
    words: 627,
    text: "Though one can argue that bureaucracies are inefficient and cost-ineffective, bureaucracies have their own place in the corporate system. The development of bureaucracy is therefore not an off-shoot of the evils of our administrative machinery but the culmination of set rules and procedures. One of the historical conditions that favours the development of bureaucracy is a money economy. This is not an absolute prerequisite. Bureaucracies based on compensation in kind existed, for example, in Egypt, Rome, and China. Generally, however, a money economy permits the payment of regular salaries, which, in turn, creates the combination of dependence and independence that is most conducive to the faithful performance of bureaucratic duties. Unpaid volunteers are too independent of the organization to submit unfailingly to its discipline. Servants, on the other hand, are too dependent on their masters to have the incentive to assume responsibilities and carry them out on their own initiative. The economic dependence of the salaried employee on his job and his freedom to advance himself in his career engender the orientation toward work required for disciplined and responsible conduct. Consequently, there were few bureaucracies prior to the development of a monetary system and the abolition of slavery. It has already been mentioned that sheer size encourages the development of bureaucracies, since they are mechanisms for executing large-scale administrative tasks. A bureaucracy can function because of the extensiveness of the corporation, thereby making it necessary to bureaucratize matters. The large modern nation, business, or union is more likely to be bureaucratized than was its smaller counterpart in the past. More important than size as such, however, is the emergence of special administrative problems. Thus, in ancient Egypt, the complex job of constructing and regulating waterways throughout the country gave rise to the first known large-scale bureaucracy in history. In other countries, notably those with long frontiers requiring defence, bureaucratic methods were introduced to solve the problem of organizing an effective army and the related one of raising taxes for this purpose. England, without land frontiers, maintained only a small army in earlier centuries, which may in part account for the fact that the trend toward bureaucratization was less pronounced there than in continental nations, which had to support large armies. Weber cites the victory of the Puritans under the leadership of Cromwell over the Cavaliers, who fought more heroically but with less discipline, as an illustration of the superior effectiveness of a bureaucratized army. The capitalistic system also has furthered the advance of bureaucracy. The rational estimation of economic risks, which is presupposed in capitalism, requires that the regular processes of the competitive market not be interrupted by external forces in unpredictable ways. Arbitrary actions of political tyrants interfere with the rational calculation of gain or loss, and so do banditry, piracy, and social upheavals. The interest of capitalism demands, therefore, not only the overthrow of tyrannical rulers but also the establishment of governments strong enough to maintain order and stability. Note that after the American Revolution such representatives of the capitalists as Alexander Hamilton advocated a strong federal government, while representatives of farmers, in the manner of Jefferson, favoured a weak central government. Capitalism then promotes effective and extensive operations of the government. It also leads to bureaucratization in other spheres. The expansion of business firms and the consequent removal of most employees from activities directly governed by the profit principle make it increasingly necessary to introduce bureaucratic methods of administration for the sake of efficiency. These giant corporations, in turn, compel workers, who no longer can bargain individually with an employer they know personally, to organize into large unions with complex administrative machineries. Strange as it may seem, the free-enterprise system fosters the development of bureaucracy in the government, in private companies, and in unions.",
    questions: [
      { q: "The first known large-scale bureaucracy in history occurred in", o: ["England", "China", "Puritan Massachusetts", "ancient Egypt"], a: 3, e: "Stated directly: 'in ancient Egypt, the complex job of constructing and regulating waterways throughout the country gave rise to the first known large-scale bureaucracy in history'." },
      { q: "Of the following, the one that is LEAST likely to be bureaucratized is", o: ["a corporation employing 2,50,000 workers", "a labour union with 10,000 members", "the state government of New York", "a club with 25 members"], a: 3, e: "Sheer size encourages bureaucracy, 'the large modern nation, business, or union is more likely to be bureaucratized than was its smaller counterpart'. A 25-member club is by far the smallest body listed and creates no special administrative problems." },
      { q: "There were few bureaucracies before the development of a monetary system and the abolition of slavery because", o: ["servants were too independent to submit to discipline", "the payment of salaries is conducive to performance of bureaucratic duties", "organizations were too small to be bureaucratized", "organizations were too large to be bureaucratized"], a: 1, e: "Regular salaries create 'the combination of dependence and independence that is most conducive to the faithful performance of bureaucratic duties', volunteers are too independent, servants (not slaves alone) too dependent. Option A reverses the passage: servants are too DEPENDENT." },
      { q: "Capitalists have generally favoured a strong federal government because", o: ["banditry, piracy, and social revolution interfere with attempts to calculate economic risks", "legislators of a weak government are not easily influenced", "such a government holds farmers in check", "they are desirous of an economy whose ups and downs cannot be predicted"], a: 0, e: "Capitalism presupposes 'the rational estimation of economic risks', which tyranny, banditry, piracy and social upheavals disrupt, hence the demand for governments 'strong enough to maintain order and stability' (Hamilton vs. Jefferson). Option D states the opposite of what capitalists want." },
      { q: "Expanding business firms use bureaucratic methods because of the need", o: ["to restrict bureau supervisors", "to deal advantageously with unions", "to decentralize the firm", "for efficiency"], a: 3, e: "The expansion of firms and the removal of most employees from profit-governed activities 'make it increasingly necessary to introduce bureaucratic methods of administration for the sake of efficiency', the passage's own words." },
      { q: "Large corporations are responsible for the development of bureaucracy in labour unions because workers", o: ["lack the incentive to carry out responsibilities on their own", "are too independent of the corporations to submit willingly to discipline", "become estranged from the owners with whom they can no longer bargain individually", "are desirous of improving their skills"], a: 2, e: "Giant corporations 'compel workers, who no longer can bargain individually with an employer they know personally, to organize into large unions with complex administrative machineries', the lost personal bargaining relationship drives unionization and its bureaucracy." },
    ],
  },
  {
    id: "inflation-poor",
    title: "Inflation and the Poor",
    tier: "moderate",
    words: 521,
    text: "Inflation has different effects on different classes of people. It is very important to understand these effects of inflation, as a study of such effects can control the unwanted repercussions. 'The burden of inflation,' Prime Minister Indira Gandhi has often said, 'falls heavily upon the poor, who are largely defenceless against price increases on the necessities of life.' That view is seldom questioned by politicians, but a growing coterie of economists has lately come to regard it as a misleading oversimplification. Affluent America knows surprisingly little about precisely how inflation affects the poor. What information is available, though, suggests to some experts that inflation, or at least some of the conditions that contribute to it, actually helps many of the poor more than price boosts hurt them. This heresy has been argued most forcefully by economists R. G. Chawdhury and J. L. John in a study for the National Institute for Research on Poverty. They contend that the labour shortages produced by an inflationary boom enable many of the poor to land jobs that otherwise would remain beyond their reach. Using complex mathematical formulas, they support earlier calculations that a reduction in the unemployment rate from 5.4 per cent to 3.5 per cent, experienced by India between April 1964 and November 1966, creates 10,42,000 full-time jobs for poor people who otherwise would be working only part-time or not at all. As for the non-working poor, Chawdhury and John found that welfare benefits have generally risen faster than prices. The average monthly cheque in the programme to aid families with dependent children rose 18 per cent during the two years that ended last June. Meanwhile, the consumer price index went up 10 per cent. Actually, price increases are less painful for the poor than for the middle class and the wealthy, the two analysts maintain. They have rejigged the figures in the government's consumer price index, which is largely based on middle-class spending patterns, to construct a 'poor price index'; it gives more weight to increases in food and rent expenses, less importance to rises in clothing, transportation, medical and education costs. Between 1965 and 1967, the last year for which they calculated the poor price index, it rose 5.1 per cent, compared with a 5.8 per cent increase in the CPI. The National Institute researchers conclude that 'the poor are not hurt by inflation' but could be hurt badly by even a 'slight' rise in unemployment resulting from a fight against inflation. This thesis impresses many eminent economists. Says W. N. Hegde, former chairman of the President's Council of Economic Advisers: 'I think we have to be very, very careful in suggesting that inflation is the enemy of the poor. It may be their friend in employment terms.' Some government figures buttress the argument. For example, 8,00,000 of the 58,00,000 Indian families that were officially defined as poor in 1966 had increased their incomes enough to rise above the poverty line last year. Their gains were achieved even though inflation had meanwhile pushed the poverty line up from Rs. 3,317 in annual family income in 1966 to Rs. 3,553 in 1968.",
    questions: [
      { q: "Inflation helps the poor because", o: ["money is worth less during an inflationary period", "money is worth more during an inflationary period", "labour shortages created during inflationary periods create more jobs for the poor", "welfare benefits rise more slowly than prices during an inflationary period"], a: 2, e: "The Chawdhury–John thesis: 'the labour shortages produced by an inflationary boom enable many of the poor to land jobs that otherwise would remain beyond their reach'. Option D reverses the passage, welfare benefits rose FASTER than prices." },
      { q: "All of the following would affect the middle class more than the poor EXCEPT", o: ["an increase in rent", "a reduction in education costs", "an increase in clothing expense", "an increase in travel expense"], a: 0, e: "The 'poor price index' gives MORE weight to food and rent, and LESS to clothing, transportation, medical and education costs. So clothing, travel and education changes weigh more on the middle-class CPI, while a rent increase hits the poor harder, making it the exception." },
      { q: "Which one of the following would be most aided during an inflationary period?", o: ["A worker with a fixed income", "A landlord", "A school teacher", "A debtor"], a: 3, e: "A debtor repays a fixed sum in money that is losing value, inflation shrinks the real burden of the debt. Fixed-income earners (including salaried teachers) are the classic losers, since their pay buys less as prices rise." },
      { q: "The passage suggests that the employment rate", o: ["drastically falls during prosperous times", "is a factor dependent on the poor price index", "increases during an inflationary boom", "cannot improve the quality of jobs"], a: 2, e: "The study links the inflationary boom to a fall in unemployment from 5.4 to 3.5 per cent, creating over ten lakh full-time jobs, i.e., employment rises when the boom is on." },
      { q: "A circumstance which supports the Chawdhury–John thesis is", o: ["the increase in the number of families below the poverty line", "the decrease in the number of families below the poverty line", "the rise in the consumer price index", "the drop in federal spending"], a: 1, e: "The supporting government figure: 8,00,000 of the 58,00,000 officially poor families rose above the poverty line during the inflationary period, fewer families below the line, exactly what the 'inflation helps the poor' thesis predicts." },
      { q: "Even the poor who do not land jobs will benefit from inflation because", o: ["taxes will be lower", "the CPI falls more quickly", "welfare benefits will rise faster than prices", "of improvement in the general economic situation"], a: 2, e: "'As for the non-working poor, Chawdhury and John found that welfare benefits have generally risen faster than prices', the average welfare cheque rose 18 per cent against a 10 per cent CPI rise." },
    ],
  },
  {
    id: "abstract-art",
    title: "In Defence of Abstract Art",
    tier: "moderate",
    words: 875,
    text: "Have you ever come across a painting by Picasso, Mondrian, Miro, or any other modern abstract painter of this century, and found yourself engulfed in a brightly coloured canvas which your senses cannot interpret? Many people would tend to denounce abstractionism as senseless trash. These people are disoriented by Miro's bright, fanciful creatures and two-dimensional canvases. They click their tongues and shake their heads at Mondrian's grid works, declaring the poor guy played too many scrabble games. They silently shake their heads in sympathy for Picasso, whose gruesome, distorted figures must be a reflection of his mental health. Then, standing in front of a work by Charlie Russell, the famous Western artist, they'll declare it a work of God. People feel more comfortable with something they can relate to and understand immediately without too much thought. This is the case with the work of Charlie Russell. Being able to recognize the elements in his paintings, trees, horses and cowboys, gives people a safety line to their world of 'reality'. There are some who would disagree when I say abstract art requires more creativity and artistic talent to produce a good piece than does representational art, but there are many weaknesses in their arguments. People who look down on abstract art have several major arguments to support their beliefs. They feel that artists turn abstract because they are not capable of the technical drafting skills that appear in a Russell; therefore, such artists create an art form that anyone is capable of and that is less time consuming, and then parade it as artistic progress. Secondly, they feel that the purpose of art is to create something of beauty in an orderly, logical composition. Russell's compositions are balanced and rational: everything sits calmly on the canvas, leaving the viewer satisfied that he has seen all there is to see. The modern abstractionists, on the other hand, seem to compose their pieces irrationally. For example, upon seeing Picasso's Guernica, a friend of mine asked me, 'What is the point?' Finally, many people feel that art should portray the ideal and real. The exactness of detail in Charlie Russell's work is an example of this. He has been called a great historian because his pieces depict the lifestyle, dress, and events of the times. His subject matter is derived from his own experiences on the trail, and reproduced to the smallest detail. I agree in part with many of these arguments, and at one time even endorsed them. But now, I believe differently. Firstly, I object to the argument that abstract artists are not capable of drafting. Many abstract artists, such as Picasso, are excellent draftsmen. As his work matured, Picasso became more abstract in order to increase the expressive quality of his work. Guernica was meant as a protest against the bombing of that city by the Germans. To express the terror and suffering of the victims more vividly, he distorted the figures and presented them in a black and white journalistic manner. If he had used representational images and colour, much of the emotional content would have been lost and the piece would not have caused the demand for justice that it did. Secondly, I do not think that a piece must be logical and aesthetically pleasing to be art. The message it conveys to its viewers is more important. It should reflect the ideals and issues of its time and be true to itself, not just a flowery, glossy surface. For example, through his work, Mondrian was trying to present a system of simplicity, logic, and rational order. As a result, his pieces did end up looking like a scrabble board. Miro created powerful, surrealistic images from his dreams and subconscious. These artists were trying to evoke a response from society through an expressionistic manner. Finally, abstract artists and representational artists maintain different ideas about 'reality'. To the representational artist, reality is what he sees with his eyes. This is the reality he reproduces on canvas. To the abstract artist, reality is what he feels about what his eyes see. This is the reality he interprets on canvas. This can be illustrated by Mondrian's Trees series. You can actually see the progression from the early recognizable, though abstracted, Trees to his final solution, the grid system. A cycle of abstract and representational art began with the first scratchings of prehistoric man. From the abstractions of ancient Egypt to representational, classical Rome, returning to abstractionism in early Christian art, and so on up to the present day, the cycle has been going on. But this day and age may witness its death through the camera. With film, there is no need to produce finely detailed, historical records manually: the camera does this for us more efficiently. Maybe representational art would cease to exist. With abstractionism as the victor of the first battle, maybe a different kind of cycle will be touched off. Possibly, some time in the distant future, thousands of years from now, art itself will be physically nonexistent. Some artists today believe that once they have planned and constructed a piece in their mind, there is no sense in finishing it with their hands; it has already been done and can never be duplicated.",
    questions: [
      { q: "The author argues that many people look down upon abstract art because they feel that", o: ["modern abstract art does not portray what is ideal and real", "abstract artists are unskilled in matters of technical drafting", "abstractionists compose irrationally", "All of these"], a: 3, e: "The second paragraph lists exactly three arguments of the detractors: abstract artists lack drafting skill, their compositions are irrational, and art should portray the ideal and real. All three options restate them, so 'All of these' is correct." },
      { q: "The author believes that people feel comfortable with representational art because", o: ["they are not engulfed in brightly coloured canvases", "they do not have to click their tongues and shake their heads in sympathy", "they understand the art without putting too much strain on their minds", "paintings like Guernica do not have a point"], a: 2, e: "'People feel more comfortable with something they can relate to and understand immediately without too much thought', recognizing trees, horses and cowboys gives them 'a safety line to their world of reality'." },
      { q: "In the author's opinion, Picasso's Guernica created a strong demand for justice since", o: ["it was a protest against the German bombing of Guernica", "Picasso managed to express the emotional content well with his abstract depiction", "it depicts the terror and suffering of the victims in a distorted manner", "it was a mature work of Picasso's, painted when the artist's drafting skills were excellent"], a: 1, e: "The author's counterfactual settles it: 'If he had used representational images and colour, much of the emotional content would have been lost and the piece would not have caused the demand for justice that it did.' The abstract treatment carrying the emotion is the causal claim, the protest motive (A) and distortion (C) are only its ingredients." },
      { q: "The author acknowledges that Mondrian's pieces may have ended up looking like a scrabble board because", o: ["many people declared the poor guy played too many scrabble games", "Mondrian believed in the 'grid-works' approach to abstractionist painting", "Mondrian was trying to convey the message of simplicity and rational order", "Mondrian learned from his Trees series to evolve a grid system"], a: 2, e: "'Through his work, Mondrian was trying to present a system of simplicity, logic, and rational order. As a result, his pieces did end up looking like a scrabble board.' The look was a consequence of the message he pursued." },
      { q: "The main difference between the abstract artist and the representational artist in the matter of the 'ideal' and the 'real', according to the author, is", o: ["how each chooses to deal with 'reality' on his or her canvas", "the superiority of interpretation of reality over production of reality", "the different values attached by each to being a historian", "the varying levels of drafting skills and logical thinking abilities"], a: 0, e: "The representational artist reproduces the reality he SEES; the abstract artist interprets the reality he FEELS about what he sees. The difference is the treatment of reality on canvas, the author does not rank one above the other in that comparison." },
    ],
  },
  {
    id: "analysis-limits",
    title: "The Limits of Analysis",
    tier: "hard",
    words: 490,
    text: "Business management, and within it the field of corporate strategy, has been typified by enormous progress during the last three decades. One major characteristic of this progress has been the development of highly analytical managerial tools and concepts. These range from extensively quantified procedures, such as discounted cash flow analysis for investment decisions, to the multiple regressions and statistical methodologies found in broader areas of strategic planning and problem solving. This development of a reliance on hard facts and tough analysis was necessary and timely. It helped to solve the problems that were typically faced by businesses in the 1960s and the early 1970s. This was the time of high growth rates in many of the economies of industrialized and developing nations, which offered a wealth of business opportunities. The overriding managerial priority was to analyse multiple options and to select skilfully from among them. Two additional developments were both fundamental and catalytic to this rapid growth in the use of the analytical technique. The first was the advent and availability of electronic data processing to array and analyse vast amounts of information, and the second was the increasing inflow of econometricians, computer scientists and operations researchers into the field of business management. Soon, managers without these tools, or lacking staff skilled in these techniques, were considered hopelessly archaic. The hard edge of quantitative, technically elegant techniques appeared to provide a new and powerful approach to management decision-making. All of these tendencies, grouped together, added up to a rather remarkable result: an impressive edifice of systematic knowledge in the area of business management, characterized by a Cartesian, highly analytical approach, exemplified and promoted by the growing number of MBA programmes offered by academic institutions in almost every developed and developing country of the world. During the last decade, however, there has been a growing perception that there was something incomplete about this modern paradigm, heretofore considered a major driving force in the admirable upswing of modern business management. In articles and at symposia, an increasing number of academicians, as well as experienced practitioners, began to suggest that there might be inherent flaws in the tendency to treat the economy like a huge machine, working like clockwork, with definable inputs and outputs, clear causes and logical effects. Faced with new pressures related to population control, resource management and other interacting constraints on otherwise free market philosophies, unlimited growth has been exposed as a false and unrealistic goal. Adam Smith's innocence has been modified all the way to propositions such as the zero sum society. In the light of stagnating markets, enormous restructuring efforts, and growing unemployment problems in many countries, it now seems questionable whether the problems faced by tomorrow's managers will be solved quite so readily by the powers of shrewd analysis alone. Central to this new, and more flexible, understanding of the multiple elements of a more comprehensive philosophy of modern management is the notion of creative solution finding.",
    questions: [
      { q: "In accordance with the structure of the passage, it would be followed by a discussion on", o: ["the specific problems of the future", "new analytical approaches", "new techniques in management", "creative management techniques"], a: 3, e: "The passage ends by declaring 'the notion of creative solution finding' central to the new philosophy of management, the natural next section develops that creative approach. 'New analytical approaches' is precisely what the passage has just called insufficient." },
      { q: "All of the following can be seen to be true about the analytical approach mentioned in the passage EXCEPT", o: ["systematic knowledge", "electronic data processing", "Cartesian approach", "None of these"], a: 3, e: "All three are explicitly tied to the analytical era: 'an impressive edifice of systematic knowledge... characterized by a Cartesian, highly analytical approach', catalysed by 'electronic data processing'. With no exception available, 'None of these' is the answer." },
      { q: "It can be safely inferred from the passage that in the 1960s and early 1970s", o: ["companies used creative techniques", "many companies used analytical techniques", "companies seldom used analytical techniques", "the use of analytical techniques was less as compared to the following decades"], a: 1, e: "The analytical tools 'helped to solve the problems that were typically faced by businesses in the 1960s and the early 1970s', and managers WITHOUT them 'were considered hopelessly archaic', so their use was widespread in that period." },
      { q: "The tone of the passage is", o: ["analytical", "casual", "amusing", "sullen"], a: 0, e: "The author traces causes and effects, why analytical tools rose, what catalysed them, why the paradigm now looks incomplete, in measured, evaluative prose. That is an analytical tone; nothing in it is casual, comic or gloomy." },
      { q: "According to the passage, which two developments were 'fundamental and catalytic' to the rapid growth of analytical techniques in management?", o: ["The advent of electronic data processing, and the inflow of econometricians, computer scientists and operations researchers into business management", "High growth rates in industrialized economies, and discounted cash flow analysis", "The spread of MBA programmes, and the zero sum society", "Stagnating markets, and enormous restructuring efforts"], a: 0, e: "Named in the third paragraph: 'The first was the advent and availability of electronic data processing... and the second was the increasing inflow of econometricians, computer scientists and operations researchers into the field of business management.'" },
    ],
  },
  // ── RC 10 batch (owner PDF, Sep 2026) — explanations authored in-house ──
  {
    "id": "railroad-critics",
    "title": "The Railroad and Its Critics",
    "tier": "hard",
    "words": 446,
    "text": "Historians generally agree that, of the great modern innovations, the railroad had the most far-reaching impact on major events in the United States in the nineteenth and early twentieth centuries, particularly on the Industrial Revolution. There is, however, considerable disagreement among cultural historians regarding public attitudes toward the railroad, both at its inception in the 1830s and during the half century between 1880 and 1930, when the national rail system was completed and reached the zenith of its popularity in the United States. In a recent book, John Stilgoe has addressed this issue by arguing that the \"romantic-era distrust\" of the railroad that he claims was present during the 1830s vanished in the decades after 1880. But the argument he provides in support of this position is unconvincing. What Stilgoe calls \"romantic-era distrust\" was in fact the reaction of a minority of writers, artistes, and intellectuals who distrusted the railroad not so much for what it was as for what it signified. Thoreau and Hawthorne appreciated, even admired, an improved means of moving things and people from one place to another. What these writers and others were concerned about was not the new machinery as such, but the new kind of economy, social order, and culture that it prefigured. In addition, Stilgoe is wrong to imply that the critical attitude of these writers was typical of the period: their distrust was largely a reaction against the prevailing attitude in the 1830s that the railroad was an unqualified improvement. Stilgoe's assertion that the ambivalence toward the railroad exhibited by writers like Hawthorne and Thoreau disappeared after the 1880s is also misleading. In support of this thesis, Stilgoe has unearthed an impressive volume of material, the work of hitherto unknown illustrators, journalists, and novelists, all devotees of the railroad; but it is not clear what this new material proves except perhaps that the works of popular culture greatly expanded at the time. The volume of the material proves nothing if Stilgoe's point is that the earlier distrust of a minority of intellectuals did not endure beyond the 1880s, and, oddly, much of Stilgoe's other evidence indicates that it did. When he glances at the treatment of railroads by writers like Henry James, Sinclair Lewis, or F. Scott Fitzgerald, what comes through in spite of Stilgoe's analysis is remarkably like Thoreau's feeling of contrariety and ambivalence. (Had he looked at the work of Frank Norris, Eugene O'Neill, or Henry Adams, Stilgoe's case would have been much stronger.) The point is that the sharp contrast between the enthusiastic supporters of the railroad in the 1830s and the minority of intellectual dissenters during that period extended into the 1880s and beyond.",
    "questions": [
      {
        "q": "The passage provides information to answer all of the following questions EXCEPT:",
        "o": [
          "During what period did the railroad reach the zenith of its popularity in the United States?",
          "How extensive was the impact of the railroad on the Industrial Revolution in the United States, relative to that of other modern innovations?",
          "Who are some of the writers of the 1830s who expressed ambivalence toward the railroad?",
          "What arguments did the writers after the 1880s, as cited by Stilgoe, offer to justify their support for the railroad?"
        ],
        "a": 3,
        "e": "The passage never tells us what arguments the post-1880 writers gave for supporting the railroad, only that Stilgoe found a large volume of pro-railroad material. A is answered (1880 to 1930), B is answered (most far-reaching impact), and C is answered (Thoreau and Hawthorne)."
      },
      {
        "q": "According to the author of the passage, Stilgoe uses the phrase \"romantic-era distrust\" to imply that the view he is referring to was",
        "o": [
          "the attitude of a minority of intellectuals toward technological innovation that began after 1830",
          "a commonly held attitude toward the railroad during the 1830s",
          "an ambivalent view of the railroad expressed by many poets and novelists between 1880 and 1930",
          "a critique of social and economic developments during the 1830s by a minority of intellectuals"
        ],
        "a": 1,
        "e": "The author says Stilgoe is 'wrong to imply that the critical attitude of these writers was typical of the period'. Calling it romantic-era distrust suggests the whole era distrusted the railroad, which is exactly what the author disputes. A and D describe the author's own view, not what Stilgoe's phrase implies."
      },
      {
        "q": "According to the author, the attitude toward the railroad that was reflected in writings of Henry James, Sinclair Lewis, and F. Scott Fitzgerald was",
        "o": [
          "influenced by the writings of Frank Norris, Eugene O'Neill, and Henry Adams",
          "similar to that of the minority of writers who had expressed ambivalence toward the railroad prior to the 1880s",
          "consistent with the public attitudes toward the railroad that were reflected in works of popular culture after the 1880s",
          "largely a reaction to the works of writers who had been severely critical of the railroad in the 1830s"
        ],
        "a": 1,
        "e": "The author says what comes through in James, Lewis and Fitzgerald is 'remarkably like Thoreau's feeling of contrariety and ambivalence', so their attitude resembled the pre-1880 minority. A gets the influence backwards and C contradicts the author's point that popular culture was pro-railroad."
      },
      {
        "q": "It can be inferred from the passage that the author uses the phrase \"works of popular culture\" primarily to refer to the",
        "o": [
          "work of a large group of writers that was published between 1880 and 1930 and that in Stilgoe's view was highly critical of the railroad",
          "work of writers who were heavily influenced by Hawthorne and Thoreau",
          "large volume of writing produced by Henry Adams, Sinclair Lewis, and Eugene O'Neill",
          "work of journalists, novelists, and illustrators that was published after 1880 and that has received little attention from scholars other than Stilgoe"
        ],
        "a": 3,
        "e": "The phrase refers to the material Stilgoe unearthed: 'hitherto unknown illustrators, journalists, and novelists', published after 1880 and previously ignored by scholars. A fails because that material was pro-railroad, not critical of it."
      },
      {
        "q": "Which one of the following can be inferred from the passage regarding the work of Frank Norris, Eugene O'Neill, and Henry Adams?",
        "o": [
          "Their work never achieved broad popular appeal.",
          "Their ideas were disseminated to a large audience by the popular culture of the early 1800s.",
          "Their work expressed a more positive attitude toward the railroad than did that of Henry James, Sinclair Lewis, and F. Scott Fitzgerald.",
          "Although they were primarily novelists, some of their work could be classified as journalism."
        ],
        "a": 2,
        "e": "The author remarks that Stilgoe's case would have been much stronger had he cited Norris, O'Neill and Adams. Stilgoe's case is that distrust of the railroad faded after 1880, so writers who would strengthen it must have shown a more positive attitude toward the railroad than the ambivalent James, Lewis and Fitzgerald. That is option C. A and B invent facts about popularity the passage never gives."
      },
      {
        "q": "It can be inferred from the passage that Stilgoe would be most likely to agree with which one of the following statements regarding the study of cultural history?",
        "o": [
          "It is impossible to know exactly what period historians are referring to when they use the term \"romantic era.\"",
          "The writing of intellectuals often anticipates ideas and movements that are later embraced by popular culture.",
          "Writers who were not popular in their own time tell us little about the age in which they lived.",
          "The works of popular culture can serve as a reliable indicator of public attitudes toward modern innovations like the railroad."
        ],
        "a": 3,
        "e": "Stilgoe treats the sheer volume of pro-railroad popular material as proof that public distrust vanished, so he must believe popular culture reliably indicates public attitudes. The author attacks exactly this assumption, which is why D is Stilgoe's view rather than the author's."
      }
    ]
  },
  {
    "id": "water-bug-wings",
    "title": "How Water Bugs Get Their Wings",
    "tier": "moderate",
    "words": 465,
    "text": "Three basic adaptive responses—regulatory, acclimatory, and developmental—may occur in organisms as they react to changing environmental conditions. In all three, adjustment of biological features (morphological adjustment) or of their use (functional adjustment) may occur. Regulatory responses involve rapid changes in the organism's use of its physiological apparatus—increasing or decreasing the rates of various processes, for example. Acclimation involves morphological change— thickening of fur or red blood cell proliferation—which alters physiology itself. Such structural changes require more time than regulatory response changes. Regulatory and acclimatory responses are both reversible. Developmental responses, however, are usually permanent and irreversible: they become fixed in the course of the individual's development in response to environmental conditions at the time the response occurs. One such response occurs in many kinds of water bugs. Most water-bug species inhabiting small lakes and ponds have two generations per year. The first hatches during the spring, reproduces during the summer, then dies. The eggs laid in the summer hatch and develop into adults in late summer. They live over the winter before breeding in early spring. Individuals in the second (overwintering) generation have fully developed wings and leave the water in autumn to overwinter in forests, returning in spring to small bodies of water to lay eggs. Their wings are absolutely necessary for this seasonal dispersal. The summer (early) generation, in contrast, is usually dimorphic —some individuals have normal functional (macropterous) wings; others have much-reduced (micropterous) wings of no use for flight. The summer generation's dimorphism is a compromise strategy, for these individuals usually do not leave the ponds and thus generally have no use for fully developed wings. But small ponds occasionally dry up during the summer, forcing the water bugs to search for new habitats, an eventuality that macropterous individuals are well adapted to meet. The dimorphism of micropterous and macropterous individuals in the summer generation expresses developmental flexibility; it is not genetically determined. The individual's wing form is environmentally determined by the temperature to which developing eggs are exposed prior to their being laid. Eggs maintained in a warm environment always produce bugs with normal wing, but exposure to cold produces micropterous individuals. Eggs producing the overwintering brood are all formed during the late summer's warm temperatures. Hence, all individuals in the overwintering brood have normal wings. Eggs laid by the overwintering adults in the spring, which develop into the summer generation of adults, are formed in early autumn and early spring. Those eggs formed in autumn are exposed to cold winter temperatures, and thus produce micropterous adults in the summer generation. Those formed during the spring are never exposed to cold temperatures, and thus yield individuals with normal wing. Adult water bugs of the overwintering generation brought into the laboratory during the cold months and kept warm, produce only macropterous offspring.",
    "questions": [
      {
        "q": "The primary purpose of the passage is to",
        "o": [
          "illustrate an organism's functional adaptive response to changing environmental conditions",
          "prove that organisms can exhibit three basic adaptive responses to changing environmental conditions",
          "explain the differences in form and function between micropterous and macropterous water bugs and analyze the effect of environmental changes on each",
          "discuss three different types of adaptive responses and provide an example that explains how one of those types of responses works"
        ],
        "a": 3,
        "e": "The passage defines the three responses, then spends two full paragraphs on one worked example, the water bug's developmental response. A is too narrow (that covers only part of it), B is wrong because the passage explains rather than proves, and C skips the framework the passage starts with."
      },
      {
        "q": "The passage supplies information to suggest that which one of the following would happen if a pond inhabited by water bugs were to dry up in June?",
        "o": [
          "The number of developmental responses among the water-bug population would decrease.",
          "Both micropterous and macropterous water bugs would show an acclimatory response.",
          "The generation of water bugs to be hatched during the subsequent spring would contain an unusually large number of macropterous individuals.",
          "The dimorphism of the summer generation would enable some individuals to survive."
        ],
        "a": 3,
        "e": "The passage says dimorphism is a compromise: if a pond dries up, the macropterous (full-winged) summer individuals can fly to a new habitat. So some individuals survive precisely because the generation has both forms. C confuses the mechanism, since next spring's wing forms depend on egg temperature, not on the drought."
      },
      {
        "q": "It can be inferred from the passage that if the winter months of a particular year were unusually warm, the",
        "o": [
          "eggs formed by water bugs in the autumn would probably produce a higher than usual proportion of macropterous individuals",
          "eggs formed by water bugs in the autumn would probably produce an entire summer generation of water bugs with smaller than normal wings",
          "eggs of the overwintering generation formed in the autumn would not be affected by this temperature change",
          "overwintering generation would not leave the ponds for the forest during the winter"
        ],
        "a": 0,
        "e": "Micropterous adults come only from eggs exposed to winter cold. A warm winter means the autumn-formed eggs escape that cold exposure, so more of them develop normal (macropterous) wings. B is the exact opposite."
      },
      {
        "q": "According to the passage, the dimorphic wing structure of the summer generation of water bugs occurs because",
        "o": [
          "the overwintering generation forms two sets of eggs, one exposed to the colder temperatures of winter and one exposed only to the warmer temperatures of spring",
          "the eggs that produce micropterous and macropterous adults are morphologically different",
          "water bugs respond to seasonal changes by making an acclimatory functional adjustment in the wings",
          "water bugs hatching in the spring live out their life spans in ponds and never need to fly"
        ],
        "a": 0,
        "e": "The overwintering adults form eggs at two times: autumn eggs that sit through winter cold and become micropterous adults, and spring eggs that stay warm and become macropterous adults. Two temperature histories, two wing forms, one generation. B is wrong because the eggs differ in exposure, not in structure."
      },
      {
        "q": "It can be inferred from the passage that which one of the following is an example of a regulatory response?",
        "o": [
          "thickening of the plumage of some birds in the autumn",
          "increase in pulse rate during vigorous exercise",
          "gradual darkening of the skin after exposure to sunlight",
          "gradual enlargement of muscles as a result of weight lifting"
        ],
        "a": 1,
        "e": "A regulatory response is a rapid, reversible change in how the body is used, like a pulse rate rising during exercise. A and C are acclimation (structural change over time) and D is also a slow morphological change."
      },
      {
        "q": "According to the passage, the generation of water bugs hatching during the summer is likely to",
        "o": [
          "be made up of equal numbers of macropterous and micropterous individuals",
          "lay its eggs during the winter in order to expose them to cold",
          "show a marked inability to fly from one pond to another",
          "contain a much greater proportion of macropterous water bugs than the early spring-hatched generation"
        ],
        "a": 3,
        "e": "Eggs laid in summer warmth all develop normal wings, so the late-summer (overwintering) generation is entirely macropterous, unlike the spring-hatched summer generation, which is a mix. A is wrong because the passage never says the mix is equal."
      }
    ]
  },
  {
    "id": "war-powers",
    "title": "The President, Congress and the War Powers",
    "tier": "hard",
    "words": 495,
    "text": "The Constitution of the United States does not explicitly define the extent of the President's authority to involve United States troops in conflicts with other nations in the absence of a declaration of war. Instead, the question of the President's authority in this matter falls in the hazy area of concurrent, a concurrent resolution: ) power, where authority is not expressly allocated to either the President or the Congress. The Constitution gives Congress the basic power to declare war, as well as the authority to raise and support armies and a navy, enact regulations for the control of the military, and provide for the common defense. The President, on the other hand, in addition to being obligated to execute the laws of the land, including commitments negotiated by defense treaties, is named commander in chief of the armed forces and is empowered to appoint envoys and make treaties with the consent of the Senate. Although this allocation of powers does not expressly address the use of armed forces short of a declared war, the spirit of the Constitution at least requires that Congress should be involved in the decision to deploy troops, and in passing the War Powers Resolution of 1973, Congress has at last reclaimed a role in such decisions. Historically, United States Presidents have not waited for the approval of Congress before involving United States troops in conflicts in which a state of war was not declared. One scholar has identified 199 military engagements that occurred without the consent of Congress, ranging from Jefferson's conflict with the Barbary pirates to Nixon's invasion of Cambodia during the Vietnam conflict, which President Nixon argued was justified because his role as commander in chief allowed him almost unlimited discretion over the deployment of troops. However, the Vietnam conflict, never a declared war, represented a turning point in Congress's tolerance of presidential discretion in the deployment of troops in undeclared wars. Galvanized by the human and monetary cost of those hostilities and showing a new determination to fulfill its proper role, Congress enacted the War Powers Resolution of 1973, a statute designed to ensure that the collective judgment of both Congress and the President would be applied to the involvement of United States troops in foreign conflicts. The resolution required the President, in the absence of a declaration of war, to consult with Congress \"in every possible instance\" before introducing forces and to report to Congress within 48 hours after the forces have actually been deployed. Most important, the resolution allows Congress to veto the involvement once it begins, and requires the President, in most cases, to end the involvement within 60 days unless Congress specifically authorizes the military operation to continue. In its final section, by declaring the resolution is not intended to alter the constitutional authority of either Congress or the President, the resolution asserts that congressional involvement in decisions to use armed force is in accord with the intent and spirit of the Constitution.",
    "questions": [
      {
        "q": "In the passage, the author is primarily concerned with",
        "o": [
          "showing how the Vietnam conflict led to a new interpretation of the Constitution's provisions for use of the military",
          "arguing that the War Powers Resolution of 1973 is an attempt to reclaim a share of constitutionally concurrent power that had been usurped by the President",
          "outlining the history of the struggle between the President and Congress for control of the military",
          "providing examples of conflicts inherent in the Constitution's approach to a balance of powers"
        ],
        "a": 1,
        "e": "The author argues the Constitution left troop deployment in a zone of concurrent power, Presidents took that power unilaterally 199 times, and with the 1973 Resolution Congress 'has at last reclaimed a role'. That is option B. C describes the second paragraph only, not the passage's argument."
      },
      {
        "q": "With regard to the use of United States troops in a foreign conflict without a formal declaration of war by the United States, the author believes that the United States Constitution does which one of the following?",
        "o": [
          "assumes that the President and Congress will agree on whether troops should be used",
          "provides a clear-cut division of authority between the President and Congress in the decision to use troops",
          "assigns a greater role to the Congress than to the President in deciding whether troops should be used",
          "intends that both the President and Congress should be involved in the decision to use troops"
        ],
        "a": 3,
        "e": "The author says 'the spirit of the Constitution at least requires that Congress should be involved in the decision to deploy troops', while the President is commander in chief, so both branches are meant to participate. C overstates it: the passage assigns Congress a role, not a greater role."
      },
      {
        "q": "The passage suggests that each of the following contributed to Congress's enacting the War Powers Resolution of 1973 EXCEPT",
        "o": [
          "a change in the attitude in Congress toward exercising its role in the use of armed forces",
          "the failure of Presidents to uphold commitments specified in defense treaties",
          "Congress's desire to be consulted concerning United States military actions instigated by the President",
          "the amount of money spent on recent conflicts waged without a declaration of war"
        ],
        "a": 1,
        "e": "The passage cites Congress's new determination to fulfil its role (A), its wish for collective judgment (C), and the human and monetary cost of Vietnam (D). Presidents failing to honour defence treaties is never mentioned, so B is the exception."
      },
      {
        "q": "It can be inferred from the passage that the War Powers Resolution of 1973 is applicable only in \"the absence of a declaration of war\" because",
        "o": [
          "Congress has enacted other laws that already set out presidential requirements for situations in which war has been declared",
          "by virtue of declaring war, Congress already implicitly participates in the decision to deploy troops",
          "the President generally receives broad public support during wars that have been formally declared by Congress",
          "Congress felt that the President should be allowed unlimited discretion in cases in which war has been declared"
        ],
        "a": 1,
        "e": "Declaring war is itself Congress's decision, so once war is declared Congress has already participated; the Resolution is needed only where that participation is missing. A invents other statutes the passage never mentions."
      },
      {
        "q": "In can be inferred from the passage that the author believes that the War Powers Resolution of 1973",
        "o": [
          "is not in accord with the explicit roles of the President and Congress as defined in the Constitution",
          "interferes with the role of the President as commander in chief of the armed forces",
          "signals Congress's commitment to fulfill a role intended for it by the Constitution",
          "fails explicitly to address the use of armed forces in the absence of a declaration of war"
        ],
        "a": 2,
        "e": "The author calls the Resolution the moment Congress 'reclaimed' its role and notes its final section asserting accord with the intent and spirit of the Constitution, which the author accepts. A and D contradict the passage directly."
      },
      {
        "q": "It can be inferred from the passage that the author would be most likely to agree with which one of the following statements regarding the invasion of Cambodia?",
        "o": [
          "Because it was undertaken without the consent of Congress, it violated the intent and spirit of the Constitution.",
          "Because it galvanized support for the War Powers Resolution, it contributed indirectly to the expansion of presidential authority.",
          "Because it was necessitated by a defense treaty, it required the consent of Congress.",
          "It served as a precedent for a new interpretation of the constitutional limits on the President's authority to deploy troops."
        ],
        "a": 0,
        "e": "The author believes the Constitution's spirit requires congressional involvement in deploying troops. Cambodia was invaded without Congress's consent, so by the author's own standard it violated that intent. D describes Nixon's justification, which the author presents critically, not approvingly."
      }
    ]
  },
  {
    "id": "ocean-law",
    "title": "Who Governs the Ocean?",
    "tier": "hard",
    "words": 489,
    "text": "The extent of a nation's power over its coastal ecosystems and the natural resources in its coastal waters has been defined by two international law doctrines: freedom of the seas and adjacent state sovereignty. Until the mid-twentieth century, most nations favored application of broad open-seas freedoms and limited sovereign rights over coastal waters. A nation had the right to include within its territorial dominion only a very narrow band of coastal waters (generally extending three miles from the shoreline), within which it had the authority but not the responsibility, to regulate all activities. But, because this area of territorial dominion was so limited, most nations did not establish rules for management or protection of their territorial waters. Regardless of whether or not nations enforced regulations in their territorial waters, large ocean areas remained free of controls or restrictions. The citizens of all nations had the right to use these unrestricted ocean areas for any innocent purpose, including navigation and fishing. Except for controls over its own citizens, no nation had the responsibility, let alone the unilateral authority, to control such activities in international waters. And, since there were few standards of conduct that applied on the \"open seas\", there were few jurisdictional conflicts between nations. The lack of standards is traceable to popular perceptions held before the middle of this century. By and large, marine pollution was not perceived as a significant problem, in part because the adverse effect of coastal activities on ocean ecosystems was not widely recognized, and pollution caused by human activities was generally believed to be limited to that caused by navigation. Moreover, the freedom to fish, or overfish, was an essential element of the traditional legal doctrine of freedom of the seas that no maritime country wished to see limited. And finally, the technology that later allowed exploitation of other ocean resources, such as oil, did not yet exist. To date, controlling pollution and regulating ocean resources have still not been comprehensively addressed by law, but international law—established through the customs and practices of nations—does not preclude such efforts. And two recent developments may actually lead to future international rules providing for ecosystem management. First, the establishment of extensive fishery zones extending territorial authority as far as 200 miles out from a country's coast, has provided the opportunity for nations individually to manage larger ecosystems. This opportunity, combined with national self-interest in maintaining fish populations, could lead nations to reevaluate policies for management of their fisheries and to address the problem of pollution in territorial waters. Second, the international community is beginning to understand the importance of preserving the resources and ecology of international waters and to show signs of accepting responsibility for doing so. As an international consensus regarding the need for comprehensive management of ocean resources develops, it will become more likely that international standards and policies for broader regulation of human activities that affect ocean ecosystems will be adopted and implemented.",
    "questions": [
      {
        "q": "According to the passage, until the mid-twentieth century there were few jurisdictional disputes over international waters because.",
        "o": [
          "the nearest coastal nation regulated activities",
          "few controls or restrictions applied to ocean areas",
          "the ocean areas were used for only innocent purposes",
          "the freedom of the seas doctrine settled all claims concerning navigation and fishing"
        ],
        "a": 1,
        "e": "The passage says that since few standards of conduct applied on the open seas, 'there were few jurisdictional conflicts between nations'. No rules meant nothing to fight over. C is a trap: innocent use was a right, not a guarantee of behaviour."
      },
      {
        "q": "According to the international law doctrines applicable before the mid- twentieth century, if commercial activity within a particular nation's territorial waters threatened all marine life in those waters, the nation would have been",
        "o": [
          "formally censured by an international organization for not properly regulating marine activities",
          "called upon by other nations to establish rules to protect its territorial waters",
          "able but not required to place legal limits on such commercial activities",
          "allowed to resolve the problem at it own discretion providing it could contain the threat to its own territorial waters"
        ],
        "a": 2,
        "e": "Within territorial waters a nation had 'the authority but not the responsibility' to regulate. So it could limit the harmful activity but was not obliged to. A and B fail because no international body or other nation had any such role then."
      },
      {
        "q": "The author suggests that, before the mid-twentieth century, most nations' actions with respect to territorial and international waters indicated that",
        "o": [
          "managing ecosystems in either territorial or international waters was given low priority",
          "unlimited resources in international waters resulted in little interest in territorial waters",
          "nations considered it their responsibility to protect territorial but not international waters",
          "a nation's authority over its citizenry ended at territorial lines"
        ],
        "a": 0,
        "e": "Most nations set no rules for territorial waters, and no nation had authority or responsibility in international waters. Ecosystem management simply ranked low everywhere, which is option A. C is contradicted: nations did not treat protection as a responsibility even at home."
      },
      {
        "q": "The author cites which one of the following as an effect of the extension of territorial waters beyond the three-mile limit?",
        "o": [
          "increased political pressure on individual nations to establish comprehensive laws regulating ocean resources",
          "a greater number of jurisdictional disputes among nations over the regulation of fishing on the open seas",
          "the opportunity for some nations to manage large ocean ecosystems",
          "a new awareness of the need to minimize pollution caused by navigation"
        ],
        "a": 2,
        "e": "The passage cites the 200-mile fishery zones as giving nations 'the opportunity... individually to manage larger ecosystems'. B is the opposite of what the passage says about disputes, and D belongs to the perception discussion, not the fishery zones."
      },
      {
        "q": "According to the passage, before the middle of the twentieth century, nations failed to establish rules protecting their territorial waters because",
        "o": [
          "the waters appeared to be unpolluted and to contain unlimited resources",
          "the fishing industry would be adversely affected by such rules",
          "the size of the area that would be subject to such rules was insignificant",
          "the technology needed for pollution control and resource management did not exist"
        ],
        "a": 2,
        "e": "The passage says that 'because this area of territorial dominion was so limited, most nations did not establish rules'. The three-mile band felt too small to be worth regulating. D is about technology for exploiting resources like oil, not about rule-making."
      },
      {
        "q": "The passage as a whole can best be described as",
        "o": [
          "a chronology of the events that have led up to present-day crisis",
          "a legal inquiry into the abuse of existing laws and the likelihood of reform",
          "a political analysis of the problems inherent in directing national attention to an international issue",
          "a historical analysis of a problem that requires international attention"
        ],
        "a": 3,
        "e": "The passage traces a problem through history (old doctrines, old perceptions) and ends with developments that could bring international standards. That is a historical analysis of a problem needing international attention. A fails because the passage describes no present-day crisis chronology."
      }
    ]
  },
  {
    "id": "biodiversity-crisis",
    "title": "The Biodiversity Crisis",
    "tier": "moderate",
    "words": 456,
    "text": "The human species came into being at the time of the greatest biological diversity in the history of the Earth. Today, as human populations expand and alter the natural environment, they are reducing biological diversity to its lowest level since the end of the Mesozoic era, 65 million years ago. The ultimate consequences of this biological collision are beyond calculation, but they are certain to be harmful. That, in essence, is the biodiversity crisis. The history of global diversity can be summarized as follows : after the initial flowering of multicellular animals, there was a swift rise in the number of species in early Paleozoic times (between 600 and 430 million years ago), then plateaulike stagnation for the remaining 200 million years of the Paleozoic era, and finally a slow but steady climb through the Mesozoic and Cenozoic eras to diversity's all-time high. This history suggests that biological diversity was hard won and a long time in coming. Furthermore, this pattern of increase was set back by five massive extinction episodes. The most recent of these, during the Cretaceous period, is by far the most famous, because it ended the age of the dinosaurs, conferred hegemony on the mammals, and ultimately made possible the ascendancy of the human species. But the cretaceous crisis was minor compared with the Permian extinctions 240 million years ago, during which between 77 and 96 percent of marine animal species perished. It took 5 million years, well into Mesozoic times, for species diversity to begin a significant recovery. Within the past 10,000 years biological diversity has entered a wholly new era. Human activity has had a devastating effect on species diversity, and the rate of human- induced extinctions is accelerating. Half of the bird species of Polynesia have been eliminated through hunting and the destruction of native forests. Hundreds of fish species endemic to Lake Victoria are now threatened with extinction following the careless introduction of one species of fish, the Nile perch. The list of such biogeographic disasters is extensive. Because every species is unique and irreplaceable, the loss of biodiversity is the most profound process of environmental change. Its consequences are also the least predictable because the value of Earth's biota remains largely unstudied and unappreciated; unlike material and cultural wealth, which we understand because they are the substance of our everyday lives, biological wealth is usually taken for granted. This is a serious strategic error, one that will be increasingly regretted as time passes. The biota is not only part of a country's heritage, the product of millions of years of evolution centered on that place; it is also a potential source for immense untapped material wealth in the form of food, medicine, and other commercially important substance.",
    "questions": [
      {
        "q": "Which one of the following best expresses the main idea of the passage?",
        "o": [
          "The reduction in biodiversity is an irreversible process that represents a setback both for science and for society as a whole.",
          "The material and cultural wealth of a nation are insignificant when compared with the country's biological wealth.",
          "The enormous diversity of life on Earth could not have come about without periodic extinctions that have conferred preeminence on one species at the expense of another.",
          "The current decline in species diversity is human-induced tragedy of incalculable proportions that has potentially grave consequences for the human species."
        ],
        "a": 3,
        "e": "The author defines the biodiversity crisis as human-driven loss whose consequences are 'beyond calculation, but... certain to be harmful', then closes on the untapped value being lost. That is D. A adds irreversibility for science that the passage never argues."
      },
      {
        "q": "Which one of the following situations is most analogous to the history of global diversity summarized in lines 10-18 of the passage?",
        "o": [
          "The number of fish in a lake declines abruptly as a result of water pollution, then makes a slow comeback after cleanup efforts and the passage of ordinances against dumping.",
          "The concentration of chlorine in the water supply of large city fluctuates widely before stabilizing at a constant and safe level.",
          "An old-fashioned article of clothing goes in and out of style periodically as a result of features in fashion magazines and the popularity of certain period films.",
          "The variety of styles stocked by a shoe store increases rapidly after the store opens, holds constant for many months, and then gradually creeps upward."
        ],
        "a": 3,
        "e": "The summary is: swift rise, long plateau, then a slow steady climb to an all-time high. The shoe store matches exactly: rapid increase, months of holding constant, then a gradual creep upward. A describes decline and recovery, which is the extinction episodes, not the overall history."
      },
      {
        "q": "The author suggests which one of the following about the Cretaceous crisis?",
        "o": [
          "It was the second most devastating extinction episode in history.",
          "It was the most devastating extinction episode up until that time.",
          "It was less devastating to species diversity than is the current biodiversity crisis.",
          "The rate of extinction among marine animal species as a result of the crisis did not approach 77 percent."
        ],
        "a": 3,
        "e": "The Permian extinctions killed 77 to 96 percent of marine animal species and the Cretaceous crisis 'was minor compared' with that, so its marine extinction rate must not have approached 77 percent. A and B overstate what the passage ranks."
      },
      {
        "q": "The author mentions the Nile perch in order to provide an example of",
        "o": [
          "a species that has become extinct through human activity",
          "the typical lack of foresight that has led to biogeographic disaster",
          "a marine animal species that survived the Permian extinctions",
          "a species that is a potential source of material wealth"
        ],
        "a": 1,
        "e": "The Nile perch was 'carelessly introduced' into Lake Victoria and now threatens hundreds of endemic fish. It is an example of thoughtless human action causing biogeographic disaster. A is wrong because the perch itself did not go extinct; it caused the threat."
      },
      {
        "q": "All of the following are explicitly mentioned in the passage as contributing to the extinction of species EXCEPT",
        "o": [
          "hunting",
          "pollution",
          "deforestation",
          "the growth of human populations"
        ],
        "a": 1,
        "e": "Hunting and destruction of native forests are named for Polynesia, and expanding human populations frame the whole crisis. Pollution is never mentioned as a cause of extinction in this passage, so B is the exception."
      },
      {
        "q": "The passage suggests which one of the following about material and cultural wealth?",
        "o": [
          "Because we can readily assess the value of material and cultural wealth, we tend not to take them for granted.",
          "Just as the biota is a source of potential material wealth, it is an untapped source of cultural wealth as well.",
          "Some degree of material and cultural wealth may have to be sacrificed if we are to protect our biological heritage.",
          "Material and cultural wealth are of less value than biological wealth because they have evolved over a shorter period of time."
        ],
        "a": 0,
        "e": "The passage says we understand material and cultural wealth 'because they are the substance of our everyday lives', while biological wealth 'is usually taken for granted'. The contrast implies we do not take the first two for granted, which is A."
      }
    ]
  },
  {
    "id": "revolution-women",
    "title": "Women of the French Revolution",
    "tier": "hard",
    "words": 455,
    "text": "Women's participation in the revolutionary events in France between 1789 and 1795 has only recently been given nuanced treatment. Early twentieth century historians of the French Revolution are typified by Jaures, who, though sympathetic to the women's movement of his own time, never even mentions its antecedents in revolutionary France. Even today most general histories treat only cursorily a few individual women, like Marie Antoinette. The recent studies by Landes, Badinter, Godineau, and Roudinesco, however, should signal a much-needed reassessment of women's participation. Godineau and Roudinesco point to three significant phases in that participation. The first, up to mid-1792, involved those women who wrote political tracts. Typical of their orientation to theoretical issues—in Godineaus's view, without practical effect—is Marie Gouze's Declaration of the Right of Women. The emergence of vocal middle-class women's political clubs marks the second phase. Formed in 1791 as adjuncts of middle-class male political clubs, and originally philanthropic in function, by late 1792 independent clubs of women began to advocate military participation for women. In the final phase, the famine of 1795 occasioned a mass women's movement: women seized food supplies, hold officials hostage, and argued for the implementation of democratic politics. This phase ended in May of 1795 with the military suppression of this multiclass movement. In all three phases women's participation in politics contrasted markedly with their participation before 1789. Before that date some noblewomen participated indirectly in elections, but such participation by more than a narrow range of the population—women or men—came only with the Revolution. What makes the recent studies particularly compelling, however, is not so much their organization of chronology as their unflinching willingness to confront the reasons for the collapse of the women's movement. For Landes and Badinter, the necessity of women's having to speak in the established vocabularies of certain intellectual and political tradition diminished the ability of the women's movement to resist suppression. Many women, and many men, they argue, located their vision within the confining tradition of Jean-Jacques Rousseau, who linked male and female roles with public and private spheres respectively. But, when women went on to make political alliances with radical Jacobin men, Badinter asserts, they adopted a vocabulary and a violently extremist viewpoint that unfortunately was even more damaging to their political interests. Each of these scholars has different political agenda and takes a different approach— Godineau, for example, works with police archives while Roudinesco uses explanatory schema from modern psychology. Yet, admirably, each gives center stage to a group that previously has been marginalized, or at best undifferentiated, by historians. And in the case of Landes and Badinter, the reader is left with a sobering awareness of the cost to the women of the Revolution of speaking in borrowed voices.",
    "questions": [
      {
        "q": "Which one of the following best states the main point of the passage?",
        "o": [
          "According to recent historical studies, the participation of women in the revolutionary events of 1789-1795 can most profitably be viewed in three successive stages.",
          "The findings of certain recent historical studies have resulted from an earlier general reassessment, by historians, of women's participation in the revolutionary events of 1789-1795.",
          "Adopting the vocabulary and viewpoint of certain intellectual and political traditions resulted in no political advantage for women in France in the years 1789- 1795.",
          "Certain recent historical studies have provided a much-needed description and evaluation of the evolving roles of women in the revolutionary events of 1789-1795."
        ],
        "a": 3,
        "e": "The passage's point is that recent studies by Landes, Badinter, Godineau and Roudinesco finally give women's participation the description and evaluation it lacked. A covers only the chronology part, and C covers only the collapse argument; D captures both."
      },
      {
        "q": "The passage suggests that Godineau would be likely to agree with which one of the following statements about Marie Gouze's Declaration of the Rights of Women?",
        "o": [
          "This work was not understood by many of Gouze's contemporaries.",
          "This work indirectly inspired the formation of independent women's political clubs.",
          "This work had little impact on the world of political action.",
          "This work was the most compelling produced by a French woman between 1789 and 1792."
        ],
        "a": 2,
        "e": "Godineau sees the early tract-writers as oriented to theoretical issues 'without practical effect', so she would agree Gouze's Declaration had little impact on political action. D praises the work in a way the passage never does."
      },
      {
        "q": "According to the passage, which one of the following is a true statement about the purpose of the women's political cubs mentioned in line 20?",
        "o": [
          "These clubs fostered a mass women's movement.",
          "These clubs eventually developed a purpose different from their original purpose.",
          "These clubs were founder to advocate military participation for women.",
          "These clubs counteracted the original purpose of male political clubs."
        ],
        "a": 1,
        "e": "The clubs were 'originally philanthropic in function' and by late 1792 were advocating military participation for women, so their purpose changed. C is a trap: military advocacy was the later purpose, not the founding one."
      },
      {
        "q": "The primary function of the first paragraph of the passage is to:",
        "o": [
          "outline the author's argument about women's roles in Frances between 1789 and 1795",
          "anticipate possible challenges to the findings of the recent studies of women in France between 1789 and 1795",
          "summarize some long-standing explanations of the role of individual women in France between 1789 and 1795",
          "present a context for the discussion of recent studies of women in France between 1789 and 1795"
        ],
        "a": 3,
        "e": "The first paragraph shows how earlier historians ignored or skimmed women's participation, which sets up why the recent studies matter. That is context, option D. A fails because the author's own argument is not outlined there."
      },
      {
        "q": "The passage suggests that Landes and Badinter would be likely to agree with which one of the following statements about the women's movement in France in the 1790s?",
        "o": [
          "The movement might have been more successful if women had developed their own political vocabularies.",
          "The downfall of the movement was probably unrelated to it alliance with Jacobin men.",
          "The movement had a great deal of choice about whether to adopt a Rousseauist political vocabulary.",
          "The movement would have triumphed if it had not been suppressed by military means."
        ],
        "a": 0,
        "e": "Landes and Badinter argue the movement was weakened by 'having to speak in the established vocabularies' of existing traditions, in borrowed voices. So a vocabulary of their own might have served women better. C is contradicted: the vocabularies are described as confining, not freely chosen."
      },
      {
        "q": "In the context of the passage, the word \"cost\" in line 63 refers to the",
        "o": [
          "dichotomy of private roles for women and public roles for men",
          "almost nonexistent political participation of women before 1789",
          "historians' lack of differentiation among various groups of women",
          "collapse of the women's movement in the 1790s"
        ],
        "a": 3,
        "e": "The 'cost... of speaking in borrowed voices' is what that speaking led to: the suppression and collapse of the movement described earlier. A names the Rousseau framework itself, which was the cause of the cost, not the cost."
      }
    ]
  },
  {
    "id": "impressionism-debate",
    "title": "Reading Impressionism",
    "tier": "hard",
    "words": 446,
    "text": "Art historians' approach to French Impressionism has changed significantly in recent years. While a decade ago Rewald's History of Impressionism, which emphasizes Impressionist painters' stylistic innovations, was unchallenged, the literature on impressionism has now become a kind of ideological battlefield, in which more attention is paid to the subject matter of the paintings, and to the social and moral issues raised by it, than to their style. Recently, politically charged discussions that address the impressionists' unequal treatment of men and women and the exclusion of modern industry and labor from their pictures have tended to crowd out the stylistic analysis favored by Rewald and his followers. In a new work illustrating this trend, Robert L. Herbert dissociates himself from formalists whose preoccupation with the stylistic features of impressionist painting has, in Herbert's view, left the history out of art history; his aim is to restore impressionist paintings \"to their sociocultural context.\" However, his arguments are not finally persuasive. In attempting to place impressionist painting in its proper historical context, Herbert has redrawn the traditional boundaries of impressionism. Limiting himself to the two decades between 1860 and 1880, he assembles under the impressionist banner what can only be described as a somewhat eccentric grouping of painters. Cezanne, Pisarro, and Sisley are almost entirely ignored, largely because their paintings do not suit Herbert's emphasis on themes of urban life and suburban leisure, while Manet, Degas, and Caillebotte—who paint scenes of urban life but whom many would hardly characterize as impressionists—dominate the first half of the book. Although this new description of Impressionist painting provides a more unified conception of nineteenth-century French painting by grouping quite disparate modernist painters together and emphasizing their common concerns rather than their stylistic difference, it also forces Herbert to overlook some of the most important genres of impressionist painting—portraiture, pure landscape, and still-life painting. Moreover, the rationale for Herbert's emphasis on the social and political realities that Impressionist paintings can be said to communicate rather than on their style is finally undermined by what even Herbert concedes was the failure of Impressionist painters to serve as particularly conscientious illustrators of their social milieu. They left much ordinary experience—work and poverty, for example—out of their paintings and what they did put in was transformed by a style that had only an indirect relationship to the social realities of the world they depicted. Not only were their pictures inventions rather than photographs, they were inventions in which style to some degree disrupted description. Their painting in effect have two levels of subject: what is represented and how it is represented, and no art historian can afford to emphasize one at the expense of the other.",
    "questions": [
      {
        "q": "Which one of the following best expresses the main point of the passage?",
        "o": [
          "The style of impressionist paintings has only an indirect relation to their subject matter.",
          "The approach to impressionism that is illustrated by Herbert's recent book is inadequate.",
          "The historical context of impressionist paintings is not relevant to their interpretation.",
          "impressionism emerged from a historical context of ideological conflict and change."
        ],
        "a": 1,
        "e": "The author presents Herbert's book, then argues its redrawn boundaries and its social emphasis both fail, ending with 'his arguments are not finally persuasive'. That is B. A is a detail the author uses, not the main point."
      },
      {
        "q": "According to the passage, Rewald's book on impressionism was characterized by which one of the following?",
        "o": [
          "evenhanded objectivity about the achievements of impressionism",
          "bias in favor of certain impressionist painters",
          "an emphasis on the stylistic features of impressionist painting",
          "an idiosyncratic view of which painters were to be classified as impressionists"
        ],
        "a": 2,
        "e": "Rewald's History of Impressionism 'emphasizes Impressionist painters' stylistic innovations', option C. D belongs to Herbert, whose grouping the author calls eccentric."
      },
      {
        "q": "The author implies that Herbert's redefinition of the boundaries of impressionism resulted from which one of the following?",
        "o": [
          "an exclusive emphasis on form and style",
          "a bias in favor of the representation of modern industry",
          "an attempt to place impressionism within a specific sociocultural context",
          "a broadening of the term impressionism to include all nineteenth-century French painting"
        ],
        "a": 2,
        "e": "Herbert redraws the boundaries because of his aim to restore the paintings 'to their sociocultural context': painters who fit urban-life themes are included, stylistic Impressionists who do not are dropped. A is the formalist approach he explicitly rejects."
      },
      {
        "q": "The author states which one of the following about modern industry and labor as subjects for painting?",
        "o": [
          "The impressionists neglected these subjects in their paintings.",
          "Herbert's book on impressionism fails to give adequate treatment of these subjects.",
          "The impressionists' treatment of these subjects was idealized.",
          "Rewald's treatment of impressionist painters focused inordinately on their representations of these subjects."
        ],
        "a": 0,
        "e": "The passage states the Impressionists excluded modern industry and labour from their pictures and 'left much ordinary experience, work and poverty, for example, out of their paintings'. That is A."
      },
      {
        "q": "Which one of the following most accurately describes the structure of the author's argument in the passage?",
        "o": [
          "The first two paragraphs each present independent arguments for a conclusion that is drawn in the third paragraph.",
          "A thesis is stated in the first paragraph and revised in the second paragraph and revised in the second paragraph, and the revised thesis is supported with argument in the third paragraph.",
          "The first two paragraphs discuss and criticize a thesis, and the third paragraph presents an alternative thesis.",
          "a claim is made in the first paragraph, and the next two paragraph, and the next two paragraphs each present reasons for accepting that claim."
        ],
        "a": 3,
        "e": "The first paragraph ends with the claim that Herbert's arguments are not persuasive, and each of the next two paragraphs gives a reason: the eccentric regrouping, then the failure of the social-emphasis rationale. That is D."
      },
      {
        "q": "The author's statement that impressionist paintings \"were inventions in which style to some degree disrupted description\" serves to",
        "o": [
          "strengthen the claim that impressionist sought to emphasize the differences between painting and photography",
          "weaken the argument that style is the only important feature of impressionist paintings",
          "indicate that impressionists recognized that they had been strongly influence by photography",
          "support the argument that an exclusive emphasis on the impressionists subject matter is mistaken"
        ],
        "a": 3,
        "e": "If style disrupted description, then the paintings cannot be read as straightforward records of social reality, so emphasising subject matter alone is a mistake. That supports the author's case against Herbert, option D. B reverses the target: the author is not defending style-only readings either."
      }
    ]
  },
  {
    "id": "admin-contracts",
    "title": "Governments, Investors and Contracts",
    "tier": "hard",
    "words": 436,
    "text": "Governments of developing countries occasionally enter into economic development agreements with foreign investors who provide capital and technological expertise that may not be readily available in such countries. Besides the normal economic risk that accompanies such enterprises, investors face the additional risk that the host government may attempt unilaterally to change in its favor the terms of the agreement or even to terminate the agreement altogether and appropriate the project for itself. In order to make economic development agreements more attractive to investors, some developing countries have attempted to strengthen the security of such agreements with clauses specifying that the agreements will be governed by \"general principles of law recognized by civilized nations\"—a set of legal principles or rules shared by the world's major legal systems. However, advocates of governments' freedom to modify or terminate such agreements argue that these agreements fall within a special class of contracts known as administrative contracts, a concept that originated in French law. They assert that under the theory of administrative contracts, a government retains inherent power to modify or terminate its own contract, and that this power indeed constitutes a general principle of law. However, their argument is flawed on at least two counts. First, in French law not all government contracts are treated as administrative contracts. Some contracts are designated as administrative by specific statute, in which case the contractor is made aware of the applicable legal rules upon entering into agreement with the government. Alternatively, the contracting government agency can itself designate a contract as administrative by including certain terms not found in private civil contracts. Moreover, even in the case of administrative contracts, French law requires that in the event that the government unilaterally modifies the terms of the contract, it must compensate the contractor for any increased burden resulting from the government's action. In effect, the government is thus prevented from modifying those contractual terms that define the financial balance of the contract. Second, the French law of administrative contracts, although adopted by several countries, is not so universally accepted that it can be embraced as a general principle of law. In both the United States and the United Kingdom, government contracts are governed by the ordinary law of contracts, with the result that the government can reserve the power to modify or terminate a contract unilaterally only by writing such power into the contract as a specific provision. Indeed, the very fact that termination and modification clauses are commonly found in government contracts suggests that a government's capacity to modify or terminate agreements unilaterally derives from specific contract provisions, not from inherent state power.",
    "questions": [
      {
        "q": "In the passage, the author is primarily concerned with doing which one of the following?",
        "o": [
          "pointing out flaws in an argument provided in support of a position",
          "analyzing the weaknesses inherent in the proposed solution to a problem",
          "marshaling evidence in support of a new explanation of a phenomenon",
          "analyzing the risks inherent in adopting a certain course of action"
        ],
        "a": 0,
        "e": "The author states the administrative-contracts argument, then says it 'is flawed on at least two counts' and devotes a paragraph to each flaw. That is A. D describes the first paragraph's background, not the author's project."
      },
      {
        "q": "It can be inferred from the passage that the author would be most likely to agree with which one of the following assertions regarding the \"general principles of law\" mentioned in lines 16-17 of the passage?",
        "o": [
          "They fail to take into account the special needs and interests of developing countries that enter into agreements with foreign investors.",
          "They have only recently been invoked as criteria for adjudicating disputes between governments and foreign investors.",
          "They are more compatible with the laws of France and the United States than with those of the United Kingdom.",
          "They do not assert that governments have an inherent right to modify unilaterally the terms of agreements that they have entered into with foreign investors."
        ],
        "a": 3,
        "e": "The author's whole second flaw is that the administrative-contract power is not universal, so it cannot be a general principle of law. It follows that the general principles do not include an inherent right to modify agreements, option D."
      },
      {
        "q": "The author implies that which one of the following is true of economic development agreements?",
        "o": [
          "They provide greater economic benefits to the governments that are parties to such agreements than to foreign investors.",
          "They are interpreted differently by courts in the United Kingdom than they are by courts in the United States.",
          "They have proliferated in recent years as a result of governments' attempts to make them more legally secure.",
          "They entail greater risk to investors when the governments that enter into such agreements reserve the right to modify unilaterally the terms of the agreements."
        ],
        "a": 3,
        "e": "Investors already face economic risk plus the risk of unilateral change; a government that reserves a modification right in the contract makes that risk concrete. B is unsupported: the passage says the US and UK treat such contracts the same way, under ordinary contract law."
      },
      {
        "q": "According to the author, which one of the following is true of a contract that is designated by a French government agency as an administrative contract?",
        "o": [
          "It requires the government agency to pay for unanticipated increases in the cost of delivering the goods and services specified in the contract.",
          "It provides the contractor with certain guarantees that are not normally provided in private civil contracts.",
          "It must be ratified by the passage of a statute.",
          "It contains terms that distinguish it from a private civil contract."
        ],
        "a": 3,
        "e": "The passage says an agency can designate a contract administrative 'by including certain terms not found in private civil contracts'. That is D. A is a trap: the compensation duty falls on the government when IT modifies the contract, not for ordinary cost overruns."
      },
      {
        "q": "It can be inferred from the passage that under the \"ordinary law of contracts\", a government would have the right to modify unilaterally the terms of a contract that it had entered into with a foreign investor if which one of the following were true?",
        "o": [
          "The government undertook a greater economic risk by entering into the contract than did the foreign investor.",
          "The cost to the foreign investor of abiding by the terms of the contract exceeded the original estimates of such costs.",
          "The modification of the contract did not result in any increased financial burden for the investor.",
          "The contract contains a specific provision allowing the government to modify the contract."
        ],
        "a": 3,
        "e": "Under ordinary contract law a government 'can reserve the power to modify or terminate a contract unilaterally only by writing such power into the contract as a specific provision'. So the right exists only if D is true."
      },
      {
        "q": "In the last paragraph, the author refers to government contracts in the United States and the United Kingdom primarily in order to",
        "o": [
          "Cite two governments that often reserve the right to modify unilaterally contracts that they enter into with foreign investors.",
          "Support the assertion that there is no general principle of law governing contracts between private individuals and governments.",
          "Cast doubt on the alleged universality of the concept of administrative contracts.",
          "Provide examples of legal systems that might benefit from the concept of administrative contracts."
        ],
        "a": 2,
        "e": "The US and UK examples show major legal systems that do not recognise inherent modification power, which defeats the claim that the French doctrine is universal. That is C. B overshoots: the author does not deny any general principles exist."
      }
    ]
  },
  {
    "id": "art-emotions",
    "title": "Why Movies Move Us",
    "tier": "hard",
    "words": 450,
    "text": "Nico Frijda writes that emotions are governed by a psychological principle called the \"law of apparent reality\": emotions are elicited only by events appraised as real, and the intensity of these emotions corresponds to the degree to which these events are appraised as real. This observation seems psychologically plausible, but emotional responses elicited by works of art raise counterexamples. Frijda's law accounts for my panic if I am afraid of snakes and see an object I correctly appraise as a rattlesnake, and also for my identical response if I see a coiled garden hose I mistakenly perceive to be a snake. However, suppose I am watching a movie and see a snake gliding toward its victim. Surely I might experience the same emotions of panic and distress, though I know the snake is not real. These responses extend even to phenomena not conventionally accepted as real. A movie about ghosts, for example, may be terrifying to all viewers, even those who firmly reject the possibility of ghosts, but this is not because viewers are confusing cinematic depiction with reality. Moreover, I can feel strong emotions in response to objects of art that are interpretations, rather than representations, of reality: I am moved by Mozart's Requiem, but I know that I am not at a real funeral. However, if Frijda's law is to explain all emotional reactions, there should be no emotional response at all to aesthetic objects or events, because we know they are not real in the way a living rattlesnake is real. Most psychologists, perplexed by the feelings they acknowledge are aroused by aesthetic experience, have claimed that these emotions are genuine, but different in kind from nonaesthetic emotions. This, however, is a descriptive distinction rather than an empirical observation and consequently lacks explanatory value. On the other hand, Gombrich argues that emotional responses to art are ersatz; art triggers remembrances of previously experienced emotions. These debates have prompted the psychologist Radford to argue that people do experience real melancholy or joy in responding to art, but that these are irrational responses precisely because people know they are reacting to illusory stimuli. Frijda's law does not help us to untangle these positions, since it simply implies that events we recognize as being represented rather than real cannot elicit emotion in the first place. Frijda does suggest that a vivid imagination has \"properties of reality\"—implying, without explanation, that we make aesthetic objects or events \"real\" in the act of experiencing them. However, as Scruton argues, a necessary characteristic of the imaginative construction that can occur in an emotional response to art is that the person knows he or she is pretending. This is what distinguishes imagination from psychotic fantasy.",
    "questions": [
      {
        "q": "Which one of the following best states the central idea of the passage?",
        "o": [
          "The law of apparent reality fails to account satisfactorily for the emotional nature of belief.",
          "Theories of aesthetic response fail to account for how we distinguish unreasonable from reasonable responses to art.",
          "The law of apparent reality fails to account satisfactorily for emotional responses to art.",
          "Psychologists have been unable to determine what accounts for the changeable nature of emotional responses to art."
        ],
        "a": 2,
        "e": "The author grants Frijda's law is plausible for real events, then argues that emotional responses to art are counterexamples it cannot explain. That is C. B is about a different debate the author mentions in passing."
      },
      {
        "q": "According to the passage, Frijda's law asserts that emotional responses to events are",
        "o": [
          "unpredictable because emotional responses depend on how aware the person is of the reality of an event",
          "weaker if the person cannot distinguish illusion from reality",
          "more or less intense depending on the degree to which the person perceives the event to be real",
          "more intense if the person perceives an event to be frightening"
        ],
        "a": 2,
        "e": "Frijda's law says emotions arise only from events appraised as real and their intensity 'corresponds to the degree to which these events are appraised as real'. That is C, a claim about intensity tracking perceived reality."
      },
      {
        "q": "The author suggests that Frijda's notion of the role of imagination in aesthetic response is problematic because it",
        "o": [
          "ignore the unselfconsciousness that is characteristic of emotional responses to art",
          "ignores the distinction between genuine emotion and ersatz emotion",
          "ignores the fact that a person who is imagining knows that he or she is imagining",
          "makes irrelevant distinctions between vivid and weak imaginative capacities"
        ],
        "a": 2,
        "e": "Scruton's point is that imaginative engagement with art requires knowing you are pretending. Frijda's suggestion that imagination makes art 'real' ignores exactly this knowledge, which is C."
      },
      {
        "q": "The passage supports all of the following statements about the differences between Gombrich and Radford EXCEPT:",
        "o": [
          "Radfod's argument relies on a notion of irrationality in a way that Gomgbrich's argument does not.",
          "Gmbrich's position is closer to the position of the majority of psychologists than is Radford's.",
          "Gombrich, unlike Radford, argues that we do not have true emotions in response to art.",
          "Gombrich's argument rests on a notion of memory in a way that Radford's argument does not."
        ],
        "a": 1,
        "e": "A is supported (Radford, not Gombrich, calls the responses irrational), C is supported (Gombrich calls the emotions ersatz, Radford calls them real), and D is supported (Gombrich rests on remembered emotions). B is not: the majority position is that the emotions are genuine but different in kind, which is closer to Radford's 'real' than to Gombrich's 'ersatz'."
      },
      {
        "q": "Which one of the following best captures the progression of the author's argument in lines 9-31?",
        "o": [
          "The emotional responses to events ranging from the real to the depicted illustrate the irrationality of emotional response.",
          "A series of events that range from the real to the depicted conveys the contrast between real events and cinematic depiction.",
          "An intensification in emotional response to a series of events that range from the real to the depicted illustrates Frijda's law.",
          "The consistency of emotional responses to events that range from the real to the depicted challenges Frijda's law."
        ],
        "a": 3,
        "e": "The examples run from a real snake, to a mistaken garden hose, to a movie snake, to ghosts, to Mozart's Requiem, and the emotional response stays the same throughout. Consistent emotion despite decreasing reality is precisely what challenges Frijda's law, option D. C reverses the logic."
      },
      {
        "q": "Author's assertions concerning movies about ghosts imply that all of the following statements are false EXCEPT:",
        "o": [
          "Movies about ghosts are terrifying in proportion to viewers' beliefs in the phenomenon of ghosts.",
          "Movies about imaginary phenomena like ghosts may be just as terrifying as movies about phenomena like snake.",
          "Movies about ghosts and snakes are not terrifying because people know that what they viewing is not real.",
          "Movies about ghosts are terrifying to viewers who previously rejected the possibility of ghosts because movies permanently alter the viewers sense of reality."
        ],
        "a": 1,
        "e": "The author says a ghost movie 'may be terrifying to all viewers, even those who firmly reject the possibility of ghosts'. So imaginary phenomena can terrify like real ones, option B. A ties fear to belief in ghosts, which the author denies."
      }
    ]
  },
  {
    "id": "bacteria-navigation",
    "title": "How Bacteria Find Food",
    "tier": "moderate",
    "words": 457,
    "text": "Although bacteria are unicellular and among the simplest autonomous forms of life, they show a remarkable ability to sense their environment. They are attracted to materials they need and are repelled by harmful substances. Most types of bacteria swim very erratically: short smooth runs in relatively straight lines are followed by brief tumbles, after which the bacteria shoot off in random directions. This leaves researchers with the question of how such bacteria find their way to an attractant such as food or, in the case of photosynthetic bacteria, light, if their swimming pattern consists only of smooth runs and tumbles, the latter resulting in random changes in direction. One clue comes from the observation that when a chemical attractant is added to a suspension of such bacteria, the bacteria swim along a gradient of the attractant, from an area where the concentration of the attractant is weaker to an area where it is stronger. As they do so, their swimming is characterized by a decrease in tumbling and an increase in straight runs over relatively longer distances. As the bacteria encounter increasing concentrations of the attractant, their tendency to tumble is suppressed, whereas tumbling increases whenever they move away from the attractant. The net effect is that runs in the direction of higher concentrations of the attractant become longer and straighter as a result of the suppression of tumbling, whereas runs away from it are shortened by an increased tendency of the bacteria to tumble and change direction. Biologists have proposed two mechanisms that bacteria might use in detecting changes in the concentration of a chemical attractant. First, a bacterium might compare the concentration of a chemical at the front and back of its cell body simultaneously. If the concentration is higher at the front of the cell, then it knows it is moving up the concentration gradient, from an area where the concentration is lower to an area where it is higher. Alternatively, it might measure the concentration at one instant and again after a brief interval, in which case the bacterium must retain a memory of the initial concentration. Researchers reasoned that if bacteria do compare concentrations at different times, then when suddenly exposed to a uniformly high concentration of an attractant, the cells would behave as if they were swimming up a concentration gradient, with long, smooth runs and relatively few tumbles. If, on the other hand, bacteria detect a chemical gradient by measuring it simultaneously at two distinct points, front and back, on the cell body, they would not respond to the jump in concentration because the concentration of the attractant in front and back of the cells, though high, would be uniform. Experimental evidence suggests that bacteria compare concentrations at different times.",
    "questions": [
      {
        "q": "It can be inferred from the passage that which one of the following experimental results would suggest that bacteria detect changes in the concentration of an attractant by measuring its concentration in front and back of the cell body simultaneously?",
        "o": [
          "When suddenly transferred from a medium in which the concentration of an attractant was uniformly low to one in which the concentration was uniformly high, the tendency of the bacteria to tumble and undergo random changes in direction increased.",
          "When suddenly transferred from a medium in which the concentration of an attractant was uniformly low to one in which the concentration was uniformly high, the bacteria's exhibited no change in the pattern of their motion.",
          "When suddenly transferred from a medium in which the concentration of an attractant was uniformly low to one in which the concentration was uniformly high, the bacteria's movement was characterized by a complete absence of tumbling.",
          "When placed in a medium in which the concentration of an attractant was in some areas low and in others high, the bacteria exhibited an increased tendency to tumble in those areas where the concentration of the attractant was high."
        ],
        "a": 1,
        "e": "If detection were simultaneous front-and-back, a uniform jump in concentration would present no gradient, so the bacteria would show no change in motion. That is B. C describes what supports the time-comparison hypothesis instead."
      },
      {
        "q": "It can be inferred from the passage that a bacterium would increase the likelihood of its moving away from an area where the concentration of a harmful substance is high if it did which one of the following?",
        "o": [
          "Increased the speed at which it swam immediately after undergoing the random changes in direction that result from tumbling.",
          "Detected the concentration gradient of an attractant toward which it could begin to swim.",
          "Relied on the simultaneous measurement of the concentration of the substance in front and back of its body, rather than on the comparison of the concentration at different points in time.",
          "Exhibited an increased tendency to tumble as it encountered increasing concentrations of the substance, and suppressed tumbling as it detected decreases in the concentration of the substance."
        ],
        "a": 3,
        "e": "To escape a repellent the bacterium needs the mirror image of its attractant behaviour: tumble more while concentrations rise and run smoothly as they fall. That is D. B changes the question, which is about the harmful substance itself."
      },
      {
        "q": "It can be inferred from the passage that when describing bacteria as \"swimming up a concentration gradient\", the author means that they were behaving as if they were swimming",
        "o": [
          "Against a resistant medium that makes their swimming less efficient.",
          "Away from a substance to which they are normally attracted.",
          "Away from a substance that is normally harmful to them.",
          "From an area where the concentration of a substance is weaker to an area where it is stronger."
        ],
        "a": 3,
        "e": "The passage earlier defines swimming up a gradient as moving 'from an area where the concentration of the attractant is weaker to an area where it is stronger', option D."
      },
      {
        "q": "The passage indicates that the pattern that characterizes a bacterium's motion changes in response to",
        "o": [
          "The kinds of chemical attractants present in different concentration gradients.",
          "The mechanism that the bacterium adopts in determining the presence of an attractant.",
          "The bacterium's detection of changes in the concentration of an attractant.",
          "The extent to which neighboring bacteria are engaged in tumbling."
        ],
        "a": 2,
        "e": "The motion pattern shifts (fewer tumbles, longer runs) exactly when the bacterium detects changing attractant concentration. A is a trap: the passage discusses concentration changes, not different kinds of attractants."
      },
      {
        "q": "Which one of the following best describes the organization of the third paragraph of the passage?",
        "o": [
          "Two approaches to a problem are discussed, a test that would determine which is more efficient is described, and a conclusion is made, based on experimental evidence.",
          "Two hypotheses are described, a way of determining which of them is more likely to be true is discussed, and one said to be more accurate on the basis of experimental evidence.",
          "Two hypotheses are described, the flaws inherent in one of them are elaborated, and experimental evidence confirming the other is cited.",
          "An assertion that a species has adopted two different mechanisms to solve a particular problem is made, and evidence is then provided in support of that assertion."
        ],
        "a": 1,
        "e": "The third paragraph lays out two hypotheses, describes the uniform-concentration test that separates them, and reports that evidence favours time comparison. That is B. C is wrong because neither hypothesis is called flawed; one is simply supported by the experiment."
      },
      {
        "q": "The passage provides information in support of which one of the following assertions?",
        "o": [
          "The seemingly erratic motion exhibited by a microorganism can in fact reflect a mechanism by which it is able to control its movement.",
          "Biologists often overstate the complexity of simple organisms such as bacteria.",
          "A bacterium cannot normally retain a memory of a measurement of the concentration of an attractant.",
          "Bacteria now appear to have less control over their movement than biologists had previously hypothesized."
        ],
        "a": 0,
        "e": "The erratic-looking run-and-tumble pattern turns out to be a control mechanism: tumbling is suppressed up-gradient and increased down-gradient, steering the cell. That supports A. C is contradicted, since the favoured hypothesis requires a brief memory."
      }
    ]
  }
];

export default PASSAGES;
