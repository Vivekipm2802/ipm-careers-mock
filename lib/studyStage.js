// ============================================================
// lib/studyStage.js — where a student is in their prep (2026-10-31).
//
// Owner directive after a Class 10 parent complaint (the plan told a
// Class 10 student to take an Alligations test on day one):
//   • target IPMAT 2029 or later (or Class 9/10 with no year saved)
//     = FOUNDATION: the plan starts with Number System → Percentage →
//     Ratio and Proportion → Average, and opens EASY tests only.
//   • target 2027 / 2028 = unchanged weak-chapter-first plan.
//
// target_year lives in student_profiles.target_year (column added by
// sql/add-target-year.sql) and is mirrored into auth user_metadata so
// it still works before that SQL has been run.
// ============================================================

export const TARGET_YEARS = ["2027", "2028", "2029", "2030"];
export const FOUNDATION_FROM_YEAR = 2029;

// Foundation chapters, in teaching order (matched on chapter title).
export const FOUNDATION_CHAPTERS = [
  /number\s*system/i,
  /percentage/i,
  /ratio\s*(and|&)\s*proportion/i,
  /^\s*average/i,
];

export function isFoundation({ targetYear, cls } = {}) {
  const y = Number(targetYear);
  if (Number.isFinite(y) && y > 0) return y >= FOUNDATION_FROM_YEAR;
  return /class\s*(9|10)\b/i.test(String(cls || ""));
}

// Reads the stage for a signed-in student. Never throws; never blocks
// longer than the queries themselves (both are single-row reads).
export async function getStudyStage(supabase, email) {
  const out = { targetYear: null, cls: null, foundation: false };
  if (!email) return out;
  try {
    let r = await supabase
      .from("student_profiles")
      .select("current_class,target_year")
      .ilike("email", email)
      .limit(1);
    if (r.error) {
      // target_year column not added yet — read class only
      r = await supabase.from("student_profiles").select("current_class").ilike("email", email).limit(1);
    }
    const row = (r.data || [])[0] || {};
    out.cls = row.current_class || null;
    out.targetYear = row.target_year || null;
  } catch (e) {}
  if (!out.targetYear) {
    try {
      const { data } = await supabase.auth.getUser();
      out.targetYear = data?.user?.user_metadata?.target_year || null;
    } catch (e) {}
  }
  out.foundation = isFoundation(out);
  return out;
}

// EASY-first entry test for a chapter: the first Easy level the student
// hasn't attempted, else the first Easy level they haven't passed, else
// the first Easy level. Chapters with no Easy level fall back to their
// lowest difficulty. Returns a level uuid or null (caller then uses the
// regular get_chapter_entry RPC).
export async function easyEntry(supabase, email, chapterId) {
  try {
    const { data: subs } = await supabase.from("m_categories").select("id").eq("parent", chapterId);
    const ids = (subs || []).map((s) => s.id);
    if (!ids.length) return null;
    const { data: lv } = await supabase
      .from("levels")
      .select("uuid,difficulty,created_at")
      .in("parent", ids)
      .order("difficulty", { ascending: true })
      .order("created_at", { ascending: true });
    const levels = (lv || []).filter((l) => l.uuid);
    if (!levels.length) return null;
    const lowest = Math.min(...levels.map((l) => Number(l.difficulty) || 99));
    const pool = levels.filter((l) => (Number(l.difficulty) || 99) === lowest);
    let played = [];
    if (email) {
      const { data: pl } = await supabase
        .from("plays")
        .select("test_uuid,isPassed")
        .eq("user", email)
        .in("test_uuid", pool.map((l) => l.uuid));
      played = pl || [];
    }
    const tried = new Set(played.map((p) => p.test_uuid));
    const passed = new Set(played.filter((p) => p.isPassed).map((p) => p.test_uuid));
    const pick = pool.find((l) => !tried.has(l.uuid)) || pool.find((l) => !passed.has(l.uuid)) || pool[0];
    return pick?.uuid || null;
  } catch (e) {
    return null;
  }
}
