# IPM Careers Study Portal — study.ipmcareer.com

Next.js (pages router) + Supabase student portal for IPMAT coaching. Owner (edu) is
non-technical: explain in plain language, give copy-paste commands, never assume he
reads code. Vercel deploys from `main`; day-to-day work happens on branch `redesign`.

## Golden rules (owner has enforced each of these repeatedly)

1. **Never run git write commands yourself** (add/commit/push/checkout/merge). Hand the
   owner one copy-paste block instead:
   `npm run build && git add -A && git commit -m "..." && git checkout main && git merge redesign && git push && git checkout redesign`
   Reading (`git log`, `git status`, `git show HEAD:file > file` for restores) is fine.
2. **Never print credentials.** Scripts read `.env.local` with
   `env.match(/^SUPABASE_SERVICE_KEY=(.*)/m)`. The local Cloudinary vars are
   placeholders (real ones only in Vercel). ANON key is public, service key is not.
3. **Never touch `styles/globals.css`.**
4. After ANY component/page edit run `node scripts/check-parse.js` AND
   `node scripts/ssr-check.js` (~284 assertions). If an intentional change trips an
   ssr-check assertion, UPDATE the assertion — never revert approved code.
   ssr-check's `stateQueue` is ordered useState fixtures: inserting a useState into a
   component shifts every later fixture for it.
5. React hooks must sit ABOVE any early-return guard.
6. **All list-type content** (Statements:, Conditions:, (I)(II), bullets, Input/Step,
   numbered sentences) must render one-per-`<p>` in question HTML — owner has flagged
   paragraph-blobs four times. Always run a text-level splitter and spot-render before
   declaring question imports done.
7. Data-only changes (Supabase rows) need NO push — tell the owner it is live already.
8. `ipmcareer.in` is an expired domain — never reintroduce it. Use study.ipmcareer.com.
9. Never name competitor coaching brands in any student-facing output.

## Mock import routine (PDF → portal)

mock_test (config JSON: timeout/switch_section/instructions/public_access/featured)
→ mock_groups section rows (subject, pos/neg, seq, per-section `time` secs)
→ modules in table `mock` → link rows {test:null, isPsuedo:true, parent_sub, module}
→ mock_questions {parent, seq, question:STEM-HTML, slug:'<parent><4 rand chars>',
   isActive:true, correct:0, options:[{text:'',title,isCorrect}], explanation,
   type:'options' | 'input' with options:{answer:"…"}} — the stem HTML goes in
   `question`; `slug` is a short code, NOT the stem (Mock 11 Oct 17: stems were put
   in slug → player showed options with no question text).
→ access_meta {type:'mt', course_id, content_id} — WITHOUT access_meta rows the mock is
   invisible to students (admin still sees it — deceptive when testing).
Structure always clones the SIBLING mocks' pattern, never the PDF's.
IPMAT Indore pattern (tests 220 "Hash IPMAT Mock 1", 242 "Hash IPMAT Mock 2", cat 39):
3 sections, subjects 179/180/181 (QA-SA 15 input Qs +4/0, QA-MCQ 30 +4/−1, VA 45 +4/−1),
2400s each, timeout 7200, switch_section false.
IIM Bangalore UG pattern (cat 13, tests 219/221-223/238-241/244+): section ORDER is
VA → LR → QADI (owner directive Oct 16 2026): VA 15 Qs (subject 91, 1800s, seq 1),
LR 15 Qs (subject 92, 2700s, seq 2), QADI 30 Qs with DI folded in (subject 90, 3600s,
seq 3); timeout 8100, +3/−1. Section tab names are exactly VA / LR / QADI
(mock_subjects 91/92/90 titles — shared by ALL IIM B mocks) and instructions2 must
list the sections in that order with those names.
NPAT pattern (NEW series from Oct 28 2026, cat 15, test 251 "NPAT Mock 1" onward): 120 Qs
in 3 sections — VA 40 (subject 211), QA 40 (subject 212), LR 40 (subject 213); these three
subjects are SHARED by every new NPAT mock (label "NPAT"); +1/0 (no negative), ONE 100-min
timer (timeout 6000, switch_section TRUE — real NPAT has no sectional limit; group time
2000 each is unused), courses 1/11/12 in access_meta AND config.courses. Section order is
the paper's own: VA → QA → LR. Mock 1 (251) is the FREE demo mock (public_access).
OLD NPAT tests 97–101 were HIDDEN Oct 28 (config.hidden, courses emptied, access_meta
rows removed — backup in outputs/old-npat-access-backup.json; 87 plays preserved).
COMING-SOON PLACEHOLDERS: NPAT Mocks 2–10 = tests 252–260 (seq 2–10), config.coming_soon
=true, start_time null, no sections/questions yet. MockTests.js renders them as locked
"Upcoming · coming soon" for everyone; /mock/[slug] shows "coming soon". WHEN THE OWNER
SENDS MOCK n: FILL THE EXISTING placeholder row (same id/uid) — add groups/modules/
questions, then set coming_soon=false and start_time=now. Never create a duplicate row.
Watch for: caselet/directions blocks with headers like "Directions (Q13–Q15):" that
parsers miss; chart IMAGES in PDFs (pdfimages -list) whose data questions need; RC
passage headers hidden inside previous Solution blocks. Section SPLITS come from the
PDF's own section headers ("Verbal Ability"/"Logical Reasoning"/"Quantitative
Aptitude"), which can sit unlabeled between a Solution block and the next Q — grep
for them BEFORE assigning questions to sections; never infer the split from question
content (Mock 10 Oct 17: Q30 Venn question was LR's 15th, wrongly put in QADI).
MANDATORY post-import audit (Oct 2026, after repeated student-caught defects) — run on
EVERY mock before telling the owner it is done: (1) exactly 4 options, exactly 1
correct; (2) no "ANSWER KEY" text leaked into any stem/explanation (it leaked into the
LAST question of 9 mocks); (3) no multi-bullet or ≥3-roman-numeral lists inside one
<p>; (4) "Hence <letter>" in explanations matches the keyed option (PDF option order
differs from ours — stale letters); (5) every <img> URL fetches 200 image/*; (6) stems
that mention a table/graph/chart contain an <img> or <table>; (7) stems whose LAST
paragraph ends with ":" while options look like list items (the committee-question bug:
the PDF's condition list became the options — PDFs can themselves omit the question
line; reconstruct from the PDF's own solution). Truncation sentinel: "I." at a line
start may be a swallowed "…opposite I." — roman-numeral splitters eat single letters.
(AUDIT 9) scan every option title for &lt;/&gt;/&amp;/&nbsp;/HTML tags — zero allowed
(swept clean across all 11 mocks, Oct 15 2026).
(8a) OPTION titles render as PLAIN TEXT in the player — never put HTML tags or
entities in options: literal < > &, unicode superscripts (²³⁴). Stems/explanations
ARE HTML. (8b) letter+digit is AMBIGUOUS: x2 may be x² (exponent) or x₂ (a point
name — subscript); the PDF flattens both, so every letter-digit token in math
questions must be adjudicated from context (Mock 9: Q50's x1,x2 were subscripts).
Multi-digit exponents (ax2018) flatten too. (8c) NO added headings above caselets
("Laptop Stack Puzzle", "Passage 1" etc.) — owner wants question content only.
(10) DI DATA CAN GO MISSING from the PDF while its questions remain: a stem that
references named data (months, departments, companies) with no table nearby means the
data block was either swallowed into the PREVIOUS question's solution (Mock 13: the
monthly-users line sat inside Q55's solution) or omitted entirely — reconstruct the
table from the solutions' arithmetic (Mock 13 workforce table). Matrix questions
written as "Row 1: ..." text or number blobs get a bordered determinant grid.
(11) Error-spotting/marked-word VA stems ((1)…(4), (a)…(d), slash-parts) render one
part per <p>.
(8) pdftotext DROPS blank lines between paragraphs — caselet/passage/DI-set paragraph
breaks MUST be rebuilt from pdftohtml -xml line gaps (same-page top-gap > ~23px = new
paragraph; across pages, break only after sentence-final punctuation). The owner checks
this (Mock 9); never ship a multi-paragraph block as one <p> blob.

## Demo portal (demo-that-sells)

Demo mode = `/demo` path OR demo email slee23137@gmail.com OR any signed-in account
with zero `enrollments` rows (admins exempt via /api/isAdmin). Gating: first OPEN mock
per category free (config.public_access), PYQ categories fully open, 5 concept easy
first-tests open (`levels.demo=true`, controlled by scripts/set-demo-concept-levels.mjs),
videos QA "Profit and Loss" + LR "Direction and Distance"/"Blood Relations" open with the
rest locked, VA pack fully locked, one free mentor call (second → upsell). Locked
anything opens the upgrade modal (lib/demo.js: WhatsApp wa.me/918299470392, plans
https://ipmcareer.com/hash-ipmat/). Demo account reseed: scripts/seed-demo-account.mjs.
RLS note: non-enrolled accounts only read `levels` rows flagged demo=true, and the
concept drawer must avoid the embedded questions join (statement timeout under RLS).

## Study stage / target year (Oct 31 2026 owner directive)

ProfileGate asks Class 9/10/11/12/Dropper + target IPMAT year (2027–2030); old profiles
get a one-question year popup. Year → student_profiles.target_year (sql/add-target-year.sql)
AND auth user_metadata.target_year (works before the SQL). lib/studyStage.js: target ≥2029
(or Class 9/10 with no year) = FOUNDATION → buildPlan(…, {foundation}) puts Number System →
Percentage → Ratio and Proportion → Average first, and easyEntry() opens EASY levels only
(m_categories.parent = chapter_id → levels.parent). 2027/2028 unchanged. Dashboard and My
Plan share the same day-seed. Ratio and Proportion has NO Easy level (3 × Moderate).
Video Lessons: packs ordered by id (QA first); "Explore by topic" strip grouped by pack, and
for demo accounts playable chapters (lib/demo DEMO_OPEN_VIDEO_CHAPTERS) first, locked last.

## Access-control landmines

- The `levels` SELECT policy grants by access_meta type='lvl' with value='all' (or a
  difficulty number) per course — it IGNORES content_id, so the admin panel's
  per-level course assignments do nothing. Every content-bearing course needs ONE
  {type:'lvl', course_id, value:'all'} row (added for courses 9/10/12 Oct 2026 after
  a test-series student saw 404s/empty drawers). `questions` read-access cascades
  from `levels`. If the owner ever wants genuinely selective per-course concept
  access, the policy itself must be rewritten to honor content_id.
- Mock list unlock reads config.courses (synced from access_meta type='mt' by the
  Oct 2026 sweep); keep both in sync when granting mocks to a course.

## Performance landmines

- NO NETWORK CALL MAY BE UNBOUNDED (Oct 29 2026 "Saving your result…" 6h incident):
  a 2h mock outlives the 1h access token, so submit triggers a token refresh; a stalled
  refresh fetch froze gotrue's queue and every getSession()/query behind it — the
  unguarded `await getAuthHeaders()` hung submit forever. Fixes: utils/supabaseClient
  browser client uses fetchWithTimeout (30s; storage objects exempt); getAuthHeaders
  races 6s then falls back to the stored token; mock submit is fully time-boxed, saves a
  device draft (`ipm_mock_draft_<testId>`, also autosaved during the test), checks for a
  landed play before retrying, and ends on a Retry screen with 30s auto-retry; reopening
  the mock offers "Submit saved attempt". Stuck OLD tabs: outputs/rescue-snippet.js
  (reads answers from React state, downloads backup, refreshes login, submits).
- EXPIRED LOGIN AT SUBMIT (Oct 31 2026 root cause of the daily slow submits): token
  lasts 1h, mocks 2h+, sleeping laptops/background tabs miss the auto-refresh. Fixes:
  the mock page renews the login every 5 min / on tab return when <20 min remain;
  submit sends refresh_token and /api/submitMock renews an expired login SERVER-side
  and returns `session` (client setSession). Overlay switches to "Saved ✓" once saved.
  health-check: "Expired-login submit" robot test; slow-submit events are verified
  against mock_plays; missing-stats plays are auto-backfilled.
- Mock page loads via /api/mockData (service role + list-equivalent access rule): the
  mock_groups RLS policy statement-times-out (57014, ~8s) for zero-enrollment/demo
  accounts — free demo mocks were stuck on "Loading...". Client RLS path kept as fallback.

- `serversupabase` DEGRADES TO AN ANON CLIENT IN THE BROWSER (no service key, no
  user session) — any client-side component using it reads through RLS as nobody
  and silently gets zero rows. Correct only in API routes / getServerSideProps.
  Client code uses `supabase` (session client). Oct 18 2026: the /test submit
  rescue-lookup and prior-attempt check both had this bug — flaky-network students
  stuck on "Saving your result" even when the insert had landed.
- The `levels` embedded questions join (`*,questions!…`) statement-times-out under
  RLS (error 57014) for demo AND enrolled students — the concept drawer selects
  plain `*` for everyone (the question-count chip hides itself).

- Mock LIST pages read `mock_test_slim` / `mock_test_view_slim` (views = config minus
  the 25KB instructions HTML). Never point list pages back at the full tables; never
  write a config object read from a slim view back to `mock_test` (it would wipe
  instructions — fetch full config first).
- DB triggers must never block on synchronous HTTP (pg_net + EXCEPTION guard only);
  when portal breaks mysteriously, grep pg_proc prosrc for http calls first.
- Supabase project is in a US region; India-side slowness may be their gateway —
  check SQL Editor speed vs REST speed before blaming the database.
- mock_plays carries scalar stat columns (score/attempted/correct/max_marks) written
  by /api/submitMock at submit time; /api/leaderboard ranks from them and must NEVER
  go back to fetching every report (the Oct 2026 submit-storm incident). Names are
  stored on play rows (self-healing in attachNames) — never reintroduce per-request
  auth.admin.listUsers pagination. Key indexes: mock_plays ("user",test_id) and
  (test_id,created_at); plays ("user") and (test_uuid); trainer_runs ("user",created_at).
  Backfill tool: scripts/backfill-mock-play-stats.mjs (re-runnable).
- mock_plays has NO `data` column. Until Oct 29 2026 submitMock's full insert sent
  `data: miscData`, failed EVERY time, and the fallback silently dropped duration/
  name/attempted/correct/max_marks (only 4 of 447 Oct plays had them; 314 backfilled).
  Never add a field to the play insert without checking the live column list.
- Report entry timing: `at` = seconds on the CURRENT runner timer — on LOCKED mocks
  that timer restarts per section, so `at` is a per-section clock. `ts` (from Oct 29
  2026) = true seconds since test start. ALL time math (result + analytics pages,
  late-wrong / quarter insights) goes through lib/playTiming.computePlayTimes —
  never sort raw `at` across sections again (owner saw VA 3m / total 50m on a 2h mock).

## Mock instructions screen

Students see ONLY the JSX instructions in pages/mock/[slug].js (config.instructions /
instructions2 HTML is NOT rendered). Everything there is derived from the test itself
(Oct 29 2026 fix after NPAT showed "−1"): marking table = insMarkingRows(sections)
(neg 0 honoured, identical sections collapse to "All questions"), SA lines only when
input-type questions exist, navigation/timing text follows config.switch_section,
test name = config.title. Never hardcode marks or section rules there again.

## Monitoring (owner directive Oct 29 2026: "find problems before students do")

- `node scripts/health-check.mjs` — robot student (throwaway healthcheck.robot@example.com,
  created + fully deleted each run; example.com can never receive the result-email trigger)
  exercises login, /api/mockData (enrolled + every free mock as demo + paid stays locked),
  /api/conceptTest + concept save, /api/submitMock + verifies stats columns, result page,
  leaderboard; then data checks (24h plays missing stats, impossible section times via
  lib/playTiming), real-device reports (client_events), and a content audit of every mock
  a student can reach (blank/no-correct/multi-correct/not-4-options/code-in-options/
  leaked key/broken image/course-access gaps — image-only stems are NOT blank).
  Report → health-reports/<date>.md (git-ignored). Exit 1 on any FAIL.
- Runs daily 07:40 IST on GitHub Actions (.github/workflows/health-check.yml; needs repo
  secrets NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY);
  a failing run emails the owner. RUN IT after every deploy and after every mock import.
- Real-device reports: lib/reportEvent → POST /api/clientEvent → public.client_events
  (service-role only, RLS on, no policies). Kinds: mock_submit_slow/failed/recovered,
  mock_draft_submitted, mock_load_fallback, concept_load_failed, concept_submit_failed.
- Add a check to health-check.mjs for EVERY new incident class, so it can't recur silently.
- Content audit accepts a 5th option only when it is "No error"/"None of these" (JIPMAT
  papers). Question fetch is batched 8 modules at a time (60 hit statement timeout 57014).
- GitHub's scheduled runs can start hours late (Oct 30: 07:40 IST run started ~14:00 IST).

## Verification endpoints

Admin check: POST /api/isAdmin (auth token). Mock attempt page: pages/mock/[slug].js
(time-window gate only). Leaderboards: /api/leaderboard (canonical re-scoring).
Concept test loader: GET /api/conceptTest?uuid= — service-role read + entitlement
mirror of the levels policy (added Oct 23 2026: the browser-side questions fetch
took ~9s per level under RLS and hung students on "Loading..."). NOTE: enrollments
keys on `email`, not `user`.
