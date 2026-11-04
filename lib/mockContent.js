// ============================================================
// lib/mockContent.js — one mock's paper (sections + modules + questions)
// read with the SERVICE ROLE in ONE nested query, warm-cached per test
// for 5 minutes. Shared by /api/mockData (taking a mock) and
// /api/resultData (result + analytics pages). Server-only.
// ============================================================
import { serversupabase } from "@/utils/supabaseClient";

// Speed (Nov 2026, owner: "loading time before starting the mock is too
// much"): the paper (sections + modules + questions) is ONE nested query,
// started immediately in parallel with the login check, and kept warm per
// test for 5 minutes (admins always read fresh, so edits show at once).
// Was 4 sequential round trips from Vercel (2-4 s); now ~2.
const CONTENT_TTL_MS = 5 * 60 * 1000;
const _content = new Map(); // testId -> { at, promise }

async function fetchContent(testId) {
  const { data, error } = await serversupabase
    .from("mock_groups")
    .select("*,subject(*),links:mock_groups!parent_sub(*,module(*,mock_questions(*)))")
    .eq("test", testId)
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);
  const sections = [];
  const modules = [];
  const questions = [];
  for (const g of data || []) {
    const { links, ...sec } = g;
    sections.push(sec);
    for (const l of links || []) {
      const { module: mod, ...link } = l;
      if (mod) {
        const { mock_questions: qs, ...modRow } = mod;
        modules.push({ ...link, module: modRow });
        (qs || []).forEach((q) => questions.push(q));
      } else {
        modules.push({ ...link, module: null });
      }
    }
  }
  questions.sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
  return { sections, modules, questions };
}

export function getContent(testId, fresh) {
  const hit = _content.get(testId);
  if (!fresh && hit && Date.now() - hit.at < CONTENT_TTL_MS) return hit.promise;
  const promise = fetchContent(testId);
  promise.catch(() => _content.delete(testId));
  _content.set(testId, { at: Date.now(), promise });
  return promise;
}

