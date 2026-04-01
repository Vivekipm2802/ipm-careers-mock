import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Slider,
  Spacer,
  Switch,
  Checkbox,
  CheckboxGroup,
  Textarea,
  Card,
  CardBody,
  CardHeader,
  Tooltip,
  Badge,
  Spinner,
  Progress,
} from "@nextui-org/react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";

const TEST_TYPES = [
  {
    key: "concept",
    label: "Concept Test",
    desc: "Focused on 1-2 topics, 10-20 questions",
    defaultTime: 1200,
    defaultQuestions: 15,
  },
  {
    key: "sectional",
    label: "Sectional Test",
    desc: "One full section (QA/VA/DI), 25-45 questions",
    defaultTime: 2400,
    defaultQuestions: 30,
  },
  {
    key: "fullmock",
    label: "Full-Length Mock",
    desc: "All sections, 60-90 questions, full exam simulation",
    defaultTime: 7200,
    defaultQuestions: 90,
  },
];

const DIFFICULTY_LEVELS = [
  { key: "easy", label: "Easy", color: "success" },
  { key: "medium", label: "Medium", color: "warning" },
  { key: "hard", label: "Hard", color: "danger" },
  { key: "mixed", label: "Mixed", color: "primary" },
];

function CustomTestGenerator({ userData, role }) {
  // Wizard step
  const [step, setStep] = useState(0);

  // Step 0: Test Type & Basic Config
  const [testType, setTestType] = useState("concept");
  const [testTitle, setTestTitle] = useState("");
  const [testDesc, setTestDesc] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [timeLimit, setTimeLimit] = useState(1200);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Step 1: Topic Selection & Question Distribution
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  // Each section: { subjectId, subjectTitle, modules: [{ moduleId, title, questionCount, availableCount, selectedCount }], pos, neg, time, questionType }

  // Step 2: Question Preview & Selection
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [previewSection, setPreviewSection] = useState(0);

  // Step 3: Review & Publish
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Config toggles
  const [config, setConfig] = useState({
    switch_section: true,
    switch_questions: true,
    calculator_allowed: false,
    allow_retests: false,
    is_scientific: false,
    public_access: false,
    timeout: 1200,
  });

  // Load categories & courses on mount
  useEffect(() => {
    loadCategories();
    loadCourses();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from("mock_categories")
      .select("*")
      .order("seq");
    if (data) setCategories(data);
  }

  async function loadCourses() {
    const { data } = await supabase.from("courses").select("*");
    if (data) setCourses(data);
  }

  async function loadTopics() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/test-generator/get-topics${selectedCourse ? `?course=${selectedCourse}` : ""}`
      );
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics);
        setSubjects(data.subjects);
      }
    } catch (e) {
      toast.error("Failed to load topics");
    }
    setLoading(false);
  }

  // When moving to step 1, load topics
  useEffect(() => {
    if (step === 1) loadTopics();
  }, [step]);

  // Initialize sections from selected subjects/topics
  function addSection(subjectId, subjectTitle) {
    const existing = sections.find((s) => s.subjectId === subjectId);
    if (existing) {
      toast.error("Section already added");
      return;
    }
    const subjectTopics = topics.filter(
      (t) => t.subjectId === subjectId
    );
    setSections([
      ...sections,
      {
        subjectId,
        subjectTitle,
        modules: subjectTopics.map((t) => ({
          moduleId: t.moduleId,
          title: t.title,
          availableCount: t.questionCount,
          selectedCount: 0,
        })),
        pos: 4,
        neg: 1,
        time: 0,
        questionType: "options",
      },
    ]);
  }

  function removeSection(idx) {
    setSections(sections.filter((_, i) => i !== idx));
  }

  function updateSectionModule(sectionIdx, moduleIdx, count) {
    const updated = [...sections];
    updated[sectionIdx].modules[moduleIdx].selectedCount = Math.min(
      count,
      updated[sectionIdx].modules[moduleIdx].availableCount
    );
    setSections(updated);
  }

  function updateSectionMarking(sectionIdx, field, value) {
    const updated = [...sections];
    updated[sectionIdx][field] = value;
    setSections(updated);
  }

  const totalSelectedQuestions = useMemo(() => {
    return sections.reduce(
      (acc, s) =>
        acc + s.modules.reduce((a, m) => a + (m.selectedCount || 0), 0),
      0
    );
  }, [sections]);

  // Load questions for preview
  async function loadQuestions() {
    setLoadingQuestions(true);
    const allQuestions = [];

    for (const section of sections) {
      for (const mod of section.modules) {
        if (mod.selectedCount <= 0) continue;
        try {
          const res = await fetch(
            `/api/test-generator/get-questions?moduleIds=${mod.moduleId}&limit=${mod.selectedCount}`
          );
          const data = await res.json();
          if (data.questions) {
            allQuestions.push(
              ...data.questions.map((q) => ({
                ...q,
                sectionTitle: section.subjectTitle,
                moduleName: mod.title,
                selected: true,
              }))
            );
          }
        } catch (e) {
          console.error("Failed to load questions for module", mod.title);
        }
      }
    }

    setQuestions(allQuestions);
    setSelectedQuestions(allQuestions.map((q) => q.id));
    setLoadingQuestions(false);
  }

  useEffect(() => {
    if (step === 2) loadQuestions();
  }, [step]);

  function toggleQuestion(qId) {
    setSelectedQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  }

  // Publish test
  async function publishTest() {
    setPublishing(true);
    const r = toast.loading("Creating test...");

    try {
      const payload = {
        title: testTitle,
        description: testDesc,
        category: selectedCategory,
        course: selectedCourse,
        generatorType: testType,
        difficulty,
        totalQuestions: selectedQuestions.length,
        timeLimit,
        sections: sections
          .filter((s) => s.modules.some((m) => m.selectedCount > 0))
          .map((s) => ({
            subjectTitle: s.subjectTitle,
            subjectId: s.subjectId,
            modules: s.modules
              .filter((m) => m.selectedCount > 0)
              .map((m) => ({
                moduleId: m.moduleId,
                title: m.title,
                questionCount: m.selectedCount,
              })),
            markingScheme: { pos: s.pos, neg: s.neg },
            questionType: s.questionType,
            time: s.time,
          })),
        selectedQuestionIds: selectedQuestions,
        config: { ...config, timeout: timeLimit },
      };

      const res = await fetch("/api/test-generator/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.testId) {
        toast.success("Test created successfully!");
        toast.remove(r);
        setPublishResult(result);
        setStep(3);
      } else {
        toast.error(result.error || "Failed to create test");
        toast.remove(r);
      }
    } catch (e) {
      toast.error("Error creating test: " + e.message);
      toast.remove(r);
    }
    setPublishing(false);
  }

  // Update time when test type changes
  useEffect(() => {
    const type = TEST_TYPES.find((t) => t.key === testType);
    if (type) {
      setTimeLimit(type.defaultTime);
      setConfig((c) => ({ ...c, timeout: type.defaultTime }));
    }
  }, [testType]);

  // Step renderers
  function renderStep0() {
    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">
          Step 1: Test Configuration
        </h2>

        {/* Test Type Selection */}
        <div>
          <p className="text-sm font-semibold mb-3 text-gray-700">
            Select Test Type
          </p>
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

        {/* Basic Info */}
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
            label="Category"
            placeholder="Select category"
            variant="bordered"
            selectedKeys={selectedCategory ? [String(selectedCategory)] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              setSelectedCategory(val ? Number(val) : null);
            }}
          >
            {categories.map((c) => (
              <SelectItem key={String(c.id)} value={String(c.id)}>
                {c.title}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Course"
            placeholder="Select course"
            variant="bordered"
            selectedKeys={selectedCourse ? [String(selectedCourse)] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              setSelectedCourse(val ? Number(val) : null);
            }}
          >
            {courses.map((c) => (
              <SelectItem key={String(c.id)} value={String(c.id)}>
                {c.title}
              </SelectItem>
            ))}
          </Select>
        </div>

        {/* Difficulty & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">
              Difficulty Level
            </p>
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

        {/* Test Config Toggles */}
        <div>
          <p className="text-sm font-semibold mb-3 text-gray-700">
            Test Settings
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Switch
              isSelected={config.switch_section}
              onValueChange={(v) =>
                setConfig({ ...config, switch_section: v })
              }
              size="sm"
            >
              Allow Section Jumping
            </Switch>
            <Switch
              isSelected={config.switch_questions}
              onValueChange={(v) =>
                setConfig({ ...config, switch_questions: v })
              }
              size="sm"
            >
              Allow Question Jumping
            </Switch>
            <Switch
              isSelected={config.calculator_allowed}
              onValueChange={(v) =>
                setConfig({ ...config, calculator_allowed: v })
              }
              size="sm"
            >
              Allow Calculator
            </Switch>
            <Switch
              isSelected={config.allow_retests}
              onValueChange={(v) =>
                setConfig({ ...config, allow_retests: v })
              }
              size="sm"
            >
              Allow Multiple Attempts
            </Switch>
            <Switch
              isSelected={config.public_access}
              onValueChange={(v) =>
                setConfig({ ...config, public_access: v })
              }
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
          Step 2: Select Topics & Question Distribution
        </h2>

        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : (
          <>
            {/* Subject buttons */}
            <div>
              <p className="text-sm font-semibold mb-2 text-gray-700">
                Available Subjects (click to add section)
              </p>
              <div className="flex gap-2 flex-wrap">
                {subjects.map((s) => (
                  <Button
                    key={s.id}
                    color={
                      sections.find((sec) => sec.subjectId === s.id)
                        ? "secondary"
                        : "default"
                    }
                    variant={
                      sections.find((sec) => sec.subjectId === s.id)
                        ? "solid"
                        : "bordered"
                    }
                    size="sm"
                    onClick={() => addSection(s.id, s.title)}
                  >
                    {s.title} ({s.totalQuestions} Qs)
                  </Button>
                ))}
              </div>
            </div>

            <Divider />

            {/* Sections config */}
            {sections.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Click a subject above to add it as a test section
              </p>
            ) : (
              sections.map((section, sIdx) => (
                <Card key={sIdx} className="p-2">
                  <CardHeader className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">
                        {section.subjectTitle}
                      </p>
                      <p className="text-sm text-gray-500">
                        {section.modules.reduce(
                          (a, m) => a + (m.selectedCount || 0),
                          0
                        )}{" "}
                        questions selected
                      </p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <Input
                        type="number"
                        label="+Marks"
                        size="sm"
                        className="w-20"
                        value={String(section.pos)}
                        onChange={(e) =>
                          updateSectionMarking(
                            sIdx,
                            "pos",
                            Number(e.target.value)
                          )
                        }
                        variant="bordered"
                      />
                      <Input
                        type="number"
                        label="-Marks"
                        size="sm"
                        className="w-20"
                        value={String(section.neg)}
                        onChange={(e) =>
                          updateSectionMarking(
                            sIdx,
                            "neg",
                            Number(e.target.value)
                          )
                        }
                        variant="bordered"
                      />
                      <Select
                        label="Type"
                        size="sm"
                        className="w-32"
                        selectedKeys={[section.questionType]}
                        onSelectionChange={(keys) =>
                          updateSectionMarking(
                            sIdx,
                            "questionType",
                            Array.from(keys)[0]
                          )
                        }
                        variant="bordered"
                      >
                        <SelectItem key="options">MCQ</SelectItem>
                        <SelectItem key="input">Short Answer</SelectItem>
                      </Select>
                      <Button
                        color="danger"
                        variant="light"
                        size="sm"
                        onClick={() => removeSection(sIdx)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {section.modules.map((mod, mIdx) => (
                        <div
                          key={mIdx}
                          className="flex items-center gap-2 p-2 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{mod.title}</p>
                            <p className="text-xs text-gray-400">
                              {mod.availableCount} available
                            </p>
                          </div>
                          <Input
                            type="number"
                            size="sm"
                            className="w-20"
                            value={String(mod.selectedCount || 0)}
                            min={0}
                            max={mod.availableCount}
                            onChange={(e) =>
                              updateSectionModule(
                                sIdx,
                                mIdx,
                                Number(e.target.value) || 0
                              )
                            }
                            variant="bordered"
                          />
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ))
            )}

            {/* Summary bar */}
            {sections.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                <p className="font-semibold text-purple-800">
                  Total Questions: {totalSelectedQuestions}
                </p>
                <p className="text-sm text-gray-600">
                  Sections: {sections.length} | Time:{" "}
                  {Math.floor(timeLimit / 60)} min
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">
          Step 3: Review Questions
        </h2>

        {loadingQuestions ? (
          <div className="flex flex-col items-center gap-4 p-12">
            <Spinner size="lg" color="secondary" />
            <p className="text-gray-500">Loading questions from database...</p>
          </div>
        ) : (
          <>
            {/* Section tabs */}
            <div className="flex gap-2 flex-wrap">
              {[
                ...new Set(questions.map((q) => q.sectionTitle)),
              ].map((title, idx) => (
                <Chip
                  key={idx}
                  color={previewSection === idx ? "secondary" : "default"}
                  variant={previewSection === idx ? "solid" : "bordered"}
                  className="cursor-pointer"
                  onClick={() => setPreviewSection(idx)}
                >
                  {title} (
                  {
                    questions.filter(
                      (q) =>
                        q.sectionTitle === title &&
                        selectedQuestions.includes(q.id)
                    ).length
                  }
                  )
                </Chip>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {selectedQuestions.length} of {questions.length} questions
                selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="bordered"
                  onClick={() =>
                    setSelectedQuestions(questions.map((q) => q.id))
                  }
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="bordered"
                  onClick={() => setSelectedQuestions([])}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <Divider />

            {/* Question list */}
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {questions
                .filter((q) => {
                  const sectionTitles = [
                    ...new Set(questions.map((q) => q.sectionTitle)),
                  ];
                  return (
                    q.sectionTitle === sectionTitles[previewSection]
                  );
                })
                .map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedQuestions.includes(q.id)
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-200 bg-gray-50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={selectedQuestions.includes(q.id)}
                        onValueChange={() => toggleQuestion(q.id)}
                        color="secondary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Chip size="sm" variant="flat" color="default">
                            Q{idx + 1}
                          </Chip>
                          <Chip size="sm" variant="flat" color="secondary">
                            {q.moduleName}
                          </Chip>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              q.type === "options" ? "primary" : "warning"
                            }
                          >
                            {q.type === "options" ? "MCQ" : "SA"}
                          </Chip>
                        </div>
                        <div
                          className="text-sm mt-1 question-preview"
                          dangerouslySetInnerHTML={{
                            __html:
                              q.question?.substring(0, 300) +
                              (q.question?.length > 300 ? "..." : ""),
                          }}
                        />
                        {q.type === "options" && q.options && (
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {(Array.isArray(q.options)
                              ? q.options
                              : []
                            ).map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`text-xs p-1 rounded ${
                                  opt.isCorrect
                                    ? "bg-green-100 text-green-800 font-semibold"
                                    : "bg-gray-100"
                                }`}
                              >
                                ({String.fromCharCode(65 + oIdx)}){" "}
                                {opt.title}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === "input" && q.options?.answer && (
                          <p className="text-xs mt-1 text-green-700 font-semibold">
                            Answer: {q.options.answer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
            <p>
              <strong>Test ID:</strong> {publishResult.testId}
            </p>
            <p>
              <strong>Title:</strong> {testTitle}
            </p>
            <p>
              <strong>Questions:</strong> {publishResult.totalQuestions}
            </p>
            <p>
              <strong>Sections:</strong>{" "}
              {publishResult.sectionsCreated || sections.length}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            The test is now live and visible to students in the selected
            category.
          </p>
          <Button
            color="secondary"
            onClick={() => {
              setStep(0);
              setTestTitle("");
              setTestDesc("");
              setSections([]);
              setQuestions([]);
              setSelectedQuestions([]);
              setPublishResult(null);
            }}
          >
            Create Another Test
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 p-4">
        <h2 className="text-2xl font-bold text-purple-800">
          Step 4: Review & Publish
        </h2>

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
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-semibold">
                  {categories.find((c) => c.id === selectedCategory)?.title ||
                    "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Difficulty</p>
                <Chip
                  color={
                    DIFFICULTY_LEVELS.find((d) => d.key === difficulty)?.color
                  }
                  size="sm"
                >
                  {difficulty}
                </Chip>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Questions</p>
                <p className="font-semibold">{selectedQuestions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time Limit</p>
                <p className="font-semibold">
                  {Math.floor(timeLimit / 60)} minutes
                </p>
              </div>
            </div>

            <Divider />

            <p className="font-semibold">Sections:</p>
            {sections
              .filter((s) => s.modules.some((m) => m.selectedCount > 0))
              .map((s, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{s.subjectTitle}</p>
                  <p className="text-sm text-gray-500">
                    {s.modules.reduce(
                      (a, m) => a + (m.selectedCount || 0),
                      0
                    )}{" "}
                    questions | +{s.pos}/-{s.neg} marks |{" "}
                    {s.questionType === "options" ? "MCQ" : "Short Answer"}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.modules
                      .filter((m) => m.selectedCount > 0)
                      .map((m, mIdx) => (
                        <Chip key={mIdx} size="sm" variant="flat">
                          {m.title}: {m.selectedCount}
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

  // Validation for next step
  function canProceed() {
    switch (step) {
      case 0:
        return testTitle.trim() && selectedCategory && selectedCourse;
      case 1:
        return totalSelectedQuestions > 0;
      case 2:
        return selectedQuestions.length > 0;
      default:
        return true;
    }
  }

  const steps = [
    "Test Config",
    "Topics & Distribution",
    "Review Questions",
    "Publish",
  ];

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h1 className="text-xl font-bold text-purple-900">
          Custom Test Generator
        </h1>
        <p className="text-sm text-gray-500">
          Create tests from your question bank automatically
        </p>
      </div>

      {/* Step indicator */}
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
              {idx < step ? "✓" : idx + 1}
            </div>
            <span
              className={`text-sm whitespace-nowrap ${
                idx === step
                  ? "font-bold text-purple-800"
                  : "text-gray-500"
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

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Navigation buttons */}
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
