import { useState, useEffect } from "react";
import {
  Button, Input, Select, SelectItem, Chip, Card, CardBody,
  CardHeader, Divider, Progress, Table, TableHeader, TableColumn,
  TableBody, TableRow, TableCell, Switch, Spinner,
} from "@nextui-org/react";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "react-hot-toast";
import DefaultLayout from "@/layouts/DefaultLayout";

const SUBJECTS = [
  "Quantitative Ability",
  "Verbal Ability",
  "Data Interpretation",
  "Logical Reasoning",
];

const TOPICS = {
  "Quantitative Ability": [
    "Percentages","Profit & Loss","Time Speed & Distance","Time & Work",
    "Simple & Compound Interest","Ratio & Proportion","Averages",
    "Mixture & Alligation","Algebra","Linear Equations","Quadratic Equations",
    "Indices","Progression & Series","Number System","HCF & LCM",
    "Remainder","Permutation & Combination","Probability",
    "Geometry","Mensuration","Coordinate Geometry","Trigonometry",
    "Set Theory","Statistics & Probability",
  ],
  "Verbal Ability": [
    "Reading Comprehension","Para Jumbles","Para-Completion","Parasummary",
    "Sentence Correction","Fill in the Blanks","Synonyms & Antonyms",
    "Idioms & Phrases","Vocabulary","Grammar","Critical Reasoning",
    "Active & Passive Voice","Direct & Indirect Speech","Analogies",
  ],
  "Data Interpretation": [
    "Tables","Bar Graphs","Pie Charts","Line Graphs","Caselets","Mixed DI Sets",
  ],
  "Logical Reasoning": [
    "Puzzles","Arrangements","Coding & Decoding","Blood Relations","Syllogisms",
    "Logical Sequence","Directions","Clocks & Calendars","Venn Diagrams",
    "Statement & Conclusion","Data Sufficiency","Input & Output",
  ],
};

const EXAM_OPTIONS = [
  { key: "IPMAT_Indore",     label: "IPMAT Indore" },
  { key: "IPMAT_Rohtak",     label: "IPMAT Rohtak" },
  { key: "JIPMAT",           label: "JIPMAT" },
  { key: "IIM_Kozhikode_BMS",label: "IIM Kozhikode BMS" },
];

const CRON_SECRET = process.env.NEXT_PUBLIC_CRON_SECRET || "";

export default function QuestionBankAdmin() {
  // Form state
  const [subject,    setSubject]    = useState("Quantitative Ability");
  const [topic,      setTopic]      = useState("Percentages");
  const [subtopic,   setSubtopic]   = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [mcqCount,   setMcqCount]   = useState(20);
  const [saCount,    setSaCount]    = useState(10);
  const [examTags,   setExamTags]   = useState(["IPMAT_Indore","IPMAT_Rohtak","JIPMAT","IIM_Kozhikode_BMS"]);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [stats,      setStats]      = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoadingStats(true);
    const { data, error } = await supabase
      .from("question_bank")
      .select("subject, topic, difficulty, type, is_active, is_verified")
      .eq("is_active", true);

    if (data) {
      // Aggregate client-side
      const map = {};
      for (const row of data) {
        const key = `${row.subject}||${row.topic}||${row.difficulty}`;
        if (!map[key]) map[key] = { subject: row.subject, topic: row.topic, difficulty: row.difficulty, mcq: 0, sa: 0, verified: 0 };
        if (row.type === "mcq") map[key].mcq++;
        if (row.type === "sa")  map[key].sa++;
        if (row.is_verified)    map[key].verified++;
      }
      setStats(Object.values(map).sort((a, b) =>
        a.subject.localeCompare(b.subject) || a.topic.localeCompare(b.topic)
      ));
    }
    setLoadingStats(false);
  }

  async function handleGenerate() {
    if (generating) return;
    if (mcqCount + saCount === 0) { toast.error("Enter at least 1 question"); return; }
    if (mcqCount + saCount > 100) { toast.error("Max 100 questions per batch"); return; }

    setGenerating(true);
    setLastResult(null);
    toast.loading(`Generating ${mcqCount + saCount} questions…`, { id: "gen" });

    try {
      const res = await fetch("/api/question-bank/generate-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
        body: JSON.stringify({
          subject, topic,
          subtopic: subtopic || null,
          difficulty,
          mcqCount: parseInt(mcqCount) || 0,
          saCount:  parseInt(saCount)  || 0,
          examTags,
        }),
      });

      const data = await res.json();
      toast.dismiss("gen");

      if (data.success) {
        toast.success(`✅ Saved ${data.saved} questions to bank!`);
        setLastResult(data);
        loadStats(); // refresh table
      } else {
        toast.error(`❌ ${data.error}`);
        setLastResult(data);
      }
    } catch (err) {
      toast.dismiss("gen");
      toast.error("Network error: " + err.message);
    }

    setGenerating(false);
  }

  const topics = TOPICS[subject] || [];

  return (
    <DefaultLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Question Bank Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate questions with Gemini and save directly to Supabase. Questions are never deleted.
          </p>
        </div>

        {/* ── Generation Form ── */}
        <Card>
          <CardHeader className="font-semibold text-base">Generate Questions</CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            {/* Subject + Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Subject"
                selectedKeys={[subject]}
                onSelectionChange={(s) => {
                  const v = Array.from(s)[0];
                  setSubject(v);
                  setTopic(TOPICS[v]?.[0] || "");
                }}
              >
                {SUBJECTS.map((s) => <SelectItem key={s}>{s}</SelectItem>)}
              </Select>

              <Select
                label="Topic"
                selectedKeys={topic ? [topic] : []}
                onSelectionChange={(s) => setTopic(Array.from(s)[0])}
              >
                {topics.map((t) => <SelectItem key={t}>{t}</SelectItem>)}
              </Select>
            </div>

            {/* Subtopic + Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Subtopic (optional)"
                placeholder="e.g. Successive Discounts"
                value={subtopic}
                onValueChange={setSubtopic}
              />
              <Select
                label="Difficulty"
                selectedKeys={[difficulty]}
                onSelectionChange={(s) => setDifficulty(Array.from(s)[0])}
              >
                {["easy","medium","hard","mixed"].map((d) => (
                  <SelectItem key={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                ))}
              </Select>
            </div>

            {/* MCQ + SA counts */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number" label="MCQ Count" min={0} max={80}
                value={String(mcqCount)}
                onValueChange={(v) => setMcqCount(Math.max(0, parseInt(v) || 0))}
                description="4-option multiple choice"
              />
              <Input
                type="number" label="SA Count" min={0} max={80}
                value={String(saCount)}
                onValueChange={(v) => setSaCount(Math.max(0, parseInt(v) || 0))}
                description="Integer answer (numeric)"
              />
            </div>

            {/* Exam tags */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Exam Tags</p>
              <div className="flex flex-wrap gap-2">
                {EXAM_OPTIONS.map(({ key, label }) => {
                  const active = examTags.includes(key);
                  return (
                    <Chip
                      key={key}
                      variant={active ? "solid" : "bordered"}
                      color={active ? "secondary" : "default"}
                      className="cursor-pointer"
                      onClick={() =>
                        setExamTags(
                          active ? examTags.filter((t) => t !== key) : [...examTags, key]
                        )
                      }
                    >
                      {label}
                    </Chip>
                  );
                })}
              </div>
            </div>

            {/* Summary + Generate button */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-secondary">{mcqCount + saCount} questions</span>
                {" "}→ {subject} / {topic} / {difficulty}
                {subtopic && <span className="text-gray-400"> / {subtopic}</span>}
              </div>
              <Button
                color="secondary"
                onPress={handleGenerate}
                isLoading={generating}
                isDisabled={mcqCount + saCount === 0 || mcqCount + saCount > 100}
              >
                {generating ? "Generating…" : "Generate & Save to Bank"}
              </Button>
            </div>

            {/* Result */}
            {lastResult && (
              <div className={`rounded-lg p-3 text-sm border-2 ${lastResult.success ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}`}>
                {lastResult.success ? (
                  <>
                    ✅ <strong>Saved {lastResult.saved}</strong> questions to Supabase
                    {" "}(requested {lastResult.requested}, generated {lastResult.generated})
                    {lastResult.dbError && (
                      <div className="mt-2 text-red-600 font-mono text-xs bg-red-100 p-2 rounded">
                        DB Error: {lastResult.dbError}
                      </div>
                    )}
                    {lastResult.generated < lastResult.requested && (
                      <div className="text-amber-600 mt-1">
                        ⚠️ {lastResult.requested - lastResult.generated} filtered out (LaTeX or non-integer answers)
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <div className="font-bold text-base mb-1">❌ Error</div>
                    <div>{lastResult.error}</div>
                    {lastResult.errors && (
                      <div className="mt-2 font-mono text-xs bg-red-100 p-2 rounded">
                        {lastResult.errors.join(" | ")}
                      </div>
                    )}
                  </div>
                )}
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer">Raw response (for debugging)</summary>
                  <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(lastResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Bank Stats Table ── */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="font-semibold text-base">Current Bank Stats</span>
            <Button size="sm" variant="light" onPress={loadStats} isLoading={loadingStats}>
              Refresh
            </Button>
          </CardHeader>
          <Divider />
          <CardBody className="p-0">
            {loadingStats ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : stats.length === 0 ? (
              <p className="text-center text-gray-400 p-8">No questions in bank yet. Generate some above!</p>
            ) : (
              <Table removeWrapper aria-label="Question bank stats">
                <TableHeader>
                  <TableColumn>SUBJECT</TableColumn>
                  <TableColumn>TOPIC</TableColumn>
                  <TableColumn>DIFFICULTY</TableColumn>
                  <TableColumn>MCQ</TableColumn>
                  <TableColumn>SA</TableColumn>
                  <TableColumn>TOTAL</TableColumn>
                  <TableColumn>VERIFIED</TableColumn>
                </TableHeader>
                <TableBody>
                  {stats.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.subject}</TableCell>
                      <TableCell className="text-xs font-medium">{row.topic}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat"
                          color={row.difficulty==="easy"?"success":row.difficulty==="hard"?"danger":"warning"}>
                          {row.difficulty}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center">{row.mcq}</TableCell>
                      <TableCell className="text-center">{row.sa}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${row.mcq+row.sa >= 30 ? "text-green-600" : row.mcq+row.sa >= 10 ? "text-amber-600" : "text-red-500"}`}>
                          {row.mcq + row.sa}
                        </span>
                        {row.mcq+row.sa < 30 && (
                          <span className="text-xs text-gray-400 ml-1">
                            (need {30-(row.mcq+row.sa)} more)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-gray-400">
                        {row.verified}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}
