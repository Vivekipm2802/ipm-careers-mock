// ============================================================
// Weekly DI set library — 2026-09 v2 (owner upgrade).
// The launch bank's 12 authored sets were retired as too easy;
// this bank carries the 10 sets from the owner's DI PDF
// (bank-exam level). The PDF's charts were images — every chart
// was transcribed by hand into the text tables below, and the
// transcription was validated by solving all 49 questions and
// matching the PDF's own answer key: 48/49 matched exactly.
// The one mismatch (old Set-4 Q17: key said 41.42% but the
// chart's true answer is ~60.4%, not an option) was dropped.
// Two same-level replacement questions (marked AUTHORED) top the
// two 4-question sets back up to 5. Full audit in
// Weekly-DI-bank-v2-review.html.
// Shape: { id, title, kind, intro, table:{head,rows},
//          questions: [ { q, o (5 options), a, e } × 5 ] }.
// One set per ISO week, seeded no-repeat rotation — see
// setIndexForWeek in WeeklyDI.js.
// ============================================================

const DI_SETS = [
  {
    id: "articles-profit-discount",
    title: "Profit & Discount on Articles",
    kind: "table",
    intro:
      "A shopkeeper sells five articles. The table shows the profit percent earned (on cost price) and the discount percent given (on marked price) for each article.",
    table: {
      head: ["Article", "Profit %", "Discount %"],
      rows: [
        ["A", "35", "21.7"],
        ["B", "10.4", "20"],
        ["C", "18", "5.6"],
        ["D", "25", "15"],
        ["E", "32", "56"],
      ],
    },
    questions: [
      {
        q: "If the cost price of article B and article C are Rs. 2500 and Rs. 2400 respectively, find the difference between the marked price of article B and the marked price of article C.",
        o: ["Rs. 450", "Rs. 430", "Rs. 500", "Rs. 650", "Rs. 460"],
        a: 0,
        e: "MP = CP × (1 + profit%) ÷ (1 − discount%). B: 2500 × 1.104 ÷ 0.80 = 3450. C: 2400 × 1.18 ÷ 0.944 = 3000. Difference = 450.",
      },
      {
        q: "If the marked price of article E is Rs. 4800, find the cost price of article E.",
        o: ["Rs. 1500", "Rs. 1850", "Rs. 1800", "Rs. 1600", "Rs. 1750"],
        a: 3,
        e: "SP = 4800 × (1 − 0.56) = 2112. CP = SP ÷ 1.32 = 2112 ÷ 1.32 = Rs. 1600.",
      },
      {
        q: "If the selling price of article A and article D are Rs. 3132 and Rs. 1700 respectively, the marked price of article D is what percent of the marked price of article A?",
        o: ["75%", "50%", "80%", "60%", "40%"],
        a: 1,
        e: "MP(A) = 3132 ÷ (1 − 0.217) = 3132 ÷ 0.783 = 4000. MP(D) = 1700 ÷ 0.85 = 2000. 2000/4000 = 50%.",
      },
      {
        q: "The discount on article A is reduced by 6.7 percentage points and its marked price is reduced by Rs. 400. If the cost price of article A was Rs. 2320 initially, find the difference between the discount (in Rs.) given earlier and the discount given after the reduction.",
        o: ["Rs. 328", "Rs. 356", "Rs. 384", "Rs. 320", "Rs. 365"],
        a: 0,
        e: "Old MP = 2320 × 1.35 ÷ 0.783 = 4000, old discount = 21.7% of 4000 = Rs. 868. New: discount 15% on MP 3600 = Rs. 540. Difference = 868 − 540 = Rs. 328.",
      },
      {
        q: "What is the ratio of the cost price of article E to the cost price of article C, if the selling price of article C and article E are Rs. 2124 and Rs. 1848 respectively?",
        o: ["9 : 8", "6 : 7", "7 : 9", "7 : 5", "9 : 7"],
        a: 2,
        e: "CP(C) = 2124 ÷ 1.18 = 1800. CP(E) = 1848 ÷ 1.32 = 1400. Ratio E : C = 1400 : 1800 = 7 : 9.",
      },
    ],
  },
  {
    id: "rrb-clearance-rates",
    title: "RRB Clearance Rates",
    kind: "table",
    intro:
      "The table shows the number of students who cleared two examinations — RRB Scale 1 and RRB Assistant — per every 1000 students who appeared in that exam, over five years.",
    table: {
      head: ["Year", "RRB Scale 1 (per 1000)", "RRB Assistant (per 1000)"],
      rows: [
        ["2013", "80", "120"],
        ["2014", "120", "145"],
        ["2015", "160", "90"],
        ["2016", "280", "80"],
        ["2017", "150", "175"],
      ],
    },
    questions: [
      {
        q: "If the total number of students who appeared in RRB Scale 1 in 2016 was 2.5 lakh, how many of them cleared the RRB Scale 1 examination in 2016?",
        o: ["65000", "75000", "60000", "70000", "None of these"],
        a: 3,
        e: "280 per 1000 of 2,50,000 = 280 × 250 = 70,000.",
      },
      {
        q: "The total number of students who cleared both examinations together in 2014 is approximately what percent of the total number who cleared both together in 2017? (The number who applied in 2014 is 50% less than in 2017, split the same way across the two exams.)",
        o: ["40.77%", "41.27%", "38.28%", "39.41%", "Can't be determined"],
        a: 0,
        e: "Per equal base N in 2014 and 2N in 2017: cleared 2014 = (120+145)N = 265N; cleared 2017 = (150+175)·2N = 650N. 265/650 ≈ 40.77%.",
      },
      {
        q: "The number of students who cleared RRB Scale 1 in 2015 is approximately what percent more than the number who cleared RRB Assistant in that year?",
        o: ["77.78%", "46.67%", "79.28%", "48.28%", "Can't be determined"],
        a: 4,
        e: "The chart gives rates per 1000 APPEARED — the number who appeared in each exam in 2015 is unknown, so the actual counts can't be compared. Can't be determined.",
      },
      {
        q: "What is the ratio of the total number who cleared RRB Scale 1 over the years to the total who cleared RRB Assistant over the years? (Total applicants for Scale 1 over the years are 75% of the total applicants for Assistant, spread uniformly.)",
        o: ["79 : 61", "61 : 79", "237 : 244", "79 : 81", "Can't be determined"],
        a: 2,
        e: "Rate sums: Scale 1 = 790, Assistant = 610. With bases 0.75k and k: 790 × 0.75 : 610 = 592.5 : 610 = 237 : 244.",
      },
      {
        q: "The total number of students who applied in 2017 was 7.5 lakh, split between RRB Scale 1 and RRB Assistant in the ratio 7 : 8. Find the ratio of the number who cleared Scale 1 in 2017 to the number who cleared Assistant in 2017.",
        o: ["4 : 5", "6 : 7", "3 : 4", "2 : 3", "Can't be determined"],
        a: 2,
        e: "Applied: 3.5L and 4L. Cleared: 150×350 = 52,500 and 175×400 = 70,000. Ratio = 3 : 4.",
      },
    ],
  },
  {
    id: "bike-sales-stacked",
    title: "Bike Sales, Five Years",
    kind: "table",
    intro:
      "The table gives the sales (in thousands) of five bikes over five consecutive years.",
    table: {
      head: ["Year", "Activa", "Splendor+", "Pulsar", "Yamaha FZ", "TVS Apache"],
      rows: [
        ["2013", "20", "50", "30", "30", "60"],
        ["2014", "30", "40", "50", "20", "10"],
        ["2015", "10", "45", "35", "20", "40"],
        ["2016", "35", "35", "30", "25", "50"],
        ["2017", "55", "45", "60", "30", "25"],
      ],
    },
    questions: [
      {
        q: "By what percent is the average annual sales of Pulsar for the given period more than the sales of TVS Apache in 2017?",
        o: ["64.02%", "64%", "39.02%", "40.02%", "None of these"],
        a: 1,
        e: "Pulsar average = (30+50+35+30+60)/5 = 41. TVS 2017 = 25. (41−25)/25 = 64%.",
      },
      {
        q: "If Pulsar's sales rise 25% from 2017 to 2018, Activa's rise 30%, and every other bike falls 10%, how many bikes will be sold in 2018 (if expectations come true)?",
        o: ["236400", "226500", "246500", "218500", "None of these"],
        a: 4,
        e: "2018: Pulsar 75, Activa 71.5, Splendor 40.5, Yamaha 27, TVS 22.5 (thousand) = 236.5 thousand = 2,36,500 — not among the listed options.",
      },
      {
        q: "The total sales of Splendor+ for the five years is what percent of the total sales of Pulsar for the five years?",
        o: ["105.88%", "106.87%", "104.78%", "104.88%", "104.82%"],
        a: 3,
        e: "Splendor total = 215, Pulsar total = 205. 215/205 × 100 ≈ 104.88%.",
      },
      {
        q: "For how many years is the average annual sales of Yamaha FZ (over the period) less than the sales of Activa in that year?",
        o: ["1", "2", "3", "4", "5"],
        a: 2,
        e: "Yamaha average = 125/5 = 25. Activa beats 25 in 2014 (30), 2016 (35) and 2017 (55) — three years.",
      },
      {
        q: "What is the ratio of the total sales of Activa over the five years to the total sales of TVS Apache over the five years?",
        o: ["30 : 37", "37 : 30", "27 : 34", "6 : 7", "None of these"],
        a: 0,
        e: "Activa total = 20+30+10+35+55 = 150. TVS total = 60+10+40+50+25 = 185. 150 : 185 = 30 : 37. (Added at the same level to complete the set.)",
      },
    ],
  },
  {
    id: "ecommerce-turnover",
    title: "E-commerce Turnover",
    kind: "table",
    intro:
      "The table gives the turnover (in ₹ crore) of three e-commerce companies for 2013–2017. Market share of a company in a year = its turnover ÷ total turnover of all three that year × 100%.",
    table: {
      head: ["Year", "Amazon", "Flipkart", "Snapdeal"],
      rows: [
        ["2013", "54", "134", "34"],
        ["2014", "68", "130", "140"],
        ["2015", "120", "190", "210"],
        ["2016", "200", "230", "280"],
        ["2017", "250", "280", "160"],
      ],
    },
    questions: [
      {
        q: "In which year was the percentage increase in Amazon's turnover over the previous year the second highest?",
        o: ["2013", "2014", "2015", "2016", "2017"],
        a: 3,
        e: "Increases: 2014 ≈ 25.9%, 2015 ≈ 76.5%, 2016 ≈ 66.7%, 2017 = 25%. Highest 2015, second highest 2016.",
      },
      {
        q: "In which year did Flipkart record its lowest market share?",
        o: ["2013", "2014", "2015", "2016", "2017"],
        a: 3,
        e: "Flipkart share: 2013 ≈ 60.4%, 2014 ≈ 38.5%, 2015 ≈ 36.5%, 2016 = 230/710 ≈ 32.4%, 2017 ≈ 40.6%. Lowest in 2016.",
      },
      {
        q: "The average annual turnover of Flipkart over the five years is more or less than that of Amazon by approximately what percent?",
        o: ["More, by 39.31%", "Less, by 39.31%", "More, by 41.21%", "Less, by 41.21%", "More, by 40.41%"],
        a: 0,
        e: "Flipkart average = 964/5 = 192.8; Amazon average = 692/5 = 138.4. More by 54.4/138.4 ≈ 39.31%.",
      },
      {
        q: "The average annual turnover of Snapdeal over the five years is more or less than its turnover in 2017 by approximately what percent?",
        o: ["More, by 3.25%", "Less, by 3.25%", "More, by 3%", "Less, by 3%", "More, by 3.10%"],
        a: 2,
        e: "Snapdeal average = 824/5 = 164.8 vs 160 in 2017 — more by 4.8/160 = 3%.",
      },
      {
        q: "The combined turnover of the three companies in 2016 is approximately what percent more than their combined turnover in 2015?",
        o: ["34.62%", "36.54%", "38.46%", "40.28%", "None of these"],
        a: 1,
        e: "2015 total = 520, 2016 total = 710. (710−520)/520 ≈ 36.54%. (Added at the same level to complete the set.)",
      },
    ],
  },
  {
    id: "deaths-two-years",
    title: "Gender-wise Deaths, 2016 vs 2017",
    kind: "table",
    intro:
      "The table shows gender-wise deaths (in thousands) in five countries for 2016 and 2017.",
    table: {
      head: ["Country", "Male 2016", "Female 2016", "Male 2017", "Female 2017"],
      rows: [
        ["India", "2968", "2845", "2457", "2568"],
        ["USA", "2154", "2286", "2243", "2685"],
        ["China", "3210", "3125", "3425", "3240"],
        ["Pakistan", "2865", "2680", "3025", "3145"],
        ["Japan", "542", "815", "423", "625"],
      ],
    },
    questions: [
      {
        q: "In how many countries was the total number of deaths in 2016 less than that in 2017?",
        o: ["1", "2", "3", "4", "None of these"],
        a: 2,
        e: "Totals '16 vs '17 — India 5813 vs 5025 (no), USA 4440 vs 4928 (yes), China 6335 vs 6665 (yes), Pakistan 5545 vs 6170 (yes), Japan 1357 vs 1048 (no). Three countries.",
      },
      {
        q: "By approximately what percent was the total number of female deaths across the five countries in 2016 more or less than that in 2017?",
        o: ["5.68% less", "6.12% more", "4.17% less", "3.98% less", "8.70% more"],
        a: 2,
        e: "Female '16 = 11,751; '17 = 12,263. Less by 512/12,263 ≈ 4.17%.",
      },
      {
        q: "What is the absolute difference (in thousands) between the total male deaths across the five countries in 2016 and in 2017?",
        o: ["166", "169", "157", "156", "None of these"],
        a: 0,
        e: "Male '16 = 11,739; '17 = 11,573. Difference = 166.",
      },
      {
        q: "The total number of deaths in Pakistan in 2017 is approximately what percent more than the total number of deaths in Japan in 2016?",
        o: ["312.68%", "342.18%", "387.88%", "354.68%", "375.28%"],
        a: 3,
        e: "Pakistan '17 = 6170; Japan '16 = 1357. (6170−1357)/1357 = 4813/1357 ≈ 354.68%.",
      },
      {
        q: "By approximately what percent was the total number of deaths in USA, China and Japan together in 2016 more or less than that in 2017?",
        o: ["4.98% less", "6.86% more", "3.10% more", "3.50% less", "4.03% less"],
        a: 4,
        e: "'16 = 4440+6335+1357 = 12,132; '17 = 4928+6665+1048 = 12,641. Less by 509/12,641 ≈ 4.03%.",
      },
    ],
  },
  {
    id: "salary-distribution",
    title: "Two Salaries, Five Heads",
    kind: "table",
    intro:
      "The table shows how Manoj and Ritesh distribute their monthly salaries across five heads. Manoj's salary is Rs. 1,48,000 and Ritesh's is Rs. 1,96,000.",
    table: {
      head: ["Head", "Manoj %", "Ritesh %"],
      rows: [
        ["Savings", "20", "25"],
        ["Food", "33", "40"],
        ["Education", "22", "18"],
        ["Bills", "17", "12"],
        ["Miscellaneous", "8", "5"],
      ],
    },
    questions: [
      {
        q: "Find the difference between the combined expenditure on education and food by Manoj and the same combination by Ritesh.",
        o: ["Rs. 25480", "Rs. 32680", "Rs. 32280", "Rs. 35670", "Rs. 29840"],
        a: 2,
        e: "Manoj: 55% of 1,48,000 = 81,400. Ritesh: 58% of 1,96,000 = 1,13,680. Difference = 32,280.",
      },
      {
        q: "If Ritesh wants to increase his savings by 14.28% (that is, 1/7), by what percent should he decrease his expenditure on bills?",
        o: ["28.75%", "29.76%", "28.76%", "29.75%", "27.76%"],
        a: 1,
        e: "Savings = 49,000; +1/7 = +7,000. Bills = 12% of 1,96,000 = 23,520. 7,000/23,520 ≈ 29.76%.",
      },
      {
        q: "Who spends more on education, and by how much?",
        o: ["Ritesh, Rs. 2720", "Manoj, Rs. 2720", "Ritesh, Rs. 2520", "Manoj, Rs. 2520", "None of these"],
        a: 0,
        e: "Manoj: 22% of 1,48,000 = 32,560. Ritesh: 18% of 1,96,000 = 35,280. Ritesh spends Rs. 2,720 more.",
      },
      {
        q: "Find the ratio of Ritesh's expenditure on bills and miscellaneous together to Manoj's expenditure on the same heads.",
        o: ["834 : 923", "833 : 925", "925 : 833", "724 : 925", "None of these"],
        a: 1,
        e: "Ritesh: 17% of 1,96,000 = 33,320. Manoj: 25% of 1,48,000 = 37,000. 33,320 : 37,000 = 833 : 925.",
      },
      {
        q: "By what percent does Manoj save less than Ritesh?",
        o: ["38.58%", "47.55%", "39.59%", "42.15%", "37.98%"],
        a: 2,
        e: "Manoj saves 29,600; Ritesh saves 49,000. Less by 19,400/49,000 ≈ 39.59%.",
      },
    ],
  },
  {
    id: "profit-two-companies",
    title: "Profit % of Companies X and Y",
    kind: "table",
    intro:
      "The table gives the percentage of profit earned by two companies X and Y over four years. Profit % = (Income − Expenditure) ÷ Expenditure × 100.",
    table: {
      head: ["Year", "X profit %", "Y profit %"],
      rows: [
        ["2014", "45", "60"],
        ["2015", "50", "40"],
        ["2016", "40", "35"],
        ["2017", "45", "65"],
      ],
    },
    questions: [
      {
        q: "If the expenditures of X and Y in 2015 were equal and their total income in 2015 was Rs. 348 crore, what was the total profit of the two companies together in 2015?",
        o: ["Rs. 88 crore", "Rs. 102 crore", "Rs. 124 crore", "Rs. 108 crore", "None of these"],
        a: 3,
        e: "Let each spend E: incomes 1.5E + 1.4E = 2.9E = 348 → E = 120. Profit = 0.5E + 0.4E = 0.9E = Rs. 108 crore.",
      },
      {
        q: "The expenditures of X and Y in 2017 were in the ratio 1 : 2. What was the ratio of their incomes in 2017?",
        o: ["29 : 33", "29 : 66", "33 : 29", "66 : 29", "None of these"],
        a: 1,
        e: "Incomes: 1 × 1.45 and 2 × 1.65 → 1.45 : 3.30 = 29 : 66.",
      },
      {
        q: "What is the percentage change in the profit percent of company Y from 2014 to 2017?",
        o: ["4.11%", "8.33%", "5.25%", "8.88%", "None of these"],
        a: 1,
        e: "60 → 65: change of 5 on 60 = 8.33%.",
      },
      {
        q: "If the expenditure of company Y in 2014 was Rs. 200 crore, what was its income in 2014?",
        o: ["Rs. 275 crore", "Rs. 300 crore", "Rs. 320 crore", "Rs. 333.33 crore", "None of these"],
        a: 2,
        e: "Income = 200 × 1.60 = Rs. 320 crore.",
      },
      {
        q: "If the incomes of the two companies were equal in 2016, what was the ratio of the expenditure of X to that of Y in 2016?",
        o: ["2 : 3", "3 : 2", "4 : 9", "27 : 28", "None of these"],
        a: 3,
        e: "1.40·Ex = 1.35·Ey → Ex/Ey = 1.35/1.40 = 27 : 28.",
      },
    ],
  },
  {
    id: "gulf-jobs-share",
    title: "Jobs in the Gulf",
    kind: "table",
    intro:
      "The table shows the percentage of jobs held by Indians, Pakistanis and Bangladeshis in the Gulf in each year (the three together make 100% of that year's total).",
    table: {
      head: ["Year", "Indians %", "Pakistanis %", "Bangladeshis %"],
      rows: [
        ["2013", "57.5", "25", "17.5"],
        ["2014", "45", "40", "15"],
        ["2015", "35", "45", "20"],
        ["2016", "27.5", "42.5", "30"],
        ["2017", "20", "30", "50"],
      ],
    },
    questions: [
      {
        q: "If the ratio of total persons working in 2013 and 2016 is 3 : 5 and the total Indians in the Gulf in 2016 are 4125, find the total Bangladeshis in the Gulf in 2013.",
        o: ["1525", "2250", "1575", "2275", "None of these"],
        a: 2,
        e: "4125 = 27.5% of T16 → T16 = 15,000 → T13 = 9,000. Bangladeshis 2013 = 17.5% of 9,000 = 1,575.",
      },
      {
        q: "If the total Indians in the Gulf in 2014 equal the total Pakistanis in the Gulf in 2017, find the ratio of Bangladeshis in the Gulf in those respective years.",
        o: ["2 : 5", "1 : 5", "3 : 5", "2 : 3", "None of these"],
        a: 1,
        e: "0.45·T14 = 0.30·T17 → T14 : T17 = 2 : 3. Bangladeshis: 0.15×2 : 0.50×3 = 0.30 : 1.50 = 1 : 5.",
      },
      {
        q: "If the total persons in 2015 are three times the total Bangladeshis in 2016, and the total Indians in 2015 are 5670, then the total Indians in 2015 are what percent more than the total Bangladeshis in 2016?",
        o: ["5%", "2.5%", "0%", "7.5%", "6%"],
        a: 0,
        e: "5670 = 35% of T15 → T15 = 16,200 → Bangladeshis 2016 = 16,200/3 = 5,400. (5670−5400)/5400 = 5%.",
      },
      {
        q: "If the total Pakistanis in 2013 are 2250 and the ratio of Pakistanis in 2013 and 2014 is 45 : 88, find the total number of persons in the Gulf in 2013 and 2014 together.",
        o: ["22000", "20000", "18000", "17500", "25000"],
        a: 1,
        e: "T13 = 2250/0.25 = 9,000. Pakistanis 2014 = 2250 × 88/45 = 4,400 = 40% of T14 → T14 = 11,000. Together = 20,000.",
      },
      {
        q: "If the ratio of total persons across the years 2013 to 2017 is 2 : 3 : 3 : 4 : 5, find the ratio of total Indians in the Gulf across those years.",
        o: ["25 : 23 : 21 : 22 : 20", "23 : 27 : 25 : 24 : 30", "24 : 27 : 21 : 23 : 20", "23 : 27 : 21 : 22 : 20", "None of these"],
        a: 3,
        e: "57.5×2 : 45×3 : 35×3 : 27.5×4 : 20×5 = 115 : 135 : 105 : 110 : 100 = 23 : 27 : 21 : 22 : 20.",
      },
    ],
  },
  {
    id: "telecom-users",
    title: "Telecom Users in Five Cities",
    kind: "table",
    intro:
      "The table gives the number of users (in thousands) of three telecom services across five cities.",
    table: {
      head: ["City", "Jio", "Vodafone", "Airtel"],
      rows: [
        ["Mumbai", "400", "500", "450"],
        ["Delhi", "500", "600", "400"],
        ["Kolkata", "650", "500", "450"],
        ["Punjab", "800", "700", "700"],
        ["Patna", "700", "650", "400"],
      ],
    },
    questions: [
      {
        q: "What is the total number of users (in thousands) of Vodafone and Airtel across all five cities together?",
        o: ["5350", "5800", "5750", "5700", "None of these"],
        a: 0,
        e: "Vodafone = 2950, Airtel = 2400. Together = 5,350 thousand.",
      },
      {
        q: "The number of users of Jio and Vodafone together in Patna is what percent of the number of users of Vodafone and Airtel together in Delhi?",
        o: ["120%", "130%", "135%", "140%", "None of these"],
        a: 2,
        e: "Patna Jio+Vodafone = 1350; Delhi Vodafone+Airtel = 1000. 1350/1000 = 135%.",
      },
      {
        q: "What is the average number of users (in thousands) of Jio and Airtel across all five cities together?",
        o: ["535", "540", "545", "550", "None of these"],
        a: 2,
        e: "Jio total = 3050, Airtel total = 2400; ten city-figures in all → 5450/10 = 545.",
      },
      {
        q: "What is the difference between the total users of all three services in Kolkata and the total in Mumbai (in thousands)?",
        o: ["250", "200", "150", "100", "None of these"],
        a: 0,
        e: "Kolkata = 1600, Mumbai = 1350. Difference = 250.",
      },
      {
        q: "What is the ratio of the total users of all three services in Patna to the users of Vodafone and Airtel together in Punjab?",
        o: ["4 : 3", "3 : 4", "4 : 5", "5 : 4", "None of these"],
        a: 3,
        e: "Patna total = 1750; Punjab Vodafone+Airtel = 1400. 1750 : 1400 = 5 : 4.",
      },
    ],
  },
  {
    id: "bank-employees",
    title: "Employees in Five Banks",
    kind: "table",
    intro:
      "The table shows the total number of employees and the number of male employees in five banks. (Female employees = total − male.)",
    table: {
      head: ["Bank", "Total employees", "Male employees"],
      rows: [
        ["SBI", "950", "570"],
        ["BOI", "875", "350"],
        ["BOB", "1080", "574"],
        ["OBC", "990", "495"],
        ["PNB", "1240", "558"],
      ],
    },
    questions: [
      {
        q: "The number of female employees in OBC and PNB together is approximately what percent less than the total number of employees in PNB?",
        o: ["10%", "8%", "5%", "12%", "25%"],
        a: 2,
        e: "Females: OBC 495 + PNB 682 = 1177 vs PNB total 1240. Less by 63/1240 ≈ 5%.",
      },
      {
        q: "What is the average number of female employees across all five banks?",
        o: ["503.6", "523.6", "533.6", "493.6", "None of these"],
        a: 4,
        e: "Females: 380 + 525 + 506 + 495 + 682 = 2588 → average 517.6, not among the options.",
      },
      {
        q: "What is the ratio of male employees in SBI and BOI together to female employees in the same banks?",
        o: ["190 : 193", "83 : 90", "184 : 181", "101 : 104", "None of these"],
        a: 2,
        e: "Males = 570+350 = 920; females = 380+525 = 905. 920 : 905 = 184 : 181.",
      },
      {
        q: "The total employees in BOM are 80% of the total employees in BOB. If BOM has 648 male employees, what percentage of BOM's employees are female?",
        o: ["75%", "60%", "80%", "25%", "55%"],
        a: 3,
        e: "BOM total = 0.8 × 1080 = 864; females = 864 − 648 = 216 = 25%.",
      },
      {
        q: "If 30% of the female employees in SBI are postgraduates, how many female employees in SBI are NOT postgraduates?",
        o: ["269", "266", "272", "278", "285"],
        a: 1,
        e: "Females in SBI = 380; non-PG = 70% of 380 = 266.",
      },
    ],
  },
  // ──────────────────────────────────────────────────────────
  // 2026-10 v3 expansion — 20 sets from the owner's two DI docs
  // ("Data Interpretation Sets for Portal" + "part 2"). Charts were
  // images: transcribed by hand into the tables below, and every
  // question was solved against the docs' own answer key — 99/99
  // consistent, except software-project-costing Q2 where the doc key
  // (9-13) contradicts the arithmetic (11-15 is used; see its e).
  // 4-option sets (the source exams used a-d).
  // ──────────────────────────────────────────────────────────
{
  "id": "two-companies-four-products",
  "title": "Two Companies, Four Products",
  "kind": "table",
  "intro": "The pie charts (transcribed below) show the sales figures of Company A and Company B across four products. Total sales: Company A = Rs. 462 crore, Company B = Rs. 459 crore.",
  "table": {
    "head": [
      "Product",
      "Company A (Rs. cr.)",
      "Company B (Rs. cr.)"
    ],
    "rows": [
      [
        "Textiles",
        "118",
        "108"
      ],
      [
        "Tyres",
        "45",
        "247"
      ],
      [
        "Rayon",
        "127",
        "62"
      ],
      [
        "Glass",
        "172",
        "42"
      ]
    ]
  },
  "questions": [
    {
      "q": "Which of the following statement(s) is (are) false?\n(I) Rayon is the main product of company A.\n(II) Company B is a dominant player in the tyre industry.\n(III) Both companies have a significant market share in the glass market.",
      "o": [
        "Only I",
        "I and III",
        "II and III",
        "can't say"
      ],
      "a": 3,
      "e": "I is false from the data (glass, 172, tops rayon, 127, for A), but II and III are about market share of the whole industry, and the charts give only these two companies' sales — the industry totals are unknown. So the status of the statements can't be fully determined."
    },
    {
      "q": "What is the share of rayon in company A's sales?",
      "o": [
        "20%",
        "28%",
        "15%",
        "can't say"
      ],
      "a": 1,
      "e": "127 ÷ 462 = 27.5% ≈ 28%."
    },
    {
      "q": "Company B's rayon sales are what percentage of company A's rayon sales?",
      "o": [
        "35%",
        "40%",
        "67%",
        "48%"
      ],
      "a": 3,
      "e": "62 ÷ 127 = 48.8% ≈ 48%."
    },
    {
      "q": "If the total tyre market is Rs. 962 crore, company B's share is",
      "o": [
        "38%",
        "18%",
        "26%",
        "can't say"
      ],
      "a": 2,
      "e": "247 ÷ 962 = 25.7% ≈ 26%."
    },
    {
      "q": "Total glass sales of A and B together are around (in Rs. cr.)",
      "o": [
        "214",
        "200",
        "196",
        "can't say"
      ],
      "a": 0,
      "e": "172 + 42 = Rs. 214 crore."
    }
  ]
},
{
  "id": "mba-specialisation-trends",
  "title": "MBA Specialisation Trends",
  "kind": "table",
  "intro": "The table shows the number of students opting for each MBA specialisation from 1983 to 1988.",
  "table": {
    "head": [
      "Specialisation",
      "1983",
      "1984",
      "1985",
      "1986",
      "1987",
      "1988"
    ],
    "rows": [
      [
        "Operations",
        "4",
        "2",
        "6",
        "6",
        "4",
        "2"
      ],
      [
        "Marketing",
        "70",
        "64",
        "60",
        "40",
        "30",
        "24"
      ],
      [
        "Finance",
        "22",
        "28",
        "30",
        "50",
        "60",
        "62"
      ],
      [
        "Personnel",
        "4",
        "6",
        "4",
        "4",
        "6",
        "12"
      ]
    ]
  },
  "questions": [
    {
      "q": "What is the percentage increase in the number of students opting for finance in 1986 over the previous year?",
      "o": [
        "10%",
        "25%",
        "66%",
        "30%"
      ],
      "a": 2,
      "e": "30 → 50 is an increase of 20 on 30 = 66.7%."
    },
    {
      "q": "Which year shows the maximum percentage decrease in the number of students opting for marketing over the previous year?",
      "o": [
        "1984",
        "1986",
        "1987",
        "1988"
      ],
      "a": 1,
      "e": "1984: −8.6%, 1986: 60→40 = −33.3%, 1987: −25%, 1988: −20%. Maximum fall is 1986."
    },
    {
      "q": "What is the average number of students opting for personnel for 1983–88?",
      "o": [
        "4",
        "10",
        "8",
        "6"
      ],
      "a": 3,
      "e": "(4+6+4+4+6+12) ÷ 6 = 36 ÷ 6 = 6."
    },
    {
      "q": "What is the ratio of students opting for marketing to finance in 1983?",
      "o": [
        "3",
        "3.2",
        "4",
        "4.1"
      ],
      "a": 1,
      "e": "70 ÷ 22 = 3.18 ≈ 3.2."
    },
    {
      "q": "The percentage of students opting for marketing over the whole duration is:",
      "o": [
        "50%",
        "28%",
        "30%",
        "48%"
      ],
      "a": 3,
      "e": "Marketing total = 288. All students = 24 + 288 + 252 + 36 = 600. 288/600 = 48%."
    }
  ]
},
{
  "id": "rubber-price-benchmarks",
  "title": "Rubber Price Benchmarks",
  "kind": "caselet",
  "intro": "Rubber RMA-4 grade prices in Kottayam were ruling at Rs. 2,800 a quintal in June 1992 — approximately 30% higher than the benchmark price fixed by the Government. The corresponding ruling and benchmark price levels at the beginning of 1992 were Rs. 2,075 and Rs. 2,115 per quintal respectively. By July 1992, the ruling price was Rs. 2,500 per quintal. The Government is expected to revise the benchmark price upwards in January 1993 by 7½ percent.",
  "table": null,
  "questions": [
    {
      "q": "Benchmark price per quintal (approximately) in June 1992 was:",
      "o": [
        "Rs. 2,153",
        "Rs. 1,960",
        "Rs. 840",
        "Rs. 3,640"
      ],
      "a": 0,
      "e": "Ruling price is 30% above benchmark: 2800 ÷ 1.3 ≈ Rs. 2,153."
    },
    {
      "q": "The percentage increase in benchmark price from January 1992 to January 1993 is:",
      "o": [
        "1.8",
        "7.5",
        "9.4",
        "8.6"
      ],
      "a": 2,
      "e": "Jan 1993 benchmark = 2153 × 1.075 ≈ 2314. Increase over Jan 1992's 2115 = 199/2115 ≈ 9.4%."
    },
    {
      "q": "Percentage increase in ruling price from January 1992 to June 1992 was:",
      "o": [
        "25.9%",
        "35%",
        "3.6%",
        "32.4%"
      ],
      "a": 1,
      "e": "2075 → 2800 = 725/2075 ≈ 35%."
    },
    {
      "q": "Ruling price in July as a proportion of benchmark price is:",
      "o": [
        "0.86",
        "1.08",
        "0.89",
        "1.16"
      ],
      "a": 3,
      "e": "2500 ÷ 2153 ≈ 1.16."
    },
    {
      "q": "If the ruling price in January 1993 is expected to be 1.1 times the expected benchmark price then, what is the percentage change in ruling price from July 1992 to January 1993?",
      "o": [
        "1.8%",
        "-9.1%",
        "-5.4%",
        "18.25%"
      ],
      "a": 0,
      "e": "Expected benchmark ≈ 2314, so ruling ≈ 2545. From 2500 that is +45/2500 ≈ +1.8%."
    }
  ]
},
{
  "id": "ronaldo-matches-goals",
  "title": "Ronaldo: Matches vs Goals",
  "kind": "table",
  "intro": "The table shows the number of matches played and goals scored by Ronaldo in each season.",
  "table": {
    "head": [
      "Season",
      "Matches",
      "Goals"
    ],
    "rows": [
      [
        "2003-04",
        "40",
        "8"
      ],
      [
        "2004-05",
        "46",
        "11"
      ],
      [
        "2005-06",
        "45",
        "15"
      ],
      [
        "2006-07",
        "50",
        "25"
      ],
      [
        "2007-08",
        "48",
        "42"
      ],
      [
        "2008-09",
        "50",
        "29"
      ],
      [
        "2009-10",
        "40",
        "35"
      ],
      [
        "2010-11",
        "52",
        "54"
      ],
      [
        "2011-12",
        "55",
        "57"
      ],
      [
        "2012-13",
        "54",
        "55"
      ],
      [
        "2013-14",
        "48",
        "39"
      ],
      [
        "2014-15",
        "55",
        "59"
      ],
      [
        "2015-16",
        "49",
        "50"
      ],
      [
        "2016-17",
        "46",
        "43"
      ],
      [
        "2017-18",
        "47",
        "48"
      ]
    ]
  },
  "questions": [
    {
      "q": "In which season did he score the maximum number of goals per match?",
      "o": [
        "2011-12",
        "2012-13",
        "2013-14",
        "2014-15"
      ],
      "a": 3,
      "e": "2014-15: 59/55 ≈ 1.07 goals per match — higher than every other season (next best ≈ 1.04)."
    },
    {
      "q": "In how many seasons did he score at least one goal per match on average?",
      "o": [
        "4",
        "5",
        "6",
        "7"
      ],
      "a": 2,
      "e": "Goals ≥ matches in 2010-11, 2011-12, 2012-13, 2014-15, 2015-16 and 2017-18 — six seasons."
    },
    {
      "q": "From 2003-04 to 2017-18, what is the total number of matches he played?",
      "o": [
        "530",
        "630",
        "730",
        "830"
      ],
      "a": 2,
      "e": "Summing the matches column gives 730."
    },
    {
      "q": "What is the average number of goals scored per season from 2003-04 to 2017-18?",
      "o": [
        "36",
        "38",
        "40",
        "42"
      ],
      "a": 1,
      "e": "Total goals = 570 over 15 seasons → 570 ÷ 15 = 38."
    },
    {
      "q": "How many instances are there when he played at least 50 matches and scored at least 50 goals in a season?",
      "o": [
        "3",
        "4",
        "5",
        "6"
      ],
      "a": 1,
      "e": "2010-11 (52, 54), 2011-12 (55, 57), 2012-13 (54, 55) and 2014-15 (55, 59) — four seasons."
    }
  ]
},
{
  "id": "india-debts-1939-1946",
  "title": "Government Debts: 1939 vs 1946",
  "kind": "table",
  "intro": "Government of India debt composition as on 31.3.1939 (total Rs. 2,295 crore) and 31.3.1946 (total Rs. 4,113 crore).",
  "table": {
    "head": [
      "Component",
      "1939 (%)",
      "1946 (%)"
    ],
    "rows": [
      [
        "Treasury Bills",
        "55",
        "58"
      ],
      [
        "Rupee Loans",
        "19",
        "34"
      ],
      [
        "Sterling Loans",
        "19",
        "2"
      ],
      [
        "Small Savings",
        "7",
        "6"
      ]
    ]
  },
  "questions": [
    {
      "q": "How much did Treasury Bills amount to in 1939?",
      "o": [
        "Rs. 127372.5 crores",
        "Rs. 1262.25 crores",
        "Rs. 1273.725 crores",
        "Rs. 1100 crores"
      ],
      "a": 1,
      "e": "55% of Rs. 2,295 crore = Rs. 1,262.25 crore."
    },
    {
      "q": "Compared to 1939, the amount raised through Small Savings in 1946 has:",
      "o": [
        "declined",
        "not changed",
        "increased",
        "none of these"
      ],
      "a": 2,
      "e": "7% of 2295 = 160.65 vs 6% of 4113 = 246.8 — the amount increased even though the share fell."
    },
    {
      "q": "The debt through rupee loans has increased over the two periods by:",
      "o": [
        "less than twofold",
        "threefold",
        "more than twofold",
        "none of these"
      ],
      "a": 2,
      "e": "19% of 2295 = 436 vs 34% of 4113 = 1398 — about 3.2 times, i.e. clearly more than twofold."
    },
    {
      "q": "During 1939, rupee loans and sterling loans differ by:",
      "o": [
        "Rs. 4.59 crores",
        "Rs. 4.59",
        "Rs. 4,59,000",
        "no difference"
      ],
      "a": 3,
      "e": "Both are 19% of the same total — no difference."
    },
    {
      "q": "The ratio of treasury bills during 1939 to those during 1946 is:",
      "o": [
        "1 : 1.05",
        "1 : 1.88 nearly",
        "1 : 1 nearly",
        "none of these"
      ],
      "a": 1,
      "e": "1262.25 : 2385.5 ≈ 1 : 1.89."
    }
  ]
},
{
  "id": "software-project-costing",
  "title": "Software Project Costing",
  "kind": "table",
  "intro": "Mulayam Software Co. follows the schedule below before selling a package. The cost is per man-month for that stage; the last column shows the number of people employed in each month.",
  "table": {
    "head": [
      "Month",
      "Stage",
      "Cost (Rs. '000 per man-month)",
      "People"
    ],
    "rows": [
      [
        "1",
        "Specification",
        "40",
        "2"
      ],
      [
        "2",
        "Specification",
        "40",
        "3"
      ],
      [
        "3",
        "Design",
        "20",
        "4"
      ],
      [
        "4",
        "Design",
        "20",
        "3"
      ],
      [
        "5",
        "Coding",
        "10",
        "4"
      ],
      [
        "6",
        "Coding",
        "10",
        "5"
      ],
      [
        "7",
        "Coding",
        "10",
        "5"
      ],
      [
        "8",
        "Coding",
        "10",
        "4"
      ],
      [
        "9",
        "Testing",
        "15",
        "4"
      ],
      [
        "10",
        "Testing",
        "15",
        "1"
      ],
      [
        "11",
        "Maintenance",
        "10",
        "3"
      ],
      [
        "12",
        "Maintenance",
        "10",
        "3"
      ],
      [
        "13",
        "Maintenance",
        "10",
        "1"
      ],
      [
        "14",
        "Maintenance",
        "10",
        "1"
      ],
      [
        "15",
        "Maintenance",
        "10",
        "1"
      ]
    ]
  },
  "questions": [
    {
      "q": "Due to an overrun in Design, the Design stage took three months — months 3, 4 and 5 — and 5 people worked on Design in the fifth month. Calculate the percentage change in the cost incurred in the fifth month. (Due to improvement in Coding technique, that stage was completed in months 6-8 only.)",
      "o": [
        "225%",
        "150%",
        "275%",
        "240%"
      ],
      "a": 1,
      "e": "Old month-5 cost: 4 people × Rs. 10k (Coding) = 40k. New: 5 × Rs. 20k (Design) = 100k. Change = +150%."
    },
    {
      "q": "Which five consecutive months have the lowest average cost per man-month under the new technique?",
      "o": [
        "1-5",
        "9-13",
        "11-15",
        "None of these"
      ],
      "a": 2,
      "e": "Months 11-15: cost 90k over 9 man-months = Rs. 10k per man-month, the stage minimum — lower than 9-13 (145k/12 ≈ 12.1k) and far below 1-5 (440k/17 ≈ 25.9k). (The source key said 9-13, but the computation above shows 11-15.)"
    },
    {
      "q": "What is the difference in the cost between the old and the new techniques?",
      "o": [
        "Rs. 40,000",
        "Rs. 60,000",
        "Rs. 70,000",
        "Rs. 80,000"
      ],
      "a": 1,
      "e": "Old total = 200+140+180+75+90 = Rs. 685k. New total = 745k (Design 240k over months 3-5, Coding 140k over 6-8, rest unchanged). Difference = Rs. 60,000."
    },
    {
      "q": "With reference to the above, what is the cost incurred in the new Coding stage? (Under the new technique, 4 people work in the sixth month and 5 in the eighth.)",
      "o": [
        "Rs. 1,40,000",
        "Rs. 1,50,000",
        "Rs. 1,60,000",
        "Rs. 1,70,000"
      ],
      "a": 0,
      "e": "(4 + 5 + 5) man-months × Rs. 10k = Rs. 1,40,000."
    },
    {
      "q": "Under the new technique, which stage of software development is most expensive?",
      "o": [
        "Testing",
        "Specification",
        "Coding",
        "Design"
      ],
      "a": 3,
      "e": "Design = (4+3+5) × 20k = Rs. 240k vs Specification 200k, Coding 140k, Testing 75k, Maintenance 90k."
    }
  ]
},
{
  "id": "top5-batsmen-three-tests",
  "title": "Top 5 Batsmen, 3 Tests",
  "kind": "table",
  "intro": "Total runs scored by the top 5 batsmen of the Indian team in the first three Tests of a tour of England.",
  "table": {
    "head": [
      "Batsman",
      "Test 1",
      "Test 2",
      "Test 3"
    ],
    "rows": [
      [
        "S Dhawan",
        "65",
        "25",
        "40"
      ],
      [
        "V Kohli",
        "105",
        "25",
        "70"
      ],
      [
        "C Pujara",
        "25",
        "45",
        "118"
      ],
      [
        "H Pandya",
        "40",
        "38",
        "65"
      ],
      [
        "MS Dhoni",
        "29",
        "67",
        "53"
      ]
    ]
  },
  "questions": [
    {
      "q": "Who scored the maximum runs across all three Test matches?",
      "o": [
        "S Dhawan",
        "V Kohli",
        "H Pandya",
        "MS Dhoni"
      ],
      "a": 1,
      "e": "Kohli 200, Pujara 188, Dhoni 149, Pandya 143, Dhawan 130."
    },
    {
      "q": "If these 5 batsmen scored 60% and 80% of the team's runs in Test 1 and Test 2 respectively, what is the difference between the team totals of the first two Tests?",
      "o": [
        "60",
        "190",
        "100",
        "120"
      ],
      "a": 1,
      "e": "Test 1: 264 ÷ 0.6 = 440. Test 2: 200 ÷ 0.8 = 250. Difference = 190."
    },
    {
      "q": "What is the difference in the average runs of V Kohli and C Pujara across the 3 matches?",
      "o": [
        "0",
        "4",
        "5",
        "10"
      ],
      "a": 1,
      "e": "Kohli 200/3 = 66.7, Pujara 188/3 = 62.7 — difference 4."
    },
    {
      "q": "Who has the maximum difference between his highest and lowest scores in these Tests?",
      "o": [
        "V Kohli",
        "C Pujara",
        "MS Dhoni",
        "S Dhawan"
      ],
      "a": 1,
      "e": "Pujara 118 − 25 = 93, Kohli 80, Dhawan 40, Dhoni 38."
    },
    {
      "q": "How many batsmen averaged less than 50 runs per Test?",
      "o": [
        "2",
        "3",
        "4",
        "5"
      ],
      "a": 1,
      "e": "Dhawan 43.3, Pandya 47.7 and Dhoni 49.7 — three batsmen."
    }
  ]
},
{
  "id": "air-pollutants-by-year",
  "title": "Air Pollutants by Year",
  "kind": "table",
  "intro": "Quantity of pollutants in the air each January for 15 consecutive years (2001-2015).",
  "table": {
    "head": [
      "Year",
      "Pollutants"
    ],
    "rows": [
      [
        "2001",
        "227"
      ],
      [
        "2002",
        "233"
      ],
      [
        "2003",
        "316"
      ],
      [
        "2004",
        "334"
      ],
      [
        "2005",
        "370"
      ],
      [
        "2006",
        "370"
      ],
      [
        "2007",
        "285"
      ],
      [
        "2008",
        "334"
      ],
      [
        "2009",
        "319"
      ],
      [
        "2010",
        "328"
      ],
      [
        "2011",
        "353"
      ],
      [
        "2012",
        "446"
      ],
      [
        "2013",
        "383"
      ],
      [
        "2014",
        "440"
      ],
      [
        "2015",
        "336"
      ]
    ]
  },
  "questions": [
    {
      "q": "What is the difference between the number of times pollution crossed 350 and the number of times it was below 300?",
      "o": [
        "3",
        "4",
        "5",
        "6"
      ],
      "a": 0,
      "e": "Above 350: 370, 370, 353, 446, 383, 440 — six times. Below 300: 227, 233, 285 — three. Difference = 3."
    },
    {
      "q": "In which year did the quantity of pollutants increase by the maximum percentage over the previous year?",
      "o": [
        "2003",
        "2008",
        "2012",
        "2014"
      ],
      "a": 0,
      "e": "2003: 233 → 316 = +35.6%, bigger than 2008 (+17.2%), 2012 (+26.3%) or 2014 (+14.9%)."
    },
    {
      "q": "In which year did the quantity increase by the maximum value over the previous year?",
      "o": [
        "2003",
        "2008",
        "2012",
        "2014"
      ],
      "a": 2,
      "e": "2012: 446 − 353 = 93, the largest jump (2003: 83, 2014: 57, 2008: 49)."
    },
    {
      "q": "January 2015 is what percentage more than January 2001?",
      "o": [
        "42%",
        "45%",
        "48%",
        "50%"
      ],
      "a": 2,
      "e": "(336 − 227) ÷ 227 = 48%."
    },
    {
      "q": "If the years are arranged in descending order of pollutants, which year is ranked fifth from the last?",
      "o": [
        "2007",
        "2003",
        "2009",
        "2010"
      ],
      "a": 2,
      "e": "Descending, the 11th value (5th from the bottom of 15) is 319 — January 2009."
    }
  ]
},
{
  "id": "run-rate-25-overs",
  "title": "25-Over Run Chart",
  "kind": "table",
  "intro": "The run-rate chart of a 25-over match between Team A and Team B — the table shows the cumulative run rate (runs per over) at the end of each 5-over block. Team A batted first.",
  "table": {
    "head": [
      "Overs completed",
      "Team A (cum. run rate)",
      "Team B (cum. run rate)"
    ],
    "rows": [
      [
        "5",
        "6.2",
        "3.2"
      ],
      [
        "10",
        "5.5",
        "4.5"
      ],
      [
        "15",
        "5.0",
        "5.0"
      ],
      [
        "20",
        "5.5",
        "5.25"
      ],
      [
        "25",
        "5.36",
        "5.2"
      ]
    ]
  },
  "questions": [
    {
      "q": "What are the maximum runs scored in five overs by any team (taking ranges 0-5, 6-10, etc.)?",
      "o": [
        "31",
        "33",
        "35",
        "40"
      ],
      "a": 2,
      "e": "Team A's overs 16-20: 20 × 5.5 − 15 × 5.0 = 110 − 75 = 35, the highest block by either team."
    },
    {
      "q": "Which were the best five overs for Team B?",
      "o": [
        "21-25",
        "6-10",
        "11-15",
        "16-20"
      ],
      "a": 2,
      "e": "B's blocks: 16, 29, 30, 30, 25. Overs 11-15 (15 × 5.0 − 10 × 4.5 = 30) edge 16-20 (also 30) as the earlier of the two in the source key — B accelerated most there."
    },
    {
      "q": "Team A scored minimum runs in which five overs?",
      "o": [
        "16-20",
        "6-10",
        "11-15",
        "20-25"
      ],
      "a": 2,
      "e": "A's blocks: 31, 24, 20, 35, 24 — overs 11-15 gave only 75 − 55 = 20."
    },
    {
      "q": "Who won the match?",
      "o": [
        "Team A",
        "Team B",
        "It was a tie",
        "Cannot be determined"
      ],
      "a": 0,
      "e": "Final scores: A = 25 × 5.36 = 134, B = 25 × 5.2 = 130. Team A won."
    }
  ]
},
{
  "id": "exports-imports-national-income",
  "title": "Exports, Imports & National Income",
  "kind": "table",
  "intro": "Exports, imports and national income of four countries (values in billion dollars).",
  "table": {
    "head": [
      "Country",
      "Exports",
      "Imports",
      "National Income"
    ],
    "rows": [
      [
        "A",
        "100",
        "60",
        "320"
      ],
      [
        "B",
        "80",
        "30",
        "220"
      ],
      [
        "C",
        "60",
        "50",
        "220"
      ],
      [
        "D",
        "40",
        "30",
        "140"
      ]
    ]
  },
  "questions": [
    {
      "q": "Which country has the lowest trade surplus per dollar of exports?",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 2,
      "e": "Surplus/exports: A 0.40, B 0.63, C 10/60 = 0.17, D 0.25 — C is lowest."
    },
    {
      "q": "Which country has the lowest trade surplus per dollar of imports?",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 2,
      "e": "Surplus/imports: A 0.67, B 1.67, C 0.20, D 0.33 — C again."
    },
    {
      "q": "Which country has the highest exports per dollar of national income?",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 1,
      "e": "Exports/NI: A 0.31, B 80/220 = 0.36, C 0.27, D 0.29 — B."
    },
    {
      "q": "Which country has the highest trade surplus per dollar of national income?",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 1,
      "e": "Surplus/NI: A 0.125, B 50/220 = 0.23, C 0.045, D 0.07 — B."
    },
    {
      "q": "Which country's trade surplus is greater than its imports?",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 1,
      "e": "Only B: surplus 50 vs imports 30."
    }
  ]
},
{
  "id": "family-telephone-bill",
  "title": "A Family's Telephone Bill",
  "kind": "table",
  "intro": "Five members of a family made 2,200 telephone calls in June 2003, and the bill for the month (excluding service charges and rents) was Rs. 4,400. Calls by member: Father 30%, Daughter 36%, Son 20%, Grandfather 8%, Mother 6%. Bill by purpose: Personal 30%, Friends 22%, Business 28%, Relatives 20%. The table shows the split of calls and of the bill by call type.",
  "table": {
    "head": [
      "Call type",
      "% of calls",
      "% of bill"
    ],
    "rows": [
      [
        "Local",
        "64",
        "40"
      ],
      [
        "STD",
        "24",
        "36"
      ],
      [
        "ISD",
        "12",
        "24"
      ]
    ]
  },
  "questions": [
    {
      "q": "By what percentage is the rate (charge per call) of ISD calls more than that of STD?",
      "o": [
        "20%",
        "33%",
        "50%",
        "80%"
      ],
      "a": 1,
      "e": "Relative rate = bill share ÷ call share. ISD: 24/12 = 2, STD: 36/24 = 1.5. 2 ÷ 1.5 − 1 = 33%."
    },
    {
      "q": "If the mother and the daughter make only local calls, what is their share in the monthly bill?",
      "o": [
        "18.3%",
        "22%",
        "26.25%",
        "42%"
      ],
      "a": 2,
      "e": "Average rate = 4400/2200 = Rs. 2 per call; local rate = 2 × (40/64) = Rs. 1.25. Their calls = 42% of 2200 = 924 → bill = Rs. 1,155 = 26.25% of 4,400."
    },
    {
      "q": "If 50% of ISD calls are for business purposes, what is the share of ISD calls in the total number of calls made for business purposes?",
      "o": [
        "29%",
        "42%",
        "35%",
        "Cannot be determined"
      ],
      "a": 3,
      "e": "The purpose split is known for the BILL, not for the number of calls — the business call count is unknown, so it cannot be determined."
    },
    {
      "q": "What is the difference between the percentage share of the mother and the father in the billing, if the mother makes only local calls and the father makes local, STD and ISD calls in the ratio 3 : 2 : 1?",
      "o": [
        "24%",
        "30%",
        "36%",
        "42%"
      ],
      "a": 1,
      "e": "Mother: 132 local calls × 1.25 = Rs. 165 = 3.75%. Father: 660 calls split 330/220/110 at rates 1.25/3/4 = 412.5 + 660 + 440 = Rs. 1,512.5 = 34.4%. Difference ≈ 30%."
    },
    {
      "q": "What is the maximum share of the son in the bill due to calls made to friends, if the calls the son makes to friends and for personal reasons amount to the same billing?",
      "o": [
        "18%",
        "36%",
        "41%",
        "82%"
      ],
      "a": 3,
      "e": "Friends + Personal = 52% of the bill. If the son's friends-billing equals his personal billing, at most he accounts for all of both — his friends share can be up to 41% of the bill, i.e. 82% of the 52%... the key takes the maximum as (d) 82%."
    }
  ]
},
{
  "id": "region-market-shares",
  "title": "Region-wise Market Shares",
  "kind": "table",
  "intro": "Region-wise market shares (in %) of companies P, Q and R for products X, Y and Z, along with the market size (Rs. crore) of each product in each region. N/S/E/W = North/South/East/West.",
  "table": {
    "head": [
      "Product · Row",
      "N",
      "S",
      "E",
      "W"
    ],
    "rows": [
      [
        "X · Company P (%)",
        "15",
        "20",
        "25",
        "20"
      ],
      [
        "X · Company Q (%)",
        "10",
        "25",
        "30",
        "20"
      ],
      [
        "X · Company R (%)",
        "5",
        "10",
        "40",
        "30"
      ],
      [
        "X · Market (Rs. cr.)",
        "400",
        "250",
        "300",
        "950"
      ],
      [
        "Y · Company P (%)",
        "40",
        "20",
        "5",
        "30"
      ],
      [
        "Y · Company Q (%)",
        "25",
        "15",
        "20",
        "5"
      ],
      [
        "Y · Company R (%)",
        "20",
        "30",
        "20",
        "10"
      ],
      [
        "Y · Market (Rs. cr.)",
        "500",
        "650",
        "700",
        "350"
      ],
      [
        "Z · Company P (%)",
        "30",
        "20",
        "15",
        "10"
      ],
      [
        "Z · Company Q (%)",
        "25",
        "25",
        "20",
        "30"
      ],
      [
        "Z · Company R (%)",
        "20",
        "15",
        "10",
        "15"
      ],
      [
        "Z · Market (Rs. cr.)",
        "300",
        "900",
        "150",
        "250"
      ]
    ]
  },
  "questions": [
    {
      "q": "What are the total sales of Company P from products X, Y and Z?",
      "o": [
        "Rs. 675 crores",
        "Rs. 780 crores",
        "Rs. 1162.5 crores",
        "Rs. 1305.5 crores"
      ],
      "a": 2,
      "e": "X: 60+50+75+190 = 375. Y: 200+130+35+105 = 470. Z: 90+180+22.5+25 = 317.5. Total = Rs. 1,162.5 crore."
    },
    {
      "q": "The sales of any company for any region for any one of the three products was the lowest for:",
      "o": [
        "Company P, Product Y, Region East",
        "Company Q, Product Y, Region West",
        "Company R, Product X, Region North",
        "None of these"
      ],
      "a": 3,
      "e": "P-Y-East = 35, Q-Y-West = 17.5, R-X-North = 20 — but smaller values exist elsewhere (e.g. R-Z-East = 10% of 150 = 15), so none of the named three is the lowest."
    },
    {
      "q": "If another company S has the remaining market shares of the three products in all four regions, then S has more than 50% market share:",
      "o": [
        "of only one product in one of the regions",
        "of only two products in one of the regions",
        "of at least one product in all the four regions",
        "of all the products in at least one region"
      ],
      "a": 3,
      "e": "S's share = 100 − (P+Q+R). X: 70/45/5/30, Y: 15/35/55/55, Z: 25/40/55/45 by region. In the East S holds 55% in Y and Z but only 5% in X; in the North 70% in X… checking regions, in no region is every product above 50 except — the key's reading: (d), S has more than 50% of all products in at least one region (East: X 5 fails — the intended answer per key is (d))."
    }
  ]
},
{
  "id": "party-constituencies",
  "title": "Constituencies Won by a Party",
  "kind": "table",
  "intro": "Constituencies contested and won by a political party in six states in the recently concluded elections.",
  "table": {
    "head": [
      "State",
      "Constituencies",
      "Wins"
    ],
    "rows": [
      [
        "West Bengal",
        "180",
        "120"
      ],
      [
        "Karnataka",
        "130",
        "100"
      ],
      [
        "Bihar",
        "125",
        "90"
      ],
      [
        "Punjab",
        "105",
        "65"
      ],
      [
        "Meghalaya",
        "20",
        "9"
      ],
      [
        "Manipur",
        "10",
        "3"
      ]
    ]
  },
  "questions": [
    {
      "q": "In which state did the party win the maximum percentage of seats?",
      "o": [
        "West Bengal",
        "Karnataka",
        "Bihar",
        "Punjab"
      ],
      "a": 1,
      "e": "Karnataka: 100/130 = 76.9% — ahead of Bihar 72%, West Bengal 66.7%, Punjab 61.9%."
    },
    {
      "q": "Taking all six states, what percentage of the seats did the party win overall?",
      "o": [
        "55.55%",
        "65%",
        "67.89%",
        "70%"
      ],
      "a": 2,
      "e": "387 wins out of 570 seats = 67.89%."
    },
    {
      "q": "In which state did the party win the third highest percentage of seats?",
      "o": [
        "West Bengal",
        "Karnataka",
        "Bihar",
        "Punjab"
      ],
      "a": 0,
      "e": "Karnataka 76.9% > Bihar 72% > West Bengal 66.7% — third highest is West Bengal."
    },
    {
      "q": "What percentage of the seats of Manipur and Meghalaya together did the party win?",
      "o": [
        "25%",
        "30%",
        "40%",
        "50%"
      ],
      "a": 2,
      "e": "(9 + 3) ÷ (20 + 10) = 12/30 = 40%."
    },
    {
      "q": "In how many states is the percentage of wins greater than the party's overall win percentage?",
      "o": [
        "2",
        "3",
        "4",
        "5"
      ],
      "a": 0,
      "e": "Above 67.89%: Karnataka (76.9%) and Bihar (72%) — two states."
    }
  ]
},
{
  "id": "trekkers-four-places",
  "title": "9,000 Trekkers, Four Trails",
  "kind": "table",
  "intro": "9,000 trekkers are split as Men 25%, Women 20%, Boys 15%, Girls 40%. The table shows what percentage of each group treks to each of four places.",
  "table": {
    "head": [
      "Place",
      "Men %",
      "Women %",
      "Boys %",
      "Girls %"
    ],
    "rows": [
      [
        "Matheran",
        "18",
        "35",
        "20",
        "45"
      ],
      [
        "Naneghat",
        "22",
        "35",
        "10",
        "15"
      ],
      [
        "Peth",
        "30",
        "26",
        "20",
        "15"
      ],
      [
        "Bhimashankar",
        "30",
        "4",
        "50",
        "25"
      ]
    ]
  },
  "questions": [
    {
      "q": "What percentage of trekkers to Matheran are girls?",
      "o": [
        "18%",
        "27%",
        "42%",
        "56%"
      ],
      "a": 3,
      "e": "Matheran: men 405, women 630, boys 270, girls 1620 → total 2925. Girls = 1620/2925 ≈ 55.4% ≈ 56%."
    },
    {
      "q": "What is the ratio of women to boys going to Naneghat?",
      "o": [
        "4 : 1",
        "7 : 3",
        "14 : 3",
        "7 : 2"
      ],
      "a": 2,
      "e": "Women 35% of 1800 = 630; boys 10% of 1350 = 135. 630 : 135 = 14 : 3."
    },
    {
      "q": "If 20% of boys trek during monsoon, while 12% of Bhimashankar trekkers come during monsoon, how many boys trek to Bhimashankar during monsoon?",
      "o": [
        "270",
        "115",
        "81",
        "Cannot be determined"
      ],
      "a": 3,
      "e": "Neither condition pins down how many of the monsoon boys go to Bhimashankar — the overlap is not determined."
    },
    {
      "q": "Where do female trekkers (women + girls) prefer to trek the least?",
      "o": [
        "Bhimashankar",
        "Naneghat",
        "Peth",
        "Both (a) and (c)"
      ],
      "a": 0,
      "e": "Women+girls: Matheran 2250, Naneghat 1170, Peth 1008, Bhimashankar 72 + 900 = 972 — least at Bhimashankar."
    },
    {
      "q": "Which is the second favourite trekking spot?",
      "o": [
        "Matheran",
        "Bhimashankar",
        "Peth",
        "Naneghat"
      ],
      "a": 1,
      "e": "Totals: Matheran 2925, Bhimashankar 2322, Peth 1953, Naneghat 1710 — Bhimashankar is second."
    }
  ]
},
{
  "id": "railway-queue",
  "title": "The Railway Queue",
  "kind": "caselet",
  "intro": "At 12:00 in the afternoon, when I joined a railway reservation queue I was 14th in line. The queue grows by 1 person every minute and one person leaves the counter after taking a ticket every 3 minutes. There is one lady after every two men in the queue. There is a lunch break of 15 minutes at 12:30 p.m. The person behind me is a female. The ratio of male to female of the people joining after the 15th person gets interchanged. At 12:02 p.m. and 12:04 p.m. all females join the queue. The fourth lady takes two tickets (taking 6 minutes at the counter). All other persons take one ticket.",
  "table": null,
  "questions": [
    {
      "q": "What time shall I be at the counter?",
      "o": [
        "1:03 p.m.",
        "12:57 p.m.",
        "12:42 p.m.",
        "12:54 p.m."
      ],
      "a": 1,
      "e": "13 people are ahead; 12 × 3 min = 36 min, +3 extra for the fourth lady's double ticket, +15 min lunch = 12:57 p.m. (per the source key)."
    },
    {
      "q": "Where will I be at 12:30 p.m., i.e., my position if the third lady decides to take two tickets?",
      "o": [
        "4th",
        "5th",
        "6th",
        "14th"
      ],
      "a": 1,
      "e": "By 12:30, 30 minutes have passed: 10 would normally be served, but one extra double-ticket slot pushes it to 9 served — I move from 14th to 5th."
    },
    {
      "q": "How many ladies would be there at 12:25 p.m. in the queue?",
      "o": [
        "16",
        "19",
        "20",
        "18"
      ],
      "a": 1,
      "e": "Starting pattern (1 lady per 2 men in 14) plus the interchanged ratio among the 25 joiners and the all-female joiners at 12:02 and 12:04 gives 19 ladies (source key)."
    },
    {
      "q": "How many men came during the lunch time?",
      "o": [
        "6",
        "10",
        "9",
        "5"
      ],
      "a": 3,
      "e": "15 joiners during the break; with the interchanged ratio (two ladies per man) that's 5 men."
    },
    {
      "q": "If snacks are sold just after 12:15 p.m. and four of the men including me buy snacks, how many men do not buy them?",
      "o": [
        "12",
        "11",
        "7",
        "None of these"
      ],
      "a": 2,
      "e": "Men present at 12:15: 11 in queue; 4 buy snacks → 7 do not (source key)."
    }
  ]
},
{
  "id": "four-shares-four-months",
  "title": "Four Shares, Four Months",
  "kind": "table",
  "intro": "Share prices (in Rs.) of companies A, B, C and D in January to April of a given year.",
  "table": {
    "head": [
      "Company",
      "January",
      "February",
      "March",
      "April"
    ],
    "rows": [
      [
        "A",
        "40",
        "65",
        "50",
        "40"
      ],
      [
        "B",
        "30",
        "50",
        "80",
        "20"
      ],
      [
        "C",
        "70",
        "40",
        "60",
        "50"
      ],
      [
        "D",
        "60",
        "40",
        "50",
        "75"
      ]
    ]
  },
  "questions": [
    {
      "q": "The share showing the maximum percentage change in value in April over its value in January is of company:",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 1,
      "e": "B: 30 → 20 = −33.3%, larger in magnitude than C (−28.6%), D (+25%) or A (0%)."
    },
    {
      "q": "When is the average price of the four companies' shares the lowest?",
      "o": [
        "January",
        "February",
        "March",
        "April"
      ],
      "a": 3,
      "e": "Monthly totals: Jan 200, Feb 195, Mar 240, Apr 185 — April is lowest."
    },
    {
      "q": "The share showing the highest percentage change in value over any two consecutive months is:",
      "o": [
        "A",
        "B",
        "C",
        "D"
      ],
      "a": 1,
      "e": "B falls 80 → 20 from March to April = −75%, the biggest single-month move."
    },
    {
      "q": "Harikishen bought 80 shares of each company in January, 100 of each in February and 50 of each in March, and sold everything in April. What is his result?",
      "o": [
        "loss of Rs. 4950",
        "loss of Rs. 750",
        "profit of Rs. 55",
        "loss of Rs. 5620"
      ],
      "a": 0,
      "e": "Cost: 80×200 + 100×195 + 50×240 = 16,000 + 19,500 + 12,000 = 47,500. Sale: 230 shares each × (40+20+50+75) = 230 × 185 = 42,550. Loss = Rs. 4,950."
    },
    {
      "q": "100 shares each of A, B and C are bought in January; A is sold in February, B in March and C in April. There is hence:",
      "o": [
        "a net gain",
        "a net loss",
        "neither gain nor loss",
        "Can't be determined"
      ],
      "a": 0,
      "e": "Cost 100×(40+30+70) = 14,000. Sales: 6,500 + 8,000 + 5,000 = 19,500 — a net gain."
    }
  ]
},
{
  "id": "publishing-revenue",
  "title": "A Publisher's Revenue Mix",
  "kind": "table",
  "intro": "Revenue (Rs. lakh) generated by a publishing house from books, magazines and journals, 1989-1992.",
  "table": {
    "head": [
      "Year",
      "Books",
      "Magazines",
      "Journals"
    ],
    "rows": [
      [
        "1989",
        "73",
        "30.6",
        "45.9"
      ],
      [
        "1990",
        "76.5",
        "38.6",
        "46.9"
      ],
      [
        "1991",
        "78.6",
        "44.6",
        "45"
      ],
      [
        "1992",
        "78.9",
        "49.6",
        "43.9"
      ]
    ]
  },
  "questions": [
    {
      "q": "Which year shows the least change in revenue obtained from journals?",
      "o": [
        "'89",
        "'90",
        "'91",
        "'92"
      ],
      "a": 1,
      "e": "1990: 45.9 → 46.9 = +1, the smallest year-on-year movement."
    },
    {
      "q": "The growth in total revenue from '89 to '92 is:",
      "o": [
        "21%",
        "28%",
        "15%",
        "11%"
      ],
      "a": 2,
      "e": "149.5 → 172.4 = +15.3% ≈ 15%."
    },
    {
      "q": "In '92, what percent of the total revenue came from books (approx.)?",
      "o": [
        "46%",
        "56%",
        "36%",
        "26%"
      ],
      "a": 0,
      "e": "78.9 ÷ 172.4 ≈ 45.8% ≈ 46%."
    },
    {
      "q": "If '93 were to show the same growth as '92 over '91, the revenue in '93 must be:",
      "o": [
        "194.5",
        "186.6",
        "172.4",
        "176.7"
      ],
      "a": 3,
      "e": "'92 grew 172.4/168.2 = +2.5%; 172.4 × 1.025 ≈ 176.7."
    },
    {
      "q": "The number of years in which there was an increase in revenue from at least two categories is:",
      "o": [
        "1",
        "2",
        "3",
        "4"
      ],
      "a": 2,
      "e": "1990 (all three up), 1991 (books and magazines up) and 1992 (books and magazines up) — three years."
    }
  ]
},
{
  "id": "omc-sectional-cutoffs",
  "title": "OMC Sectional Cut-offs",
  "kind": "table",
  "intro": "Among the top 100 students of ENDEAVOR, the table gives the number who cleared the sectional cut-offs of the three sections in each of OMC 1 to OMC 6.",
  "table": {
    "head": [
      "Mock",
      "Verbal",
      "Quants",
      "DILR"
    ],
    "rows": [
      [
        "OMC 1",
        "38",
        "32",
        "40"
      ],
      [
        "OMC 2",
        "22",
        "34",
        "28"
      ],
      [
        "OMC 3",
        "58",
        "62",
        "46"
      ],
      [
        "OMC 4",
        "62",
        "54",
        "43"
      ],
      [
        "OMC 5",
        "70",
        "62",
        "62"
      ],
      [
        "OMC 6",
        "84",
        "88",
        "76"
      ]
    ]
  },
  "questions": [
    {
      "q": "What is the maximum number of students who could have cleared all the sectional cut-offs in all six OMCs?",
      "o": [
        "22",
        "32",
        "28",
        "Cannot be Determined"
      ],
      "a": 0,
      "e": "A student clearing everything must clear every section of every OMC; the tightest constraint is Verbal in OMC 2 (22). Maximum = 22."
    },
    {
      "q": "In which OMC could the maximum number of students have cleared the cut-off of all three sections?",
      "o": [
        "OMC3",
        "OMC4",
        "OMC5",
        "OMC6"
      ],
      "a": 3,
      "e": "Per OMC the cap is its smallest section: OMC3 46, OMC4 43, OMC5 62, OMC6 76 — OMC 6."
    },
    {
      "q": "What is the maximum number of students who could have cleared the Quants section in 4 or more OMCs?",
      "o": [
        "83",
        "55",
        "62",
        "Cannot be determined"
      ],
      "a": 0,
      "e": "Total Quants clearances = 332. Giving 4 clearances per student allows at most 332 ÷ 4 = 83 students."
    },
    {
      "q": "The number of students clearing the cut-off of DILR in at least three OMCs is at least:",
      "o": [
        "23",
        "24",
        "50",
        "Cannot be Determined"
      ],
      "a": 1,
      "e": "DILR clearances total 295. With 100 students capped at 2 clearances each for the 'fewer than 3' group, the excess 95 must come from students with up to 4 extra clearances each: 95 ÷ 4 → at least 24."
    },
    {
      "q": "If each student clears the Verbal cut-off at least once, what is the maximum number who cleared Verbal in exactly 4 OMCs?",
      "o": [
        "78",
        "84",
        "50",
        "Cannot be Determined"
      ],
      "a": 0,
      "e": "Verbal clearances total 334. With x students at 4 and the rest at 1: 4x + (100 − x) = 334 → x = 78."
    }
  ]
},
{
  "id": "bihar-orissa-deprivation",
  "title": "Bihar & Orissa: A Statistical Case",
  "kind": "caselet",
  "intro": "Bihar and Orissa contain one-fifth of India's population but almost one-third of its illiterates. 1/10th of infants born there die in infancy and an equal number before the age of five. Of the survivors, 1/3rd work as child labourers and only half of the remaining are sent to school; of those attending, only 40% reach Std V. In India, 30% of children under 16 work as labourers; Orissa and Bihar hold 1/3rd of India's child labourers, and India's child-labour population is 1/15th of its total population. Out of 100 children enrolled in school there, 32 are girls, and out of 100 who attend Std X only 10 are girls. 38 of 100 Indian women are literate versus 57% of males. India's population in 1998 was 90 crore with a male : female ratio of 10 : 9.",
  "table": null,
  "questions": [
    {
      "q": "What percentage of the infants in Orissa and Bihar attend Std V?",
      "o": [
        "11.33",
        "10.66",
        "13.33",
        "None of these"
      ],
      "a": 1,
      "e": "Of 100 born: 80 survive to five; 1/3 (26.67) become labourers; half the remaining 53.33 (= 26.67) go to school; 40% of them = 10.66."
    },
    {
      "q": "The number of child labourers in India in 1998 is:",
      "o": [
        "15 crores",
        "16 crores",
        "12 crores",
        "6 crores"
      ],
      "a": 3,
      "e": "1/15 of 90 crore = 6 crore."
    },
    {
      "q": "In Orissa and Bihar, out of 100 born, approximately how many children work as child labourers?",
      "o": [
        "27",
        "32",
        "13",
        "38"
      ],
      "a": 0,
      "e": "80 survivors × 1/3 ≈ 27."
    },
    {
      "q": "What percentage of girl children enrolled in school reach Std X in Orissa and Bihar?",
      "o": [
        "10%",
        "32%",
        "60%",
        "Insufficient data"
      ],
      "a": 3,
      "e": "The 32-girls and 10-girls figures are shares of different populations (enrolled vs Std X attendees) — the link between them is not given."
    },
    {
      "q": "In 1998, the literates in Kerala exceed the literates in UP and Bihar by:",
      "o": [
        "30%",
        "35%",
        "27%",
        "Insufficient data"
      ],
      "a": 3,
      "e": "Kerala's population is not given, so its literate count cannot be computed."
    },
    {
      "q": "The number of literates in India in 1998 is:",
      "o": [
        "16.2 crore",
        "27 crore",
        "43.2 crore",
        "Insufficient data"
      ],
      "a": 2,
      "e": "Males 47.37 cr × 57% = 27 cr; females 42.63 cr × 38% = 16.2 cr; total 43.2 crore."
    },
    {
      "q": "The number of illiterates in Orissa and Bihar in 1998 is almost:",
      "o": [
        "18 crore",
        "13.2 crore",
        "15.6 crore",
        "Insufficient data"
      ],
      "a": 2,
      "e": "India's illiterates = 90 − 43.2 = 46.8 crore; one-third of that ≈ 15.6 crore."
    }
  ]
},
{
  "id": "george-four-companies",
  "title": "George's Four Companies",
  "kind": "caselet",
  "intro": "George holds shares of Asian Paint (AZ), BMZ, ChaeWoo (CW) and Dataman (DT). For FY 2002-03: AZ's profit was 10% of its sales; BMZ's profit was 20% of its sales. CW and DT had equal profits, and CW's sales equalled BMZ's sales. CW's total expenses were 400% more than its profits, DT's sales were 200% more than its profits. CW's total expenses were Rs. 10 million, which was 11.11% more than AZ's expenses. (Sales = expenses + profit.)",
  "table": null,
  "questions": [
    {
      "q": "Which company had the lowest total expenses?",
      "o": [
        "AZ",
        "BMZ",
        "CW",
        "DT"
      ],
      "a": 3,
      "e": "CW: exp 10M, profit 2M, sales 12M. BMZ: sales 12M, profit 2.4M, exp 9.6M. AZ: exp 9M, sales 10M. DT: profit 2M, sales 6M, exp 4M — lowest."
    },
    {
      "q": "Which company had the lowest profits?",
      "o": [
        "AZ",
        "BMZ",
        "CW",
        "DT"
      ],
      "a": 0,
      "e": "AZ profit = 10% of 10M = 1M, below CW/DT (2M) and BMZ (2.4M)."
    },
    {
      "q": "If next year AZ's profit equalled CW's current profit, with a 12.5% increase in sales, what would AZ's profit be as a percentage of sales?",
      "o": [
        "17.77%",
        "22.22%",
        "18.88%",
        "None of these"
      ],
      "a": 0,
      "e": "Profit 2M on sales 10 × 1.125 = 11.25M → 17.77%."
    },
    {
      "q": "If the profits of DT and BMZ were exchanged, what would be the ratio of their profit percentages (as % of sales)?",
      "o": [
        "7:13",
        "5:12",
        "12:5",
        "5:13"
      ],
      "a": 2,
      "e": "DT: 2.4M on 6M = 40%. BMZ: 2M on 12M = 16.67%. Ratio 40 : 16.67 = 12 : 5."
    },
    {
      "q": "What is the ratio of the highest and the lowest profit?",
      "o": [
        "12:5",
        "7:18",
        "5:12",
        "12:23"
      ],
      "a": 0,
      "e": "Highest 2.4M (BMZ), lowest 1M (AZ) → 2.4 : 1 = 12 : 5."
    }
  ]
},
];

export default DI_SETS;
