import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Slider,
  Switch,
  Card,
  CardBody,
  CardHeader,
  Spinner,
} from "@nextui-org/react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";

const TEST_TYPES = [
  {
    key: "concept",
    label: "Concept Test",
    desc: "Focused on 1-2 topics, 10-20 questions",
    defaultTime: 1200,
  },
  {
    key: "sectional",
    label: "Sectional Test",
    desc: "One full section (QA/VA/DI), 25-45 questions",
    defaultTime: 2400,
  },
  {
    key: "fullmock",
    label: "Full-Length Mock",
    desc: "All sections, 60-90 questions, full exam simulation",
    defaultTime: 7200,
  },
];

const DIFFICULTY_LEVELS = [
  { key: "easy", label: "Easy", color: "success" },
  { key: "medium", label: "Medium", color: "warning" },
  { key: "hard", label: "Hard", color: "danger" },
  { key: "mixed", label: "Mixed", color: "primary" },
];

const SUBJECT_PRESETS = [
  "Quantitative Ability",
  "Verbal Ability",
  "Data Interpretation",
  "Logical Reasoning",
];

const QA_TOPICS = [
  "Algebra", "Arithmetic", "Geometry", "Number System", "Mensuration",
  "Trigonometry", "Permutation & Combination", "Probability", "Percentages",
  "Profit & Loss", "Time & Work", "Speed Distance Time", "Averages", "Ratio & Proportion",
  "Tables", "Bar Graphs", "Pie Charts", "Line Graphs", "Caselets",
];

const VA_TOPICS = [
  "Reading Comprehension", "Vocabulary", "Grammar", "Para Jumbles",
  "Sentence Correction", "Fill in the Blanks", "Synonyms & Antonyms",
  "Idioms & Phrases", "Critical Reasoning", "Analogies",
];

const LR_TOPICS = [
  "Arrangements", "Syllogisms", "Blood Relations", "Coding-Decoding",
  "Direction Sense", "Puzzles", "Series", "Venn Diagrams", "Clocks & Calendars",
];

const DI_TOPICS = [
  "Tables", "Bar Graphs", "Pie Charts", "Line Graphs", "Caselets",
  "Mixed DI Sets", "Data Sufficiency",
];

const TOPIC_PRESETS = {
  "Quantitative Ability": QA_TOPICS,
  "Quantitative Ability (MCQ)": QA_TOPICS,
  "Quantitative Ability (SA)": QA_TOPICS,
  "Quantitative Aptitude": QA_TOPICS,
  "Quantitative & Numerical Ability": QA_TOPICS,
  "Verbal Ability": VA_TOPICS,
  "Verbal Ability (MCQ)": VA_TOPICS,
  "Verbal Ability & Reading Comprehension": VA_TOPICS,
  "Verbal & Reasoning Ability": [...VA_TOPICS, ...LR_TOPICS.slice(0, 4)],
  "Data Interpretation": DI_TOPICS,
  "Logical Reasoning": LR_TOPICS,
  "Data Interpretation & Logical Reasoning": [...DI_TOPICS, ...LR_TOPICS],
};

function CustomTestGenerator({ userData, role }) {
  const [step, setStep] = useState(0);

  // Step 0: Config
  const [testType, setTestType] = useState("concept");
  const [testTitle, setTestTitle] = useState("");
  const [testDesc, setTestDesc] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [timeLimit, setTimeLimit] = useState(1200);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [config, setConfig] = useState({
    switch_section: true,
    switch_questions: true,
    calculator_allowed: false,
    allow_retests: false,
    public_access: false,
    timeout: 1200,
  });

  // Step 1: Define sections & topics
  const [sections, setSections] = useState([]);
  // Each section: { subjectTitle, topics: [{ topicName, mcqCount, saCount }], mcqPos, mcqNeg, saPos, saNeg, time }

  // Step 2: Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Step 3: Publish
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Sectional test has 3 fixed section categories
  const SECTIONAL_CATEGORIES = [
    { id: "QA", title: "Quantitative Aptitude" },
    { id: "VA", title: "Verbal Ability" },
    { id: "LR", title: "Logical Reasoning" },
  ];

  // Store concept test_groups and mock_categories separately
  const [conceptGroups, setConceptGroups] = useState([]);
  const [mockCategories, setMockCategories] = useState([]);

  useEffect(() => {
    loadCourses();
    loadConceptGroups();
    loadMockCategories();
  }, []);

  async function loadConceptGroups() {
    const { data } = await supabase
      .from("test_groups")
      .select("*")
      .eq("type", "concept");
    if (data) setConceptGroups(data);
  }

  async function loadMockCategories() {
    const { data } = await supabase
      .from("mock_categories")
      .select("*")
      .order("seq");
    if (data) setMockCategories(data);
  }

  async function loadCourses() {
    const { data } = await supabase.from("courses").select("*");
    if (data) setCourses(data);
  }

  // Compute which categories to show based on test type
  useEffect(() => {
    let cats = [];
    if (testType === "concept") {
      cats = conceptGroups.map((g) => ({ id: g.id, title: g.title }));
    } else if (testType === "sectional") {
      cats = SECTIONAL_CATEGORIES;
    } else if (testType === "fullmock") {
      cats = mockCategories.map((c) => ({ id: c.id, title: c.title }));
    }
    setCategories(cats);
    setSelectedCategory(null);
  }, [testType, conceptGroups, mockCategories]);

  // Update time defaults when type changes
  useEffect(() => {
    const type = TEST_TYPES.find((t) => t.key === testType);
    if (type) {
      setTimeLimit(type.defaultTime);
      setConfig((c) => ({ ...c, timeout: type.defaultTime }));
    }
  }, [testType]);

  // --- Section management ---
  function addSection(subjectTitle) {
    if (!subjectTitle) return;
    if (sections.find((s) => s.subjectTitle === subjectTitle)) {
      toast.error("Section already added");
      return;
    }
    const presetTopics = TOPIC_PRESETS[subjectTitle] || [];
    setSections([
      ...sections,
      {
        subjectTitle,
        topics: presetTopics.length > 0
          ? [{ topicName: presetTopics[0], mcqCount: 5, saCount: 0 }]
          : [{ topicName: "", mcqCount: 5, saCount: 0 }],
        mcqPos: 4,
        mcqNeg: 1,
        saPos: 4,
        saNeg: 0,
        time: testType === "fullmock" ? 2400 : 0,
      },
    ]);
  }

  // Exam templates for full-length mock
  const EXAM_TEMPLATES = {
    "ipmat-indore": {
      label: "IPMAT Indore",
      totalTime: 7200, // 120 min
      desc: "3 sections | 90 questions | 120 minutes (40 min each)",
      sections: [
        {
          subjectTitle: "Quantitative Ability (MCQ)",
          topics: [
            { topicName: "Algebra", mcqCount: 5, saCount: 0 },
            { topicName: "Arithmetic", mcqCount: 5, saCount: 0 },
            { topicName: "Geometry", mcqCount: 4, saCount: 0 },
            { topicName: "Number System", mcqCount: 4, saCount: 0 },
            { topicName: "Tables", mcqCount: 3, saCount: 0 },
            { topicName: "Bar Graphs", mcqCount: 3, saCount: 0 },
            { topicName: "Pie Charts", mcqCount: 3, saCount: 0 },
            { topicName: "Percentages", mcqCount: 3, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2400, // 40 min
        },
        {
          subjectTitle: "Quantitative Ability (SA)",
          topics: [
            { topicName: "Algebra", mcqCount: 0, saCount: 4 },
            { topicName: "Arithmetic", mcqCount: 0, saCount: 4 },
            { topicName: "Geometry", mcqCount: 0, saCount: 4 },
            { topicName: "Number System", mcqCount: 0, saCount: 3 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2400, // 40 min
        },
        {
          subjectTitle: "Verbal Ability (MCQ)",
          topics: [
            { topicName: "Reading Comprehension", mcqCount: 12, saCount: 0 },
            { topicName: "Vocabulary", mcqCount: 8, saCount: 0 },
            { topicName: "Grammar", mcqCount: 8, saCount: 0 },
            { topicName: "Para Jumbles", mcqCount: 8, saCount: 0 },
            { topicName: "Fill in the Blanks", mcqCount: 5, saCount: 0 },
            { topicName: "Sentence Correction", mcqCount: 4, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2400, // 40 min
        },
      ],
    },
    "ipmat-rohtak": {
      label: "IPMAT Rohtak",
      totalTime: 7200, // 120 min
      desc: "3 sections | 120 questions | 120 minutes (40 min each)",
      sections: [
        {
          subjectTitle: "Quantitative Ability",
          topics: [
            { topicName: "Algebra", mcqCount: 8, saCount: 0 },
            { topicName: "Arithmetic", mcqCount: 8, saCount: 0 },
            { topicName: "Geometry", mcqCount: 6, saCount: 0 },
            { topicName: "Number System", mcqCount: 6, saCount: 0 },
            { topicName: "Percentages", mcqCount: 6, saCount: 0 },
            { topicName: "Ratio & Proportion", mcqCount: 6, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2400, // 40 min
        },
        {
          subjectTitle: "Logical Reasoning",
          topics: [
            { topicName: "Arrangements", mcqCount: 8, saCount: 0 },
            { topicName: "Puzzles", mcqCount: 8, saCount: 0 },
            { topicName: "Syllogisms", mcqCount: 6, saCount: 0 },
            { topicName: "Blood Relations", mcqCount: 6, saCount: 0 },
            { topicName: "Coding-Decoding", mcqCount: 6, saCount: 0 },
            { topicName: "Series", mcqCount: 6, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2400, // 40 min
        },
        {
          subjectTitle: "Verbal Ability",
          topics: [
            { topicName: "Reading Comprehension", mcqCount: 10, saCount: 0 },
            { topicName: "Vocabulary", mcqCount: 8, saCount: 0 },
            { topicName: "Grammar", mcqCount: 8, saCount: 0 },
            { topicName: "Para Jumbles", mcqCount: 7, saCount: 0 },
            { topicName: "Fill in the Blanks", mcqCount: 7, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2400, // 40 min
        },
      ],
    },
    "jipmat": {
      label: "JIPMAT",
      totalTime: 9000, // 150 min
      desc: "3 sections | 100 questions | 150 minutes",
      sections: [
        {
          subjectTitle: "Quantitative Aptitude",
          topics: [
            { topicName: "Algebra", mcqCount: 7, saCount: 0 },
            { topicName: "Arithmetic", mcqCount: 7, saCount: 0 },
            { topicName: "Geometry", mcqCount: 5, saCount: 0 },
            { topicName: "Number System", mcqCount: 5, saCount: 0 },
            { topicName: "Percentages", mcqCount: 5, saCount: 0 },
            { topicName: "Profit & Loss", mcqCount: 4, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 3000, // 50 min
        },
        {
          subjectTitle: "Verbal Ability & Reading Comprehension",
          topics: [
            { topicName: "Reading Comprehension", mcqCount: 10, saCount: 0 },
            { topicName: "Vocabulary", mcqCount: 6, saCount: 0 },
            { topicName: "Grammar", mcqCount: 6, saCount: 0 },
            { topicName: "Para Jumbles", mcqCount: 6, saCount: 0 },
            { topicName: "Fill in the Blanks", mcqCount: 6, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 3000, // 50 min
        },
        {
          subjectTitle: "Data Interpretation & Logical Reasoning",
          topics: [
            { topicName: "Tables", mcqCount: 4, saCount: 0 },
            { topicName: "Bar Graphs", mcqCount: 4, saCount: 0 },
            { topicName: "Pie Charts", mcqCount: 3, saCount: 0 },
            { topicName: "Arrangements", mcqCount: 6, saCount: 0 },
            { topicName: "Puzzles", mcqCount: 6, saCount: 0 },
            { topicName: "Syllogisms", mcqCount: 5, saCount: 0 },
            { topicName: "Blood Relations", mcqCount: 5, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 3000, // 50 min
        },
      ],
    },
    "iim-k-bms": {
      label: "IIM Kozhikode BMS",
      totalTime: 7200, // 120 min
      desc: "2 sections | 100 questions | 120 minutes (60 min each)",
      sections: [
        {
          subjectTitle: "Verbal Ability & Reading Comprehension",
          topics: [
            { topicName: "Reading Comprehension", mcqCount: 12, saCount: 0 },
            { topicName: "Vocabulary", mcqCount: 8, saCount: 0 },
            { topicName: "Grammar", mcqCount: 8, saCount: 0 },
            { topicName: "Para Jumbles", mcqCount: 6, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 3600, // 60 min
        },
        {
          subjectTitle: "Quantitative Ability",
          topics: [
            { topicName: "Algebra", mcqCount: 7, saCount: 0 },
            { topicName: "Arithmetic", mcqCount: 7, saCount: 0 },
            { topicName: "Geometry", mcqCount: 5, saCount: 0 },
            { topicName: "Number System", mcqCount: 5, saCount: 0 },
            { topicName: "Tables", mcqCount: 3, saCount: 0 },
            { topicName: "Bar Graphs", mcqCount: 3, saCount: 0 },
            { topicName: "Percentages", mcqCount: 3, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 3600, // 60 min
        },
      ],
    },
    "npat": {
      label: "NPAT",
      totalTime: 6000, // 100 min
      desc: "3 sections | 120 questions | 100 minutes",
      sections: [
        {
          subjectTitle: "Quantitative & Numerical Ability",
          topics: [
            { topicName: "Algebra", mcqCount: 8, saCount: 0 },
            { topicName: "Arithmetic", mcqCount: 8, saCount: 0 },
            { topicName: "Geometry", mcqCount: 6, saCount: 0 },
            { topicName: "Number System", mcqCount: 6, saCount: 0 },
            { topicName: "Percentages", mcqCount: 6, saCount: 0 },
            { topicName: "Profit & Loss", mcqCount: 6, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2000, // ~33 min
        },
        {
          subjectTitle: "Logical Reasoning",
          topics: [
            { topicName: "Arrangements", mcqCount: 8, saCount: 0 },
            { topicName: "Puzzles", mcqCount: 8, saCount: 0 },
            { topicName: "Syllogisms", mcqCount: 6, saCount: 0 },
            { topicName: "Blood Relations", mcqCount: 6, saCount: 0 },
            { topicName: "Coding-Decoding", mcqCount: 6, saCount: 0 },
            { topicName: "Series", mcqCount: 6, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2000, // ~33 min
        },
        {
          subjectTitle: "Verbal & Reasoning Ability",
          topics: [
            { topicName: "Reading Comprehension", mcqCount: 10, saCount: 0 },
            { topicName: "Vocabulary", mcqCount: 8, saCount: 0 },
            { topicName: "Grammar", mcqCount: 8, saCount: 0 },
            { topicName: "Para Jumbles", mcqCount: 7, saCount: 0 },
            { topicName: "Analogies", mcqCount: 7, saCount: 0 },
          ],
          mcqPos: 4, mcqNeg: 1, saPos: 4, saNeg: 0,
          time: 2000, // ~33 min
        },
      ],
    },
  };

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Load a full-length mock template by exam name
  function createFullMockTemplate(templateKey) {
    const template = EXAM_TEMPLATES[templateKey];
    if (!template) return;
    setSections(template.sections.map((s) => ({ ...s })));
    setTimeLimit(template.totalTime);
    setConfig((c) => ({ ...c, timeout: template.totalTime }));
    setSelectedTemplate(templateKey);
    toast.success(`${template.label} template loaded!`);
  }

  function removeSection(idx) {
    setSections(sections.filter((_, i) => i !== idx));
  }

  function addTopic(sIdx) {
    const updated = [...sections];
    updated[sIdx].topics.push({ topicName: "", mcqCount: 3, saCount: 0 });
    setSections(updated);
  }

  function removeTopic(sIdx, tIdx) {
    const updated = [...sections];
    updated[sIdx].topics = updated[sIdx].topics.filter((_, i) => i !== tIdx);
    setSections(updated);
  }

  function updateTopic(sIdx, tIdx, field, value) {
    const updated = [...sections];
    updated[sIdx].topics[tIdx][field] = value;
    setSections(updated);
  }

  function updateSection(sIdx, field, value) {
    const updated = [...sections];
    updated[sIdx][field] = value;
    setSections(updated);
  }

  const totalQuestions = useMemo(() => {
    return sections.reduce(
      (acc, s) =>
        acc +
        s.topics.reduce(
          (a, t) => a + (parseInt(t.mcqCount) || 0) + (parseInt(t.saCount) || 0),
          0
        ),
      0
    );
  }, [sections]);

  // --- Generate questions via Gemini ---
  async function generateQuestions() {
    setGenerating(true);
    setGenerationError(null);
    const loadingToast = toast.loading("Generating questions with AI...");

    try {
      const payload = {
        sections: sections.map((s) => ({
          subjectTitle: s.subjectTitle,
          topics: s.topics
            .filter((t) => t.topicName && ((parseInt(t.mcqCount) || 0) + (parseInt(t.saCount) || 0)) > 0)
            .map((t) => ({
              topicName: t.topicName,
              mcqCount: parseInt(t.mcqCount) || 0,
              saCount: parseInt(t.saCount) || 0,
            })),
        })),
        difficulty,
        testType,
      };

      const res = await fetch("/api/test-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.questions) {
        setGeneratedQuestions(data.questions);
        toast.success(`Generated ${data.questions.length} questions!`);
        toast.dismiss(loadingToast);
      } else {
        const debugStr = data.debug ? "\n\nDebug: " + JSON.stringify(data.debug, null, 2) : "";
        setGenerationError((data.error || "Failed to generate questions") + debugStr);
        toast.error(data.error || "Failed to generate questions");
        toast.dismiss(loadingToast);
      }
    } catch (e) {
      setGenerationError("Network error: " + e.message);
      toast.error("Error: " + e.message);
      toast.dismiss(loadingToast);
    }
    setGenerating(false);
  }

  // Auto-generate when entering step 2
  useEffect(() => {
    if (step === 2 && generatedQuestions.length === 0 && !generating) {
      generateQuestions();
    }
  }, [step]);

  // Remove a generated question
  function removeQuestion(tempId) {
    setGeneratedQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  }

  // --- Publish ---
  async function publishTest() {
    setPublishing(true);
    const loadingToast = toast.loading("Publishing test...");

    try {
      const payload = {
        title: testTitle,
        description: testDesc,
        // For fullmock: category is a mock_categories ID
        // For concept/sectional: category is null, routing info is in config
        category: testType === "fullmock" ? selectedCategory : null,
        course: selectedCourses[0] || null,
        courses: selectedCourses,
        generatorType: testType,
        difficulty,
        timeLimit,
        sections: sections.map((s) => ({
          subjectTitle: s.subjectTitle,
          topics: s.topics
            .filter((t) => t.topicName && ((parseInt(t.mcqCount) || 0) + (parseInt(t.saCount) || 0)) > 0)
            .map((t) => ({
              topicName: t.topicName,
              mcqCount: parseInt(t.mcqCount) || 0,
              saCount: parseInt(t.saCount) || 0,
            })),
          markingScheme: { mcqPos: s.mcqPos, mcqNeg: s.mcqNeg, saPos: s.saPos, saNeg: s.saNeg },
          time: s.time,
        })),
        generatedQuestions,
        config: {
          ...config,
          timeout: timeLimit,
          courses: selectedCourses,
          // Store page-routing info
          generatorType: testType,
          ...(testType === "concept" && { targetGroup: selectedCategory }),
          ...(testType === "sectional" && { targetSection: selectedCategory }),
        },
      };

      const res = await fetch("/api/test-generator/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Test published successfully!");
        toast.dismiss(loadingToast);
        setPublishResult(result);
        setStep(3);
      } else {
        toast.error(result.error || "Failed to publish");
        toast.dismiss(loadingToast);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
      toast.dismiss(loadingToast);
    }
    setPublishing(false);
  }

  // --- Validation ---
  function canProceed() {
    switch (step) {
      case 0:
        return testTitle.trim() && selectedCategory !== null && selectedCategory !== "" && selectedCourses.length > 0;
      case 1:
        return totalQuestions > 0 && sections.every((s) =>
          s.topics.some((t) => t.topicName && ((parseInt(t.mcqCount) || 0) + (parseInt(t.saCount) || 0)) > 0)
        );
      case 2:
        return generatedQuestions.length > 0 && !generating;
      default:
        return true;
    }
  }

  // =================== RENDERERS ===================

  function renderStep0() {
    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">Step 1: Test Configuration</h2>

        {/* Test Type */}
        <div>
          <p className="text-sm font-semibold mb-3 text-gray-700">Select Test Type</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEST_TYPES.map((type) => (
              <div
                key={type.key}
                onClick={() => setTestType(type.key)}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  testType === type.key
                    ? "border-purple-600 bg-purple-50 shadow-md"
                    : "border-gray-200 hover:border-purple-300"
                }`}
              >
                <p className="font-bold text-lg">{type.label}</p>
                <p className="text-sm text-gray-500 mt-1">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Test Title"
            placeholder="e.g. IPMAT Concept Test - Algebra"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            variant="bordered"
            isRequired
          />
          <Input
            label="Description (optional)"
            placeholder="Brief description of the test"
            value={testDesc}
            onChange={(e) => setTestDesc(e.target.value)}
            variant="bordered"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={
              testType === "concept"
                ? "Collection (Concept Tests Page)"
                : testType === "sectional"
                ? "Section (Sectional Test Page)"
                : "Category (Mock Tests Page)"
            }
            placeholder={
              testType === "concept"
                ? "Select collection"
                : testType === "sectional"
                ? "Select section"
                : "Select category"
            }
            variant="bordered"
            selectedKeys={selectedCategory ? [String(selectedCategory)] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              // For fullmock, category IDs are numbers; for others, could be strings
              setSelectedCategory(
                testType === "fullmock" ? (val ? Number(val) : null) : val || null
              );
            }}
          >
            {categories.map((c) => (
              <SelectItem key={String(c.id)} value={String(c.id)}>
                {c.title}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Course(s)"
            placeholder="Select one or more courses"
            variant="bordered"
            selectionMode="multiple"
            selectedKeys={new Set(selectedCourses.map(String))}
            onSelectionChange={(keys) => {
              const vals = Array.from(keys).map(Number).filter(Boolean);
              setSelectedCourses(vals);
            }}
          >
            {courses.map((c) => (
              <SelectItem key={String(c.id)} value={String(c.id)}>
                {c.title}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">Difficulty Level</p>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTY_LEVELS.map((d) => (
                <Chip
                  key={d.key}
                  color={d.color}
                  variant={difficulty === d.key ? "solid" : "bordered"}
                  className="cursor-pointer"
                  onClick={() => setDifficulty(d.key)}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">
              Time Limit: {Math.floor(timeLimit / 60)} min {timeLimit % 60}s
            </p>
            <Slider
              step={60}
              minValue={300}
              maxValue={10800}
              value={timeLimit}
              onChange={setTimeLimit}
              className="max-w-md"
              color="secondary"
            />
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-sm font-semibold mb-3 text-gray-700">Test Settings</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Switch
              isSelected={config.switch_section}
              onValueChange={(v) => setConfig({ ...config, switch_section: v })}
              size="sm"
            >
              Allow Section Jumping
            </Switch>
            <Switch
              isSelected={config.switch_questions}
              onValueChange={(v) => setConfig({ ...config, switch_questions: v })}
              size="sm"
            >
              Allow Question Jumping
            </Switch>
            <Switch
              isSelected={config.calculator_allowed}
              onValueChange={(v) => setConfig({ ...config, calculator_allowed: v })}
              size="sm"
            >
              Allow Calculator
            </Switch>
            <Switch
              isSelected={config.allow_retests}
              onValueChange={(v) => setConfig({ ...config, allow_retests: v })}
              size="sm"
            >
              Allow Multiple Attempts
            </Switch>
            <Switch
              isSelected={config.public_access}
              onValueChange={(v) => setConfig({ ...config, public_access: v })}
              size="sm"
            >
              Public Access (No Enrollment)
            </Switch>
          </div>
        </div>
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">
          Step 2: Define Sections & Topics
        </h2>
        <p className="text-sm text-gray-500">
          Add subjects and topics. AI will generate questions for each topic.
        </p>

        {/* Full Mock Template selector */}
        {testType === "fullmock" && sections.length === 0 && (
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <p className="font-semibold text-purple-800 mb-2">Choose Exam Template</p>
            <p className="text-sm text-gray-600 mb-3">
              Load a pre-configured exam template with sections, topics, question counts, and sectional timing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(EXAM_TEMPLATES).map(([key, tmpl]) => (
                <div
                  key={key}
                  onClick={() => createFullMockTemplate(key)}
                  className="cursor-pointer p-3 rounded-lg border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-100 transition-all bg-white"
                >
                  <p className="font-bold text-purple-800">{tmpl.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{tmpl.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {testType === "fullmock" && sections.length > 0 && selectedTemplate && (
          <div className="flex items-center gap-3">
            <Chip color="secondary" variant="flat" size="sm">
              Template: {EXAM_TEMPLATES[selectedTemplate]?.label}
            </Chip>
            <Button
              size="sm"
              variant="light"
              color="danger"
              onClick={() => {
                setSections([]);
                setSelectedTemplate(null);
              }}
            >
              Clear & Choose Different Template
            </Button>
          </div>
        )}

        {/* Quick add subject buttons */}
        <div>
          <p className="text-sm font-semibold mb-2 text-gray-700">
            {testType === "fullmock" ? "Add / Edit Sections" : "Quick Add Subject"}
          </p>
          <div className="flex gap-2 flex-wrap">
            {SUBJECT_PRESETS.map((s) => (
              <Button
                key={s}
                color={sections.find((sec) => sec.subjectTitle === s) ? "secondary" : "default"}
                variant={sections.find((sec) => sec.subjectTitle === s) ? "solid" : "bordered"}
                size="sm"
                onClick={() => addSection(s)}
              >
                {s}
              </Button>
            ))}
            <Button
              size="sm"
              variant="bordered"
              color="primary"
              onClick={() => {
                const name = prompt("Enter custom subject name:");
                if (name) addSection(name.trim());
              }}
            >
              + Custom Subject
            </Button>
          </div>
        </div>

        <Divider />

        {sections.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            Click a subject above to add it as a test section
          </p>
        ) : (
          sections.map((section, sIdx) => (
            <Card key={sIdx} className="p-2">
              <CardHeader className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{section.subjectTitle}</p>
                  <p className="text-sm text-gray-500">
                    {section.topics.reduce(
                      (a, t) => a + (parseInt(t.mcqCount) || 0) + (parseInt(t.saCount) || 0),
                      0
                    )}{" "}
                    questions total
                  </p>
                </div>
                <Button
                  color="danger"
                  variant="light"
                  size="sm"
                  onClick={() => removeSection(sIdx)}
                >
                  Remove
                </Button>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-3">
                  {section.topics.map((topic, tIdx) => (
                    <div
                      key={tIdx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      {/* Topic name - select from presets or type custom */}
                      <div className="flex-1">
                        {(() => {
                          // Find matching topic presets — check exact match first, then partial match
                          const presets = TOPIC_PRESETS[section.subjectTitle] ||
                            Object.entries(TOPIC_PRESETS).find(([key]) =>
                              section.subjectTitle.toLowerCase().includes(key.toLowerCase().split(" ")[0])
                            )?.[1] || null;
                          return presets ? (
                            <Select
                              label="Topic"
                              size="sm"
                              variant="bordered"
                              selectedKeys={topic.topicName ? [topic.topicName] : []}
                              onSelectionChange={(keys) => {
                                const val = Array.from(keys)[0];
                                if (val) updateTopic(sIdx, tIdx, "topicName", val);
                              }}
                            >
                              {presets.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </Select>
                          ) : (
                            <Input
                              label="Topic Name"
                              size="sm"
                              variant="bordered"
                              value={topic.topicName}
                              onChange={(e) =>
                                updateTopic(sIdx, tIdx, "topicName", e.target.value)
                              }
                            />
                          );
                        })()}
                      </div>
                      <Input
                        type="number"
                        label="MCQ"
                        size="sm"
                        className="w-20"
                        value={String(topic.mcqCount || 0)}
                        min={0}
                        onChange={(e) =>
                          updateTopic(sIdx, tIdx, "mcqCount", e.target.value)
                        }
                        variant="bordered"
                      />
                      <Input
                        type="number"
                        label="SA"
                        size="sm"
                        className="w-20"
                        value={String(topic.saCount || 0)}
                        min={0}
                        onChange={(e) =>
                          updateTopic(sIdx, tIdx, "saCount", e.target.value)
                        }
                        variant="bordered"
                      />
                      <Button
                        isIconOnly
                        color="danger"
                        variant="light"
                        size="sm"
                        onClick={() => removeTopic(sIdx, tIdx)}
                        isDisabled={section.topics.length <= 1}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="bordered"
                    color="secondary"
                    onClick={() => addTopic(sIdx)}
                    className="self-start"
                  >
                    + Add Topic
                  </Button>

                  <Divider className="my-3" />

                  <p className="text-sm font-semibold text-gray-700 mb-2">Marking Scheme</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                      type="number"
                      label="MCQ +Marks"
                      size="sm"
                      value={String(section.mcqPos)}
                      onChange={(e) => updateSection(sIdx, "mcqPos", Number(e.target.value))}
                      variant="bordered"
                    />
                    <Input
                      type="number"
                      label="MCQ -Marks"
                      size="sm"
                      value={String(section.mcqNeg)}
                      onChange={(e) => updateSection(sIdx, "mcqNeg", Number(e.target.value))}
                      variant="bordered"
                    />
                    <Input
                      type="number"
                      label="SA +Marks"
                      size="sm"
                      value={String(section.saPos)}
                      onChange={(e) => updateSection(sIdx, "saPos", Number(e.target.value))}
                      variant="bordered"
                    />
                    <Input
                      type="number"
                      label="SA -Marks"
                      size="sm"
                      value={String(section.saNeg)}
                      onChange={(e) => updateSection(sIdx, "saNeg", Number(e.target.value))}
                      variant="bordered"
                      description="Usually 0 for SA"
                    />
                  </div>

                  {/* Sectional Timing */}
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Section Time Limit
                      {testType === "fullmock" && (
                        <span className="text-xs font-normal text-purple-600 ml-2">
                          (Required for full-length mocks)
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        label="Minutes"
                        size="sm"
                        className="w-32"
                        value={String(Math.floor((section.time || 0) / 60))}
                        min={0}
                        onChange={(e) => {
                          const mins = parseInt(e.target.value) || 0;
                          const currentSecs = (section.time || 0) % 60;
                          updateSection(sIdx, "time", mins * 60 + currentSecs);
                        }}
                        variant="bordered"
                      />
                      <Input
                        type="number"
                        label="Seconds"
                        size="sm"
                        className="w-32"
                        value={String((section.time || 0) % 60)}
                        min={0}
                        max={59}
                        onChange={(e) => {
                          const secs = Math.min(59, parseInt(e.target.value) || 0);
                          const currentMins = Math.floor((section.time || 0) / 60);
                          updateSection(sIdx, "time", currentMins * 60 + secs);
                        }}
                        variant="bordered"
                      />
                      <p className="text-sm text-gray-500">
                        {section.time > 0
                          ? `${Math.floor(section.time / 60)}m ${section.time % 60}s`
                          : "No section limit (uses total time)"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}

        {sections.length > 0 && (
          <div className="flex flex-col gap-2 p-3 bg-purple-50 rounded-xl">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-purple-800">
                Total Questions to Generate: {totalQuestions}
              </p>
              <p className="text-sm text-gray-600">
                Sections: {sections.length} | Total Time: {Math.floor(timeLimit / 60)} min
              </p>
            </div>
            {testType === "fullmock" && (
              <div className="flex gap-2 flex-wrap">
                {sections.map((s, idx) => (
                  <Chip key={idx} size="sm" variant="flat" color={s.time > 0 ? "success" : "warning"}>
                    {s.subjectTitle}: {s.time > 0 ? `${Math.floor(s.time / 60)}m` : "No limit"}
                  </Chip>
                ))}
                <Chip size="sm" variant="flat" color="secondary">
                  Sum: {Math.floor(sections.reduce((a, s) => a + (s.time || 0), 0) / 60)}m
                </Chip>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">
          Step 3: AI-Generated Questions
        </h2>

        {generating ? (
          <div className="flex flex-col items-center gap-4 p-12">
            <Spinner size="lg" color="secondary" />
            <p className="text-gray-500">Generating questions with Gemini AI...</p>
            <p className="text-sm text-gray-400">This may take 20-60 seconds depending on the number of questions</p>
          </div>
        ) : generationError ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="text-4xl">&#9888;</div>
            <pre className="text-red-600 font-semibold text-sm whitespace-pre-wrap max-w-2xl text-left">{generationError}</pre>
            <Button color="secondary" onClick={generateQuestions}>
              Retry Generation
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {generatedQuestions.length} questions generated
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="bordered"
                  color="warning"
                  onClick={() => {
                    setGeneratedQuestions([]);
                    generateQuestions();
                  }}
                >
                  Regenerate All
                </Button>
              </div>
            </div>

            <Divider />

            {/* Group by section */}
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {sections.map((section, sIdx) => {
                const sectionQs = generatedQuestions.filter(
                  (q) => q.sectionTitle === section.subjectTitle
                );
                if (sectionQs.length === 0) return null;
                return (
                  <div key={sIdx}>
                    <p className="font-bold text-lg text-purple-700 mb-2">
                      {section.subjectTitle} ({sectionQs.length} questions)
                    </p>
                    {sectionQs.map((q, qIdx) => (
                      <div
                        key={q.tempId}
                        className="p-3 mb-2 rounded-lg border border-gray-200 bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Chip size="sm" variant="flat" color="default">
                                Q{qIdx + 1}
                              </Chip>
                              <Chip size="sm" variant="flat" color="secondary">
                                {q.topicName}
                              </Chip>
                              <Chip
                                size="sm"
                                variant="flat"
                                color={q.type === "options" ? "primary" : "warning"}
                              >
                                {q.type === "options" ? "MCQ" : "SA"}
                              </Chip>
                            </div>
                            <div
                              className="text-sm mt-1"
                              dangerouslySetInnerHTML={{ __html: q.question }}
                            />
                            {q.type === "options" && q.options && (
                              <div className="mt-2 grid grid-cols-2 gap-1">
                                {(Array.isArray(q.options) ? q.options : []).map(
                                  (opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`text-xs p-1 rounded ${
                                        opt.isCorrect
                                          ? "bg-green-100 text-green-800 font-semibold"
                                          : "bg-gray-100"
                                      }`}
                                    >
                                      ({opt.title || String.fromCharCode(65 + oIdx)}){" "}
                                      {opt.text}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            {q.type === "input" && q.options?.answer && (
                              <p className="text-xs mt-1 text-green-700 font-semibold">
                                Answer: {q.options.answer}
                              </p>
                            )}
                            {q.explanation && (
                              <p className="text-xs mt-2 text-blue-600 italic">
                                Explanation: {q.explanation}
                              </p>
                            )}
                          </div>
                          <Button
                            isIconOnly
                            color="danger"
                            variant="light"
                            size="sm"
                            onClick={() => removeQuestion(q.tempId)}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderStep3() {
    if (publishResult) {
      return (
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="text-6xl">&#10003;</div>
          <h2 className="text-2xl font-bold text-green-700">
            Test Created Successfully!
          </h2>
          <div className="bg-green-50 p-6 rounded-xl w-full max-w-lg">
            <p><strong>Test ID:</strong> {publishResult.testId}</p>
            <p><strong>Title:</strong> {testTitle}</p>
            <p><strong>Questions:</strong> {publishResult.totalQuestions}</p>
            <p><strong>Sections:</strong> {publishResult.sectionsCreated}</p>
          </div>
          <p className="text-sm text-gray-500">
            The test is now live and visible to students in the selected category.
          </p>
          <Button
            color="secondary"
            onClick={() => {
              setStep(0);
              setTestTitle("");
              setTestDesc("");
              setSections([]);
              setGeneratedQuestions([]);
              setPublishResult(null);
              setGenerationError(null);
              setSelectedCourses([]);
            }}
          >
            Create Another Test
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">Step 4: Review & Publish</h2>

        <Card>
          <CardBody className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Title</p>
                <p className="font-semibold">{testTitle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-semibold">
                  {TEST_TYPES.find((t) => t.key === testType)?.label}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {testType === "concept" ? "Collection" : testType === "sectional" ? "Section" : "Category"}
                </p>
                <p className="font-semibold">
                  {categories.find((c) => String(c.id) === String(selectedCategory))?.title || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Course(s)</p>
                <div className="flex gap-1 flex-wrap">
                  {selectedCourses.map((cId) => (
                    <Chip key={cId} size="sm" variant="flat" color="primary">
                      {courses.find((c) => c.id === cId)?.title || cId}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Difficulty</p>
                <Chip
                  color={DIFFICULTY_LEVELS.find((d) => d.key === difficulty)?.color}
                  size="sm"
                >
                  {difficulty}
                </Chip>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Questions</p>
                <p className="font-semibold">{generatedQuestions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time Limit</p>
                <p className="font-semibold">{Math.floor(timeLimit / 60)} minutes</p>
              </div>
            </div>

            <Divider />

            <p className="font-semibold">Sections:</p>
            {sections.map((s, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{s.subjectTitle}</p>
                <p className="text-sm text-gray-500">
                  {generatedQuestions.filter((q) => q.sectionTitle === s.subjectTitle).length}{" "}
                  questions | MCQ: +{s.mcqPos}/-{s.mcqNeg} | SA: +{s.saPos}/-{s.saNeg}
                  {s.time > 0 && ` | Time: ${Math.floor(s.time / 60)}m ${s.time % 60 > 0 ? `${s.time % 60}s` : ""}`}
                </p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {s.topics
                    .filter((t) => t.topicName)
                    .map((t, tIdx) => (
                      <Chip key={tIdx} size="sm" variant="flat">
                        {t.topicName}: {(parseInt(t.mcqCount) || 0) + (parseInt(t.saCount) || 0)}
                      </Chip>
                    ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Button
          color="secondary"
          size="lg"
          className="w-full font-bold text-lg"
          isLoading={publishing}
          onClick={publishTest}
        >
          Publish Test
        </Button>
      </div>
    );
  }

  const steps = [
    "Test Config",
    "Sections & Topics",
    "Generate Questions",
    "Publish",
  ];

  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-4 border-b bg-white">
        <h1 className="text-xl font-bold text-purple-900">
          AI Test Generator
        </h1>
        <p className="text-sm text-gray-500">
          Create tests powered by Gemini AI — no question bank needed
        </p>
      </div>

      <div className="flex items-center gap-2 p-4 bg-gray-50 border-b overflow-x-auto">
        {steps.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx < step
                  ? "bg-green-500 text-white"
                  : idx === step
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {idx < step ? "\u2713" : idx + 1}
            </div>
            <span
              className={`text-sm whitespace-nowrap ${
                idx === step ? "font-bold text-purple-800" : "text-gray-500"
              }`}
            >
              {s}
            </span>
            {idx < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-gray-300"></div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {!publishResult && (
        <div className="flex justify-between items-center p-4 border-t bg-white">
          <Button
            variant="bordered"
            onClick={() => setStep(Math.max(0, step - 1))}
            isDisabled={step === 0}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <Button
                color="secondary"
                onClick={() => setStep(step + 1)}
                isDisabled={!canProceed()}
              >
                {step === 2 ? "Review & Publish" : "Next"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomTestGenerator;
