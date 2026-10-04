// ============================================================
// Gulp Protocol passage library — 2026-10 bank (46 passages).
// Three tiers:
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
  },
  // ──────────────────────────────────────────────────────────
  // 2026-10 expansion — 30 passages from the owner's four RC files
  // ("Reading Comprehension for Portal" docx parts 1-3 + PDF).
  // Sources carried their own answer + explanation per question;
  // explanations were de-templated, answers kept as keyed.
  // ──────────────────────────────────────────────────────────
{
  "id": "right-to-work-laws",
  "title": "Right-to-Work Laws",
  "tier": "moderate",
  "words": 464,
  "text": "The Taft-Hartley Act, passed by the United States Congress in 1947, gave states the power to enact \"right-to-work\" legislation that prohibits union shop () agreements. According to such an agreement, a labor union negotiates wages and working conditions for all workers in a business, and all workers are required to belong to the union. Since 1947, 20 states have adopted right-to-work laws. Much of the literature concerning right-to-work laws implies that such legislation has not actually had a significant impact. This point of view, however, has not gone uncriticized. Thomas V Carroll has proposed that the conclusions drawn by previous researchers are attributable to their myopic focus on the premise that, unless right-to-work laws significantly reduce union membership within a state, they have no effect. Carroll argues that the right-to-work laws \"do matter\" in that such laws generate differences in real wages across states. Specifically, Carroll indicates that while right-to-work laws may not \"destroy\" unions by reducing the absolute number of unionized workers, they do impede the spread of unions and thereby reduce wages within right-to-work states. Because the countervailing power of unions is weakened in right-to-work states, manufacturers and their suppliers can act cohesively in competitive labor markers, thus lowering wages in the affected industries.\nSuch a finding has important implications regarding the demographics of employment and wages in right-to-work states. Specifically, if right-to-work laws lower wages by weakening union power, minority workers can be expected to suffer a relatively greater economic disadvantage in right-to-work states than in union shop states. This is so because, contrary to what was once thought, union tend to have a significant positive impact on the economic position of minority workers, especially Black workers, relative to White workers. Most studies concerned with the impact of unionism on the Black worker's economic position relative to the White worker's have concentrated on the changes in Black wages due to union membership. That is, they have concentrated on union versus nonunion groups. In a pioneering study, however, Ashenfelter finds that these studies overlook an important fact: although craft unionism increase the differential between the wages of White workers and Black workers due to the traditional exclusion of minority workers from unions in the craft sectors of the labor market, strong positive wage gains are made by Black workers within industrial unions. In fact, Ashenfelter estimates that industrial unionism decreases the differential between the wages of Black workers and White workers by about 3 percent. If state right-to-work laws weaken the economic power of unions to raise wages, Black workers will experience a disproportionate decline in their relative wage positions. Black workers in right-to-work states would therefore experience a decline in their relative economic positions unless there is strong economic growth in right-to-work states, creating labor shortages and thereby driving up wages.",
  "questions": [
    {
      "q": "The reasoning behind the \"literature\" (line 9), as that reasoning is presented in the passage, is most analogous to the reasoning behind which one of the following situations?",
      "o": [
        "A law is proposed that benefits many but disadvantages a few: those advocating passage of the law argue that the disadvantages to few are not so serious that the benefits should be denied to many.",
        "A new tax on certain categories of consumer items is proposed: those in favor of the tax argue that those affected by the tax are well able to pay it, since the items taxed are luxury items.",
        "A college sets strict course requirements that every student must complete before graduating; students already enrolled argue that it is unfair for the new requirements to apply to those enrolled before the change.",
        "A fare increase in a public transportation system does not significantly reduce the number of fares sold: the management of the public transportation system asserts, therefore, that the fare hike has had no negative effects."
      ],
      "a": 3,
      "e": "The passage supports option D: a fare increase in a public transportation system does not significantly reduce the number of fares sold: the management of the public transportation system asserts, therefore, that the fare hike has had no negative effects."
    },
    {
      "q": "According to the passage, which one of the following is true of Carroll's study?",
      "o": [
        "It implies that right-to-work laws have had a negligible effect on workers in right-to-work states.",
        "It demonstrates that right-to-work laws have significantly decreased union membership from what it once was in right-to-work states.",
        "It argues that right-to-work laws have affected wages in right-to-work states.",
        "It supports the findings of most earlier researchers."
      ],
      "a": 2,
      "e": "The passage directly supports this: it argues that right-to-work laws have affected wages in right-to-work states. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "It can be inferred from the passage that the author believes which one of following about craft unions?",
      "o": [
        "Craft unions have been successful in ensuring that the wages of their members remain higher than the wages of nonunion workers in the same occupational groups.",
        "The number of minority workers joining craft unions has increased sharply in states that have not adopted right-to-work legislation.",
        "Wages for workers belonging to craft unions have generally risen faster and more steadily than wages for workers belonging to industrial unions.",
        "The wages of workers belonging to craft unions have not been significantly affected by right-to-work legislation, although the wages of workers belonging to industrial unions have been negatively affected."
      ],
      "a": 0,
      "e": "It can be inferred from the passage that craft unions have been successful in ensuring that the wages of their members remain higher than the wages of nonunion workers in the same occupational groups."
    },
    {
      "q": "Which one of the following best describes the effect industrial unionism has had on the wages of Black workers relative to those of White workers, as that effect is presented in the passage?",
      "o": [
        "Prior to 1947, industrial unionism had little effect on the wages of Black workers relative to those of White workers: since 1947, it has had a slight positive effect.",
        "Prior to 1947, industrial unionism had a strong positive effect on the wages of Black workers relative to those of White workers: since 1947, it has had little effect.",
        "Prior to 1947, industrial unionism had a negative effect on the wages of Black workers relative to those of White workers: since 1947, it has had a significant positive effect.",
        "Industrial unionism has contributed strongly to a 3 percent decrease in the wage differential between Black workers and White workers."
      ],
      "a": 3,
      "e": "The passage supports option D: industrial unionism has contributed strongly to a 3 percent decrease in the wage differential between black workers and white workers."
    },
    {
      "q": "According to the passage, which one of the following could counteract the effects of a decrease in unions' economic power to raise wages in right-to-work states?",
      "o": [
        "a decease in the number of union shop agreements",
        "strong economic growth that creates labor shortages",
        "a decrease in membership in craft unions",
        "the merging of large industrial unions"
      ],
      "a": 1,
      "e": "The passage directly supports this: strong economic growth that creates labor shortages. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "Which one of the following best describes the passage as a whole?",
      "o": [
        "an overview of a problem in research methodology and a recommended solution to that problem",
        "a comparison of two competing theories and a suggestion for reconciling them",
        "a critique of certain legislation and a proposal for modification of that legislation",
        "a review of research that challenges the conclusions of earlier researchers"
      ],
      "a": 3,
      "e": "The passage supports option D: a review of research that challenges the conclusions of earlier researchers."
    }
  ]
},
{
  "id": "women-physicians-abroad",
  "title": "Women Physicians Abroad",
  "tier": "moderate",
  "words": 450,
  "text": "In the late nineteenth century, the need for women physicians in missionary hospitals in Canton, China, led to expanded opportunities for both Western women and Chinese women. The presence of Western women as medical missionaries in China was made possible by certain changes within the Western missionary movement. Beginning in the 1870s, increasingly large numbers of women were forming women's foreign mission societies dedicated to the support of women's foreign mission work. Beyond giving the women who organized the societies a formal activity outside their home circles, these organizations enabled an increasing number of single women missionaries (as opposed to women who were part of the more typical husband-wife missionary teams) to work abroad. Before the formation of these women's organizations, mission funds had been collected by ministers and other church leaders, most of whom emphasized local parish work. What money was spent on foreign missions was under the control of exclusively male foreign mission boards whose members were uniformly uneasy about the new idea of sending single women out into the mission field. But as women's groups began raising impressive amounts of money donated specifically in support of single women missionaries, the home churches bowed both to women's changing roles at home and to increasing numbers of single professional missionary women abroad.\nAlthough the idea of employing a woman physician was a daring one for most Western missionaries in China, the advantages of a well-trained Western woman physician could not be ignored by Canton mission hospital administrators. A woman physician could attend women patients without offending any of the accepted conventions of female modesty. Eventually, some of these women were able to found and head separate women's medical institutions, thereby gaining access to professional responsibilities far beyond those available to them at home.\nThese developments also led to the attainment of valuable training and status by a significant number of Chinese women. The presence of women physicians in Canton mission hospitals led many Chinese women to avail themselves of Western medicine who might otherwise have failed to do so because of their culture's emphasis on physical modesty. In order to provide enough women physicians for these patients, growing numbers of young Chinese women were given instruction in medicine. This enabled them to earn an independent income, something that was then largely unavailable to women within traditional Chinese society. Many women graduates were eventually able to go out on their own into private practice, freeing themselves of dependence upon the mission community.\nThe most important result of these opportunities was the establishment of clear evidence of women's abilities and strengths, clear reasons for affording women expanded opportunities, and clear role models for how these abilities and responsibilities might be exercised.",
  "questions": [
    {
      "q": "Which one of the following statements about Western women missionaries working abroad can be inferred from the passage?",
      "o": [
        "There were very few women involved in foreign missionary work before the 1870s.",
        "Most women working abroad as missionaries before the 1870s were financed by women's foreign mission societies.",
        "Most women employed in mission hospitals abroad before the 1870s were trained as nurses rather than as physicians.",
        "Most women missionaries working abroad before the 1870s were married to men who were also missionaries."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that most women missionaries working abroad before the 1870s were married to men who were also missionaries."
    },
    {
      "q": "The author mentions that most foreign mission boards were exclusively male most probably in order to",
      "o": [
        "Contrast foreign mission boards with the boards of secular organizations sending aid to China.",
        "Explain the policy of foreign mission boards toward training Chinese women in medicine.",
        "Justify the preference of foreign mission boards for professionally qualified missionaries.",
        "Help account for the attitude of foreign mission boards towards sending single women missionaries abroad."
      ],
      "a": 3,
      "e": "The passage supports option D: help account for the attitude of foreign mission boards towards sending single women missionaries abroad."
    },
    {
      "q": "Which one of the following best describes the organization of the passage?",
      "o": [
        "A situation is described, conditions that brought about the situation are explained, and results of the situation are enumerated.",
        "An assertion is made, statements supporting and refuting the assertion are examined, and a conclusion is drawn.",
        "An obstacle is identified, a variety of possible ways to overcome the obstacle are presented, and an opinion is ventured.",
        "A predicament is outlined, factors leading up to the predicament are scrutinized, and a tentative resolution of the predicament is recommended."
      ],
      "a": 0,
      "e": "The passage supports option A: a situation is described, conditions that brought about the situation are explained, and results of the situation are enumerated."
    },
    {
      "q": "Which one of the following, if true, would most undermine the author's analysis of the reason for the increasing number of single women missionaries sent abroad beginning in the 1870s?",
      "o": [
        "The Western church boards that sent the greatest number of single women missionaries abroad had not received any financial support from women's auxiliary groups.",
        "The women who were sent abroad as missionary physicians had been raised in families with a strong history of missionary commitment.",
        "Most of the single missionary women sent abroad were trained as teachers and translators rather than as medical practitioners.",
        "The western church boards tended to send abroad single missionary women who had previously been active in local parish work."
      ],
      "a": 0,
      "e": "The passage supports option A: the western church boards that sent the greatest number of single women missionaries abroad had not received any financial support from women's auxiliary groups."
    },
    {
      "q": "According to the passage, which one of the following was a factor in the acceptance of Western women as physicians in mission hospitals in Canton, China?",
      "o": [
        "The number of male physicians practicing in that region.",
        "The specific women's foreign mission society that supplied the funding.",
        "The specific home parishes from which the missionary women came.",
        "The cultural conventions of the host society."
      ],
      "a": 3,
      "e": "The passage directly supports this: the cultural conventions of the host society. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The passage suggests which one of the following about medical practices in late-nineteenth-century Canton, China?",
      "o": [
        "There was great suspicion of non-Chinese medical practices.",
        "Medical care was more often administered in the home than in hospitals.",
        "It was customary for women physicians to donate a portion of their income for the maintenance of their extended family.",
        "It was not customary for female patients to be treated by male physicians."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that it was not customary for female patients to be treated by male physicians."
    }
  ]
},
{
  "id": "early-music-movement",
  "title": "The Early Music Movement",
  "tier": "hard",
  "words": 452,
  "text": "In recent years the early music movement, which advocates performing a work as it was performed at the time of its composition, has taken on the character of a crusade, particularly as it has moved beyond the sphere of medieval and baroque music and into music from the late eighteenth and early nineteenth centuries by composers such as Mozart and Beethoven. Granted, knowledge about the experience of playing old music on now-obsolete instruments has been of inestimable value to scholars. Nevertheless, the early music approach to performance raises profound and troubling questions.\nEarly music advocates assume that composers write only for the instruments available to them, but evidence suggests that composers of Beethoven's stature imagined extraordinarily high and low notes as part of their compositions, even when they recognized that such notes could not be played on instruments available at the time. In the score of Beethoven's first piano concerto, there is a \"wrong\" note, a high F-natural where the melody obviously calls for a high F-sharp, but pianos did not have this high an F-sharp when Beethoven composed the concerto. Because Beethoven once expressed a desire to revise his early works to exploit the extended range of pianos that became available to him some years later, it seems likely that he would have played the F-sharp if given the opportunity. To use a piano exactly contemporary with the work's composition would require playing a note that was probably frustrating for Beethoven himself to have had to play.\nIn addition, early music advocates often inadvertently divorce music and its performance from the life of which they were, and are, a part. The discovery that Haydn's and Mozart's symphonies were conducted during their lifetimes by a pianist who played the chords to keep the orchestra together has given rise to early music recordings in which a piano can be heard obtrusively in the foreground, despite evidence indicating that the orchestral piano was virtually inaudible to audiences at eighteenth-century concerts and was dropped as musically unnecessary when a better way to beat time was found. And although in the early nineteenth century the first three movements (sections) of Mozart's and Beethoven's symphonies were often played faster, and the last movement slower than today, this difference can readily be explained by the fact that at that time audiences applauded at the end of each movement, rather than withholding applause until the end of the entire work. As a result, musicians were not forced into extra brilliance in the finale in order to generate applause, as they are now. To restore the original tempo of these symphonies represents an irrational denial of the fact that our concepts of musical intensity and excitement have quite simply, changed.",
  "questions": [
    {
      "q": "It can be inferred from the passage that by \"a piano exactly contemporary\" (line 30) with the composition of Beethoven's first piano concerto, the author means the kind of piano that was",
      "o": [
        "Designed to be inaudible to the audience when used by conductors of orchestras.",
        "Incapable of playing the high F-natural that is in the score of Beethoven's original version of the concerto.",
        "Unavailable to Mozart and Haydn.",
        "Incapable of playing the high F-sharp that the melody of the concerto calls for."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that incapable of playing the high f-sharp that the melody of the concerto calls for."
    },
    {
      "q": "Which one of the following best expresses the main idea of the passage?",
      "o": [
        "The early music movement has yet to resolve a number of troubling questions regarding its approach to the performance of music.",
        "The early music movement, while largely successful in its approach to the performance of medieval and baroque music, has yet to justify its use of obsolete instruments in the performance of music by Beethoven and Mozart.",
        "The early music approach to performance often assumes that composers write music that is perfectly tailored to the limitations of the instruments on which it will be performed during their lifetimes.",
        "Although advocates of early music know much about the instruments used to perform music at the time it was composed, they lack information regarding how the style of such performances has changed since such music was written."
      ],
      "a": 0,
      "e": "The passage supports option A: the early music movement has yet to resolve a number of troubling questions regarding its approach to the performance of music."
    },
    {
      "q": "In the second paragraph, the author discusses Beethoven's first piano concerto primarily in order to",
      "o": [
        "Illustrate how piano music began to change in response to the extended range of pianos that became available during Beethoven's lifetime.",
        "Illustrate how Beethoven's work failed to anticipate the changes in the design of instruments that were about to be made during his lifetime.",
        "Suggest that early music advocates commonly perform music using scores that do not reflect revisions made to the music years after it was originally composed.",
        "Illustrate how composers like Beethoven sometimes composed music that called for notes that could not be played on instruments that were currently available."
      ],
      "a": 3,
      "e": "The passage supports option D: illustrate how composers like beethoven sometimes composed music that called for notes that could not be played on instruments that were currently available."
    },
    {
      "q": "The author suggests that the final movements of symphonies by Mozart and Beethoven might be played more slowly by today's orchestras if which one of the following were to occur?",
      "o": [
        "Orchestras were to use instruments no more advanced in design than those used by orchestras at the time Mozart and Beethoven composed their symphonies.",
        "Audiences were to return to the custom of applauding at the end of each movement of a symphony.",
        "Audiences were to reserve their most enthusiastic applause for the most brilliantly played finales.",
        "Conductors were to return to the practice of playing the chords on an orchestral piano to keep the orchestra together."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that audiences were to return to the custom of applauding at the end of each movement of a symphony."
    },
    {
      "q": "Which one of the following best describes the organization of the last paragraph?",
      "o": [
        "A generalization is made evidence undermining it is presented, and a conclusion rejecting it is then drawn.",
        "A criticism is stated and then elaborated with two supporting examples.",
        "An assumption is identified and then evidence undermining its validity is presented.",
        "An assumption is identified and then evidence frequently provided in support of it is then critically evaluated."
      ],
      "a": 1,
      "e": "The passage supports option B: a criticism is stated and then elaborated with two supporting examples."
    },
    {
      "q": "It can be inferred from the passage that the author's explanation in lines 50-54 would be most weakened if which one of the following were true?",
      "o": [
        "Musicians who perform in modern orchestras generally receive more extensive training than did their nineteenth-century counterparts.",
        "Breaks between the movements of symphonies performed during the early nineteenth century often lasted longer than they do today because nineteenth-century musicians needed to retune their instruments between each movement.",
        "Early nineteenth-century orchestral musicians were generally as concerned with the audience's response to their music as are the musicians who perform today in modern orchestras.",
        "Early nineteenth-century audience applauded only perfunctorily after the first three movements of symphonies and conventionally withheld their most enthusiastic applause until the final movement was completed."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that early nineteenth-century audience applauded only perfunctorily after the first three movements of symphonies and conventionally withheld their most enthusiastic applause until the final movement was completed."
    }
  ]
},
{
  "id": "minimills-and-big-steel",
  "title": "Minimills and Big Steel",
  "tier": "moderate",
  "words": 456,
  "text": "Although the United States steel industry faces widely publicized economic problems that have eroded its steel production capacity, not all branches of the industry have been equally affected. The steel industry is not monolithic: it includes integrated producers, minimills, and specialty-steel mills. The integrated producers start with iron ore and coal and produce a wide assortment of shaped steels. The minimills reprocess scrap steel into a limited range of low-quality products, such as reinforcing rods for concrete. The specialty-steel mills are similar to minimills in that they tend to be smaller than the integrated producers and are based on scrap, but they manufacture much more expensive products than minimills do and commonly have an active in-house research-and-development effort.\nBoth minimills and specialty-steel mills have succeeded in avoiding the worst of the economic difficulties that are afflicting integrated steel producers, and some of the mills are quite profitable. Both take advantage of new technology for refining and casting steel, such as continuous casting, as soon as it becomes available. The minimills concentrate on producing a narrow range of products for sale in their immediate geographic area, whereas specialty-steel mills preserve flexibility in their operations in order to fulfill a customer's particular specifications.\nAmong the factors that constrain the competitiveness of integrated producers are excessive labor, energy, and capital costs, as well as manufacturing inflexibility. Their equipment is old and less automated, and does not incorporate many of the latest refinement in steelmaking technology. (For example, only about half of the United States integrated producers have continuous casters, which combine pouring and rolling into one operation and thus save the cost of separate rolling equipment.) One might conclude that the older labor-intensive machinery still operating in United States integrated plants is at fault for the poor performance of the United States industry, but this cannot explain why Japanese integrated producers, who produce a higher-quality product using less energy and labor, are also experiencing economic trouble. The fact is that the common technological denominator of integrated producers is an inherently inefficient process that is still rooted in the nineteenth century.\nIntegrated producers have been unable to compete successfully with minimills because the minimills, like specialty-steel mills, have dispensed almost entirely with the archaic energy and capital-intensive front end of integrated steelmaking: the iron-smelting process, including the mining and preparation of the raw materials and the blast-furnace operation. In addition, minimills have found a profitable way to market steel products: as indicated above, they sell their finished products locally, thereby reducing transportation costs, and concentrate on a limited range of shapes and sizes within a narrow group of products that can be manufactured economically. For these reasons, minimills have been able to avoid the economic decline affecting integrated steel producers.",
  "questions": [
    {
      "q": "Which one of the following best expresses the main idea of the passage?",
      "o": [
        "United States steel producers face economic problems that are shared by producers in other nations.",
        "Minimills are the most successful steel producers because they best meet market demands for cheap steel.",
        "Minimills and specialty-steel mills are more economically competitive than integrated producers because they use new technology and avoid the costs of the iron-smelting process.",
        "United States steel producers are experiencing an economic decline that can be traced back to the nineteenth century."
      ],
      "a": 2,
      "e": "The passage supports option C: minimills and specialty-steel mills are more economically competitive than integrated producers because they use new technology and avoid the costs of the iron-smelting process."
    },
    {
      "q": "The author mentions all of the following as features of minimills EXCEPT",
      "o": [
        "flexibility in their operations",
        "local sale of their products",
        "avoidance of mining operations",
        "use of new steel-refining technology"
      ],
      "a": 0,
      "e": "The passage supports option A: flexibility in their operations."
    },
    {
      "q": "The author of the passage refers to \"Japanese integrated producers\" (line 43) primarily in order to support the view that",
      "o": [
        "different economic difficulties face the steel industries of different nations",
        "not all integrated producers share a common technological denominator",
        "labor-intensive machinery cannot be blamed for the economic condition of United States integrated steel producers",
        "modern steelmaking technology is generally labor-and energy-efficient"
      ],
      "a": 2,
      "e": "The passage supports option C: labor-intensive machinery cannot be blamed for the economic condition of united states integrated steel producers."
    },
    {
      "q": "Which one of the following best describes the organization of the third paragraph?",
      "o": [
        "A hypothesis is proposed and supported; then an opposing view is presented and criticized.",
        "A debate is described and illustrated: then a contrast is made and the debate is resolved.",
        "A dilemma is described and cited as evidence for a broader criticism.",
        "General statements are made and details given; then an explanation is proposed and rejected, and an alternative is offered."
      ],
      "a": 3,
      "e": "The passage supports option D: general statements are made and details given; then an explanation is proposed and rejected, and an alternative is offered."
    },
    {
      "q": "It can be inferred from the passage that United States specialty-steel mills generally differ from integrated steel producers in that the specialty-steel mills",
      "o": [
        "sell products in a restricted geographical area",
        "share the economic troubles of the minimills",
        "resemble specialty-steel mills found in Japan",
        "do not operate blast furnaces"
      ],
      "a": 3,
      "e": "It can be inferred from the passage that do not operate blast furnaces."
    },
    {
      "q": "Each of the following describes an industry facing a problem also experienced by United Stated integrated steel producers EXCEPT",
      "o": [
        "a paper-manufacturing company that experiences difficulty in obtaining enough timber and other raw materials to meet its orders",
        "a food-canning plant whose canning machines must constantly be tended by human operators",
        "a textile firm that spends heavily on capital equipment and energy to process raw cotton before it is turned into fabric",
        "a window-glass manufacturer that is unable to produce quickly different varieties of glass with special features required by certain customers"
      ],
      "a": 0,
      "e": "The passage supports option A: a paper-manufacturing company that experiences difficulty in obtaining enough timber and other raw materials to meet its orders."
    }
  ]
},
{
  "id": "work-and-the-family",
  "title": "Work and the Family",
  "tier": "moderate",
  "words": 462,
  "text": "The labor force is often organized as if workers had no family responsibilities. Preschool-age children need full-time care; children in primary school need care after school and during school vacations. Although day-care services can resolve some scheduling conflicts between home and office, workers cannot always find or afford suitable care. Even when they obtain such care, parents must still cope with emergencies, such as illnesses, that keep children at home. Moreover, children need more than tending; they also need meaningful time with their parents. Conventional full-time workdays, especially when combined with unavoidable household duties, are too inflexible for parents with primary child-care responsibility.\nAlthough a small but increasing number of working men are single parents, those barriers against successful participation in the labor market that are related to primary child-care responsibilities mainly disadvantage women. Even in families where both parents work, cultural pressures are traditionally much greater on mothers than on fathers to bear the primary child-rearing responsibilities.\nIn reconciling child-rearing responsibilities with participation in the labor market, many working mothers are forced to make compromises. For example, approximately one-third of all working mothers are employed only part-time, even though part-time jobs are dramatically underpaid and often less desirable in comparison to full-time employment. Even though part-time work is usually available only in occupations offering minimal employee responsibility and little opportunity for advancement or self-enrichment, such employment does allow many women the time and flexibility to fulfill their family duties, but only at the expense of the advantages associated with full-time employment.\nMoreover, even mothers with full-time employment must compromise opportunities in order to adjust to barriers against parents in the labor market. Many choose jobs entailing little challenge or responsibility or those offering flexible scheduling, often available only in poorly paid positions, while other working mothers, although willing and able to assume as much responsibility as people without children, find that their need to spend regular and predictable time with their children inevitably causes them to lose career opportunities to those without such demands. Thus, women in education are more likely to become teachers than school administrators, whose more conventional full-time work schedules do not correspond to the schedules of school-age children, while female lawyers are more likely to practice law in trusts and estates, where they can control their work schedules, than in litigation, where they cannot. Nonprofessional women are concentrated in secretarial work and department store sales, where their absences can be covered easily by substitutes and where they can enter and leave the work force with little loss, since the jobs offer so little personal gain. Indeed, as long as the labor market remains hostile to parents, and family roles continue to be allocated on the basis of gender, women will be seriously disadvantaged in that labor market.",
  "questions": [
    {
      "q": "Which one of the following best summarizes the main idea of the passage?",
      "o": [
        "Current trends in the labor force indicate that working parents, especially women, may not always need to choose between occupational and child-care responsibilities.",
        "In order for mothers to have an equal opportunity for advancement in the labor force, traditional family roles have to be reexamined and revised.",
        "Although single parents who work have to balance parental and career demands, single mothers suffer resulting employment disadvantages that single fathers can almost always avoid.",
        "Traditional work schedules are too inflexible to accommodate the child-care responsibilities of many parents, a fact that severely disadvantages women in the labor force."
      ],
      "a": 3,
      "e": "The passage supports option D: traditional work schedules are too inflexible to accommodate the child-care responsibilities of many parents, a fact that severely disadvantages women in the labor force."
    },
    {
      "q": "Which one of the following statements about part-time work can be inferred from the information presented in the passage?",
      "o": [
        "One-third of all part-time workers are working mothers.",
        "Part-time work generally offers fewer opportunities for advancement to working mothers than to women generally.",
        "Part-time work, in addition to having relatively poor wages, often requires that employees work during holidays, when their children are out of school.",
        "Part-time employment, despite its disadvantages, provides working mothers with an opportunity to address some of the demands of caring for children."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that part-time employment, despite its disadvantages, provides working mothers with an opportunity to address some of the demands of caring for children."
    },
    {
      "q": "It can be inferred from the passage that the author would be most likely to agree with which one of the following statements about working fathers in two-parent families?",
      "o": [
        "They are equally burdened by the employment disadvantages placed upon all parents---male and female---in the labor market.",
        "They are so absorbed in their jobs that they often do not see the injustice going on around them.",
        "They are shielded by the traditional allocation of family roles from many of the pressures associated with child-rearing responsibilities.",
        "They help compound the inequities in the labor market by keeping women form competing with men for career opportunities."
      ],
      "a": 2,
      "e": "It can be inferred from the passage that they are shielded by the traditional allocation of family roles from many of the pressures associated with child-rearing responsibilities."
    },
    {
      "q": "Of the following, which one would the author most likely say is the most troublesome barrier facing working parents with primary child-care responsibility?",
      "o": [
        "the lack of full-time jobs open to women",
        "the inflexibility of work schedules",
        "the low wages of part-time employment",
        "the limited advancement opportunities for nonprofessional employees"
      ],
      "a": 1,
      "e": "The passage supports option B: the inflexibility of work schedules."
    },
    {
      "q": "The passage suggests that day care is at best a limited solution to the pressures associated with child rearing for all of the following reasons EXCEPT:",
      "o": [
        "Even the best day care available cannot guarantee that children will have meaningful time with their parents.",
        "Some parents cannot afford day-care services.",
        "Working parents sometimes have difficulty finding suitable day care for their children.",
        "Parents who send their children to day care still need to provide care for their children during vacations."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that parents who send their children to day care still need to provide care for their children during vacations."
    },
    {
      "q": "According to the passage, many working parents may be forced to make any of the following types of career decisions EXCEPT",
      "o": [
        "declining professional positions for nonprofessional ones, which typically have less conventional work schedules",
        "accepting part-time employment rather than full-time employment",
        "taking jobs with limited responsibility, and thus more limited career opportunities, in order to have a more flexible schedule",
        "pursuing career specializations that allow them to control their work schedules instead of pursuing a more desirable specialization in the same field"
      ],
      "a": 0,
      "e": "The passage directly supports this: declining professional positions for nonprofessional ones, which typically have less conventional work schedules. This information is stated in the passage, making it the most accurate answer based on the text."
    }
  ]
},
{
  "id": "websters-contradictions",
  "title": "Webster's Contradictory Characters",
  "tier": "hard",
  "words": 467,
  "text": "Critics have long been puzzled by the inner contradictions of major characters in John Webster's tragedies. In his The Duchess of Malfi, for instance, the Duchess is \"good\" in demonstrating the obvious tenderness and sincerity of her love for Antonio, but \"bad\" in ignoring the wishes and welfare of her family and in making religion a \"cloak\" hiding worldly self-indulgence. Bosola is \"bad\" in serving Ferdinand, \"good\" in turning the Duchess' thoughts toward heaven and in planning to avenge her murder. The ancient Greek philosopher Aristotle implied that such contradictions are virtually essential to the tragic personality, and yet critics keep coming back to this element of inconsistency as though it were an eccentric feature of Webster's own tragic vision.\nThe problem is that, as an Elizabethan playwright, Webster has become a prisoner of our critical presuppositions. We have, in recent years, been dazzled by the way the earlier Renaissance and medieval theater, particularly the morality play, illuminates Elizabethan drama. We now understand how the habit of mind that saw the world as a battleground between good and evil produced the morality play. Morality plays allegorized that conflict by presenting characters whose actions were defined as the embodiment of good or evil. This model of reality lived on, overlaid by different conventions, in the most sophisticated Elizabethan works of the following age. Yet Webster seems not to have been as heavily influenced by the morality play's model of reality as were his Elizabethan contemporaries; he was apparently more sensitive to the more morally complicated Italian drama than to these English sources. Consequently, his characters cannot be evaluated according to reductive formulas of good and evil, which is precisely what modern critics have tried to do. They choose what seem to be the most promising of the contradictor values that are dramatized in the play, and treat those values as if they were the only basis for analyzing the moral development of the play's major characters, attributing the inconsistencies in a character's behavior to artistic incompetence on Webster's part. The lack of consistency in Webster's characters can be better understood if we recognize that the ambiguity at the heart of his tragic vision lies not in the external world but in the duality of human nature. Webster establishes tension in his plays by setting up conflicting systems of value that appear immoral only when one value system is viewed exclusively from the perspective of the other. He presents us not only with characters that we condemn intellectually or ethically and at the same time impulsively approve of, but also with judgments we must accept as logically sound and yet find emotionally repulsive. The dilemma is not only dramatic: it is tragic, because the conflict is irreconcilable, and because it is ours as much as that of the characters.",
  "questions": [
    {
      "q": "The primary purpose of the passage is to",
      "o": [
        "clarify an ambiguous assertion",
        "provide evidence in support of a commonly held view",
        "analyze an unresolved question and propose an answer",
        "offer an alternative to a flawed interpretation"
      ],
      "a": 3,
      "e": "Taken as a whole, the passage is organised around option D: offer an alternative to a flawed interpretation."
    },
    {
      "q": "The author suggests which one of the following about the dramatic works that most influenced Webster's tragedies?",
      "o": [
        "They were not concerned with dramatizing the conflict between good and evil that was presented in morality plays.",
        "They were not as sophisticated as the Italian sources from which other Elizabethan tragedies were derived.",
        "They have never been adequately understood by critics.",
        "They have only recently been used to illuminate the conventions of Elizabethan drama."
      ],
      "a": 0,
      "e": "It can be inferred from the passage that they were not concerned with dramatizing the conflict between good and evil that was presented in morality plays."
    },
    {
      "q": "The author's allusion to Aristotle's view of tragedy in lines 11-13 serves which one of the following functions in the passage?",
      "o": [
        "It introduces a commonly held view of Webster's tragedies that the author plans to defend.",
        "It supports the author's suggestion that Webster's conception of tragedy is not idiosyncratic.",
        "It provides an example of an approach to Webster's tragedies that the author criticizes.",
        "It establishes the similarity between classical and modern approaches to tragedy."
      ],
      "a": 1,
      "e": "The passage supports option B: it supports the author's suggestion that webster's conception of tragedy is not idiosyncratic."
    },
    {
      "q": "It can be inferred from the passage that modern critics' interpretations of Webster's tragedies would be more valid if",
      "o": [
        "the ambiguity inherent in Webster's tragic vision resulted from the duality of human nature",
        "Webster's conception of the tragic personality were similar to that of Aristotle",
        "Webster had been heavily influenced by the morality play",
        "Elizabethan dramatists had been more sensitive to Italian sources of influence"
      ],
      "a": 2,
      "e": "It can be inferred from the passage that webster had been heavily influenced by the morality play."
    },
    {
      "q": "With which one of the following statements regarding Elizabethan drama would the author be most likely to agree?",
      "o": [
        "The skill of Elizabethan dramatists has in recent years been overestimated.",
        "The conventions that shaped Elizabethan drama are best exemplified by Webster's drama.",
        "Elizabethan drama, for the most part, can be viewed as being heavily influenced by the morality play.",
        "Only by carefully examining the work of his Elizabethan contemporaries can Webster's achievement as a dramatist be accurately measured."
      ],
      "a": 2,
      "e": "The passage supports option C: elizabethan drama, for the most part, can be viewed as being heavily influenced by the morality play."
    },
    {
      "q": "It can be inferred from the passage that most modern critics assume which one of the following in their interpretation of Webster's tragedies?",
      "o": [
        "Webster's play tended to allegorize the conflict between good and evil more than did those of his contemporaries.",
        "Webster's plays were derived more from Italian than from English sources.",
        "The artistic flaws in Webster's tragedies were largely the result of his ignorance of the classical definition of tragedy.",
        "In writing his tragedies, Webster was influenced by the same sources as his contemporaries."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that in writing his tragedies, webster was influenced by the same sources as his contemporaries."
    }
  ]
},
{
  "id": "bacteria-that-help-crops",
  "title": "Bacteria That Help Crops",
  "tier": "moderate",
  "words": 449,
  "text": "Cultivation of a single crop on a given tract of land leads eventually to decreased yields. One reason for this is that harmful bacterial phytopathogens, organisms parasitic on plant hosts, increase in the soil surrounding plant roots. The problem can be cured by crop rotation, denying the pathogens a suitable host for a period of time. However, even if crops are not rotated, the severity of diseases brought on by such phytopathogens often decreases after a number of years as the microbial population of the soil changes and the soil becomes \"suppressive\" to those diseases. While there may be many reasons for this phenomenon, it is clear that levels of certain bacteria, such as Pseudomonas fluorescens, a bacterium antagonistic to a number of harmful phytopathogens, are greater in suppressive than in nonsuppressive soil. This suggests that the presence of such bacteria suppresses phytopathogens. There is now considerable experimental support for this view. Wheat yield increases of 27 percent have been obtained in field trials by treatment of wheat seeds with fluorescent pseudomonads. Similar treatment of sugar beets, cotton, and potatoes has had similar results.\nThese improvements in crop yields through the application of Pseudomonas fluorescens suggest that agriculture could benefit from the use of bacteria genetically altered for specific purposes. For example, a form of phytopathogen altered to remove its harmful properties could be released into the environment in quantities favorable to its competing with and eventually excluding the harmful normal strain. Some experiments suggest that deliberately releasing altered nonpathogenic Pseudomonas syringae could crowd out the nonaltered variety that causes frost damage. Opponents of such research have objected that the deliberate and large-scale release of genetically altered bacteria might have deleterious results. Proponents, on the other hand, argue that this particular strain is altered only by the removal of the gene responsible for the strain's propensity to cause frost damage, thereby rendering it safer than the phytopathogen from which it was derived.\nSome proponents have gone further and suggest that genetic alteration techniques could create organisms with totally new combinations of desirable traits not found in nature. For example, genes responsible for production of insecticidal compounds have been transposed from other bacteria into pseudomonads that colonize corn roots. Experiments of this kind are difficult and require great care: such bacteria are developed in highly artificial environments and may not compete well with natural soil bacteria. Nevertheless, proponents contend that the prospects for improved agriculture through such methods seem excellent. These prospects lead many to hope that current efforts to assess the risks of deliberate release of altered microorganisms will successfully answer the concerns of opponents and create a climate in which such research can go forward without undue impediment.",
  "questions": [
    {
      "q": "Which one of the following best summarizes the main idea of the passage?",
      "o": [
        "Recent field experiments with genetically altered Pseudomonas bacteria have shown that releasing genetically altered bacteria into the environment would not involve any significant danger.",
        "Encouraged by current research, advocates of agricultural use of genetically altered bacteria are optimistic that such use will eventually result in improved agriculture, though opponents remain wary.",
        "Current research indicates that adding genetically altered Pseudomonas syringae bacteria to the soil surrounding crop plant roots will have many beneficial effects, such as the prevention of frost damage in certain crops.",
        "Genetic alteration of a number of harmful phytopathogens has been advocated by many researchers who contend that these techniques will eventually replace such outdated methods as crop rotation."
      ],
      "a": 1,
      "e": "The passage supports option B: encouraged by current research, advocates of agricultural use of genetically altered bacteria are optimistic that such use will eventually result in improved agriculture, though opponents remain wary."
    },
    {
      "q": "The author discusses naturally occurring Pseudomonas fluorescens bacteria in the first paragraph primarily in order to do which one of the following?",
      "o": [
        "prove that increases in the level of such bacteria in the soil are the sole cause of soil suppressivity",
        "explain why yields increased after wheat fields were sprayed with altered Pseudomonas fluorescens bacteria",
        "detail the chemical processes that such bacteria use to suppress organisms parasitic to crop plants, such as wheat, sugar beets, and potatoes",
        "provide background information to support the argument that research into the agricultural use of genetically altered bacteria would be fruitful"
      ],
      "a": 3,
      "e": "The passage supports option D: provide background information to support the argument that research into the agricultural use of genetically altered bacteria would be fruitful."
    },
    {
      "q": "It can be inferred from the author's discussion of Pseudomonas fluorescens bacteria that which one of the following would be true of crops impervious to parasitical organisms?",
      "o": [
        "Pseudomonas fluorescens bacteria would be absent from the soil surrounding their roots.",
        "They would crowd out and eventually exclude other crop plants if their growth were not carefully regulated.",
        "Their yield would not be likely to be improved by adding Pseudomonas fluorescens bacteria to the soil.",
        "They would mature more quickly than crop plants that were susceptible to parasitical organisms."
      ],
      "a": 2,
      "e": "It can be inferred from the passage that their yield would not be likely to be improved by adding pseudomonas fluorescens bacteria to the soil."
    },
    {
      "q": "It can be inferred from the passage that crop rotation can increase yields in part because",
      "o": [
        "moving crop plants around makes them hardier and more resistant to disease",
        "the number of Pseudomonas fluorescens bacteria in the soil usually increases when crops are rotated",
        "the roots of many crop plants produce compounds that are antagonistic to phytopathogens harmful to other crop plants",
        "phytopathogens typically attack some plant species but find other species to be unsuitable hosts"
      ],
      "a": 3,
      "e": "It can be inferred from the passage that phytopathogens typically attack some plant species but find other species to be unsuitable hosts."
    },
    {
      "q": "According to the passage, proponents of the use of genetically altered bacteria in agriculture argue that which one of the following is true of the altered bacteria used in the frost-damage experiments?",
      "o": [
        "The altered bacteria had a genetic constitution differing from that of the normal strain only in that the altered variety had one less gene.",
        "Although the altered bacteria competed effectively with the nonaltered strain in the laboratory, they were not as viable in natural environments.",
        "The altered bacteria were much safer and more effective than the naturally occurring Pseudomonas fluorescens bacteria used in earlier experiments.",
        "The altered bacteria were antagonistic to several types of naturally occurring phytopathogens in the soil surrounding the roots of frost-damaged crops."
      ],
      "a": 0,
      "e": "The passage directly supports this: the altered bacteria had a genetic constitution differing from that of the normal strain only in that the altered variety had one less gene. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "Which one of the following, if true, would most seriously weaken the proponents' argument regarding the safety of using altered Pseudomonas syringae bacteria to control frost damage?",
      "o": [
        "Pseudomonas syringae bacteria are primitive and have a simple genetic constitution.",
        "The altered bacteria are derived from a strain that is parasitic to plants and can cause damage to crops.",
        "Current genetic-engineering techniques permit the large-scale commercial production of such bacteria.",
        "Often genes whose presence is responsible for one harmful characteristic must be present in order to prevent other harmful characteristics."
      ],
      "a": 3,
      "e": "This option most directly addresses the argument in question. It provides evidence or reasoning that bears on the claim being evaluated, while the other options are either irrelevant, supportive of the wrong conclusion, or do not address the specific argument."
    }
  ]
},
{
  "id": "the-dawes-act",
  "title": "The Dawes Act",
  "tier": "moderate",
  "words": 450,
  "text": "In 1887 the Dawes Act legislated wide-scale private ownership of reservation lands in the United States for Native Americans. The act allotted plots of 80 acres to each Native American adult. However, the Native Americans were not granted outright title to their lands. The act defined each grant as a \"trust patent,\" meaning that the Bureau of Indian Affairs (BIA), the governmental agency in charge of administering policy regarding Native Americans, would hold the allotted land in trust for 25 years, during which time the Native American owners could use, but not alienate (sell) the land. After the 25-year period, the Native American allottee would receive a \"fee patent\" awarding full legal ownership of the land.\nTwo main reasons were advanced for the restriction on the Native Americans' ability to sell their lands. First, it was claimed that free alienability would lead to immediate transfer of large amounts of former reservation land to non-Native Americans, consequently threatening the traditional way of life on those reservations. A second objection to free alienation was that Native Americans were unaccustomed to, and did not desire, a system of private landownership. Their custom, it was said, favored communal use of land.\nHowever, both of these arguments bear only on the transfer of Native American lands to non-Native Americans: neither offers a reason for prohibiting Native Americans from transferring land among themselves. Selling land to each other would not threaten the Native American culture. Additionally, if communal land use remained preferable to Native Americans after allotment, free alienability would have allowed allottees to sell their lands back to the tribe.\nWhen stated rationales for government policies prove empty, using an interest-group model often provides an explanation. While neither Native Americans nor the potential non-Native American purchasers benefited from the restraint on alienation contained in the Dawes Act, one clearly defined group did benefit: the BIA bureaucrats. It has been convincingly demonstrated that bureaucrats seek to maximize the size of their staffs and their budgets in order to compensate for the lack of other sources of fulfillment, such as power and prestige. Additionally, politicians tend to favor the growth of governmental bureaucracy because such growth provides increased opportunity for the exercise of political patronage. The restraint on alienation vastly increased the amount of work, and hence the budgets, necessary to implement the statute. Until allotment was ended in 1934, granting fee patents and leasing Native American lands were among the principal activities of the United States government. One hypothesis, then, for the temporary restriction on alienation in the Dawes Act is that it reflected a compromise between non-Native Americans favoring immediate alienability so they could purchase land and the BIA bureaucrats who administered the privatization system.",
  "questions": [
    {
      "q": "Which one of the following best summarizes the main idea of the passage?",
      "o": [
        "United States government policy toward Native Americans has tended to disregard their needs and consider instead the needs of non-Native American purchasers of land.",
        "In order to preserve the unique way of life on Native American reservations, use of Native American lands must be communal rather than individual.",
        "The Dawes Act's restriction on the right of Native Americans to sell their land may have been implemented primarily to serve the interests of politicians and bureaucrats.",
        "The clause restricting free alienability in the Dawes Act greatly expanded United States governmental activity in the area of land administration."
      ],
      "a": 2,
      "e": "The passage supports option C: the dawes act's restriction on the right of native americans to sell their land may have been implemented primarily to serve the interests of politicians and bureaucrats."
    },
    {
      "q": "Which one of the following statements concerning the reason for the end of allotment, if true, would provide the most support for the author's view of politicians?",
      "o": [
        "Politicians realized that allotment was damaging the Native American way of life.",
        "Politicians decided that allotment would be more congruent with the Native American custom of communal land use.",
        "Politicians believed that allotment's continuation would not enhance their opportunities to exercise patronage.",
        "Politicians felt that the staff and budgets of the BIA had grown too large."
      ],
      "a": 2,
      "e": "The passage supports option C: politicians believed that allotment's continuation would not enhance their opportunities to exercise patronage."
    },
    {
      "q": "Which one of the following best describes the organization of the passage?",
      "o": [
        "The passage of a law is analyzed in detail, the benefits and drawbacks of one of its clauses are studied, and a final assessment of the law is offered.",
        "The history of a law is narrated, the effects of one of its clauses on various populations are studied, and repeal of the law is advocated",
        "A law is examined, the political and social backgrounds of one of its clauses are characterized, and the permanent effects of the law are studied.",
        "A law is described, the rationale put forward for one of its clauses is outlined and dismissed, and a different rationale for the clause is presented."
      ],
      "a": 3,
      "e": "The passage supports option D: a law is described, the rationale put forward for one of its clauses is outlined and dismissed, and a different rationale for the clause is presented."
    },
    {
      "q": "The author's attitude toward the reasons advanced for the restriction on alienability in the Dawes Act at the time of its passage can best be described as",
      "o": [
        "completely credulous",
        "partially approving",
        "basically indecisive",
        "highly skeptical"
      ],
      "a": 3,
      "e": "The author's tone throughout the passage is best characterised as reflected in this answer. The language and rhetorical choices in the passage support this reading."
    },
    {
      "q": "It can be inferred from the passage that which one of the following was true of Native American life immediately before passage of the Dawes Act?",
      "o": [
        "Most Native Americans supported themselves through farming.",
        "Not many Native Americans personally owned the land on which they lived.",
        "The land on which most Native Americans lived had been bought from their tribes.",
        "Few Native Americans had much contact with their non-Native American neighbors."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that not many native americans personally owned the land on which they lived."
    },
    {
      "q": "According to the passage, the type of landownership initially obtainable by Native Americans under the Dawes Act differed from the type of ownership obtainable after a 25-year period in that only the latter allowed",
      "o": [
        "owners of land to farm it",
        "owners of land to sell it",
        "government some control over how owners disposed of land",
        "owners of land to build on it with relatively minor governmental restrictions"
      ],
      "a": 1,
      "e": "The passage directly supports this: owners of land to sell it. This information is stated in the passage, making it the most accurate answer based on the text."
    }
  ]
},
{
  "id": "law-and-literature",
  "title": "Law and Literature",
  "tier": "hard",
  "words": 439,
  "text": "The law-and-literature movement claims to have introduced a valuable pedagogical innovation into legal study: instructing students in techniques of literary analysis for the purpose of interpreting laws and in the reciprocal use of legal analysis for the purpose of interpreting literary texts. The results, according to advocates, are not only conceptual breakthroughs in both law and literature but also more sensitive and humane lawyers. Whatever the truth of this last claim, there can be no doubt that the movement is a success: law-and-literature is an accepted subject in law journals and in leading law schools. Indeed, one indication of the movement's strength is the fact that its most distinguished critic, Richard A. Posner, paradoxically ends up expressing qualified support for the movement in a recent study in which he systematically refutes the writings of its leading legal scholars and cooperating literary critics.\nCritiquing the movement's assumption that lawyers can offer special insights into literature that deals with legal matters, Posner points out that writers of literature use the law loosely to convey a particular idea or as a metaphor for the workings of the society envisioned in their fiction. Legal questions per se, about which a lawyer might instruct readers, are seldom at issue in literature. This is why practitioners of law-and-literature end up discussing the law itself far less than one might suppose. Movement leader James White, for example, in his discussion of arguments in the Iliad, barely touches on law, and then so generally as to render himself vulnerable to Posner's devastating remark that \"any argument can be analogized to a legal dispute.\"\nSimilarly, the notion that literary criticism can be helpful in interpreting law is problematic. Posner argues that literary criticism in general aims at exploring richness and variety of meaning in texts, whereas legal interpretation aims at discovering a single meaning. A literary approach can thus only confuse the task of interpreting the law, especially if one adopts current fashions like deconstruction, which holds that all texts are inherently uninterpretable.\nNevertheless, Posner writes that law-and-literature is a field with \"promise\". Why? Perhaps, recognizing the success of a movement that, in the past, has singled him out for abuse, he is attempting to appease his detractors, paying obeisance to the movements institutional success by declaring that it \"deserves a place in legal research\" while leaving it to others to draw the conclusion from his cogent analysis that it is an entirely factitious undertaking, deserving of no intellectual respect whatsoever. As a result, his work stands both as a rebuttal of law-and-literature and as a tribute to the power it has come to exercise in academic circles.",
  "questions": [
    {
      "q": "The primary purpose of the passage is to",
      "o": [
        "assess the law-and-literature movement by examining the position of one of its most prominent critics",
        "assert that a mutually beneficial relationship exists between the study of law and the study of literature",
        "provide examples of the law-and-literature movement in practice by discussing the work of its proponents",
        "dismiss a prominent critics recent study of the law-and-literature movement"
      ],
      "a": 0,
      "e": "Taken as a whole, the passage is organised around option A: assess the law-and-literature movement by examining the position of one of its most prominent critics."
    },
    {
      "q": "Posner's stated position with regard to (with regard to: adv.) the law-and-literature movement is most analogous to which one of the following?",
      "o": [
        "a musician who is trained in the classics but frequently plays modern music while performing on stage",
        "a partisan who transfers allegiance to a new political party that demonstrates more promise but has fewer documented accomplishments",
        "a sports fan who wholeheartedly supports the team most likely to win rather than his or her personal favorite",
        "a salesperson who describes the faults in a fashionable product while conceding that it may have some value"
      ],
      "a": 3,
      "e": "The passage supports option D: a salesperson who describes the faults in a fashionable product while conceding that it may have some value."
    },
    {
      "q": "The passage suggests that Posner regards legal practitioners as using an approach to interpreting law that",
      "o": [
        "eschews discovery of multiple meanings",
        "employs techniques like deconstruction",
        "interprets laws in light of varying community standards",
        "is informed by the positions of literary critics"
      ],
      "a": 0,
      "e": "It can be inferred from the passage that eschews discovery of multiple meanings."
    },
    {
      "q": "The Passage suggests that Posner might find legal training useful in the interpretation of a literary text in which",
      "o": [
        "a legal dispute symbolizes the relationship between two characters",
        "an oppressive law is used to symbolize an oppressive culture",
        "one of the key issues involves the answer to a legal question",
        "a legal controversy is used to represent a moral conflict"
      ],
      "a": 2,
      "e": "It can be inferred from the passage that one of the key issues involves the answer to a legal question."
    },
    {
      "q": "The author uses the word \"success\" in line 11 to refer to the law-and-literature movement's",
      "o": [
        "positive effect on the sensitivity of lawyers",
        "widespread acceptance by law schools and law journals",
        "ability to offer fresh insights into literary texts",
        "ability to encourage innovative approaches in two disciplines"
      ],
      "a": 1,
      "e": "The passage supports option B: widespread acceptance by law schools and law journals."
    },
    {
      "q": "According to the passage, Posner argues that legal analysis is not generally useful in interpreting literature because",
      "o": [
        "use of the law in literature is generally of a quite different nature than use of the law in legal practice",
        "law is rarely used to convey important ideas in literature",
        "lawyers do not have enough literary training to analyze literature competently",
        "legal interpretations of literature tend to focus on legal issues to the exclusion of other important elements"
      ],
      "a": 0,
      "e": "The passage directly supports this: use of the law in literature is generally of a quite different nature than use of the law in legal practice. This information is stated in the passage, making it the most accurate answer based on the text."
    }
  ]
},
{
  "id": "historians-of-science",
  "title": "Historians of Science",
  "tier": "hard",
  "words": 462,
  "text": "A recent generation of historians of science, far from portraying accepted scientific views as objectively accurate reflections of a natural world, explain the acceptance of such views in terms of the ideological biases of certain influential scientists or the institutional and rhetorical power such scientists wield. As an example of ideological bias, it has been argued that Pasteur rejected the theory of spontaneous generation not because of experimental evidence but because he rejected the materialist ideology implicit in that doctrine. These historians seem to find allies in certain philosophers of science who argue that scientific views are not imposed by reality but are free inventions of creative minds, and that scientific claims are never more than brave conjectures, always subject to inevitable future falsification. While these philosophers of science themselves would not be likely to have much truck with the recent historians, it is an easy step from their views to the extremism of the historians.\nWhile this rejection of the traditional belief that scientific views are objective reflections of the world may be fashionable, it is deeply implausible. We now know, for example, that water is made of hydrogen and oxygen and that parents each contribute one-half of their children's complement of genes. I do not believe any serious-minded and informed person can claim that these statements are not factual descriptions of the world or that they will inevitably be falsified.\nHowever, science's accumulation of lasting truths about the world is not by any means a straightforward matter. We certainly need to get beyond the naive view that the truth will automatically reveal itself to any scientist who looks in the right direction; most often, in fact, a whole series of prior discoveries is needed to tease reality's truths from experiment and observation. And the philosophers of science mentioned above are quite right to argue that new scientific ideas often correct old ones by indicating errors and imprecision (as, say, Newton's ideas did to Kepler's). Nor would I deny that there are interesting questions to be answered about the social processes in which scientific activity is embedded. The persuasive processes by which particular scientific groups establish their experimental results as authoritative are themselves social activities and can be rewardingly studied as such. Indeed, much of the new work in the history of science has been extremely revealing about the institutional interactions and rhetorical devices that help determine whose results achieve prominence.\nBut one can accept all this without accepting the thesis that natural reality never plays any part at all in determining what scientists believe. What the new historians ought to be showing us is how those doctrines that do in fact fit reality work their way through the complex social processes of scientific activity to eventually receive general scientific acceptance.",
  "questions": [
    {
      "q": "It can be inferred from the passage that the author would be most likely to agree with which one of the following characterizations of scientific truth?",
      "o": [
        "It is often implausible.",
        "It is subject to inevitable falsification.",
        "It is rarely obvious and transparent .",
        "It is rarely discovered by creative processes."
      ],
      "a": 2,
      "e": "It can be inferred from the passage that it is rarely obvious and transparent ."
    },
    {
      "q": "According to the passage, Kepler's ideas provide an example of scientific ideas that were",
      "o": [
        "corrected by subsequent inquiries",
        "dependent on a series of prior observations",
        "originally thought to be imprecise and then later confirmed",
        "established primarily by the force of an individuals rhetorical power"
      ],
      "a": 0,
      "e": "The passage directly supports this: corrected by subsequent inquiries. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "In the third paragraph of the passage, the author is primarily concerned with",
      "o": [
        "presenting conflicting explanations for a phenomenon",
        "suggesting a field for possible future research",
        "qualifying a previously expressed point of view",
        "providing an answer to a theoretical question"
      ],
      "a": 2,
      "e": "The passage supports option C: qualifying a previously expressed point of view."
    },
    {
      "q": "The use of the words \"any serious-minded and informed person' (lines 28-29) serves which one of the following functions in the context of the passage?",
      "o": [
        "to satirize chronologically earlier notions about the composition of water",
        "to reinforce a previously stated opinion about certain philosophers of science",
        "to suggest the author's reservations about the \"traditional belief\" mentioned in line 22",
        "to discredit someone who would argue that certain scientific assertions do not factually describe reality"
      ],
      "a": 3,
      "e": "The passage supports option D: to discredit someone who would argue that certain scientific assertions do not factually describe reality."
    },
    {
      "q": "It can be inferred from the passage that the author would most likely agree with which one of the following statements about the relationship between the views of \"certain philosophers of science\" (lines l2-13) and those of the recent historians?",
      "o": [
        "These two views are difficult to differentiate.",
        "These two views share some similarities.",
        "The views of the philosophers ought to be seen as the source of the historians' views.",
        "Both views emphasize the rhetorical power of scientists."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that these two views share some similarities."
    },
    {
      "q": "Which one of the following best characterizes the author's assessment of the opinions of the new historians of science, as these opinions are presented in the passage?",
      "o": [
        "They lack any credibility.",
        "They themselves can be rewardingly studied as social phenomena.",
        "They are least convincing when they concern the actions of scientific groups.",
        "Although they are gross overstatements, they lead to some valuable insights."
      ],
      "a": 3,
      "e": "The passage supports option D: although they are gross overstatements, they lead to some valuable insights."
    }
  ]
},
{
  "id": "cherokee-removal",
  "title": "The Cherokee Removal",
  "tier": "moderate",
  "words": 455,
  "text": "Until recently, it was thought that the Cherokee, a Native American tribe, were compelled to assimilate Euro-American culture during the 1820s. During that decade, it was supposed, White missionaries arrived and, together with their part-Cherokee intermediaries, imposed the benefits of \"civilization\" on Cherokee tribes while the United States government actively promoted acculturalization by encouraging the Cherokee to switch from hunting to settled agriculture. This view was based on the assumption that the end of a Native American group's economic and political autonomy would automatically mean the end of its cultural autonomy as well.\nWilliam G. McLaughlin has recently argued that not only did Cherokee culture flourish during and after the 1820s, but the Cherokee themselves actively and continually reshaped their culture. Missionaries did have a decisive impact during these years, he argues, but that impact was far from what it was intended to be. The missionaries' tendency to cater to the interests of an acculturating part-Cherokee elite (who comprised the bulk of their converts) at the expense of the more traditionalist full-Cherokee majority created great intratribal tensions. As the elite initiated reforms designed to legitimize their own and the Cherokee Nation's place in the new republic of the United States, antimission Cherokee reacted by fostering revivals of traditional religious beliefs and practices. However, these revivals did not, according to McLaughlin, undermine the elitist reforms, but supplemented them with popular traditionalist counterparts.\nTraditionalist Cherokee did not reject the elitist reforms outright, McLaughlin argues, simply because they recognized that there was more than one way to use the skills the missionaries could provide them. As he quotes one group as saying, \"We want our children to learn English so that the White man cannot cheat us.\" Many traditionalists Cherokee welcomed the missionaries for another reason: they perceived that it would be useful to have White allies. In the end, McLaughlin asserts, most members of the Cherokee council, including traditionalists, supported a move which preserved many of the reforms of the part-Cherokee elite but limited the activities and influence of the missionaries and other White settlers. According to McLaughlin, the identity and culture that resulted were distinctively Cherokee, yet reflected the larger political and social setting in which they flourished.\nBecause his work concentrates on the nineteenth century, McLaughlin unfortunately overlooks earlier sources of influence, such as eighteen-century White resident traders and neighbors, thus obscuring the relative impact of the missionaries of the 1820s in contributing to both acculturalization and resistance to it among the Cherokee. However, McLaughlin is undoubtedly correct in recognizing that culture is an ongoing process rather than a static entity, and he has made a significant contribution to our understanding of how Cherokee culture changed while retaining its essential identity after confronting the missionaries.",
  "questions": [
    {
      "q": "Which one of the following best states the main idea of the passage?",
      "o": [
        "McLaughlin's studies of the impact of missionaries on Cherokee culture during the 1820s are fundamentally flawed, since McLaughlin ignores the greater impact of White resident traders in the eighteenth century.",
        "Though his work is limited in perspective, McLaughlin is substantially correct that changes in Cherokee culture in the 1820s were mediated by the Cherokee themselves rather than simply imposed by the missionaries.",
        "Although McLaughlin is correct in asserting that cultural changes among the Cherokee were autonomous and so not a result of the presence of missionaries, he overemphasizes the role of intertribal conflicts.",
        "McLaughlin has shown that Cherokee culture not only flourished during and after the 1820s, but that changes in Cherokee culture during this time developed naturally from elements already present in Cherokee culture."
      ],
      "a": 1,
      "e": "The passage supports option B: though his work is limited in perspective, mclaughlin is substantially correct that changes in cherokee culture in the 1820s were mediated by the cherokee themselves rather than simply imposed by the missionaries."
    },
    {
      "q": "Which one of the following statements regarding the Cherokee council in the 1820s can be inferred from the passage?",
      "o": [
        "Members of the Cherokee council were elected democratically by the entire Cherokee Nation.",
        "In order for a policy to come into effect for the Cherokee Nation, it had to have been approved by a unanimous vote of the Cherokee council.",
        "Despite the fact that the Cherokee were dominated politically and economically by the United States in the 1820s, the Cherokee council was able to override policies set by the United States government.",
        "Though it did not have complete autonomy in governing the Cherokee Nation, it was able to set some policies affecting the activities of White people living in tribal areas."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that though it did not have complete autonomy in governing the cherokee nation, it was able to set some policies affecting the activities of white people living in tribal areas."
    },
    {
      "q": "Which one of the following statements regarding the attitudes of traditionalist Cherokee toward the reforms that were instituted in the 1820s can be inferred from the passage?",
      "o": [
        "They supported the reforms merely as a way of placating the increasingly vocal acculturating elite.",
        "They thought that the reforms would lead to the destruction of traditional Cherokee culture but felt powerless to stop the reforms.",
        "They supported the reforms only because they thought that they were inevitable and it was better that the reforms appear to have been initiated by the Cherokee themselves.",
        "They viewed the reforms as a means of preserving the Cherokee Nation and protecting it against exploitation."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that they viewed the reforms as a means of preserving the cherokee nation and protecting it against exploitation."
    },
    {
      "q": "According to the passage, McLaughlin cites which one of the following as a contributing factor in the revival of traditional religious beliefs among the Cherokee in the 1820s?",
      "o": [
        "Missionaries were gaining converts at an increasing rate as the 1820s progressed.",
        "The traditionalist Cherokee majority thought that most of the reforms initiated by the missionaries' converts would corrupt Cherokee culture.",
        "Missionaries unintentionally created conflict among the Cherokee by favoring the interests of the acculturating elite at the expense of the more traditionalist majority.",
        "Traditionalist Cherokee recognized that only some of the reforms instituted by a small Cherokee elite would be beneficial to all Cherokee."
      ],
      "a": 2,
      "e": "The passage directly supports this: missionaries unintentionally created conflict among the cherokee by favoring the interests of the acculturating elite at the expense of the more traditionalist majority. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "Which one of the following, if true, would most seriously undermine McLaughlin's account of the course of reform among the Cherokee during the 1820s?",
      "o": [
        "Traditionalist Cherokee gained control over the majority of seats on the Cherokee council during the 1820s.",
        "The United States government took an active interest in political and cultural developments within Native American tribes.",
        "The missionaries living among the Cherokee in the 1820s were strongly in favor of the cultural reforms initiated by the acculturating elite.",
        "Revivals of traditional Cherokee religious beliefs and practices began late in the eighteenth century, before the missionaries arrived."
      ],
      "a": 3,
      "e": "The passage supports option D: revivals of traditional cherokee religious beliefs and practices began late in the eighteenth century, before the missionaries arrived."
    },
    {
      "q": "It can be inferred from the author's discussion of McLaughlin's views that the author thinks that Cherokee acculturalization in the 1820s",
      "o": [
        "was reversed in the decades following the 1820s",
        "may have been part of an already-existing process of acculturalization",
        "could have been the result of earlier contacts with missionaries",
        "would not have occurred without the encouragement of the United States government"
      ],
      "a": 1,
      "e": "It can be inferred from the passage that may have been part of an already-existing process of acculturalization."
    }
  ]
},
{
  "id": "the-luminists",
  "title": "The Luminists",
  "tier": "hard",
  "words": 467,
  "text": "In the history of nineteenth-century landscape painting in the United States, the Luminists are distinguished by their focus on atmosphere and light. The accepted view of Luminist paintings is that they are basically spiritual and imply a tranquil mysticism that contrasts with earlier American artists' concept of nature as dynamic and energetic. According to this view, the Luminist atmosphere, characterized by \"pure and constant light,\" guides the onlooker toward a lucid transcendentalism, an idealized vision of the world.\nWhat this view fails to do is to identify the true significance of this transcendental atmosphere in Luminist paintings. The prosaic factors that are revealed by a closer examination of these works suggest that the glowing appearance of nature in Luminism is actually a sign of nature's domestication, its adaptation to human use. The idealized Luminist atmosphere thus seems to convey, not an intensification of human responses to nature, but rather a muting of those emotions, like awe and fear, which untamed nature elicits.\nOne critic, in describing the spiritual quality of harbor scenes by Fitz Hugh Lane, an important Luminist, carefully notes that \"at the peak of Luminist development in the 1850s and 1860s, spiritualism in America was extremely widespread.\" It is also true, however, that the 1850s and 1860s were a time of trade expansion. From 1848 until his death in 1865, Lane lived in a house with a view of the harbor of Gloucester, Massachusetts, and he made short trips to Maine, New York, Baltimore, and probably Puerto Rico. In all of these places he painted the harbors with their ships - the instruments of expanding trade.\nLane usually depicts places like New York Harbor, with ships at anchor, ), but even when he depicts more remote, less commercially active harbors, nature appears pastoral and domesticated rather than primitive or unexplored. The ships, rather than the surrounding landscapes - including the sea - are generally the active element in his pictures. For Lane the sea is, in effect, a canal or a trade route for commercial activity, not a free powerful element, as it is in the early pictures of his predecessor, Cole. For Lane nature is subdued, even when storms are approaching; thus, the sea is always a viable highway for the transport of goods. In sum, I consider Lane's sea simply an environment for human activity - nature no longer inviolate. The luminescence that Lane paints symbolizes nature's humbled state, for the light itself is as docile as the Luminist sea, and its tranquility in a sense signifies no more than good conditions on the highway to progress. Progress, probably even more than transcendence, is the secret message of Luminism. In a sense, Luminist pictures are an ideological justification of the atmosphere necessary for business, if also an exaggerated, idealistic rendering of that atmosphere.",
  "questions": [
    {
      "q": "The passage is primarily concerned with discussing",
      "o": [
        "the importance of religion to the art of a particular period",
        "the way one artist's work illustrates a tradition of painting",
        "the significance of the sea in one artist's work",
        "differences in the treatment of nature as a more active or a less active force"
      ],
      "a": 1,
      "e": "The passage supports option B: the way one artist's work illustrates a tradition of painting."
    },
    {
      "q": "The author argues that nature is portrayed in Lane's pictures as",
      "o": [
        "wild and unexplored",
        "idealized and distant",
        "continually changing",
        "subordinate to human concerns"
      ],
      "a": 3,
      "e": "The passage supports option D: subordinate to human concerns."
    },
    {
      "q": "The passage contains information to suggest that the author would most probably agree with which one of the following statements?",
      "o": [
        "The prevailing religious principles of a given time can be reflected in the art of that time.",
        "In order to interest viewers, works of art must depict familiar subjects in detail.",
        "Because commerce is unusual as a subject in art, the painter of commercial activity must travel and observe it widely.",
        "Knowing about the environment in which an artist lived can aid in an understanding of a work by that artist."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that knowing about the environment in which an artist lived can aid in an understanding of a work by that artist."
    },
    {
      "q": "According to the author, a supporter of the view of Luminism described in the first paragraph would most likely",
      "o": [
        "be unimpressed by the paintings glowing light",
        "consider Luminist scenes to be undomesticated and wild",
        "interpret the Luminist depiction of nature incorrectly",
        "see Luminist paintings as practical rather than mystical"
      ],
      "a": 2,
      "e": "The passage directly supports this: interpret the luminist depiction of nature incorrectly. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "According to the author, the sea is significant in Lane's paintings because of its association with",
      "o": [
        "exploration",
        "commerce",
        "canals",
        "idealism"
      ],
      "a": 1,
      "e": "The passage directly supports this: commerce. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author's primary purpose is to",
      "o": [
        "refute a new theory",
        "replace an inadequate analysis",
        "summarize current critics' attitudes",
        "support another critic's evaluation"
      ],
      "a": 1,
      "e": "Taken as a whole, the passage is organised around option B: replace an inadequate analysis."
    }
  ]
},
{
  "id": "recombinant-dna",
  "title": "The rDNA Breakthrough",
  "tier": "moderate",
  "words": 449,
  "text": "After thirty years of investigation into cell genetics, researchers made startling discoveries in the 1960s and early 1970s which culminated in the development of processes, collectively known as recombinant deoxyribonucleic acid (rDNA) technology, for the active manipulation of a cell's genetic code. The technology has created excitement and controversy because it involves altering DNA - which contains the building blocks of the genetic code.\nUsing rDNA technology, scientists can transfer a portion of the DNA from one organism to a single living cell of another. The scientist chemically \"snips\" the DNA chain of the host cell at a predetermined point and attaches another piece of DNA from a donor cell at that place, creating a completely new organism.\nProponents of rDNA research and development claim that it will allow scientists to find cures for disease and to better understand how genetic information controls an organism's development. They also see many other potentially practical benefits, especially in the pharmaceutical industry. Some corporations employing the new technology even claim that by the end of the century all major diseases will be treated with drugs derived from microorganisms created through rDNA technology. Pharmaceutical products already developed, but not yet marketed, indicate that these predictions may be realized.\nProponents also cite nonmedical applications for this technology. Energy production and waste disposal may benefit: genetically altered organisms could convert sewage and other organic material into methane fuel. Agriculture might also take advantage of rDNA technology to produce new varieties of crops that resist foul weather, pests, and the effects of poor soil.\nA major concern of the critics of rDNA research is that genetically altered microorganisms might escape from the laboratory. Because these microorganisms are laboratory creations that, in all probability, do not occur in nature, their interaction with the natural world cannot be predicted with certainty. It is possible that they could cause previously unknown, perhaps incurable diseases. The effect of genetically altered microorganisms on the world's microbiological predator-prey relationships is another potentially serious problem pointed out by the opponents of rDNA research. Introducing a new species may disrupt or even destroy the existing ecosystem. The collapse of interdependent relationships among species, extrapolated to its extreme, could eventually result in the destruction of humanity.\nOpponents of rDNA technology also cite ethical problems with it. For example, it gives scientists the power to instantly cross evolutionary and species boundaries that nature took millennia to establish. The implications of such power would become particularly profound if genetic engineers were to tinker with human genes, a practice that would bring us one step closer to Aldous Huxley's grim vision in Brave New World of a totalitarian society that engineers () human beings to fulfill specific roles.",
  "questions": [
    {
      "q": "In the passage, the author is primarily concerned with doing which one of the following?",
      "o": [
        "explaining the process and applications of rDNA technology",
        "advocating continued rDNA research and development",
        "providing evidence indicating the need for regulation of rDNA research and development",
        "summarizing the controversy surrounding rDNA research and development"
      ],
      "a": 3,
      "e": "The passage supports option D: summarizing the controversy surrounding rdna research and development."
    },
    {
      "q": "According to the passage, which one of the following is an accurate statement about research into the genetic code of cells?",
      "o": [
        "It led to the development of processes for the manipulation of DNA.",
        "It was initiated by the discovery of rDNA technology.",
        "It led to the use of new treatments for major diseases.",
        "It was universally heralded as a great benefit to humanity."
      ],
      "a": 0,
      "e": "The passage directly supports this: it led to the development of processes for the manipulation of dna. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The potential benefits of rDNA technology referred to in the passage include all of the following EXCEPT",
      "o": [
        "new methods of waste treatment",
        "new biological knowledge",
        "enhanced food production",
        "development of less expensive drugs"
      ],
      "a": 3,
      "e": "The passage supports option D: development of less expensive drugs."
    },
    {
      "q": "Which one of the following, if true, would most weaken an argument of opponents of rDNA technology?",
      "o": [
        "New safety procedures developed by rDNA researchers make it impossible for genetically altered microorganisms to escape from laboratories.",
        "A genetically altered microorganism accidentally released from a laboratory is successfully contained.",
        "A particular rDNA-engineered microorganism introduced into an ecosystem attracts predators that keep its population down.",
        "Genetically altered organisms designed to process sewage into methane cannot survive outside the waste treatment plant."
      ],
      "a": 0,
      "e": "This option most directly addresses the argument in question. It provides evidence or reasoning that bears on the claim being evaluated, while the other options are either irrelevant, supportive of the wrong conclusion, or do not address the specific argument."
    },
    {
      "q": "The author's reference in the last sentence of the passage to a society that engineers human beings to fulfill specific roles serves to",
      "o": [
        "emphasize the potential medical dangers of rDNA technology",
        "advocate research on the use of rDNA technology in human genetics",
        "warn of the possible disasters that could result from upsetting the balance of nature",
        "illustrate the sociopolitical ramifications of applying genetic engineering to humans"
      ],
      "a": 3,
      "e": "The passage supports option D: illustrate the sociopolitical ramifications of applying genetic engineering to humans."
    },
    {
      "q": "Which one of the following, if true, would most strengthen an argument of the opponents of rDNA technology?",
      "o": [
        "Agricultural products developed through rDNA technology are no more attractive to consumers than are traditional crops.",
        "Genetically altered microorganisms have no natural predators but can prey on a wide variety of other microorganisms.",
        "Drugs produced using rDNA technology cost more to manufacture than drugs produced with traditional technologies.",
        "Ecosystems are impermanent systems that are often liable to collapse, and occasionally do so."
      ],
      "a": 1,
      "e": "This option most directly addresses the argument in question. It provides evidence or reasoning that bears on the claim being evaluated, while the other options are either irrelevant, supportive of the wrong conclusion, or do not address the specific argument."
    }
  ]
},
{
  "id": "gray-marketing",
  "title": "Gray Marketing",
  "tier": "moderate",
  "words": 450,
  "text": "Gray marketing, the selling of trademarked products through channels of distribution not authorized by the trademark holder, can involve distribution of goods either within a market region or across market boundaries. Gray marketing within a market region (\"channel flow diversion\") occurs when manufacturer-authorized distributors sell trademarked goods to unauthorized distributors who then sell the goods to consumers within the same region. For example, quantity discounts from manufacturers may motivate authorized dealers to enter the gray market because they can purchase larger quantities of a product than they themselves intend to stock if they can sell the extra units through gray marketing channels.\nWhen gray marketing occurs across market boundaries, it is typically in an international setting and may be called \"parallel importing.\" Manufacturers often produce and sell products in more than one country and establish a network of authorized dealers in each country. Parallel importing occurs when trademarked goods intended for one country are diverted from proper channels (channel flow diversion) and then exported to unauthorized distributors in another country.\nTrademark owners justifiably argue against gray marketing practices since such practices clearly jeopardize the goodwill established by trademark owners: consumers who purchase trademarked goods in the gray market do not get the same \"extended product,\" which typically includes pre- and postsale service. Equally important, authorized distributors may cease to promote the product if it becomes available for much lower prices through unauthorized channels.\nCurrent debate over regulation of gray marketing focuses on three disparate theories in trademark law that have been variously and confusingly applied to parallel importation cases: universality, exhaustion, and territoriality. The theory of universality holds that a trademark is only an indication of the source or origin of the product. This theory does not recognize the goodwill functions of a trademark. When the courts apply this theory, gray marketing practices are allowed to continue because the origin of the product remains the same regardless of the specific route of the product through the channel of distribution. The exhaustion theory holds that a trademark owner relinquishes all rights once a product has been sold. When this theory is applied, gray marketing practices are allowed to continue because the trademark owners' rights cease as soon as their products are sold to a distributor. The theory of territoriality holds that a trademark is effective in the country in which it is registered. Under the theory of territoriality, trademark owners can stop gray marketing practices in the registering countries on products bearing their trademarks. Since only the territoriality theory affords trademark owners any real legal protection against gray marketing practices, I believe it is inevitable as well as desirable that it will come to be consistently applied in gray marketing cases.",
  "questions": [
    {
      "q": "Which one of the following best expresses the main point of the passage?",
      "o": [
        "Gray marketing is unfair to trademark owners and should be legally controlled.",
        "Gray marketing is practiced in many different forms and places, and legislators should recognize the futility of trying to regulate it.",
        "The mechanisms used to control gray marketing across markets are different from those most effective in controlling gray marketing within markets.",
        "The three trademark law theories that have been applied in gray marketing cases lead to different case outcomes."
      ],
      "a": 0,
      "e": "The passage supports option A: gray marketing is unfair to trademark owners and should be legally controlled."
    },
    {
      "q": "The function of the passage as a whole is to",
      "o": [
        "criticize the motives and methods of those who practice gray marketing",
        "evaluate the effects of both channel flow diversion and parallel importation",
        "discuss the methods that have been used to regulate gray marketing and evaluate such methods' degrees of success",
        "describe a controversial marketing practice and evaluate several legal views regarding it"
      ],
      "a": 3,
      "e": "The passage supports option D: describe a controversial marketing practice and evaluate several legal views regarding it."
    },
    {
      "q": "Which one of the following does the author offer as an argument against gray marketing?",
      "o": [
        "Manufacturers find it difficult to monitor the effectiveness of promotional efforts made on behalf of products that are gray marketed.",
        "Gray marketing can discourage product promotion by authorized distributors.",
        "Gray marketing forces manufacturers to accept the low profit margins that result from quantity discounting.",
        "Gray marketing discourages competition among unauthorized dealers."
      ],
      "a": 1,
      "e": "The passage supports option B: gray marketing can discourage product promotion by authorized distributors."
    },
    {
      "q": "The information in the passage suggests that proponents of the theory of territoriality would probably differ from proponents of the theory of exhaustion on which one of the following issues?",
      "o": [
        "the right of trademark owners to enforce, in countries in which the trademarks are registered, distribution agreements intended to restrict distribution to authorized channels",
        "the right of trademark owners to sell trademarked goods only to those distributors who agree to abide by distribution agreements",
        "the legality of channel flow diversion that occurs in a country other than the one in which a trademark is registered",
        "the significance consumers attach to a trademark"
      ],
      "a": 0,
      "e": "It can be inferred from the passage that the right of trademark owners to enforce, in countries in which the trademarks are registered, distribution agreements intended to restrict distribution to authorized channels."
    },
    {
      "q": "The author discusses the impact of gray marketing on goodwill in order to",
      "o": [
        "fault trademark owners for their unwillingness to offer a solution to a major consumer complaint against gray marketing",
        "indicate a way in which manufacturers sustain damage against which they ought to be protected",
        "highlight one way in which gray marketing across markets is more problematic than gray marketing within a market",
        "demonstrate that gray marketing does not always benefit the interests of unauthorized distributors"
      ],
      "a": 1,
      "e": "The passage supports option B: indicate a way in which manufacturers sustain damage against which they ought to be protected."
    },
    {
      "q": "The author's attitude toward the possibility that the courts will come to exercise consistent control over gray marketing practices can best be characterized as one of",
      "o": [
        "resigned tolerance",
        "utter dismay",
        "reasoned optimism",
        "unbridled fervor"
      ],
      "a": 2,
      "e": "The author's tone throughout the passage is best characterised as reflected in this answer. The language and rhetorical choices in the passage support this reading."
    }
  ]
},
{
  "id": "slave-narratives",
  "title": "Authorship and Slave Narratives",
  "tier": "hard",
  "words": 484,
  "text": "Any study of autobiographical narratives that appeared under the ostensible authorship of African American writers between 1760 and 1865 inevitably raises concerns about authenticity and interpretation. Should an autobiography whose written composition was literally out of the hands of its narrator be considered as the literary equivalent of those autobiographies that were authored independently by their subjects?\nIn many cases, the so-called edited narrative of an ex-slave ought to be treated as a ghostwritten account insofar as literary analysis is concerned, especially when it was composed by its editor from \"a statement of facts\" provided by an African American subject. Blassingame has taken pains to show that the editors of several of the more famous antebellum slave narratives were \"noted for their integrity\" and thus were unlikely to distort the facts given them by slave narrators. From a literary standpoint, however, it is not the moral integrity of these editors that is at issue (at issue 1: in a state of controversy: in disagreement 2 also in issue: under discussion or in dispute) but the linguistic, structural, and tonal integrity of the narratives they produces. Even if an editor faithfully reproduced the facts of a narrator's life, it was still the editor who decided what to make of these facts, how they should be emphasized, in what order they ought to be presented, and what was extraneous or germane. Readers of African American autobiography then and now have too readily accepted the presumption of these eighteenth- and nineteenth-century editors that experiential facts recounted orally could be recorded and sorted by an amanuensis-editor, taken out of their original contexts, and then published with editorial prefaces, footnotes, and appended commentary, all without compromising the validity of the narrative as a product of an African American consciousness.\nTranscribed narratives in which an editor explicitly delimits his or her role undoubtedly may be regarded as more authentic and reflective of the narrator's thought in action than those edited works that flesh (to clothe or cover with or as if with flesh; broadly: to give substance to usually used with out) out a statement of facts in ways unaccounted for. Still, it would be naïve to accord dictated oral narratives the same status as autobiographies composed and written by the subjects of the stories themselves. This point is illustrated by an analysis of Works Progress Administration interviews with ex-slaves in the 1930s that suggests that narrators often told interviewers what they seemed to want to hear. If it seemed impolitic for former slaves to tell all they knew and thought about the past to interviewers in the 1930s, the same could be said of escaped slaves on the run in the antebellum era. Dictated narratives, therefore, are literary texts whose authenticity is difficult to determine. Analysts should reserve close analytic readings for independently authored texts. Discussion of collaborative texts should take into account the conditions that governed their production.",
  "questions": [
    {
      "q": "Which one of the following best summarizes the main point of the passage?",
      "o": [
        "The personal integrity of an autobiography's editor has little relevance to its value as a literary work.",
        "Autobiographies dictated to editors are less valuable as literature than are autobiographies authored by their subjects.",
        "The facts that are recorded in an autobiography are less important than the personal impressions of its author.",
        "The circumstances under which an autobiography was written should affect the way it is interpreted as literature."
      ],
      "a": 3,
      "e": "The passage supports option D: the circumstances under which an autobiography was written should affect the way it is interpreted as literature."
    },
    {
      "q": "The information in the passage suggests that the role of the \"editor\" (lines 23-24) is most like that of",
      "o": [
        "an artist who wishes to invent a unique method of conveying the emotional impact of a scene in a painting",
        "a worker who must interpret the instructions of an employer",
        "a critic who must provide evidence to support opinions about a play being reviewed",
        "a historian who must decide how to direct the reenactment of a historical event"
      ],
      "a": 3,
      "e": "It can be inferred from the passage that a historian who must decide how to direct the reenactment of a historical event."
    },
    {
      "q": "Which one of the following best describes the author's opinion about applying literary analysis to edited autobiographies?",
      "o": [
        "The author is adamantly opposed to the application of literary analysis to edited autobiographies.",
        "The author is skeptical of the value of close analytical reading in the case of edited autobiographies.",
        "The author believes that literary analysis of the prefaces, footnotes, and commentaries that accompany edited autobiographies would be more useful than an analysis of the text of the autobiographies.",
        "The author believes that an exclusively literary analysis of edited autobiographies is more valuable than a reading that emphasizes their historical import."
      ],
      "a": 1,
      "e": "The passage supports option B: the author is skeptical of the value of close analytical reading in the case of edited autobiographies."
    },
    {
      "q": "The passage supports which one of the following statements about the readers of autobiographies of African Americans that were published between 1760 and 1865?",
      "o": [
        "They were more concerned with the personal details in the autobiographies than with their historical significance.",
        "They were unable to distinguish between ghostwritten and edited autobiographies.",
        "They were less naïve about the facts of slave life than are readers today.",
        "They presumed that the editing of the autobiographies did not affect their authenticity."
      ],
      "a": 3,
      "e": "The passage supports option D: they presumed that the editing of the autobiographies did not affect their authenticity."
    },
    {
      "q": "When one of the following words, as it is used in the passage, best serves to underscore the author's concerns about the authenticity of the autobiographies discussed?",
      "o": [
        "\"ostensible\" (line 2)",
        "\"integrity\" (line 18)",
        "\"extraneous\" (line 27)",
        "\"delimits\" (line 39)"
      ],
      "a": 0,
      "e": "The passage supports option A: \"ostensible\" (line 2)."
    },
    {
      "q": "According to the passage, close analytic reading of an autobiography is appropriate only when the",
      "o": [
        "autobiography has been dictated to an experienced amanuensis-editor",
        "autobiography attempts to reflect the narrator's thought in action",
        "autobiography was authored independently by its subject",
        "moral integrity of the autobiography's editor is well established"
      ],
      "a": 2,
      "e": "The passage directly supports this: autobiography was authored independently by its subject. This information is stated in the passage, making it the most accurate answer based on the text."
    }
  ]
},
{
  "id": "britains-real-wealth",
  "title": "Who Really Held Britain's Wealth",
  "tier": "moderate",
  "words": 452,
  "text": "A conventional view of nineteenth-century Britain holds that iron manufacturers and textile manufacturers from the north of England became the wealthiest and most powerful people in society after about 1832. According to Marxist historians, these industrialists were the target of the working class in its struggle for power. A new study by Rubinstein, however, suggests that the real wealth lay with the bankers and merchants of London. Rubinstein does not deny that a northern industrial elite existed but argues that it was consistently outnumbered and outdone by a London-based commercial elite. His claims are provocative and deserve consideration.\nRubinstein's claim about the location of wealth comes from his investigation of probate records. These indicate the value of personal property, excluding real property (buildings and land), left by individuals at death. It does seem as if large fortunes were more frequently made in commerce than in industry and, within industry, more frequently from alcohol or tobacco than from textiles or metal. However, such records do not unequivocally make Rubinstein's case. Uncertainties abound about how the probate rules for valuing assets were actually applied. Mills and factories, being real property, were clearly excluded: machinery may also have been, for the same reason. What the valuation conventions were for stock-in-trade (goods for sale) is also uncertain. It is possible that their probate values were much lower than their actual market value: cash or near-cash, such as bank balances or stocks, were, on the other hand, invariably considered at full face value. A further complication is that probate valuations probably took no notice of a business's goodwill (favor with the public) which, since it represents expectations about future profit-making, would today very often be a large fraction of market value. Whether factors like these introduced systematic biases into the probate valuations of individuals with different types of businesses would be worth investigating.\nThe orthodox view that the wealthiest individuals were the most powerful is also questioned by Rubinstein's study. The problem for this orthodox view is that Rubinstein finds many millionaires who are totally unknown to nineteenth-century historians: the reason for their obscurity could be that they were not powerful. Indeed, Rubinstein dismisses any notion that great wealth had anything to do with entry into the governing elite, as represented by bishops, higher civil servants, and chairmen of manufacturing companies. The only requirements were university attendance and a father with a middle-class income.\nRubinstein, in another study, has begun to buttress his findings about the location of wealth by analyzing income tax returns, which reveal a geographical distribution of middle-class incomes similar to that of wealthy incomes revealed by probate records. But until further confirmatory investigation is done, his claims can only be considered partially convincing.",
  "questions": [
    {
      "q": "The main idea of the passage is that",
      "o": [
        "the Marxist interpretation of the relationship between class and power in nineteenth-century Britain is no longer viable",
        "a simple equation between wealth and power is unlikely to be supported by new data from nineteenth-century British archives",
        "a recent historical investigation has challenged but not disproved the orthodox view of the distribution of wealth and the relationship of wealth to power in nineteenth-century Britain",
        "probate records provide the historian with a revealing but incomplete glimpse of the extent and location of wealth in nineteenth-century Britain"
      ],
      "a": 2,
      "e": "The passage supports option C: a recent historical investigation has challenged but not disproved the orthodox view of the distribution of wealth and the relationship of wealth to power in nineteenth-century britain."
    },
    {
      "q": "The author of the passage implies that probate records as a source of information about wealth in nineteenth-century Britain are",
      "o": [
        "self-contradictory and misleading",
        "ambiguous and outdated",
        "controversial but readily available",
        "revealing but difficult to interpret"
      ],
      "a": 3,
      "e": "The passage supports option D: revealing but difficult to interpret."
    },
    {
      "q": "The author suggests that the total probate valuations of the personal property of individuals holding goods for sale in nineteenth-century Britain may have been",
      "o": [
        "affected by the valuation conventions for such goods",
        "less accurate than the valuations for such goods provided by income tax returns",
        "less, on average, if such goods were tobacco-related than if they were alcohol-related",
        "greater, on average, than the total probate valuations of those individuals who held bank balances"
      ],
      "a": 0,
      "e": "It can be inferred from the passage that affected by the valuation conventions for such goods."
    },
    {
      "q": "According to the passage, Rubinstein has provided evidence that challenges which one of the following claims about nineteenth-century Britain?",
      "o": [
        "The distribution of great wealth between commerce and industry was not equal.",
        "Large incomes were typically made in alcohol and tobacco rather than in textiles and metal.",
        "A London-based commercial elite can be identified.",
        "There was a necessary relationship between great wealth and power."
      ],
      "a": 3,
      "e": "The passage directly supports this: there was a necessary relationship between great wealth and power. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author mentions that goodwill was probably excluded from the probate valuation of a business in nineteenth-century Britain most likely in order to",
      "o": [
        "give an example of a business asset about which little was known in the nineteenth century",
        "suggest that the probate valuations of certain businesses may have been significant underestimations of their true market value",
        "make the point that this exclusion probably had an equal impact on the probate valuations of all nineteenth-century British businesses",
        "indicate that expectations about future profit-making is the single most important factor in determining the market value of certain businesses"
      ],
      "a": 1,
      "e": "The passage supports option B: suggest that the probate valuations of certain businesses may have been significant underestimations of their true market value."
    },
    {
      "q": "Which one of the following studies would provide support for Rubinstein's claims?",
      "o": [
        "a study that indicated that many members of the commercial elite in nineteenth-century London had insignificant holdings of real property",
        "a study that indicated that in the nineteenth century, industrialists from the north of England were in fact a target for working-class people",
        "a study that indicated that, in nineteenth-century Britain, probate values of goods for sale were not as high as probate values of cash assets",
        "a study that indicated that the wealth of nineteenth-century British industrialists did not appear to be significantly greater when the full value of their real property holdings was actually considered"
      ],
      "a": 3,
      "e": "The passage supports option D: a study that indicated that the wealth of nineteenth-century british industrialists did not appear to be significantly greater when the full value of their real property holdings was actually considered."
    }
  ]
},
{
  "id": "video-art",
  "title": "Video Art and Technology",
  "tier": "hard",
  "words": 437,
  "text": "Many argue that recent developments in electronic technology such as computers and videotape have enabled artists to vary their forms of expression. For example, video art can now achieve images whose effect is produced by \"digitalization\": breaking up the picture using computerized information processing. Such new technologies create new ways of seeing and hearing by adding different dimensions to older forms, rather than replacing those forms. Consider Locale, a film about a modern dance company. The camera operator wore a SteadicamTM, an uncomplicated device that allows a camera to be mounted on a person so that the camera remains steady no matter how the operator moves. The SteadicamTM captures the dance in ways impossible with traditional mounts. Such new equipment also allows for the preservation of previously unrecordable aspects of performances, thus enriching archives.\nBy Contrast, others claim that technology subverts the artistic enterprise: that artistic efforts achieved with machines preempt human creativity, rather than being inspired by it. The originality of musical performance, for example, might suffer, as musicians would be deprived of the opportunity to spontaneously change pieces of music before live audiences. Some even worry that technology will eliminate live performance altogether; performances will be recorded for home viewing, abolishing the relationship between performer and audience. But these negative views assume both that technology poses an unprecedented challenge to the arts and that we are not committed enough to the artistic enterprise to preserve the live performance, assumptions that seem unnecessarily cynical. In fact, technology has traditionally assisted our capacity for creative expression and can refine our notions of any give art form.\nFor example, the portable camera and the snapshot were developed at the same time as the rise of impressionist painting in the nineteenth century. These photographic technologies encouraged a new appreciation. In addition, impressionist artists like Degas studied the elements of light and movement captured by instantaneous photography and used their new understanding of the way our perceptions distort reality to try to more accurately capture realty in their work. Since photos can capture the \"moments\" of a movement, such as a hand partially raised in a gesture of greeting, Impressionist artists were inspired to paint such moments in order to more effectively convey the quality of spontaneous human action. Photography freed artists from the preconception that a subject should be painted in a static, artificial entirety, and inspired them to capture the random and fragmentary qualities of our world. Finally, since photography preempted painting as the means of obtaining portraits, painters had more freedom to vary their subject matter, thus giving rise to the abstract creations characteristic of modern art.",
  "questions": [
    {
      "q": "Which one of the following statements best expresses the main idea of the passage?",
      "o": [
        "The progress of art relies primarily on technology.",
        "Technological innovation can be beneficial to art.",
        "There are risks associated with using technology to create art.",
        "Technology will transform the way the public responds to art."
      ],
      "a": 1,
      "e": "The passage supports option B: technological innovation can be beneficial to art."
    },
    {
      "q": "It can be inferred from the passage that the author shares which one of the following opinions with the opponents of the use of new technology in art?",
      "o": [
        "The live performance is an important aspect of the artistic enterprise.",
        "The public's commitment to the artistic enterprise is questionable.",
        "Recent technological innovations present an entirely new sort of challenge to art.",
        "Technological innovations of the past have been very useful to artists."
      ],
      "a": 0,
      "e": "It can be inferred from the passage that the live performance is an important aspect of the artistic enterprise."
    },
    {
      "q": "Which one of the following, if true, would most undermine the position held by opponents of the use of new technology in art concerning the effect of technology on live performance?",
      "o": [
        "Surveys show that when recordings of performances are made available for home viewing, the public becomes far more knowledgeable about different performing artists.",
        "Surveys show that some people feel comfortable responding spontaneously to artistic performances when they are viewing recordings of those performances at home.",
        "After a live performance, sales of recordings for home viewing of the particular performing artist generally increase.",
        "The distribution of recordings of artists' performances has begun to attract many new audience members to their live performances."
      ],
      "a": 3,
      "e": "The passage supports option D: the distribution of recordings of artists' performances has begun to attract many new audience members to their live performances."
    },
    {
      "q": "The author uses the example of the SteadicamTM primarily in order to suggest that",
      "o": [
        "the filming of performances should not be limited by inadequate equipment",
        "new technologies do not need to be very complex in order to benefit art",
        "the interaction of a traditional art form with a new technology will change attitudes toward technology in general",
        "new technology does not so much preempt as enhance a traditional art form"
      ],
      "a": 3,
      "e": "It can be inferred from the passage that new technology does not so much preempt as enhance a traditional art form."
    },
    {
      "q": "According to the passage, proponents of the use of new electronic technology in the arts claim that which one of the following is true?",
      "o": [
        "Most people who reject the use of electronic technology in art forget that machines require a person to operate them.",
        "Electronic technology allows for the expansion of archives because longer performances can be recorded.",
        "Electronic technology assists artists in finding new ways to present their material.",
        "Electronic technology makes the practice of any art form more efficient by speeding up the creative process."
      ],
      "a": 2,
      "e": "The passage directly supports this: electronic technology assists artists in finding new ways to present their material. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "It can be inferred from the passage that the author would agree with which one of the following statements regarding changes in painting since the nineteenth century?",
      "o": [
        "The artistic experiments of the nineteenth century led painters to use a variety of methods in creating portraits, which they then applied to other subject matter.",
        "The nineteenth-century knowledge of light and movement provided by photography inspired the abstract works characteristic of modern art.",
        "Once painters no longer felt that they had to paint conventional portraits, they turned exclusively to abstract portraiture.",
        "Once painters painted fewer conventional portraits, they had greater opportunity to move beyond the literal depiction of objects. During the 1940s and 1950s the United States government developed a new policy toward Native Americans, often known as \"readjustment.\" Because the increased awareness of civil rights in these decades helped reinforce the belief that life on reservations prevented Native Americans from exercising the rights guaranteed to citizens under the United States Constitution, the readjustment movement advocated the end of the federal government's involvement in Native American affairs and encouraged the assimilation of Native Americans as individuals into mainstream society. However, the same years also saw the emergence of a Native American leadership and efforts to develop tribal instructions and reaffirm tribal identity. The clash of these two trends may be traced in the attempts on the part of the Bureau of Indian Affairs (BIA) to convince the Oneida tribe of Wisconsin to accept readjustment. The culmination of BIA efforts to sway the Oneida occurred at a meeting that took place in the fall of 1956. The BIA suggested that it would be to the Oneida's benefit to own their own property and, like other homeowners, pay real estate taxes on it. The BIA also emphasized that, after readjustment, the government would not attempt to restrict Native Americans' ability to sell their individually owned lands. The Oneida were then offered a one-time lump-sum payment of $60,000 in lieu of (in lieu of: , ) the $0.52 annuity guaranteed in perpetuity to each member of the tribe under the Canandaigua Treaty. The efforts of the BIA to \"sell\" readjustment to the tribe failed because the Oneida realized that they had heard similar offers before. The Oneida delegates reacted negatively to the BIA's first suggestion because taxation of Native American lands had been one past vehicle for dispossessing the Oneida: after the distribution of some tribal lands to individual Native Americans in the late nineteenth century, Native American lands became subject to taxation, resulting in new and impossible financial burdens, foreclosures, and subsequent tax sales of property. The Oneida delegates were equally suspicious of the BIA's emphasis on the rights of individual landowners, since in the late nineteenth century many individual Native Americans had been convinced by unscrupulous speculators to sell their lands. Finally, the offer of a lump-sum payment was unanimously opposed by the Oneida delegates, who saw that changing the terms of a treaty might jeopardize the many pending land claims based upon the treaty. As a result of the 1956 meeting, the Oneida rejected readjustment. Instead, they determined to improve tribal life by lobbying for federal monies for postsecondary education, for the improvement of drainage on tribal lands, and for the building of a convalescent home for tribal members. Thus, by learning the lessons of history, the Oneida were able to survive as a tribe in their homeland."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that once painters painted fewer conventional portraits, they had greater opportunity to move beyond the literal depiction of objects. during the 1940s and 1950s the united states government developed a new policy toward native americans, often known as \"readjustment.\" because the increased awareness of civil rights in these decades helped reinforce the belief that life on reservations prevented native americans from exercising the rights guaranteed to citizens under the united states constitution, the readjustment movement advocated the end of the federal government's involvement in native american affairs and encouraged the assimilation of native americans as individuals into mainstream society. however, the same years also saw the emergence of a native american leadership and efforts to develop tribal instructions and reaffirm tribal identity. the clash of these two trends may be traced in the attempts on the part of the bureau of indian affairs (bia) to convince the oneida tribe of wisconsin to accept readjustment. the culmination of bia efforts to sway the oneida occurred at a meeting that took place in the fall of 1956. the bia suggested that it would be to the oneida's benefit to own their own property and, like other homeowners, pay real estate taxes on it. the bia also emphasized that, after readjustment, the government would not attempt to restrict native americans' ability to sell their individually owned lands. the oneida were then offered a one-time lump-sum payment of $60,000 in lieu of (in lieu of: , ) the $0.52 annuity guaranteed in perpetuity to each member of the tribe under the canandaigua treaty. the efforts of the bia to \"sell\" readjustment to the tribe failed because the oneida realized that they had heard similar offers before. the oneida delegates reacted negatively to the bia's first suggestion because taxation of native american lands had been one past vehicle for dispossessing the oneida: after the distribution of some tribal lands to individual native americans in the late nineteenth century, native american lands became subject to taxation, resulting in new and impossible financial burdens, foreclosures, and subsequent tax sales of property. the oneida delegates were equally suspicious of the bia's emphasis on the rights of individual landowners, since in the late nineteenth century many individual native americans had been convinced by unscrupulous speculators to sell their lands. finally, the offer of a lump-sum payment was unanimously opposed by the oneida delegates, who saw that changing the terms of a treaty might jeopardize the many pending land claims based upon the treaty. as a result of the 1956 meeting, the oneida rejected readjustment. instead, they determined to improve tribal life by lobbying for federal monies for postsecondary education, for the improvement of drainage on tribal lands, and for the building of a convalescent home for tribal members. thus, by learning the lessons of history, the oneida were able to survive as a tribe in their homeland."
    }
  ]
},
{
  "id": "termination-policy",
  "title": "The Termination Policy",
  "tier": "moderate",
  "words": 454,
  "text": "During the 1940s and 1950s the United States government developed a new policy toward Native Americans, often known as \"readjustment.\" Because the increased awareness of civil rights in these decades helped reinforce the belief that life on reservations prevented Native Americans from exercising the rights guaranteed to citizens under the United States Constitution, the readjustment movement advocated the end of the federal government's involvement in Native American affairs and encouraged the assimilation of Native Americans as individuals into mainstream society. However, the same years also saw the emergence of a Native American leadership and efforts to develop tribal instructions and reaffirm tribal identity. The clash of these two trends may be traced in the attempts on the part of the Bureau of Indian Affairs (BIA) to convince the Oneida tribe of Wisconsin to accept readjustment.\nThe culmination of BIA efforts to sway the Oneida occurred at a meeting that took place in the fall of 1956. The BIA suggested that it would be to the Oneida's benefit to own their own property and, like other homeowners, pay real estate taxes on it. The BIA also emphasized that, after readjustment, the government would not attempt to restrict Native Americans' ability to sell their individually owned lands. The Oneida were then offered a one-time lump-sum payment of $60,000 in lieu of the $0.52 annuity guaranteed in perpetuity to each member of the tribe under the Canandaigua Treaty.\nThe efforts of the BIA to \"sell\" readjustment to the tribe failed because the Oneida realized that they had heard similar offers before. The Oneida delegates reacted negatively to the BIA's first suggestion because taxation of Native American lands had been one past vehicle for dispossessing the Oneida: after the distribution of some tribal lands to individual Native Americans in the late nineteenth century, Native American lands became subject to taxation, resulting in new and impossible financial burdens, foreclosures, and subsequent tax sales of property. The Oneida delegates were equally suspicious of the BIA's emphasis on the rights of individual landowners, since in the late nineteenth century many individual Native Americans had been convinced by unscrupulous speculators to sell their lands. Finally, the offer of a lump-sum payment was unanimously opposed by the Oneida delegates, who saw that changing the terms of a treaty might jeopardize the many pending land claims based upon the treaty.\nAs a result of the 1956 meeting, the Oneida rejected readjustment. Instead, they determined to improve tribal life by lobbying for federal monies for postsecondary education, for the improvement of drainage on tribal lands, and for the building of a convalescent home for tribal members. Thus, by learning the lessons of history, the Oneida were able to survive as a tribe in their homeland.",
  "questions": [
    {
      "q": "Which one of the following would be most consistent with the policy of readjustment described in the passage?",
      "o": [
        "the establishment among Native Americans of a tribal system of a elected government",
        "the creation of a national project to preserve Native American language and oral history",
        "the establishment of programs to encourage Native Americans to move from reservations to urban areas",
        "the development of a large-scale effort to restore Native American lands to their original tribes"
      ],
      "a": 2,
      "e": "The passage supports option C: the establishment of programs to encourage native americans to move from reservations to urban areas."
    },
    {
      "q": "According to the passage, after the 1956 meeting the Oneida resolved to",
      "o": [
        "obtain improved social services and living conditions for members of the tribe",
        "pursue litigation designed to reclaim tribal lands",
        "secure recognition of their unique status as a self-governing Native American nation within the United States",
        "establish new kinds of tribal institutions"
      ],
      "a": 0,
      "e": "The passage directly supports this: obtain improved social services and living conditions for members of the tribe. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "Which one of the following best describes the function of the first paragraph in the context of the passage as a whole?",
      "o": [
        "It summarizes the basis of a conflict underlying negotiations described elsewhere in the passage.",
        "It presents two positions, one of which is defended by evidence provided in succeeding paragraphs.",
        "It compares competing interpretations of a historical conflict.",
        "It analyzes the causes of a specific historical event and predicts a future development."
      ],
      "a": 0,
      "e": "The passage supports option A: it summarizes the basis of a conflict underlying negotiations described elsewhere in the passage."
    },
    {
      "q": "The author refers to the increased awareness of civil rights during the 1940s and 1950s most probably in order to",
      "o": [
        "contrast the readjustment movement with other social phenomena",
        "account for the stance of the Native American leadership",
        "help explain the impetus for the readjustment movement",
        "explain the motives of BIA bureaucrats"
      ],
      "a": 2,
      "e": "The passage supports option C: help explain the impetus for the readjustment movement."
    },
    {
      "q": "The passage suggests that advocates of readjustment would most likely agree with which one of the following statements regarding the relationship between the federal government and Native Americans?",
      "o": [
        "The federal government should work with individual Native Americans to improve life on reservations.",
        "The federal government should be no more involved in the affaires of Native Americans than in the affairs of other citizens.",
        "The federal government should assume more responsibility for providing social services to Native Americans.",
        "The federal government should share its responsibility for maintaining Native American territories with tribal leaders."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that the federal government should be no more involved in the affaires of native americans than in the affairs of other citizens."
    },
    {
      "q": "The passage suggests that the Oneida delegates viewed the Canandaigua Treaty as",
      "o": [
        "a valuable safeguard of certain Oneida rights and privileges",
        "the source of many past problems for the Oneida tribe",
        "a model for the type of agreement they hoped to reach with the federal government",
        "an important step toward recognition of their status as an independent Native American nation"
      ],
      "a": 0,
      "e": "It can be inferred from the passage that a valuable safeguard of certain oneida rights and privileges."
    }
  ]
},
{
  "id": "coming-of-literacy",
  "title": "The Coming of Literacy",
  "tier": "hard",
  "words": 459,
  "text": "Direct observation of contemporary societies at the threshold of widespread literacy has not assisted our understanding of how such literacy altered ancient Greek society, in particular its political culture. The discovery of what Goody has called the \"enabling effects\" of literacy in contemporary societies tends to seduce the observer into confusing often rudimentary knowledge of how to read with popular access to important books and documents: this confusion is then projected onto ancient societies. \"In ancient Greece,\" Goody writes, \"alphabetic reading and writing was important for the development of political democracy.\"\nAn examination of the ancient Greek city Athens exemplifies how this sort of confusion is detrimental to understanding ancient politics. In Athens, the early development of a written law code was retrospectively mythologized as the critical factor in breaking the power monopoly of the old aristocracy: hence the Greek tradition of the \"law-giver,\" which has captured the imaginations of scholars like Goody. But the application and efficacy of all law codes depend on their interpretation by magistrates and courts, and unless the right of interpretation is \"democratized,\" the mere existence of written laws changes little.\nIn fact, never in antiquity did any but the elite consult documents and books. Even in Greek courts the juries heard only the relevant statutes read out during the proceedings, as they heard verbal testimony, and they then rendered their verdict on the spot, without the benefit of any discussion among themselves. True, in Athens the juries were representative of a broad spectrum of the population, and these juries, drawn from diverse social classes, both interpreted what they had heard and determined matters of fact. However, they guided solely by the speeches prepared for the parties by professional pleaders and by the quotations of laws or decrees within the speeches, rather than by their own access to any kind of document or book.\nGranted, people today also rely heavily on a truly knowledgeable minority for information and its interpretation, often transmitted orally. Yet this is still fundamentally different from an ancient society in which there was no \"popular literature,\" i.e., no newspapers, magazines, or other media that dealt with sociopolitical issues. An ancient law code would have been analogous to the Latin Bible, a venerated document but a closed book. The resistance of the medieval Church to vernacular translations of the Bible, in the West at least, is therefore a pointer to the realities of ancient literacy. When fundamental documents are accessible for study only to an elite, the rest of the society is subject to the elite's interpretation of the rules of behavior, including right political behavior. Athens, insofar as it functioned as a democracy, did so not because of widespread literacy, but because the elite had chosen to accept democratic institutions.",
  "questions": [
    {
      "q": "Which one of the following statements best expresses the main idea of the passage?",
      "o": [
        "Democratic political institutions grow organically from the traditions and conventions of a society.",
        "Democratic political institutions are not necessarily the outcome of literacy in a society.",
        "Religious authority, like political authority, can determine who in a given society will have access to important books and documents.",
        "Those who are best educated are most often those who control the institutions of authority in a society."
      ],
      "a": 1,
      "e": "The passage supports option B: democratic political institutions are not necessarily the outcome of literacy in a society."
    },
    {
      "q": "It can be inferred from the passage that the author assumes which one of the following about societies in which the people possess a rudimentary reading ability?",
      "o": [
        "They are more politically advanced than societies without rudimentary reading ability.",
        "They are unlikely to exhibit the positive effects of literacy.",
        "They are rapidly evolving toward widespread literacy.",
        "Many of their people might not have access to important documents and books."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that many of their people might not have access to important documents and books."
    },
    {
      "q": "The author refers to the truly knowledgeable minority in contemporary societies in the context of the fourth paragraph in order to imply which one of the following?",
      "o": [
        "Because they have a popular literature that closes the gap between the elite and the majority, contemporary societies rely far less on the knowledge of experts than did ancient societies.",
        "Contemporary societies rely on the knowledge of experts, as did ancient societies, because contemporary popular literature so frequently conveys specious information.",
        "Although contemporary societies rely heavily on the knowledge of experts, access to popular literature makes contemporary societies less dependent on experts for information about rules of behavior than were ancient societies.",
        "While only some members of the elite can become experts, popular literature gives the majority in contemporary society an opportunity to become members of such an elite."
      ],
      "a": 2,
      "e": "The passage supports option C: although contemporary societies rely heavily on the knowledge of experts, access to popular literature makes contemporary societies less dependent on experts for information about rules of behavior than were ancient societies."
    },
    {
      "q": "According to the passage, each of the following statements concerning ancient Greek juries is true EXCEPT:",
      "o": [
        "They were somewhat democratic insofar as they were composed largely of people from the lowest social classes.",
        "They were exposed to the law only insofar as they heard relevant statutes read out during legal proceedings.",
        "They ascertained the facts of a case and interpreted the laws.",
        "They did not have direct access to important books and documents that were available to the elite."
      ],
      "a": 0,
      "e": "The passage directly supports this: they were somewhat democratic insofar as they were composed largely of people from the lowest social classes. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author characterizes the Greek tradition of the \"law-giver\" (line 21) as an effect mythologizing most probably in order to",
      "o": [
        "illustrate the ancient Greek tendency to memorialize historical events by transforming them into myths",
        "convey the historical importance of the development of the early Athenian written law code",
        "convey the high regard in which the Athenians held their legal tradition",
        "suggest that the development of a written law code was not primarily responsible for diminishing the power of the Athenian aristocracy"
      ],
      "a": 3,
      "e": "The passage supports option D: suggest that the development of a written law code was not primarily responsible for diminishing the power of the athenian aristocracy."
    },
    {
      "q": "The author draws an analogy between the Latin Bible and an early law code (lines 49-51) in order to make which one of the following points?",
      "o": [
        "Documents were considered authoritative in premodern society in proportion to their inaccessibility to the majority.",
        "Documents that were perceived as highly influential in premodern societies were not necessarily accessible to the society's majority.",
        "What is most revered in a nondemocratic society is what is most frequently misunderstood.",
        "Political documents in premodern societies exerted a social influence similar to that exerted by religious documents."
      ],
      "a": 1,
      "e": "The passage supports option B: documents that were perceived as highly influential in premodern societies were not necessarily accessible to the society's majority."
    }
  ]
},
{
  "id": "colonial-english-identity",
  "title": "Colonial English Identity",
  "tier": "hard",
  "words": 446,
  "text": "The English who in the seventeenth and eighteenth centuries inhabited those colonies that would later become the United States shared a common political vocabulary with the English in England. Steeped as they were in the English political language, these colonials failed to observe that their experience in America had given the words a significance quite different from that accepted by the English with whom they debated; in fact, they claimed that they were more loyal to the English political tradition than were the English in England.\nIn many respects the political institutions of England were reproduced in these American colonies. By the middle of eighteenth century, all of these colonies except four were headed by Royal Governors appointed by the King and perceived as bearing a relation to the people of the colony similar to that of the King to the English people. Moreover, each of these colonies enjoyed a representative assembly, which was consciously modeled, in powers and practices, after the English Parliament. In both England and these colonies, only property holders could vote.\nNevertheless, though English and colonial institutions were structurally similar, attitudes toward those institutions differed. For example, English legal development from the early seventeenth century had been moving steadily toward the absolute power of Parliament. The most unmistakable sign of this tendency was the legal assertion that the King was subject to the law. Together with this resolute denial of the absolute right of kings went the assertion that Parliament was unlimited in its power: it could change even the Constitution by its ordinary acts of legislation. By the eighteenth century the English had accepted the idea that the parliamentary representatives of the people were omnipotent.\nThe citizens of these colonies did not look upon the English Parliament with such fond eyes, nor did they concede that their own assemblies possessed such wide powers. There were good historical reasons for this. To the English the word \"constitution\" meant the whole body of law and legal custom formulated since the beginning of the kingdom, whereas to these colonials a constitution was a specific written document, enumerating specific powers. This distinction in meaning can be traced to the fact that the foundations of government in the various colonies were written charters granted by the Crown. These express () authorizations to govern were tangible, definite things. Over the years these colonial had often repaired to the charters to justify themselves in the struggle against tyrannical governors or officials of the Crown. More than a century of government under written constitutions convinced these colonists of the necessity for and efficacy of protecting their liberties against governmental encroachment by explicitly defining all governmental powers in a document.",
  "questions": [
    {
      "q": "Which one of the following best expresses the main idea of the passage?",
      "o": [
        "The colonials and the English mistakenly thought that they shared a common political vocabulary.",
        "The colonials and the English shared a variety of institutions.",
        "The colonials and the English had conflicting interpretations of the language and institutional structures that they shared.",
        "Colonial attitudes toward English institutions grew increasingly hostile in the eighteenth century."
      ],
      "a": 2,
      "e": "The passage supports option C: the colonials and the english had conflicting interpretations of the language and institutional structures that they shared."
    },
    {
      "q": "The passage supports all of the following statements about the political conditions present by the middle of the eighteenth century in the American colonies discussed in the passage EXCEPT:",
      "o": [
        "Colonials who did not own property could not vote.",
        "All of these colonies had representative assemblies modeled after the British Parliament.",
        "Some of these colonies had Royal Governors.",
        "Royal Governors could be removed from office by colonial assemblies."
      ],
      "a": 3,
      "e": "The passage supports option D: royal governors could be removed from office by colonial assemblies."
    },
    {
      "q": "The passage implies which one of the following about English kings prior to the early seventeenth century?",
      "o": [
        "They were the source of all law.",
        "They frequently flouted laws made by Parliament.",
        "Their power relative to that of Parliament was considerably greater than it was in the eighteenth century.",
        "They were more often the sources of legal reform than they were in the eighteenth century."
      ],
      "a": 2,
      "e": "The passage supports option C: their power relative to that of parliament was considerably greater than it was in the eighteenth century."
    },
    {
      "q": "The author mentions which one of the following as evidence for the eighteenth-century English attitude toward Parliament?",
      "o": [
        "The English had become uncomfortable with institutions that could claim absolute authority.",
        "The English realized that their interests were better guarded by Parliament than by the King.",
        "The English allowed Parliament to make constitutional changes by legislative enactment.",
        "The English felt that the King did not possess the knowledge that could enable him to rule responsibly."
      ],
      "a": 2,
      "e": "The author's tone throughout the passage is best characterised as reflected in this answer. The language and rhetorical choices in the passage support this reading."
    },
    {
      "q": "The passage implies that the colonials discussed in the passage would have considered which one of the following to be a source of their debates with England?",
      "o": [
        "their changed use of the English political vocabulary",
        "English commitment to parliamentary representation",
        "their uniquely English experience",
        "their greater loyalty to the English political traditions"
      ],
      "a": 3,
      "e": "The passage supports option D: their greater loyalty to the english political traditions."
    },
    {
      "q": "According to the passage, the English attitude toward the English Constitution differed from the colonial attitude toward constitutions in that the English regarded their Constitution as",
      "o": [
        "the legal foundation of the kingdom",
        "a document containing a collection of customs",
        "a cumulative corpus of legislation and legal traditions",
        "a record alterable by royal authority"
      ],
      "a": 2,
      "e": "The passage directly supports this: a cumulative corpus of legislation and legal traditions. This information is stated in the passage, making it the most accurate answer based on the text."
    }
  ]
},
{
  "id": "offshore-platforms",
  "title": "Offshore Platforms",
  "tier": "moderate",
  "words": 445,
  "text": "Oil companies needs offshore platforms primarily because the oil or natural gas the companies extract from the ocean floor has to be processed before pumps can be used to move the substances ashore. But because processing crude (unprocessed oil or gas) on a platform rather than at facilities onshore exposes workers to the risks of explosion and to an unpredictable environment, researchers are attempting to diminish the need for human labor on platforms and even to eliminate platforms altogether by redesigning two kinds of pumps to handle crude. These pumps could then be used to boost the natural pressure driving the flow of crude, which, by itself, is sufficient only to bring the crude to the platform, located just above the wellhead. Currently, pumps that could boost this natural pressure sufficiently to drive the crude through a pipeline to the shore do not work consistently because of the crude's content. Crude may consist of oil or natural gas in multiphase states - combinations of liquids, gases, and solids under pressure - that do not reach the wellhead in constant proportions. The flow of crude oil, for example, can change quickly from 60 percent liquid to 70 percent gas. This surge in gas content causes loss of \"head\", or pressure inside a pump, with the result that a pump can no longer impart enough energy to transport the crude mixture through the pipeline and to the shore.\nOf two pumps being redesigned, the positive-displacement pump is promising because it is immune to sudden shifts in the proportion of liquid to gas in the crude mixture. But the pump's design, which consists of a single or twin screw pushing the fluid from one end of the pump to the other, brings crude into close contact with most parts of the pump, and thus requires that it be made of expensive, corrosion-resistant material. The alternative is the centrifugal pump, which has a rotating impeller that sucks fluid in at one end and forces fluid out at the other. Although this pump has a proven design and has worked for years with little maintenance in waste-disposal plants, researchers have discovered that because the swirl of its impeller separates gas out from the oil that normally accompanies it, significant reductions in head can occur as it operates.\nResearch in the development of these pumps is focused mainly on trying to reduce the cost of the positive-displacement pump and attempting to make the centrifugal pump more tolerant of gas. Other researchers are looking at ways of adapting either kind of pump for use underwater, so that crude could be moved directly from the sea bottom to processing facilities onshore, eliminating platforms.",
  "questions": [
    {
      "q": "Which one of following best expresses the main idea of the passage?",
      "o": [
        "Oil companies are experimenting with technologies that may help diminish the danger to workers from offshore crude processing.",
        "Oil companies are seeking methods of installing processing facilities underwater.",
        "Researchers are developing several new pumps designed to enhance human labor efficiency in processing facilities.",
        "Researchers are seeking to develop equipment that would preempt (to replace with something considered to be of greater value or priority: take precedence over) the need for processing facilities onshore."
      ],
      "a": 0,
      "e": "The passage supports option A: oil companies are experimenting with technologies that may help diminish the danger to workers from offshore crude processing."
    },
    {
      "q": "The passage supports which one of the following statements about the natural pressure driving the flow of crude?",
      "o": [
        "It is higher than that created by the centrifugal pump.",
        "It is constant regardless of relative proportions of gas and liquid.",
        "It is able to carry the crude only as far as the wellhead.",
        "It is able to carry the crude to the platform."
      ],
      "a": 3,
      "e": "The passage supports option D: it is able to carry the crude to the platform."
    },
    {
      "q": "Which one of the following best describes the relationship of the second paragraph to the passage as a whole?",
      "o": [
        "It offers concrete detail designed to show that the argument made in the first paragraph is flawed.",
        "It provides detail that expands upon the information presented in the first paragraph.",
        "It enhances the author's discussion by objectively presenting in detail the pros and cons of a claim made in the first paragraph.",
        "It detracts from the author's discussion by presenting various problems that qualify the goals presented."
      ],
      "a": 1,
      "e": "The passage supports option B: it provides detail that expands upon the information presented in the first paragraph."
    },
    {
      "q": "Which one of the following phrases, if substituted for the word \"head\" in line 47, would LEAST change the meaning of the sentence?",
      "o": [
        "the flow of the crude inside the pump",
        "the volume of oil inside the pump",
        "the volume of gas inside the pump",
        "the pressure inside of the pump"
      ],
      "a": 3,
      "e": "The passage supports option D: the pressure inside of the pump."
    },
    {
      "q": "With which one of the following statements regarding offshore platforms would the author most likely agree?",
      "o": [
        "If a reduction of human labor on offshore platform is achieved, there is no real need to eliminate platforms altogether.",
        "Reducing human labor on offshore platforms is desirable because researchers' knowledge about the transportation of crude is dangerously incomplete.",
        "The dangers involved in working on offshore platforms make their elimination a desirable goal.",
        "The positive-displacement pump is the better alternative for researchers, because it would allow them to eliminate platforms altogether."
      ],
      "a": 2,
      "e": "Option C best fits the arguments presented: The dangers involved in working on offshore platforms make their elimination a desirable goal."
    },
    {
      "q": "Which one of the following can be inferred from the passage about pumps that are currently available to boost the natural pressure of crude?",
      "o": [
        "The efficiency of these pumps depends on there being no gas in the flow of crude.",
        "These pumps are more efficient when the crude is less subject to sudden increases in the proportion of gas to liquid.",
        "A sudden change from solid to liquid in the flow of crude increases the efficiency of these pumps.",
        "The proportion of liquid to gas in the flow of crude does not affect the efficiency of these pumps."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that these pumps are more efficient when the crude is less subject to sudden increases in the proportion of gas to liquid."
    }
  ]
},
{
  "id": "venetian-narrative-painting",
  "title": "Venetian Narrative Painting",
  "tier": "hard",
  "words": 462,
  "text": "To critics accustomed to the style of fifteenth-century narrative paintings by Italian artists from Tuscany, the Venetian examples of narrative paintings with religious subjects that Patricia Fortini Brown analyzes in a recent book will come as a great surprise. While the Tuscan paintings present large-scale figures, clear narratives, and simple settings, the Venetians filled their pictures with dozens of small figures and elaborate building, in addition to a wealth of carefully observed anecdotal detail often irrelevant to the paintings' principal subjects - the religious stories they narrate. Although it occasionally obscured these stories, this accumulation of circumstantial detail from Venetian life - the inclusion of prominent Venetian citizens, for example - was considered appropriate to the narration of historical subjects and underlined the authenticity of the historical events depicted. Indeed, Brown argues that the distinctive style of the Venetian paintings - what she calls the \"eyewitness style\" - was influenced by Venetian affinity for a strongly parochial type of historical writing, consisting almost exclusively of vernacular chronicles of local events embroidered with all kinds of inconsequential detail.\nAnd yet, while Venetian attitudes toward history that are reflected in their art account in part for the difference in style between Venetian and Tuscan narrative paintings, Brown has overlooked some practical influences, such as climate. Tuscan churches are filled with frescoes that, in contrast to Venetian narrative paintings, consist mainly of large figures and easily recognized religious stories, as one would expect of paintings that are normally viewed from a distance and are designed primarily to remind the faithful of their religious tenets. In Venice, where the damp climate is unsuited to fresco, narrative frescoes in churches were almost nonexistent, with the result that Venetian artists and their public had no practical experience of the large-scale representation of familiar religious stories. Their model for painted stories was the cycle () of secular historical paintings in the Venetian magistrate's palace, which were indeed the counterpart of written history and were made all the more authoritative by a proliferation of circumstantial detail.\nMoreover, because painting frescoes requires an unusually sure hand, particularly in the representation of human form, the development of drawing skill was central to artistic training in Tuscany, and by 1500 the public there tended to distinguish artists on the basis of how well they could draw human figures. In Venice, a city virtually without frescoes, this kind of skill was acquired and appreciated much later. Gentile Bellini, for example, although regarded as one of the supreme painters of the day, was feeble at drawing. On the other hand, the emphasis on architecture so evident in the Venetian narrative paintings was something that local painters obviously prized, largely because painting architecture in perspective was seen as a particular test of the Venetian painter's skill.",
  "questions": [
    {
      "q": "Which one of the following best states the main idea of the passage?",
      "o": [
        "Tuscan painters' use of fresco explains the prominence of human figures in the narrative paintings that they produced during the fifteenth century.",
        "In addition to fifteenth-century Venetian attitudes toward history, other factors may help to explain the characteristic features of Venetian narrative paintings with religious subjects produced during that period.",
        "The inclusion of authentic detail from Venetian life distinguished fifteenth-century Venetian narrative paintings from those that were produced in Tuscany.",
        "Venetian painters were generally more skilled at painting buildings than Tuscan painters were at drawing human forms."
      ],
      "a": 1,
      "e": "The passage supports option B: in addition to fifteenth-century venetian attitudes toward history, other factors may help to explain the characteristic features of venetian narrative paintings with religious subjects produced during that period."
    },
    {
      "q": "In the passage, the author is primarily concerned with",
      "o": [
        "Pointing out the superiority of one painting style over another.",
        "Citing evidence that requires a reevaluation of a conventionally held view.",
        "Discussing factors that explain a difference in painting styles.",
        "Outlining the strengths and weaknesses of two opposing views regarding the evolution of a painting style."
      ],
      "a": 2,
      "e": "The passage supports option C: discussing factors that explain a difference in painting styles."
    },
    {
      "q": "As it is described in the passage, Brown's explanation of the use of the eyewitness style in Venetian narrative painting suggests that",
      "o": [
        "The painting of architecture in perspective requires greater drawing skill than does the representation of a human form in a fresco.",
        "Certain characteristics of a style of painting can reflect a style of historical writing that was common during the same period.",
        "The eyewitness style in Venetian narrative paintings with religious subjects was largely the result of the influence of Tuscan artists who worked primarily in fresco.",
        "The historical detail in Venetian narrative paintings with religious subjects can be traced primarily to the influence of the paintings in the Venetian magistrate's palace."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that certain characteristics of a style of painting can reflect a style of historical writing that was common during the same period."
    },
    {
      "q": "The author suggests that fifteenth-century Venetian narrative paintings with religious subjects were painted by artists who",
      "o": [
        "were able to draw human figures with more skill after they were apprenticed to painters in Tuscany",
        "assumed that their paintings would typically be viewed from a distance",
        "were a major influence on the artists who produced the cycle of historical paintings in the Venetian magistrate's palace",
        "were better at painting architecture in perspective than they were at drawing human figures"
      ],
      "a": 3,
      "e": "It can be inferred from the passage that were better at painting architecture in perspective than they were at drawing human figures."
    },
    {
      "q": "The author implies that Venetian narrative paintings with religious subjects included the representation of elaborate buildings in part because",
      "o": [
        "the ability to paint architecture in perspective was seen in Venice as proof of a painter's skill",
        "the subjects of such paintings were often religious stories",
        "large frescoes were especially conducive to representing architecture in perspective",
        "the architecture of Venice in the fifteenth century was more elaborate than was the architecture of Tuscany"
      ],
      "a": 0,
      "e": "The passage supports option A: the ability to paint architecture in perspective was seen in venice as proof of a painter's skill."
    },
    {
      "q": "Which one of the following, if true, would most weaken the author's contention that fifteenth-century Venetian artists \"had no practical experience of the large-scale representation of familiar religious stories\" (line 40-42)?",
      "o": [
        "The style of secular historical paintings in the palace of the Venetian magistrate was similar to that of Venetian narrative paintings with religious subjects.",
        "The style of the historical writing produced by fifteenth-century Venetian authors was similar in its inclusion of anecdotal details to secular paintings produced during that century in Tuscany.",
        "Many of the artists who produced Venetian narrative paintings with religious subjects served as apprentices in Tuscany, where they had become familiar with the technique of painting of frescoes.",
        "Few of the frescoes painted in Tuscany during the fifteenth century had secular subjects, and those that did often betrayed the artist's inability to represent elaborate architecture in perspective."
      ],
      "a": 2,
      "e": "This option most directly addresses the argument in question. It provides evidence or reasoning that bears on the claim being evaluated, while the other options are either irrelevant, supportive of the wrong conclusion, or do not address the specific argument."
    }
  ]
},
{
  "id": "when-rules-run-out",
  "title": "When Legal Rules Run Out",
  "tier": "hard",
  "words": 434,
  "text": "Currently, legal scholars agree that in some cases legal rules do not specify a definite outcome. These scholars believe that such indeterminacy results from the vagueness of language: the boundaries of the application of a term are often unclear. Nevertheless, they maintain that the system of legal rules by and large rests on clear core meanings that do determine definite outcomes for most cases. Contrary to this view, an earlier group of legal philosophers, called \"realists,\" argued that indeterminacy pervades every part of the law.\nThe realists held that there is always a cluster of rules relevant to the decision in any litigated case. For example, deciding whether an aunt's promise to pay her niece a sum of money if she refrained from smoking is enforceable would involve a number of rules regarding such issues as offer, acceptance, and revocation. Linguistic vagueness in any one of these rules would affect the outcome of the case, making possible multiple points of indeterminacy, not just one or two, in any legal case.\nFor the realists, an even more damaging kind of indeterminacy stems from the fact that in a common-law system based on precedent, a judge's decision is held to be binding on judges in subsequent similar cases. Judicial decisions are expressed in written opinions, commonly held to consist of two parts: the holding (the decision for or against the plaintiff and the essential grounds or legal reasons for it, that is, what subsequent judges are bound by), and the dicta (everything in an opinion not essential to the decision, for example, comments about points of law not treated as the basis of the outcome). The realists argued that in practice the common-law system treats the \"holding/dicta\" distinction loosely. They pointed out that even when the judge writing an opinion characterizes part of it as \"the holding,\" judges writing subsequent opinions, although unlikely to dispute the decision itself, are not bound by the original judge's perception of what was essential to the decision. Later judges have tremendous leeway in being able to redefine the holding and the dicta in a precedential case. This leeway enables judges to choose which rules of law formed the basis of the decision in the earlier case. When judging almost any case, then, a judge can find a relevant precedential case which, in subsequent opinions, has been read by one judge as stating one legal rule, and by another judge as stating another, possibly contradictory one. A judge thus faces an indeterminate legal situation in which he or she has to choose which rules are to govern the case at hand.",
  "questions": [
    {
      "q": "According to the passage, the realists argued that which one of the following is true of a common-law system?",
      "o": [
        "It gives rise to numerous situations in which the decisions of earlier judges are found to be in error by later judges.",
        "It possesses a clear set of legal rules in theory, but in practice most judges are unaware of the strict meaning of those rules.",
        "Its strength lies in the requirement that judges decide cases according to precedent rather than according to a set of abstract principles.",
        "It treats the difference between the holding and the dicta in a written opinion rather loosely in practice."
      ],
      "a": 3,
      "e": "The passage directly supports this: it treats the difference between the holding and the dicta in a written opinion rather loosely in practice. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "According to the passage, which one of the following best describes the relationship between a judicial holding and a judicial decision?",
      "o": [
        "The holding is not commonly considered binding on subsequent judges, but the decision is.",
        "The holding formally states the outcome of the case, while the decision explains it.",
        "The holding explains the decision but does not include it.",
        "The holding sets forth and justifies a decision."
      ],
      "a": 3,
      "e": "The passage directly supports this: the holding sets forth and justifies a decision. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The information in the passage suggests that the realists would most likely have agreed with which one of the following statements about the reaction of judges to past interpretations of a precedential case, each of which states a different legal rule?",
      "o": [
        "The judges would most likely disagree with one or more of the interpretations and overturn the earlier judges' decisions.",
        "The judges might differ from each other concerning which of the interpretations would apply in a given case.",
        "The judges probably would consider themselves bound by all the legal rules stated in the interpretations.",
        "The judges would regard the lack of unanimity among interpretations as evidence that no precedents existed."
      ],
      "a": 1,
      "e": "It can be inferred from the passage that the judges might differ from each other concerning which of the interpretations would apply in a given case."
    },
    {
      "q": "It can be inferred from the passage that most legal scholars today would agree with the realists that",
      "o": [
        "Linguistic vagueness can cause indeterminacy regarding the outcome of a litigated case.",
        "In any litigated case, several different and possibly contradictory legal rules are relevant to the decision of the case.",
        "The distinction between holding and dicta in a written opinion is usually difficult to determine in practice.",
        "The boundaries of applicability of terms may sometimes be difficult to determine, but the core meanings of the terms are well established."
      ],
      "a": 0,
      "e": "It can be inferred from the passage that linguistic vagueness can cause indeterminacy regarding the outcome of a litigated case."
    },
    {
      "q": "The passage suggests that the realists believed which one of the following to be true of the dicta in a judge's written opinion?",
      "o": [
        "The judge writing the opinion is usually careful to specify those parts of the opinion he or she considers part of the dicta.",
        "The appropriateness of the judge's decision would be disputed by subsequent judges on the basis of legal rules expressed in the dicta.",
        "A consensus concerning what constitutes the dicta in a judge's opinion comes to be fixed over time as subsequent similar cases are decided.",
        "Subsequent judges can consider parts of what the original judge saw as the dicta to be essential to the original opinion."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that subsequent judges can consider parts of what the original judge saw as the dicta to be essential to the original opinion."
    },
    {
      "q": "Which one of the following best describes the overall organization of the passage?",
      "o": [
        "A traditional point of view is explained and problems arising from it are described.",
        "Two conflicting systems of thought are compared point for point and then evaluated.",
        "A legal concept is defined and arguments justifying that definition are refuted.",
        "Two viewpoints on an issue are briefly described and one of those viewpoints is discussed at greater length."
      ],
      "a": 3,
      "e": "The passage supports option D: two viewpoints on an issue are briefly described and one of those viewpoints is discussed at greater length."
    }
  ]
},
{
  "id": "theorising-civil-rights",
  "title": "Theorising the Civil Rights Movement",
  "tier": "hard",
  "words": 469,
  "text": "Years after the movement to obtain civil rights for black people in the United States made its most important gains, scholars are reaching for a theoretical perspective capable of clarifying its momentous developments. New theories of social movements are being discussed, not just among social psychologists, but also among political theorists.\nOf the many competing formulations of the \"classical\" social psychological theory of social movement, three are prominent in the literature on the civil rights movement: \"rising expectations,\" \"relative deprivation,\" and \"J-curve.\" Each conforms to a causal sequence characteristic of classical social movement theory, linking some unusual condition, or \"system strain,\" to the generation of unrest. When these versions of the classical theory are applied to the civil rights movement, the source of strain is identified as a change in black socioeconomic status that occurred shortly before the widespread protest activity of the movement.\nFor example, the theory of rising expectations asserts that protest activity was a response to psychological tensions generated by gains experienced immediately prior to the civil rights movement. Advancement did not satisfy ambition, but created the desire for further advancement. Only slightly different is the theory of relative deprivation. Here the impetus to protest is identified as gains achieved during the premovement period, coupled with simultaneous failure to make any appreciable headway relative to the dominant group. The J-curve theory argues that the movement occurred because a prolonged period of rising expectations and gratification was followed by a sharp reversal.\nPolitical theorists have been dismissive of these applications of classical theory to the civil rights movement. Their arguments rest on the conviction that, implicitly, the classical theory trivializes the political ends of movement participants, focusing rather on presumed psychological dysfunctions: reduction of complex social situations to simple paradigms of stimulus and response obviates the relevance of all but the shortest-term analysis. Furthermore, the theories lack predictive value: \"strain\" is always present to some degree, but social movement is not. How can we know which strain will provoke upheaval?\nThese very legitimate complaints having frequently been made, it remains to find a means of testing the strength of the theories. Problematically, while proponents of the various theories have contradictory interpretations of socioeconomic conditions leading to the civil rights movement, examination of various statistical records regarding the material status of black Americans yields ample evidence to support any of the three theories. The steady rise in median black family income supports the rising expectations hypothesis; the stability of the economic position of black vis-à-vis (prep....,..., ) white Americans lends credence to the relative deprivation interpretation; unemployment data are consistent with the J-curve theory. A better test is the comparison of each of these economic indicators with the frequency of movement-initiated events reported in the press; unsurprisingly, none correlates significantly with the pace of reports about movement activity.",
  "questions": [
    {
      "q": "It can be inferred from the passage that the classical theory of social movement would not be appropriately applied to an annual general election because such an election",
      "o": [
        "may focus on personalities rather than on political issues",
        "is not provoked primarily by an unusual condition",
        "may be decided according to the psychological needs of voters",
        "may not entail momentous developments"
      ],
      "a": 1,
      "e": "It can be inferred from the passage that is not provoked primarily by an unusual condition."
    },
    {
      "q": "According to the passage, the \"rising expectations\" and \"relative deprivation\" models differ in which one of the following ways?",
      "o": [
        "They predict different responses to the same socioeconomic conditions.",
        "They disagree about the relevance of psychological explanations for protest movements.",
        "They are meant to explain different kinds of social change.",
        "They describe the motivation of protesters in slightly different ways."
      ],
      "a": 3,
      "e": "The passage directly supports this: they describe the motivation of protesters in slightly different ways. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author implies that political theorists attribute which one of the following assumptions to social psychologists who apply the classical theory of social movements to the civil rights movement?",
      "o": [
        "Participants in any given social movement have conflicting motivations.",
        "Social movements are ultimately beneficial to society.",
        "Only strain of a socioeconomic nature can provoke a social movement.",
        "Psychological motivations of movement participants better illuminate the causes of social movements than do participants' political motivations."
      ],
      "a": 3,
      "e": "The passage supports option D: psychological motivations of movement participants better illuminate the causes of social movements than do participants' political motivations."
    },
    {
      "q": "Which one of the following statements is supported by the results of the \"better test\" discussed in the last paragraph of the passage?",
      "o": [
        "The test confirms the three classical theories discussed in the passage.",
        "The test provides no basis for deciding among the three classical theories discussed in the passage.",
        "The test shows that it is impossible to apply any theory of social movements to the civil rights movement.",
        "The test indicates that press coverage of the civil rights movement was biased."
      ],
      "a": 1,
      "e": "The passage supports option B: the test provides no basis for deciding among the three classical theories discussed in the passage."
    },
    {
      "q": "The validity of the \"better test\" (line 65) as proposed by the author might be undermined by the fact that",
      "o": [
        "the press is selective about the movement activities it chooses to cover",
        "not all economic indicators receive the same amount of press coverage",
        "economic indicators often contradict one another",
        "a movement-initiated event may not correlate significantly with any of the three economic indicators"
      ],
      "a": 0,
      "e": "The passage supports option A: the press is selective about the movement activities it chooses to cover."
    },
    {
      "q": "The main purpose of the passage is to",
      "o": [
        "Persuade historians of the indispensability of a theoretical framework for understanding recent history.",
        "Present a new model of social movement.",
        "Account for a shift in a theoretical debate.",
        "Discuss the reasoning behind and shortcomings of certain social psychological theories. # LSAT 12 SECTION III Time 35 minutes 26 Questions Directions: Each passage in this section is followed by a group of questions to be answered on the basis of what is stated or implied in the passage. For some of the questions, more than one of the choices could conceivably answer the question. However, you are to choose the best answer, that is, the response that most accurately and completely answers the question, and blacken the corresponding space on your answer sheet. Nearly every writer on the philosophy of civil rights activist Martin Luther King, Jr., makes a connection between King and Henry David Thoreau, usually via Thoreau's famous essay, \"Civil Disobedience\" (1849). In his book Stride Toward Freedom (1958), King himself stated that Thoreau's essay was his first intellectual contact with the theory of passive resistance to governmental laws that are perceived as morally unjust. However, this emphasis on Thoreau's influence on King is unfortunate: first, King would not have agreed with many other aspects of Thoreau's philosophy, including Thoreau's ultimate acceptance of violence as a form of protest; second, an overemphasis on the influence of one essay has kept historians from noting other correspondences between King's philosophy and transcendentalism (1: a philosophy that emphasizes the a priori conditions of knowledge and experience or the unknowable character of ultimate reality or that emphasizes the transcendent as the fundamental reality; 2: a philosophy that asserts the primacy of the spiritual and transcendental over the material and empirical). \"Civil Disobedience\" was the only example of transcendentalist writing with which King was familiar, and in many other transcendentalist writings, including works by Ralph Waldo Emerson and Margaret Fuller, King would have found ideas more nearly akin to his own. The kind of civil disobedience King had in mind was, in fact, quite different from Thoreau's view of civil disobedience . Thoreau, like most other transcendentalists, was primarily interested in reform of the individual, whereas King was primarily interested in reform of society. As a protest against the Mexican War, Thoreau refused to pay taxes, but he did not hope by his action to force a change in national policy. While he encouraged others to adopt similar protests, he did not attempt to mount any mass protest action against unjust laws. In contrast to Thoreau, King began to advocate the use of mass civil disobedience to effect revolutionary changes within the social system. However, King's writings suggest that, without realizing it, he was an incipient transcendentalist. Most transcendentalists subscribed to the concept of \"higher law\" and included civil disobedience to unjust laws as part of their strategy. They often invoked the concept of higher law to justify their opposition to slavery and to advocate disobedience to the strengthened Fugitive Slave Law of 1850. In his second major book, King's discussion of just and unjust laws and the responsibility of the individual is very similar to the transcendentalists' discussion of higher law. In reference to how one can advocate breaking some laws and obeying others, King notes that there are two types of laws, just and unjust; he describes a just law as a \"code that squares with (square with: ()...[]) the moral law \" and an unjust law as a \"code that is out of harmony with the moral law.\" Thus, King's opposition to the injustice of legalized segregation in the twentieth century is philosophically akin to the transcendentalists' opposition to the Fugitive Slave Law in the nineteenth century."
      ],
      "a": 3,
      "e": "The passage supports option D: discuss the reasoning behind and shortcomings of certain social psychological theories. # lsat 12 section iii time 35 minutes 26 questions directions: each passage in this section is followed by a group of questions to be answered on the basis of what is stated or implied in the passage. for some of the questions, more than one of the choices could conceivably answer the question. however, you are to choose the best answer, that is, the response that most accurately and completely answers the question, and blacken the corresponding space on your answer sheet. nearly every writer on the philosophy of civil rights activist martin luther king, jr., makes a connection between king and henry david thoreau, usually via thoreau's famous essay, \"civil disobedience\" (1849). in his book stride toward freedom (1958), king himself stated that thoreau's essay was his first intellectual contact with the theory of passive resistance to governmental laws that are perceived as morally unjust. however, this emphasis on thoreau's influence on king is unfortunate: first, king would not have agreed with many other aspects of thoreau's philosophy, including thoreau's ultimate acceptance of violence as a form of protest; second, an overemphasis on the influence of one essay has kept historians from noting other correspondences between king's philosophy and transcendentalism (1: a philosophy that emphasizes the a priori conditions of knowledge and experience or the unknowable character of ultimate reality or that emphasizes the transcendent as the fundamental reality; 2: a philosophy that asserts the primacy of the spiritual and transcendental over the material and empirical). \"civil disobedience\" was the only example of transcendentalist writing with which king was familiar, and in many other transcendentalist writings, including works by ralph waldo emerson and margaret fuller, king would have found ideas more nearly akin to his own. the kind of civil disobedience king had in mind was, in fact, quite different from thoreau's view of civil disobedience . thoreau, like most other transcendentalists, was primarily interested in reform of the individual, whereas king was primarily interested in reform of society. as a protest against the mexican war, thoreau refused to pay taxes, but he did not hope by his action to force a change in national policy. while he encouraged others to adopt similar protests, he did not attempt to mount any mass protest action against unjust laws. in contrast to thoreau, king began to advocate the use of mass civil disobedience to effect revolutionary changes within the social system. however, king's writings suggest that, without realizing it, he was an incipient transcendentalist. most transcendentalists subscribed to the concept of \"higher law\" and included civil disobedience to unjust laws as part of their strategy. they often invoked the concept of higher law to justify their opposition to slavery and to advocate disobedience to the strengthened fugitive slave law of 1850. in his second major book, king's discussion of just and unjust laws and the responsibility of the individual is very similar to the transcendentalists' discussion of higher law. in reference to how one can advocate breaking some laws and obeying others, king notes that there are two types of laws, just and unjust; he describes a just law as a \"code that squares with (square with: ()...[]) the moral law \" and an unjust law as a \"code that is out of harmony with the moral law.\" thus, king's opposition to the injustice of legalized segregation in the twentieth century is philosophically akin to the transcendentalists' opposition to the fugitive slave law in the nineteenth century."
    }
  ]
},
{
  "id": "kings-philosophy",
  "title": "King's Philosophy of Nonviolence",
  "tier": "moderate",
  "words": 444,
  "text": "Nearly every writer on the philosophy of civil rights activist Martin Luther King, Jr., makes a connection between King and Henry David Thoreau, usually via Thoreau's famous essay, \"Civil Disobedience\" (1849). In his book Stride Toward Freedom (1958), King himself stated that Thoreau's essay was his first intellectual contact with the theory of passive resistance to governmental laws that are perceived as morally unjust. However, this emphasis on Thoreau's influence on King is unfortunate: first, King would not have agreed with many other aspects of Thoreau's philosophy, including Thoreau's ultimate acceptance of violence as a form of protest; second, an overemphasis on the influence of one essay has kept historians from noting other correspondences between King's philosophy and transcendentalism. \"Civil Disobedience\" was the only example of transcendentalist writing with which King was familiar, and in many other transcendentalist writings, including works by Ralph Waldo Emerson and Margaret Fuller, King would have found ideas more nearly akin to his own.\nThe kind of civil disobedience King had in mind was, in fact, quite different from Thoreau's view of civil disobedience. Thoreau, like most other transcendentalists, was primarily interested in reform of the individual, whereas King was primarily interested in reform of society. As a protest against the Mexican War, Thoreau refused to pay taxes, but he did not hope by his action to force a change in national policy. While he encouraged others to adopt similar protests, he did not attempt to mount any mass protest action against unjust laws. In contrast to Thoreau, King began to advocate the use of mass civil disobedience to effect revolutionary changes within the social system.\nHowever, King's writings suggest that, without realizing it, he was an incipient transcendentalist. Most transcendentalists subscribed to the concept of \"higher law\" and included civil disobedience to unjust laws as part of their strategy. They often invoked the concept of higher law to justify their opposition to slavery and to advocate disobedience to the strengthened Fugitive Slave Law of 1850. In his second major book, King's discussion of just and unjust laws and the responsibility of the individual is very similar to the transcendentalists' discussion of higher law. In reference to how one can advocate breaking some laws and obeying others, King notes that there are two types of laws, just and unjust; he describes a just law as a \"code that squares with...[]) the moral law \" and an unjust law as a \"code that is out of harmony with the moral law.\" Thus, King's opposition to the injustice of legalized segregation in the twentieth century is philosophically akin to the transcendentalists' opposition to the Fugitive Slave Law in the nineteenth century.",
  "questions": [
    {
      "q": "Which one of the following best states the main idea of the passage?",
      "o": [
        "King's philosophy was more influenced by Thoreau's essay on civil disobedience than by any other writing of the transcendentalists.",
        "While historians may have overestimated Thoreau's influence on King, King was greatly influenced by a number of the transcendentalist philosophers.",
        "Thoreau's and King's views on civil disobedience differed in that King was more concerned with the social reform than with the economic reform of society.",
        "Although historians have overemphasized Thoreau's influence on King, there are parallels between King's philosophy and transcendentalism that have not been fully appreciated."
      ],
      "a": 3,
      "e": "The passage supports option D: although historians have overemphasized thoreau's influence on king, there are parallels between king's philosophy and transcendentalism that have not been fully appreciated."
    },
    {
      "q": "Which one of the following statements about \"Civil Disobedience\" would the author consider most accurate?",
      "o": [
        "It was not King's first contact with the concept of passive resistance to unjust laws.",
        "It was one of many examples of transcendentalist writing with which King was familiar.",
        "It provided King with a model for using passive resistance to effect social change.",
        "It influenced King's philosophy on passive resistance to unjust laws."
      ],
      "a": 3,
      "e": "The passage supports option D: it influenced king's philosophy on passive resistance to unjust laws."
    },
    {
      "q": "In the first paragraph, the author is primarily concerned with",
      "o": [
        "chronicling the development of King's philosophy on passive resistance to unjust law",
        "suggesting that a common emphasis on one influence on King's philosophy has been misleading",
        "providing new information about the influence of twentieth-century philosophers on King's work",
        "summarizing the work of historians of the most important influences on King's philosophy"
      ],
      "a": 1,
      "e": "The passage supports option B: suggesting that a common emphasis on one influence on king's philosophy has been misleading."
    },
    {
      "q": "According to the passage, which one of the following is true of' Emerson and Fuller?",
      "o": [
        "Some of their ideas were less typical of transcendentalism than were some of Thoreau's ideas.",
        "They were more concerned with the reform of society than with the reform of the individual.",
        "They would have been more likely than Thoreau to agree with King on the necessity of mass protest in civil disobedience.",
        "Some of their ideas were more similar to King's than were some of Thoreau's."
      ],
      "a": 3,
      "e": "The passage directly supports this: some of their ideas were more similar to king's than were some of thoreau's. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "According to the passage, King differed from most transcendentalists in that he",
      "o": [
        "opposed violence as a form of civil protest",
        "opposed war as an instrument of foreign policy under any circumstances",
        "believed that just laws had an inherent moral value",
        "was more interested in reforming society than in reforming the individual"
      ],
      "a": 3,
      "e": "The passage directly supports this: was more interested in reforming society than in reforming the individual. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The passage suggests which one of the following about Thoreau?",
      "o": [
        "He was the first to develop fully the theory of civil disobedience.",
        "His work has had a greater influence on contemporary thinkers than has the work of Emerson and Fuller.",
        "His philosophy does not contain all of the same elements as the philosophies of the other transcendentalists.",
        "He advocated using civil disobedience to force the federal government to change its policies on war."
      ],
      "a": 2,
      "e": "It can be inferred from the passage that his philosophy does not contain all of the same elements as the philosophies of the other transcendentalists."
    }
  ]
},
{
  "id": "life-histories",
  "title": "Life Histories",
  "tier": "moderate",
  "words": 448,
  "text": "Anthropologist David Mandelbaum makes a distinction between life-passage studies and life-history studies which emerged primarily out of research concerning Native Americans. Life-passage studies, he says, \"emphasize the requirements of society, showing how groups socialize and enculturate (v. ) their young in order to make them into viable members of society.\" Life histories, however, \"emphasize the experiences and requirements of the individual, how the person copes with society rather than how society copes with the stream of individuals.\" Life-passage studies bring out the general cultural characteristics and commonalities (a common feature or attribute) that broadly define a culture, but are unconcerned with an individual's choices or how the individual perceives and responds to the demands and expectations imposed by the constraints of his or her culture. This distinction can clearly be seen in the autobiographies of Native American women. For example, some early recorded autobiographies, such as The Autobiography of a Fox (Fox: ()) Indian Woman, a life passage recorded by anthropologist Truman Michelson, emphasizes prescribed roles. The narrator presents her story in a way that conforms with tribal expectations. Michelson's work is valuable as ethnography, as a reflection of the day-to-day responsibilities of Mesquakie women, yet as is often the case with life-passage studies, it presents little of the central character's psychological motivation. The Fox woman's life story focuses on her tribal education and integration into the ways of her people, and relates only what Michelson ultimately decided was worth preserving. The difference between the two types of studies is often the result of the amount of control the narrator maintains over the material; autobiographies in which there are no recorder-editors are far more reflective of the life-history category, for there are no outsiders shaping the story to reflect their preconceived notions of what the general cultural patterns are. For example, in Maria Campbell's account of growing up as a Canadian Metis who was influenced strongly, and often negatively, by the non-Native American world around her, one learns a great deal about the life of Native American women, but Campbell's individual story, which is told to us directly, is always the center of her narrative. Clearly it is important to her to communicate to the audience what her experiences as a Native American have been. Through Campbell's story of her family the reader learns of the effect of poverty and prejudice on a people. The reader becomes an intimate of Campbell the writer, sharing her pain and celebrating her small victories. Although Campbell's book is written as a life history (the dramatic moments, the frustrations, and the fears are clearly hers), it reveals much about ethnic relations in Canada while reflecting the period in which it was written.",
  "questions": [
    {
      "q": "Which one of the following is the most accurate expression of the main point of the passage?",
      "o": [
        "The contributions of life-history studies to anthropology have made life-passage studies obsolete.",
        "Despite their dissimilar approaches to the study of culture, life-history and lifepassage studies have similar goals.",
        "The autobiographies of Native American women illustrate the differences between life-history and life-passage studies.",
        "The roots of Maria Campbell's autobiography can be traced to earlier narratives such as The Autobiography of a Fox Indian Woman."
      ],
      "a": 2,
      "e": "The passage supports option C: the autobiographies of native american women illustrate the differences between lifehistory and life-passage studies."
    },
    {
      "q": "The term \"prescribed roles\" in line 24 of the passage refers to the",
      "o": [
        "Function of life-passage studies in helping ethnologists to understand cultural tradition.",
        "Function of life-history studies in helping ethnologists to gather information.",
        "Way in which a subject of a life passage views himself or herself.",
        "Roles generally adopted by individuals in order to comply with cultural demands."
      ],
      "a": 3,
      "e": "The passage supports option D: roles generally adopted by individuals in order to comply with cultural demands."
    },
    {
      "q": "The reference to the \"psychological motivation\" (line 30) of the subject of The Autobiography of a Fox Indian Woman serves primarily to",
      "o": [
        "Dismiss as irrelevant the personal perspective in the life-history study.",
        "Identify an aspect of experience that is not commonly a major focus of life-passage studies.",
        "Clarify the narrator's self-acknowledged purpose in relating a life passage.",
        "Suggest a common conflict between the goals of the narrator and those of the recorder in most life-passage studies."
      ],
      "a": 1,
      "e": "The passage supports option B: identify an aspect of experience that is not commonly a major focus of life-passage studies."
    },
    {
      "q": "Which one of following statements about Maria Campbell can be inferred from material in the passage?",
      "o": [
        "She was familiar with the very early history of her tribe but lacked insight into the motivations of non-Native Americans.",
        "She was unfamiliar with Michelson's work but had probably read a number of lifepassage studies about Native Americans.",
        "She had training as a historian but was not qualified as an anthropologist.",
        "Her life history provides more than a record of her personal experience."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that her life history provides more than a record of her personal experience."
    },
    {
      "q": "According to the passage, one way in which life history studies differ from life-passage studies is that life-history studies are",
      "o": [
        "Usually told in the subject's native language.",
        "Less reliable because they rely solely on the subject's recall.",
        "More likely to be told without the influence of an intermediary.",
        "More creative in the way they interpret the subject's cultural legacy."
      ],
      "a": 2,
      "e": "The passage directly supports this: more likely to be told without the influence of an intermediary. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "Which one of the following pairings best illustrates the contrast between life passages and life histories?",
      "o": [
        "A study of the attitudes of a society toward a mainstream religion and an analysis of techniques used to instruct members of that religious group.",
        "A study of how a preindustrial society maintains peace with neighboring societies and a study of how a postindustrial society does the same.",
        "A study of the way a military organization establishes and maintains discipline and a newly enlisted soldier's narrative describing his initial responses to the military environment.",
        "An analysis of a society's means of subsistence and a study of how its members celebrate religious holidays."
      ],
      "a": 2,
      "e": "The passage supports option C: a study of the way a military organization establishes and maintains discipline and a newly enlisted soldier's narrative describing his initial responses to the military environment."
    }
  ]
},
{
  "id": "asteroid-satellites",
  "title": "Do Asteroids Have Satellites?",
  "tier": "hard",
  "words": 453,
  "text": "Until recently many astronomers believed that asteroids travel about the solar system unaccompanied by satellites. These astronomers assumed this because they considered asteroid-satellite systems inherently unstable. Theoreticians could have told them otherwise: even minuscule bodies in the solar system can theoretically have satellites, as long as everything is in proper scale. If a bowling ball were orbiting about the Sun in the asteroid belt, it could have a pebble orbiting it as far away as a few hundred radii (or about 50 meters) without losing the pebble to the Sun's gravitational pull. Observations now suggest that asteroid satellites may exists not only in theory but also in reality. Several astronomers have noticed, while watching asteroids pass briefly in front of stars, that something besides the known asteroid sometimes blocks out the star as well. Is that something a satellite? The most convincing such report concerns the asteroid Herculina, which was due to pass in front of a star in 1978. Astronomers waiting for the predicted event found not just one occultation, or eclipse, of the star, but two distinct drops in brightness. One was the predicted occultation, exactly on time. The other, lasting about five seconds, preceded the predicted event by about two minutes. The presence of a secondary body near Herculina thus seemed strongly indicated. To cause the secondary occultation, an unseen satellite would have to be about 45 kilometers in diameter, a quarter of the size of Herculina, and at a distance of 990 kilometers from the asteroid at the time. These values are within theoretical bounds, and such an asteroid-satellite pair could be stable. With the Herculina event, apparent secondary occultations became \"respectable\" - and more commonly reported. In fact, so common did reports of secondary events become that they are now simply too numerous for all of them to be accurate. Even if every asteroid has as many satellites as can be fitted around it without an undue number of collisions, only one in every hundred primary occultations would be accompanied by a secondary event (one in every thousand if asteroid satellites system resembled those of the planets). Yet even astronomers who find the case for asteroid satellites unconvincing at present say they would change their minds if a photoelectric record were made of a well-behaved secondary event. By \"well-behaved\" they mean that during occultation the observed brightness must drop sharply as the star winks out () and must rise sharply as it reappears from behind the obstructing object, but the brightness during the secondary occultation must drop to that of the asteroid, no higher and no lower. This would make it extremely unlikely that an airplane or a glitch in the instruments was masquerading as an occulting body.",
  "questions": [
    {
      "q": "Which one of the following best expresses the main idea of the passage?",
      "o": [
        "The observation of Herculina represented the crucial event that astronomical observers and theoreticians had been waiting for to establish a convincing case for the stability of asteroid-satellite systems.",
        "Although astronomers long believed that observation supports the existence of stable asteroid-satellite systems, numerous recent reports have increased skepticism on this issue in astronomy.",
        "Theoreticians' views on the stability of asteroid-satellite systems may be revised in the light of reports like those about Herculina.",
        "The Herculina event suggests that theoreticians' views about asteroid-satellite systems may be correct, and astronomers agree about the kind of evidence needed to clearly resolve the issue."
      ],
      "a": 3,
      "e": "The passage supports option D: the herculina event suggests that theoreticians' views about asteroid-satellite systems may be correct, and astronomers agree about the kind of evidence needed to clearly resolve the issue."
    },
    {
      "q": "Which one of the following is mentioned in the passage as providing evidence that Herculina has a satellite?",
      "o": [
        "the diameter of a body directly observed near Herculina",
        "the distance between Herculina and planet nearest to it",
        "the shortest possible time in which satellites of Herculina, if any, could complete a single orbit",
        "the occultation that occurred shortly before the predicted occultation by Herculina"
      ],
      "a": 3,
      "e": "The passage supports option D: the occultation that occurred shortly before the predicted occultation by herculina."
    },
    {
      "q": "According to the passage, the attitude of astronomers toward asteroid satellites since the Herculina event can best described as",
      "o": [
        "open-mindedness combined with a concern for rigorous standards of proof",
        "contempt for and impatience with the position held by theoreticians",
        "bemusement at a chaotic mix of theory, inadequate or spurious data, and calls for scientific rigor",
        "hardheaded skepticism, implying rejection of all data not recorded automatically by state-of-the-art instruments"
      ],
      "a": 0,
      "e": "The passage directly supports this: open-mindedness combined with a concern for rigorous standards of proof. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author implies that which one of the following was true prior to reports of the Herculina event?",
      "o": [
        "Since no good theoretical model existed, all claims that reports of secondary occultations were common were disputed.",
        "Some of the reported observations of secondary occultations were actually observations of collisions of satellites with one another.",
        "If there were observations of phenomena exactly like the phenomena now labeled secondary occultations, astronomers were less likely than to have reported such observations.",
        "The prevailing standards concerning what to classify as a well-behaved secondary event were less stringent than they are now."
      ],
      "a": 2,
      "e": "The passage supports option C: if there were observations of phenomena exactly like the phenomena now labeled secondary occultations, astronomers were less likely than to have reported such observations."
    },
    {
      "q": "The information presented in the passage implies which one of the following about the frequency of reports of secondary occultations after the Herculina event?",
      "o": [
        "The percentage of reports of primary occultations that also included reports of secondary occultations increased tenfold compared to the time before the Herculina event.",
        "Primary occultations by asteroids were reported to have been accompanied by secondary occultations in about one out of every thousand cases.",
        "The absolute number of reports of secondary occultations increased tenfold compared to the time before the Herculina event.",
        "Primary occultations by asteroids were reported to have been accompanied by secondary occultations in more than one out of every hundred cases."
      ],
      "a": 3,
      "e": "The passage supports option D: primary occultations by asteroids were reported to have been accompanied by secondary occultations in more than one out of every hundred cases."
    },
    {
      "q": "The primary purpose of the passage is to",
      "o": [
        "cast doubts on existing reports of secondary occultations of stars",
        "describe experimental efforts by astronomers to separate theoretically believable observations of satellites of asteroids from spurious ones",
        "review the development of ideas among astronomers about whether or not satellites of asteroids exist",
        "bring a theoretician's perspective to bear on an incomplete discussion of satellites of asteroids"
      ],
      "a": 2,
      "e": "Taken as a whole, the passage is organised around option C: review the development of ideas among astronomers about whether or not satellites of asteroids exist."
    }
  ]
},
{
  "id": "boyles-laboratory",
  "title": "Inside Boyle's Laboratory",
  "tier": "hard",
  "words": 445,
  "text": "Historians attempting to explain how scientific work was done in the laboratory of the seventeenth-century chemist and natural philosopher Robert Boyle must address a fundamental discrepancy between how such experimentation was actually performed and the seventeenth-century rhetoric describing it. Leaders of the new Royal Society of London in the 1660s insisted that authentic science depended upon actual experiments performed, observed, and recorded by the scientists themselves. Rejecting the traditional contempt for manual operations, these scientists, all members of the English upper class, were not to think themselves demeaned by the mucking about with chemicals, furnaces, and pumps; rather, the willingness of each of them to become, as Boyle himself said, a mere \"drudge\" and \"under-builder\" in the search for God's truth in nature was taken as a sign of their nobility and Christian piety. This rhetoric has been so effective that one modern historian assures us that Boyle himself actually performed all of the thousand or more experiments he reported. In fact, due to poor eyesight, fragile health, and frequent absences from his laboratory, Boyle turned over much of the labor of obtaining and recording experimental results to paid technicians, although published accounts of the experiments rarely, if ever, acknowledged the technicians' contributions. Nor was Boyle unique in relying on technicians without publicly crediting their work. Why were the contributions of these technicians not recognized by their employers? One reason is the historical tendency, which has persisted into the twentieth century, to view scientific discovery as resulting from momentary flashes of individual insight rather than from extended periods of cooperative work by individuals with varying levels of knowledge and skill. Moreover, despite the clamor of seventeenth-century scientific rhetoric commending a hands-on approach, science was still overwhelmingly an activity of the English upper class, and the traditional contempt that genteel society maintained for manual labor was pervasive and deeply rooted. Finally, all of Boyle's technicians were \"servants,\" which in seventeenth-century usage meant anyone who worked for pay. To seventeenth-century sensibilities, the wage relationship was charged with political significance. Servants, meaning wage earners, were excluded from the franchise because they were perceived as ultimately dependent on their wages and thus controlled by the will of their employers. Technicians remained invisible in the political economy of science for the same reasons that underlay servants' general political exclusion. The technicians' contribution, their observations and judgment, if acknowledged, would not have been perceived in the larger scientific community as objective because the technicians were dependent on the wages paid to them by their employers. Servants might have made the apparatus work, but their contributions to the making of scientific knowledge were largely - and conveniently - ignored by their employers.",
  "questions": [
    {
      "q": "Which one of the following best summarizes the main idea of the passage?",
      "o": [
        "Seventeenth-century scientific experimentation would have been impossible without the work of paid laboratory technicians.",
        "Seventeenth-century social conventions prohibited upper-class laboratory workers from taking public credit for their work.",
        "Seventeenth-century views of scientific discovery combined with social class distinctions to ensure that laboratory technicians' scientific work was never publicly acknowledged.",
        "Seventeenth-century scientists were far more dependent on their laboratory technicians than are scientists today, yet far less willing to acknowledge technicians' scientific contributions."
      ],
      "a": 2,
      "e": "The passage supports option C: seventeenth-century views of scientific discovery combined with social class distinctions to ensure that laboratory technicians' scientific work was never publicly acknowledged."
    },
    {
      "q": "It can be inferred from the passage that the \"seventeenth-century rhetoric\" mentioned in line 6 would have more accurately described the experimentation performed in Boyle's laboratory if which one of the following were true?",
      "o": [
        "Unlike many seventeenth-century scientists, Boyle recognized that most scientific discoveries resulted from the cooperative efforts of many individuals.",
        "Unlike many seventeenth-century scientists, Boyle maintained a deeply rooted and pervasive contempt for manual labor.",
        "Unlike many seventeenth-century scientists, Boyle was a member of the Royal Society of London.",
        "Boyle himself performed the actual labor of obtaining and recording experimental results."
      ],
      "a": 3,
      "e": "It can be inferred from the passage that boyle himself performed the actual labor of obtaining and recording experimental results."
    },
    {
      "q": "According to the author, servants of seventeenth-century England were excluded from the franchised because of the belief that",
      "o": [
        "their interests were adequately represented by their employers",
        "their education was inadequate to make informed political decisions",
        "the independence of their political judgment would be compromised by their economic dependence on their employers",
        "their participation in the elections would be a polarizing influence on the political process"
      ],
      "a": 2,
      "e": "The passage directly supports this: the independence of their political judgment would be compromised by their economic dependence on their employers. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "According to the author, the Royal Society of London insisted that scientists abandon the",
      "o": [
        "belief that the primary purpose of scientific discovery was to reveal the divine truth that could be found in nature",
        "view that scientific knowledge results largely from the insights of a few brilliant individuals rather than from the cooperative efforts of many workers",
        "seventeenth-century belief that servants should be denied the right to vote because they were dependent on wages paid to them by their employers",
        "traditional disdain for manual labor that was maintained by most members of the English upper class during the seventeenth-century"
      ],
      "a": 3,
      "e": "The passage directly supports this: traditional disdain for manual labor that was maintained by most members of the english upper class during the seventeenth-century. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author implies that which one of the following beliefs was held in both the seventeenth and the twentieth centuries?",
      "o": [
        "Individual insights rather than cooperative endeavors produce most scientific discoveries.",
        "How science is practiced is significantly influenced by the political beliefs and assumption of scientists.",
        "Scientific research undertaken for pay cannot be considered objective.",
        "Scientific discovery can reveal divine truth in nature."
      ],
      "a": 0,
      "e": "The passage supports option A: individual insights rather than cooperative endeavors produce most scientific discoveries."
    },
    {
      "q": "Which one of the following best describes the organization of the last paragraph?",
      "o": [
        "Several alternative answers are presented to a question posed in the previous paragraph, and the last is adopted as the most plausible.",
        "A question regarding the cause of the phenomenon described in the previous paragraph is posed, two possible explanations are rejected, and evidence is provided in support of a third.",
        "A question regarding the phenomenon described in the previous paragraph is posed, and several incompatible views are presented.",
        "A question regarding the cause of the phenomenon described in the previous paragraph is posed, and several contributing factors are then discussed."
      ],
      "a": 3,
      "e": "The passage supports option D: a question regarding the cause of the phenomenon described in the previous paragraph is posed, and several contributing factors are then discussed."
    }
  ]
},
{
  "id": "monopoly-and-antitrust",
  "title": "Monopoly Power and Antitrust",
  "tier": "moderate",
  "words": 524,
  "text": "One type of violation of the antitrust laws is the abuse of monopoly power. Monopoly power is the ability of a firm to raise its prices above the competitive level - that is, above the level that would exist naturally if several firms had to compete - without driving away so many customers as to make the price increase unprofitable. In order to show that a firm has abused monopoly power, and thereby violated the antitrust laws, two essential facts must be established. First, a firm must be shown to possess monopoly power, and second, that power must have been used to exclude competition in the monopolized market or related markets. The price a firm may charge for its product is constrained by the availability of close substitutes for the product. If a firm attempts to charge a higher price - a supracompetitive price - consumers will turn to other firms able to supply substitute products at competitive prices. If a firm provides a large percentage of the products actually or potentially available, however, customers may find it difficult to buy from alternative suppliers. Consequently, a firm with a large share of the relevant market of substitutable products may be able to raise its price without losing many customers. For this reason courts often use market share as a rough indicator of monopoly power. Supracompetitive prices are associated with a loss of consumers' welfare because such prices force some consumers to buy a less attractive mix of products than they would ordinarily buy. Supracompetitive prices, however, do not themselves constitute an abuse of monopoly power. Antitrust laws do not attempt to counter the mere existence of monopoly power, or even the use of monopoly power to extract extraordinarily high profits. For example, a firm enjoying economies of scale - that is, low unit production costs due to high volume - does not violate the antitrust laws when it obtains a large market share by charging prices that are profitable but so low that its smaller rivals cannot survive. If the antitrust laws posed disincentives to the existence and growth of such firms, the laws could impair consumers' welfare. Even if the firm, upon acquiring monopoly power, chose to raise prices in order to increase profits, it would not be in violation of the antitrust laws. The antitrust prohibitions focus instead on abuses of monopoly power that exclude competition in the monopolized market or involve leverage - the use of power in one market to reduce competition in another. One such forbidden practice is a tying arrangement, in which a monopolist conditions the sale of a product in one market on the buyer's purchase of another product in a different market. For example, a firm enjoying a monopoly in the communications systems market might not sell its products to a consumer unless that customer also buys its computer systems, which are competing with other firms' computer systems. The focus on the abuse of monopoly power, rather than on monopoly itself, follows from the primary purpose of the antitrust laws: to promote consumers' welfare through assurance of the quality and quantity of products available to consumers.",
  "questions": [
    {
      "q": "Which one of the following distinctions between monopoly power and the abuse of monopoly power would the author say underlies the antitrust laws discussed in the passage?",
      "o": [
        "Monopoly power is assessed in term of market share, whereas abuse of monopoly power is assessed in term of market control.",
        "Monopoly power is easy to demonstrate, whereas abuse of monopoly power is difficult to demonstrate.",
        "Monopoly power involves only one market, whereas abuse of monopoly power involves at least two or more related markets.",
        "Monopoly power does not necessarily hurt consumer welfare, whereas abuse of monopoly power does."
      ],
      "a": 3,
      "e": "The passage supports option D: monopoly power does not necessarily hurt consumer welfare, whereas abuse of monopoly power does."
    },
    {
      "q": "Would the use of leverage meet the criteria for abuse of monopoly power outlined in the first paragraph?",
      "o": [
        "No, because leverage involves a nonmonopolized market.",
        "No, unless the leverage involves a tying arrangement.",
        "Yes, because leverage is a characteristic of monopoly power.",
        "Yes, because leverage is used to eliminate competition in a related market."
      ],
      "a": 3,
      "e": "The passage supports option D: yes, because leverage is used to eliminate competition in a related market."
    },
    {
      "q": "What is the main purpose of the third paragraph (lines 28---47)?",
      "o": [
        "to distinguish between supracompetitive prices and supracompetitive profits",
        "to describe the positive use of monopoly power",
        "to introduce the concept of economies of scale",
        "to distinguish what is not covered by the antitrust law under discussion from what is covered"
      ],
      "a": 3,
      "e": "The passage supports option D: to distinguish what is not covered by the antitrust law under discussion from what is covered."
    },
    {
      "q": "Given only the information in the passage, with which one of the following statements about competition would those responsible for the antitrust laws most likely agree?",
      "o": [
        "Competition is essential to consumers' welfare.",
        "There are acceptable and unacceptable ways for firms to reduce their competition.",
        "The preservation of competition is the principal aim of the antitrust laws.",
        "Supracompetitive prices lead to reductions in competition."
      ],
      "a": 1,
      "e": "Option B best fits the arguments presented: There are acceptable and unacceptable ways for firms to reduce their competition."
    },
    {
      "q": "Which one of the following sentences would best complete the last paragraph of the passage?",
      "o": [
        "By limiting consumers' choices, abuse of monopoly power reduces consumers' welfare, but monopoly alone can sometimes actually operate in the consumers' best interest.",
        "What is needed now is a set of related laws to deal with the negative impacts that monopoly itself has on consumers' ability to purchase products at reasonable cost.",
        "Over time, the antitrust laws have been very effective in ensuring competition and, consequently, consumers' welfare in the volatile communications and computer systems industries.",
        "By controlling supracompetitive prices and corresponding supracompetitive profits, the antitrust laws have, indeed, gone a long way toward meeting that objective."
      ],
      "a": 0,
      "e": "The passage supports option A: by limiting consumers' choices, abuse of monopoly power reduces consumers' welfare, but monopoly alone can sometimes actually operate in the consumers' best interest."
    }
  ]
},
{
  "id": "navajo-weaving",
  "title": "Navajo Weaving",
  "tier": "moderate",
  "words": 457,
  "text": "Amsden has divided Navajo weaving into four distinct styles. He argues that three of them can be identified by the type of design used to form horizontal bands: colored strips, zigzags, or diamonds. The fourth, or bordered, style he identifies by a distinct border surrounding centrally placed, dominating figures. Amsden believes that the diamond style appeared after 1869 when, under Anglo influence and encouragement, the blanket became a rug with larger designs and bolder lines. The bordered style appeared about 1890, and, Amsden argues, it reflects the greatest number of Anglo influences on the newly emerging rug business. The Anglo desire that anything with a graphic designs have a top, bottom, and border is a cultural preference that the Navajo abhorred, as evidenced, he suggests, by the fact that in early bordered specimens strips of color unexpectedly break through the enclosing pattern. Amsden argues that the bordered rug represents a radical break with previous styles. He asserts that the border changed the artistic problem facing weavers: a blank area suggests the use of isolated figures, while traditional, banded Navajo designs were continuous and did not use isolated figures. The old patterns alternated horizontal decorative zones in a regular order. Amsden's view raises several questions. First, what is involved in altering artistic styles? Some studies suggest that artisans' motor habits and thought processes must be revised when a style changes precipitously. In the evolution of Navajo weaving, however, no radical revisions in the way articles are produced need be assumed. After all, all weaving subordinates design to the physical limitations created by the process of weaving, which includes creating an edge or border. The habits required to make decorative borders are, therefore, latent and easily brought to the surface. Second, is the relationship between the banded and bordered styles as simple as Amsden suggests? He assumes that a break in style is a break in psychology. But if style results from constant quests for invention, such stylistic breaks are inevitable. When a style has exhausted the possibilities inherent in its principles, artists cast about (v., ) for new, but not necessarily alien, principles. Navajo weaving may have reached this turning point prior to 1890. Third, is there really a significant stylistic gap? Two other styles lie between the banded styles and the bordered styles. They suggest that disintegration of the bands may have altered visual and motor habits and prepared the way for a border filled with separate units. In the Chief White Antelope blanket, dated prior to 1865, ten years before the first Anglo trading post on the Navajo reservation, whole and partial diamonds interrupt the flowing design and become separate forms. Parts of diamonds arranged vertically at each side may be seen to anticipate the border.",
  "questions": [
    {
      "q": "The author's central thesis is that",
      "o": [
        "the Navajo rejected the stylistic influences of Anglo culture",
        "Navajo weaving cannot be classified by Amsden's categories",
        "the Navajo changed their style of weaving because they sought the challenge of new artistic problems",
        "the casual factors leading to the emergence of the bordered style are not as clearcut as Amsden suggests"
      ],
      "a": 3,
      "e": "The passage supports option D: the casual factors leading to the emergence of the bordered style are not as clear-cut as amsden suggests."
    },
    {
      "q": "It can be inferred from the passage that Amsden views the use of \"strips of color\" (line 18) in the early bordered style as",
      "o": [
        "a sign of resistance to a change in style",
        "an echo of the diamond style",
        "a feature derived from Anglo culture",
        "an attempt to disintegrate the rigid form of the banded style"
      ],
      "a": 0,
      "e": "It can be inferred from the passage that a sign of resistance to a change in style."
    },
    {
      "q": "The author's view of Navajo weaving suggests which one of the following?",
      "o": [
        "The appearance of the first trading post on the Navajo reservation coincided with the appearance of the diamond style.",
        "Traces of thought processes and motor habits of one culture can generally be found in the art of another culture occupying the same period and region.",
        "The bordered style may have developed gradually from the banded style as a result of Navajo experiencing with design.",
        "The influence of Anglo culture was not the only non-Native American influence on Navajo weaving."
      ],
      "a": 2,
      "e": "It can be inferred from the passage that the bordered style may have developed gradually from the banded style as a result of navajo experiencing with design."
    },
    {
      "q": "According to the passage, Navajo weavings made prior to 1890 typically were characterized by all of the following EXCEPT",
      "o": [
        "repetition of forms",
        "overall patterns",
        "horizontal bands",
        "isolated figures"
      ],
      "a": 3,
      "e": "The passage directly supports this: isolated figures. This information is stated in the passage, making it the most accurate answer based on the text."
    },
    {
      "q": "The author would most probably agree with which one of the following conclusions about the stylistic development of Navajo weaving?",
      "o": [
        "The styles of Navajo weaving changed in response to changes in Navajo motor habits and thought processes.",
        "The zigzag style was the result of stylistic influences from Anglo culture.",
        "Navajo weaving used isolated figures in the beginning, but combined naturalistic and abstract designs in later styles.",
        "Navajo weaving changed gradually from a style in which the entire surface was covered by horizontal bands to one in which central figures dominated the surface."
      ],
      "a": 3,
      "e": "The passage supports option D: navajo weaving changed gradually from a style in which the entire surface was covered by horizontal bands to one in which central figures dominated the surface."
    },
    {
      "q": "The author suggests that Amsden's claim that borders in Navajo weaving were inspired by Anglo culture could be",
      "o": [
        "conceived as a response to imagined correspondences between Anglo and Navajo art",
        "biased by Amsden's feelings about Anglo culture",
        "a result of Amsden's failing to take into account certain aspects of Navajo weaving",
        "based on a limited number of specimens of the styles of Navajo weaving"
      ],
      "a": 2,
      "e": "It can be inferred from the passage that a result of amsden's failing to take into account certain aspects of navajo weaving."
    }
  ]
},
];

export default PASSAGES;
