import { serversupabase } from "@/utils/supabaseClient";

/**
 * Maps an answer like "A"/"B"/"C"/"D" or "1"/"2"/"3"/"4" to zero-based index.
 * Falls back to trying to find the answer text inside options.
 */
function mapAnswerToIndex(answer, options) {
  if (answer == null) return null;
  const a = String(answer).trim();
  const letterMap = { A: 0, B: 1, C: 2, D: 3 };
  if (a.toUpperCase() in letterMap) return letterMap[a.toUpperCase()];
  const num = Number(a);
  if (!Number.isNaN(num)) {
    const idx = num - 1;
    if (idx >= 0 && idx < options.length) return idx;
  }
  // try match by text
  const found = options.findIndex((opt) => {
    if (typeof opt !== "string") return false;
    return opt.trim().toLowerCase() === a.trim().toLowerCase();
  });
  return found >= 0 ? found : null;
}

function buildSolutionHTML(questions) {
  try {
    const blocks = questions.map((q, i) => {
      const opts =
        Array.isArray(q.options) && q.options.length
          ? q.options
              .map((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                return `<li><strong>${letter}.</strong> ${opt}</li>`;
              })
              .join("")
          : "";
      const answerLetter =
        typeof q.answerIndex === "number"
          ? String.fromCharCode(65 + q.answerIndex)
          : q.answer || "";
      const expl = q.explanation || "";
      return `
        <div style="margin-bottom:12px;">
          <div><strong>Q${i + 1}.</strong> ${q.question || ""}</div>
          <ol type="A" style="margin: 6px 0 6px 20px;">${opts}</ol>
          <div><strong>Answer:</strong> ${answerLetter}</div>
          <div><strong>Explanation:</strong> ${expl}</div>
        </div>
      `;
    });
    return `<div>${blocks.join("")}</div>`;
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ success: false, message: "OpenAI API key not configured" });
  }

  try {
    const topics = [
      "ancient civilizations and archaeological discoveries",
      "modern scientific breakthroughs and innovations",
      "environmental conservation and climate change",
      "space exploration and astronomy",
      "artificial intelligence and technology ethics",
      "historical events and their global impact",
      "cultural traditions and anthropology",
      "economic theories and global markets",
      "medical advances and public health",
      "literature and philosophical movements",
      "marine biology and ocean ecosystems",
      "renewable energy and sustainability",
      "psychology and human behavior",
      "art history and creative movements",
      "political systems and governance",
      "wildlife conservation and biodiversity",
      "urban planning and architecture",
      "genetics and biotechnology",
      "social movements and civil rights",
      "education systems and pedagogy",
      "sports science and athletic performance",
      "nutrition and food science",
      "linguistics and language evolution",
      "entrepreneurship and business innovation",
      "music theory and cultural influence",
      "neuroscience and brain research",
      "agricultural technology and food security",
      "cybersecurity and digital privacy",
      "mythology and folklore studies",
      "quantum physics and theoretical science",
      "volcanic activity and geological formations",
      "deep sea exploration and marine technology",
      "indigenous knowledge systems and traditional medicine",
      "cryptocurrency and blockchain technology",
      "virtual reality and immersive experiences",
      "forensic science and criminal investigation",
      "meteorology and weather prediction systems",
      "robotics and automation in industry",
      "paleontology and dinosaur discoveries",
      "nanotechnology and molecular engineering",
      "behavioral economics and decision making",
      "coral reef ecosystems and conservation",
      "medieval history and feudal societies",
      "photosynthesis and plant biology",
      "aviation history and aerospace engineering",
      "microbiome research and gut health",
      "game theory and strategic thinking",
      "textile manufacturing and fashion history",
      "cartography and map making evolution",
      "sleep science and circadian rhythms",
      "volcanic soil fertility and agriculture",
      "bioluminescence in marine organisms",
      "ancient trade routes and commerce",
      "particle physics and subatomic research",
      "desert ecosystems and adaptation strategies",
      "memory formation and cognitive neuroscience",
      "renewable materials and sustainable design",
      "epidemiology and disease tracking",
      "tectonic plate movements and earthquakes",
      "fermentation processes and food preservation",
      "biomimicry and nature-inspired engineering",
    ];

    const styles = [
      "an informative article",
      "a narrative essay",
      "an analytical piece",
      "a descriptive passage",
      "an argumentative text",
      "a biographical sketch",
      "a scientific report",
      "a historical account",
      "a comparative analysis",
      "an investigative piece",
      "an expository essay",
      "a case study analysis",
      "a research summary",
      "a critical review",
      "a documentary-style narrative",
    ];

    const contexts = [
      "focusing on recent discoveries from the last 5 years",
      "exploring lesser-known facts and surprising details",
      "examining controversial debates and different perspectives",
      "highlighting real-world applications and practical implications",
      "discussing future trends and emerging developments",
      "analyzing historical evolution and key milestones",
      "comparing different approaches and methodologies",
      "investigating common misconceptions and myths",
      "exploring interdisciplinary connections",
      "examining case studies and specific examples",
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomContext = contexts[Math.floor(Math.random() * contexts.length)];

    // Generate a Reading Comprehension (RC) using OpenAI
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                'You are a helpful assistant that generates unique and diverse Reading Comprehension (RC) quiz for students. Respond in JSON with the following structure: {"passage": "...", "questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}]}. The passage should be a minimum of 300 words (at least 300 words), and there should be 3-5 questions. Each question must have 4 options, one correct answer, and a brief explanation.',
            },
            {
              role: "user",
              content: `Generate a completely unique and original Reading Comprehension (RC) quiz about "${randomTopic}" written as ${randomStyle}, ${randomContext}. 

CRITICAL REQUIREMENTS:
- The passage MUST be at least 300 words
- Cover SPECIFIC, CONCRETE examples and details (not generic information)
- Include UNIQUE angles that are rarely discussed
- Use VARIED vocabulary and sentence structures
- Make it ENGAGING with interesting facts or stories
- Ensure questions test COMPREHENSION, not just recall
- DO NOT repeat common knowledge - find unusual perspectives

Topic: ${randomTopic}
Style: ${randomStyle}
Context: ${randomContext}

`,
            },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      return res.status(500).json({
        success: false,
        message: "OpenAI API error",
        error: errorText,
      });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    let rcObj;
    try {
      rcObj = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: "Failed to parse OpenAI response",
        raw: content,
      });
    }

    const { passage, questions } = rcObj || {};
    if (
      !passage ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(500).json({
        success: false,
        message: "OpenAI response missing passage or questions",
        raw: content,
      });
    }

    const normalizedQuestions = questions.map((q) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      const answerIndex = mapAnswerToIndex(q.answer, opts);
      return {
        question: q.question || "",
        options: opts,
        answer: q.answer ?? null,
        explanation: q.explanation || "",
        answerIndex,
      };
    });

    const correctIndices = normalizedQuestions.map((q) =>
      typeof q.answerIndex === "number" ? q.answerIndex : null
    );

    const solutionHTML = buildSolutionHTML(normalizedQuestions);

    const { data: keyRows, error: keyErr } = await serversupabase
      .from("daily_rc_keys")
      .insert([
        {
          correct: JSON.stringify(correctIndices),
          solution: solutionHTML,
        },
      ])
      .select("uid")
      .limit(1);

    if (keyErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to create answer key",
        error: keyErr.message,
      });
    }

    const answerKeyUid = keyRows?.[0]?.uid;
    if (!answerKeyUid) {
      return res.status(500).json({
        success: false,
        message: "Answer key UID not returned",
      });
    }

    const { data, error } = await serversupabase
      .from("daily_rc")
      .insert([
        {
          content: passage,
          options: questions,
          answer_key: answerKeyUid,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting RC:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save RC to database",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Generated RC Successfully",
      rc: data?.[0],
    });
  } catch (error) {
    console.error("Error generating RC:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
