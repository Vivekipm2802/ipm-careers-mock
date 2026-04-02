-- ============================================================
-- Question Bank Table
-- Pre-generated questions stored for instant test creation.
-- Run this in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS question_bank (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  subject      text        NOT NULL,     -- e.g. "Quantitative Ability"
  topic        text        NOT NULL,     -- e.g. "Percentages"
  difficulty   text        NOT NULL DEFAULT 'medium',  -- easy | medium | hard | mixed
  type         text        NOT NULL CHECK (type IN ('options', 'input')),
  question     text        NOT NULL,
  options      jsonb       NOT NULL,
  explanation  text,
  used_count   integer     NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by subject + topic + difficulty
CREATE INDEX IF NOT EXISTS qb_subject_topic_diff_idx
  ON question_bank (subject, topic, difficulty);

-- Sort least-used questions first
CREATE INDEX IF NOT EXISTS qb_used_count_idx
  ON question_bank (used_count ASC, last_used_at ASC NULLS FIRST);

-- RLS: students/teachers must NOT see raw bank; service-role bypasses automatically
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to question_bank"
  ON question_bank
  FOR ALL
  TO anon, authenticated
  USING (false);
