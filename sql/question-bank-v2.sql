-- ============================================================
-- Question Bank v2  —  Run this in Supabase SQL Editor
-- Drop old table first (it was empty), then create fresh.
-- Questions are NEVER deleted — use is_active = false instead.
-- ============================================================

-- Drop old version if it exists
DROP TABLE IF EXISTS question_bank CASCADE;

-- ── Main table ───────────────────────────────────────────────
CREATE TABLE question_bank (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Classification tags
  subject       text        NOT NULL,   -- "Quantitative Ability" | "Verbal Ability" | "Data Interpretation" | "Logical Reasoning"
  topic         text        NOT NULL,   -- "Percentages" | "Reading Comprehension" | ...
  subtopic      text,                   -- optional finer grain, e.g. "Successive Discounts"
  difficulty    text        NOT NULL DEFAULT 'medium'
                            CHECK (difficulty IN ('easy','medium','hard','mixed')),
  type          text        NOT NULL
                            CHECK (type IN ('mcq','sa')),   -- mcq = 4-option, sa = numeric integer answer

  -- Exam tags  (which entrance exams this Q is suitable for)
  exam_tags     text[]      NOT NULL DEFAULT '{}',
  -- e.g. ARRAY['IPMAT_Indore','IPMAT_Rohtak','JIPMAT','IIM_Kozhikode_BMS']

  -- Question content  (plain HTML, ZERO LaTeX)
  question      text        NOT NULL,
  options       jsonb       NOT NULL,
  -- MCQ  → [{"title":"A","text":"...","isCorrect":false}, ...]
  -- SA   → {"answer":"42"}   (always a whole-number integer as a string)
  explanation   text,

  -- Source & quality
  source        text        NOT NULL DEFAULT 'gemini',  -- gemini | manual | imported
  model_used    text,                   -- e.g. "gemini-2.5-flash"
  is_active     boolean     NOT NULL DEFAULT true,      -- false = soft-deleted, never hard-delete
  is_verified   boolean     NOT NULL DEFAULT false,     -- true = teacher has reviewed

  -- Usage tracking
  used_count    integer     NOT NULL DEFAULT 0,
  last_used_at  timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes for fast test-generation lookups ─────────────────
CREATE INDEX qb_subject_topic_diff_type_idx
  ON question_bank (subject, topic, difficulty, type)
  WHERE is_active = true;

CREATE INDEX qb_exam_tags_idx
  ON question_bank USING gin (exam_tags);

CREATE INDEX qb_used_count_idx
  ON question_bank (used_count ASC, last_used_at ASC NULLS FIRST)
  WHERE is_active = true;

CREATE INDEX qb_subject_idx   ON question_bank (subject)   WHERE is_active = true;
CREATE INDEX qb_topic_idx     ON question_bank (topic)     WHERE is_active = true;
CREATE INDEX qb_type_idx      ON question_bank (type)      WHERE is_active = true;
CREATE INDEX qb_difficulty_idx ON question_bank (difficulty) WHERE is_active = true;
CREATE INDEX qb_verified_idx  ON question_bank (is_verified) WHERE is_active = true;

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER qb_updated_at
  BEFORE UPDATE ON question_bank
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS: only service-role can write; anon/auth cannot ───────
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to question_bank"
  ON question_bank FOR ALL
  TO anon, authenticated
  USING (false);

-- ── Handy view for stats (no RLS needed, read-only) ──────────
CREATE OR REPLACE VIEW question_bank_stats AS
SELECT
  subject,
  topic,
  difficulty,
  type,
  COUNT(*)                                    AS total,
  COUNT(*) FILTER (WHERE is_active = true)    AS active,
  COUNT(*) FILTER (WHERE is_verified = true)  AS verified,
  SUM(used_count)                             AS total_uses,
  MAX(created_at)                             AS last_added
FROM question_bank
GROUP BY subject, topic, difficulty, type
ORDER BY subject, topic, difficulty, type;
