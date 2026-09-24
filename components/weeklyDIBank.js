// ============================================================
// Weekly DI set library — 2026-09 launch bank.
// 12 hand-authored Data Interpretation sets, all text/table
// based (no graphs — nothing that needs an image). One set is
// served per ISO week (resets Monday) with the same seeded
// no-repeat rotation the Gulp bank uses — see setIndexForWeek
// in WeeklyDI.js.
// Shape: { id, title, kind: 'table'|'caselet', intro,
//          table?: { head: [...], rows: [[...], ...] },
//          questions: [ { q, o (4 options), a (correct index),
//                         e (explanation) } × 5 ] }.
// Every answer was computed by hand and re-verified; the full
// arithmetic walkthrough is in Weekly-DI-bank-review.html for
// owner sign-off.
// ============================================================

const DI_SETS = [
  {
    id: "bookstore-sales",
    title: "Bookstore Chain Revenue",
    kind: "table",
    intro:
      "The table shows the annual revenue (in ₹ lakh) of five stores of a bookstore chain for 2024 and 2025.",
    table: {
      head: ["Store", "2024", "2025"],
      rows: [
        ["A", "120", "150"],
        ["B", "200", "180"],
        ["C", "80", "100"],
        ["D", "150", "195"],
        ["E", "250", "275"],
      ],
    },
    questions: [
      {
        q: "What is the total revenue of the chain in 2025 (₹ lakh)?",
        o: ["800", "850", "900", "950"],
        a: 2,
        e: "150 + 180 + 100 + 195 + 275 = 900.",
      },
      {
        q: "Which store recorded the highest percentage growth from 2024 to 2025?",
        o: ["A", "C", "D", "E"],
        a: 2,
        e: "Growth: A +25%, B −10%, C +25%, D +30% (45/150), E +10%. D is the highest.",
      },
      {
        q: "By what percentage did store B's revenue change?",
        o: ["Fell 10%", "Fell 20%", "Grew 10%", "Fell 11.1%"],
        a: 0,
        e: "B went from 200 to 180: a fall of 20 on 200 = 10% decline.",
      },
      {
        q: "Store E's 2025 revenue is approximately what percent of the chain's total 2025 revenue?",
        o: ["27.5%", "30.6%", "33.3%", "25%"],
        a: 1,
        e: "275 / 900 × 100 ≈ 30.6%.",
      },
      {
        q: "What is the ratio of store A's 2024 revenue to store C's 2025 revenue?",
        o: ["5 : 6", "6 : 5", "4 : 5", "3 : 2"],
        a: 1,
        e: "120 : 100 simplifies to 6 : 5.",
      },
    ],
  },
  {
    id: "admissions-pie",
    title: "Applicants by Stream",
    kind: "caselet",
    intro:
      "24,000 students applied to a university across five streams. The percentage distribution of applicants: Engineering 30%, Management 25%, Medicine 20%, Law 15%, Arts 10%.",
    questions: [
      {
        q: "How many students applied for Management?",
        o: ["5,400", "6,000", "6,600", "4,800"],
        a: 1,
        e: "25% of 24,000 = 6,000.",
      },
      {
        q: "How many students applied for Law and Arts together?",
        o: ["5,400", "7,200", "6,000", "4,800"],
        a: 2,
        e: "15% + 10% = 25% of 24,000 = 6,000.",
      },
      {
        q: "What is the ratio of Engineering to Medicine applicants?",
        o: ["2 : 3", "3 : 2", "5 : 4", "6 : 5"],
        a: 1,
        e: "30% : 20% = 3 : 2.",
      },
      {
        q: "If Medicine applications rise by 15% next year (others unchanged), how many Medicine applicants will there be?",
        o: ["5,520", "5,220", "5,760", "5,040"],
        a: 0,
        e: "Medicine now = 4,800. 4,800 × 1.15 = 5,520.",
      },
      {
        q: "If this distribution were drawn as a pie chart, what would be the central angle for Law?",
        o: ["45°", "50°", "54°", "60°"],
        a: 2,
        e: "15% of 360° = 54°.",
      },
    ],
  },
  {
    id: "factory-defects",
    title: "Factory Output & Defects",
    kind: "table",
    intro:
      "Four factories of a company produced the following units in a month, with the given defect rates.",
    table: {
      head: ["Factory", "Units produced", "Defect rate"],
      rows: [
        ["P", "4,000", "5%"],
        ["Q", "6,000", "4%"],
        ["R", "5,000", "6%"],
        ["S", "5,000", "2%"],
      ],
    },
    questions: [
      {
        q: "How many defective units were produced in all?",
        o: ["800", "820", "840", "880"],
        a: 2,
        e: "200 (P) + 240 (Q) + 300 (R) + 100 (S) = 840.",
      },
      {
        q: "Which factory produced the most non-defective units?",
        o: ["P", "Q", "R", "S"],
        a: 1,
        e: "Good units: P 3,800; Q 5,760; R 4,700; S 4,900. Q leads.",
      },
      {
        q: "What is the overall defect rate across the four factories?",
        o: ["4.0%", "4.2%", "4.25%", "4.5%"],
        a: 1,
        e: "840 defective out of 20,000 produced = 4.2%.",
      },
      {
        q: "Non-defective units of factory R are what percent of R's production?",
        o: ["96%", "94%", "92%", "90%"],
        a: 1,
        e: "R's defect rate is 6%, so 94% are good.",
      },
      {
        q: "What is the ratio of defective units of P to those of S?",
        o: ["1 : 2", "2 : 1", "5 : 2", "4 : 1"],
        a: 1,
        e: "P has 200 defective, S has 100 — ratio 2 : 1.",
      },
    ],
  },
  {
    id: "class-results",
    title: "Batch Results Caselet",
    kind: "caselet",
    intro:
      "A coaching batch has 240 students with boys and girls in the ratio 3 : 2. In the final mock, 75% of the boys and 87.5% of the girls cleared the cutoff.",
    questions: [
      {
        q: "How many girls are in the batch?",
        o: ["90", "96", "100", "108"],
        a: 1,
        e: "Girls = 2/5 of 240 = 96 (boys = 144).",
      },
      {
        q: "How many boys cleared the cutoff?",
        o: ["96", "104", "108", "112"],
        a: 2,
        e: "75% of 144 = 108.",
      },
      {
        q: "What percentage of the whole batch cleared the cutoff?",
        o: ["78%", "80%", "82%", "84%"],
        a: 1,
        e: "Cleared = 108 + 84 (87.5% of 96) = 192. 192/240 = 80%.",
      },
      {
        q: "How many girls did NOT clear the cutoff?",
        o: ["10", "12", "14", "16"],
        a: 1,
        e: "12.5% of 96 = 12.",
      },
      {
        q: "What is the ratio of boys who failed to girls who failed?",
        o: ["2 : 1", "3 : 1", "3 : 2", "4 : 1"],
        a: 1,
        e: "Failed boys = 36, failed girls = 12 — ratio 3 : 1.",
      },
    ],
  },
  {
    id: "phone-shipments",
    title: "Smartphone Shipments",
    kind: "table",
    intro:
      "The table shows smartphone shipments (in thousands of units) of five brands in two consecutive quarters.",
    table: {
      head: ["Brand", "Q1", "Q2"],
      rows: [
        ["V", "45", "54"],
        ["W", "60", "57"],
        ["X", "30", "39"],
        ["Y", "75", "75"],
        ["Z", "90", "99"],
      ],
    },
    questions: [
      {
        q: "What were total Q2 shipments (in thousands)?",
        o: ["300", "312", "324", "336"],
        a: 2,
        e: "54 + 57 + 39 + 75 + 99 = 324.",
      },
      {
        q: "Which brand grew the fastest from Q1 to Q2 in percentage terms?",
        o: ["V", "X", "Z", "Y"],
        a: 1,
        e: "V +20%, W −5%, X +30% (9/30), Y 0%, Z +10%. X is fastest.",
      },
      {
        q: "Brand Y's share of total Q1 shipments was:",
        o: ["20%", "22.5%", "25%", "30%"],
        a: 2,
        e: "75 / 300 = 25%.",
      },
      {
        q: "In Q2, how many thousand more units did Z ship than X?",
        o: ["50", "55", "60", "65"],
        a: 2,
        e: "99 − 39 = 60.",
      },
      {
        q: "By what percentage did total shipments grow from Q1 to Q2?",
        o: ["6%", "8%", "10%", "12%"],
        a: 1,
        e: "Growth = 324 − 300 = 24 on 300 = 8%.",
      },
    ],
  },
  {
    id: "household-budget",
    title: "Household Budget",
    kind: "caselet",
    intro:
      "A family's monthly income is ₹80,000. They spend 25% on rent, 20% on food, 15% on education and 10% on transport. The rest is saved.",
    questions: [
      {
        q: "How much does the family save each month?",
        o: ["₹20,000", "₹22,000", "₹24,000", "₹26,000"],
        a: 2,
        e: "Spending = 70%, so savings = 30% of 80,000 = ₹24,000.",
      },
      {
        q: "What is the combined monthly spend on rent and food?",
        o: ["₹32,000", "₹36,000", "₹40,000", "₹34,000"],
        a: 1,
        e: "45% of 80,000 = ₹36,000.",
      },
      {
        q: "What is the ratio of education spend to transport spend?",
        o: ["2 : 3", "3 : 2", "5 : 3", "4 : 3"],
        a: 1,
        e: "15% : 10% = 3 : 2.",
      },
      {
        q: "If income rises 10% but rent stays the same in rupees, rent becomes approximately what percent of the new income?",
        o: ["22.7%", "25%", "21.5%", "24.2%"],
        a: 0,
        e: "Rent = ₹20,000; new income = ₹88,000. 20,000/88,000 ≈ 22.7%.",
      },
      {
        q: "What are the family's annual savings at the current income?",
        o: ["₹2,40,000", "₹2,64,000", "₹2,88,000", "₹3,00,000"],
        a: 2,
        e: "24,000 × 12 = ₹2,88,000.",
      },
    ],
  },
  {
    id: "batsman-series",
    title: "Runs Across a Series",
    kind: "table",
    intro: "A batsman's scores in the five matches of a series are given below.",
    table: {
      head: ["Match", "M1", "M2", "M3", "M4", "M5"],
      rows: [["Runs", "42", "68", "25", "90", "75"]],
    },
    questions: [
      {
        q: "What was his average score in the series?",
        o: ["58", "60", "62", "64"],
        a: 1,
        e: "Total = 300 over 5 matches → average 60.",
      },
      {
        q: "M4's score is what percent of his series total?",
        o: ["25%", "27.5%", "30%", "33.3%"],
        a: 2,
        e: "90 / 300 = 30%.",
      },
      {
        q: "By what percentage did his score rise from M3 to M4?",
        o: ["65%", "160%", "225%", "260%"],
        a: 3,
        e: "(90 − 25)/25 × 100 = 260%.",
      },
      {
        q: "In how many matches did he score above his series average?",
        o: ["2", "3", "4", "1"],
        a: 1,
        e: "Above 60: M2 (68), M4 (90), M5 (75) — three matches.",
      },
      {
        q: "How many runs must he score in a sixth match to raise his average to 65?",
        o: ["85", "90", "95", "100"],
        a: 1,
        e: "Needed total = 65 × 6 = 390; he has 300, so 90 more.",
      },
    ],
  },
  {
    id: "library-books",
    title: "Library Circulation",
    kind: "caselet",
    intro:
      "A library holds 4,800 books, with fiction and non-fiction in the ratio 5 : 3. In a month, 20% of the fiction books and 30% of the non-fiction books were issued.",
    questions: [
      {
        q: "How many non-fiction books does the library hold?",
        o: ["1,600", "1,800", "2,000", "2,400"],
        a: 1,
        e: "3/8 of 4,800 = 1,800 (fiction = 3,000).",
      },
      {
        q: "How many books in all were issued that month?",
        o: ["1,080", "1,140", "1,200", "1,260"],
        a: 1,
        e: "Fiction issued 600 + non-fiction issued 540 = 1,140.",
      },
      {
        q: "How many more fiction than non-fiction books were issued?",
        o: ["40", "50", "60", "80"],
        a: 2,
        e: "600 − 540 = 60.",
      },
      {
        q: "What percentage of the library's full stock was issued?",
        o: ["22.5%", "23.75%", "25%", "21.25%"],
        a: 1,
        e: "1,140 / 4,800 × 100 = 23.75%.",
      },
      {
        q: "How many fiction books remained on the shelves?",
        o: ["2,200", "2,400", "2,500", "2,600"],
        a: 1,
        e: "3,000 − 600 = 2,400.",
      },
    ],
  },
  {
    id: "company-workforce",
    title: "Workforce by Department",
    kind: "table",
    intro:
      "The table shows employee headcount in four departments of a company and the share of women in each.",
    table: {
      head: ["Department", "Employees", "Women"],
      rows: [
        ["Sales", "120", "45%"],
        ["HR", "40", "60%"],
        ["Tech", "200", "30%"],
        ["Operations", "140", "50%"],
      ],
    },
    questions: [
      {
        q: "How many women work in Tech?",
        o: ["50", "60", "66", "70"],
        a: 1,
        e: "30% of 200 = 60.",
      },
      {
        q: "How many women does the company employ in all?",
        o: ["198", "204", "208", "212"],
        a: 2,
        e: "54 + 24 + 60 + 70 = 208.",
      },
      {
        q: "Which department employs the most women?",
        o: ["Sales", "HR", "Tech", "Operations"],
        a: 3,
        e: "Operations has 70 women — more than Sales 54, HR 24, Tech 60.",
      },
      {
        q: "How many men work in Sales?",
        o: ["54", "60", "66", "72"],
        a: 2,
        e: "55% of 120 = 66.",
      },
      {
        q: "Women form what percent of the total workforce (500)?",
        o: ["40%", "41.6%", "42.4%", "43.2%"],
        a: 1,
        e: "208 / 500 × 100 = 41.6%.",
      },
    ],
  },
  {
    id: "marks-grid",
    title: "Sectional Marks Grid",
    kind: "table",
    intro:
      "Five students' scores (out of 100) in three sections of a mock test are shown below.",
    table: {
      head: ["Student", "QA", "VA", "LR"],
      rows: [
        ["Amit", "80", "65", "75"],
        ["Bela", "70", "85", "60"],
        ["Chirag", "90", "55", "80"],
        ["Divya", "60", "95", "70"],
        ["Esha", "75", "70", "90"],
      ],
    },
    questions: [
      {
        q: "Who scored the highest total across the three sections?",
        o: ["Amit", "Chirag", "Divya", "Esha"],
        a: 3,
        e: "Totals: Amit 220, Bela 215, Chirag 225, Divya 225, Esha 235. Esha tops.",
      },
      {
        q: "What is the average QA score of the five students?",
        o: ["73", "74", "75", "76"],
        a: 2,
        e: "(80+70+90+60+75)/5 = 375/5 = 75.",
      },
      {
        q: "Divya's VA score is approximately what percent of her total?",
        o: ["40.0%", "42.2%", "44.5%", "38.6%"],
        a: 1,
        e: "95 / 225 × 100 ≈ 42.2%.",
      },
      {
        q: "Which two students scored the same total?",
        o: ["Amit & Bela", "Bela & Chirag", "Chirag & Divya", "Divya & Esha"],
        a: 2,
        e: "Chirag and Divya both totalled 225.",
      },
      {
        q: "What is the average total score per student?",
        o: ["220", "222", "224", "226"],
        a: 2,
        e: "Grand total 1,120 over 5 students = 224.",
      },
    ],
  },
  {
    id: "fuel-price",
    title: "Fuel Price Hike",
    kind: "caselet",
    intro:
      "The price of petrol rises from ₹80 to ₹100 per litre. Before the hike, a family used 30 litres a month.",
    questions: [
      {
        q: "By what percentage did the price rise?",
        o: ["20%", "22.5%", "25%", "30%"],
        a: 2,
        e: "Rise of ₹20 on ₹80 = 25%.",
      },
      {
        q: "What was the family's monthly petrol expense before the hike?",
        o: ["₹2,000", "₹2,400", "₹2,600", "₹3,000"],
        a: 1,
        e: "30 × 80 = ₹2,400.",
      },
      {
        q: "If usage stays at 30 litres, what is the new monthly expense?",
        o: ["₹2,800", "₹2,900", "₹3,000", "₹3,200"],
        a: 2,
        e: "30 × 100 = ₹3,000.",
      },
      {
        q: "By what percentage must the family cut usage to keep the expense at ₹2,400?",
        o: ["15%", "20%", "25%", "30%"],
        a: 1,
        e: "Affordable litres = 2,400/100 = 24, a cut of 6 on 30 = 20%.",
      },
      {
        q: "If they instead cut usage to 27 litres, the new expense exceeds the old one by:",
        o: ["10%", "12.5%", "15%", "8%"],
        a: 1,
        e: "New expense = 27 × 100 = ₹2,700; 300 more on 2,400 = 12.5%.",
      },
    ],
  },
  {
    id: "app-downloads",
    title: "App Downloads by Month",
    kind: "table",
    intro:
      "Monthly downloads (in thousands) of a study app from January to May are given below.",
    table: {
      head: ["Month", "Jan", "Feb", "Mar", "Apr", "May"],
      rows: [["Downloads", "20", "25", "40", "32", "48"]],
    },
    questions: [
      {
        q: "In which month was the percentage growth over the previous month the highest?",
        o: ["February", "March", "April", "May"],
        a: 1,
        e: "Feb +25%, Mar +60% (15/25), Apr −20%, May +50%. March is highest.",
      },
      {
        q: "What were total downloads over the five months (in thousands)?",
        o: ["155", "160", "165", "170"],
        a: 2,
        e: "20 + 25 + 40 + 32 + 48 = 165.",
      },
      {
        q: "May's downloads are what percent of January's?",
        o: ["140%", "200%", "240%", "250%"],
        a: 2,
        e: "48 / 20 × 100 = 240%.",
      },
      {
        q: "What was the average monthly download count (in thousands)?",
        o: ["31", "32", "33", "34"],
        a: 2,
        e: "165 / 5 = 33.",
      },
      {
        q: "By what percentage did downloads fall from March to April?",
        o: ["16%", "20%", "25%", "8%"],
        a: 1,
        e: "Fall of 8 on 40 = 20%.",
      },
    ],
  },
];

export default DI_SETS;
