import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Button, Spacer, Spinner } from "@nextui-org/react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";
import { AnimatePresence, motion } from "framer-motion";
import { CtoLocal } from "@/utils/DateUtil";
import {
  isAfter,
  isBefore,
  addDays,
  parseISO,
  format,
  endOfDay,
} from "date-fns";
import { Lock } from "lucide-react";

const SECTIONS = [
  { key: "QA", title: "Quantitative Aptitude" },
  { key: "VA", title: "Verbal Ability" },
  { key: "LR", title: "Logical Reasoning" },
];

const SectionalTest = ({ enrolled = [] }: { enrolled?: any[] }) => {
  const { isDemo } = useNMNContext();
  const [tests, setTests] = useState<any[]>([]);
  const [allTests, setAllTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [results, setResults] = useState<any[]>([]);

  const testIdsWithResults = results
    ? new Set(results.map((r: any) => r.test_id))
    : new Set();

  async function loadTests() {
    // Load tests the user has access to
    const { data, error } = await supabase
      .from("mock_test")
      .select("id, title, description, category, course, seq, start_time, end_time, uid, config")
      .order("seq", { ascending: true });

    if (data) {
      // Filter to only sectional tests (generatorType = "sectional" in config)
      const sectional = data.filter(
        (t: any) => t.config?.generatorType === "sectional"
      );
      setTests(sectional);
    }

    // Also load from the view (includes locked tests)
    const { data: allData } = await supabase
      .from("mock_test_view")
      .select("id, title, description, category, course, seq, start_time, end_time, uid, config")
      .order("seq", { ascending: true });

    if (allData) {
      const sectionalAll = allData.filter(
        (t: any) => t.config?.generatorType === "sectional"
      );
      setAllTests(sectionalAll);
    }

    setLoading(false);
  }

  async function loadResults() {
    let allResults: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("mock_plays")
        .select("uid, test_id, created_at")
        .range(from, from + batchSize - 1);

      if (data && data.length > 0) {
        allResults = [...allResults, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    setResults(allResults);
  }

  useEffect(() => {
    loadTests();
    loadResults();
  }, []);

  const currentSection = SECTIONS[activeSection];
  const filteredTests = tests.filter(
    (t) => t.config?.targetSection === currentSection.key
  );
  const filteredAllTests = allTests.filter(
    (t) =>
      t.config?.targetSection === currentSection.key &&
      !tests.some((existing) => existing.id === t.id)
  );

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12">
        <Spinner size="lg" color="secondary" />
        <p className="text-gray-500 mt-4">Loading sectional tests...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden justify-start items-start w-full h-full">
      <div className="pr-2 mt-4 overflow-hidden flex flex-col justify-start items-start flex-1 h-full w-full text-left">
        <h2 className="font-bold text-2xl text-primary">Sectional Tests</h2>
        <p className="text-sm text-gray-500 mt-1">
          Practice individual sections with AI-generated questions
        </p>
        <Spacer y={4} />

        <div className="w-full h-full flex flex-col items-start justify-start overflow-hidden">
          {/* Section tabs */}
          <div className="w-full flex flex-row flex-shrink-0 scrollbar-hide overflow-x-auto items-center justify-start">
            {SECTIONS.map((section, idx) => (
              <div
                key={section.key}
                onClick={() => setActiveSection(idx)}
                className={
                  "bg-gray-100 flex-shrink-0 px-4 cursor-pointer hover:brightness-90 p-2 text-sm rounded-t-lg mx-[1px] " +
                  (idx === activeSection
                    ? " !bg-gradient-purple text-white font-semibold"
                    : "")
                }
              >
                {section.title}
              </div>
            ))}
          </div>

          {/* Test list */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.2, type: "tween" }}
              className="w-full p-3 border-1 bg-gray-50 rounded-b-xl overflow-y-auto flex-1"
            >
              {filteredTests.length === 0 && filteredAllTests.length === 0 ? (
                <div className="rounded-xl bg-white w-full border-gray-300 border-1 border-dashed text-gray-600 my-2 p-4 text-center">
                  <p className="font-semibold">No tests in {currentSection.title} yet</p>
                  <p className="text-sm mt-1">
                    Tests created with the AI Test Generator will appear here
                  </p>
                </div>
              ) : null}

              {filteredTests.map((i: any) => (
                <TestCard
                  key={i.id}
                  i={i}
                  hasResult={testIdsWithResults.has(i?.id)}
                />
              ))}

              {filteredAllTests.map((i: any) => (
                <TestCard
                  key={i.id}
                  i={i}
                  hasResult={testIdsWithResults.has(i?.id)}
                  demo={
                    i?.config?.public_access !== true &&
                    !enrolled?.some(
                      (enrollment: any) =>
                        enrollment?.course?.id === i?.course ||
                        i?.config?.courses?.includes(enrollment?.course?.id)
                    )
                  }
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const TestCard = ({
  i,
  demo,
  hasResult,
}: {
  i: any;
  demo?: boolean;
  hasResult?: boolean;
}) => {
  return (
    <div className="w-full bg-white rounded-md border-1 border-gray-100 flex flex-row justify-between py-1 px-1 shadow-sm items-center my-1">
      <div className="w-[70px] flex flex-col items-center justify-center aspect-square rounded-lg bg-gray-50">
        {i?.start_time ? (
          <>
            <p className="text-xl text-primary font-bold">
              {CtoLocal(i?.start_time)?.date}
            </p>
            <p className="text-xs">{CtoLocal(i?.start_time)?.monthName}</p>
          </>
        ) : (
          <>
            <p className="text-xl text-primary font-bold">AI</p>
            <p className="text-xs">Test</p>
          </>
        )}
      </div>
      <Spacer x={2} />
      <div className="flex flex-col items-start justify-start flex-1 text-left">
        <p className="font-semibold text-primary">{i?.title}</p>
        <p className="text-sm text-gray-500">{i?.description}</p>
      </div>
      <div className="flex flex-row pr-2 gap-2">
        {hasResult && (
          <Button size="sm" color="success">
            View Result
          </Button>
        )}

        {demo === true ? (
          <Button
            size="sm"
            color="secondary"
            className="text-black"
            onPress={() => toast.success("Please contact Us.")}
            endContent={<Lock size={16} />}
          >
            Unlock
          </Button>
        ) : i?.start_time ? (
          (() => {
            const now = new Date();
            const startTime = parseISO(i.start_time);
            const availableFrom = addDays(startTime, -2);

            if (
              isAfter(now, availableFrom) &&
              isBefore(now, addDays(startTime, 1)) &&
              (!i?.end_time || isBefore(now, parseISO(i.end_time)))
            ) {
              return (
                <Button
                  size="sm"
                  className="text-white"
                  color="primary"
                  as={Link}
                  href={`/mock/${i?.uid}`}
                  target="_blank"
                >
                  Select Test
                </Button>
              );
            } else if (i?.end_time && isAfter(now, endOfDay(parseISO(i.end_time)))) {
              return (
                <span className="text-sm text-gray-500">Test time has passed</span>
              );
            }
            return null;
          })()
        ) : (
          <Button
            size="sm"
            className="text-white"
            color="primary"
            as={Link}
            href={`/mock/${i?.uid}`}
            target="_blank"
          >
            Start Test
          </Button>
        )}
      </div>
    </div>
  );
};

export default SectionalTest;
