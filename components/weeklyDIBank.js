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
];

export default DI_SETS;
