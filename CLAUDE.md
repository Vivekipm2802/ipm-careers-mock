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
→ mock_questions {parent, seq, slug, correct:0, options:[{text:'',title,isCorrect}],
   explanation, type:'options' | 'input' with options:{answer:"…"}}
→ access_meta {type:'mt', course_id, content_id} — WITHOUT access_meta rows the mock is
   invisible to students (admin still sees it — deceptive when testing).
Structure always clones the SIBLING mocks' pattern, never the PDF's.
IPMAT Indore pattern (tests 220 "Hash IPMAT Mock 1", 242 "Hash IPMAT Mock 2", cat 39):
3 sections, subjects 179/180/181 (QA-SA 15 input Qs +4/0, QA-MCQ 30 +4/−1, VA 45 +4/−1),
2400s each, timeout 7200, switch_section false.
IIM Bangalore UG pattern (cat 13, tests 219/221-223/238-241): VA 15 / QA 30 (DI folded) /
LR 15, subjects 90/91/92, times 1800/3600/2700, timeout 8100, +3/−1.
Watch for: caselet/directions blocks with headers like "Directions (Q13–Q15):" that
parsers miss; chart IMAGES in PDFs (pdfimages -list) whose data questions need; RC
passage headers hidden inside previous Solution blocks.

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

## Performance landmines

- Mock LIST pages read `mock_test_slim` / `mock_test_view_slim` (views = config minus
  the 25KB instructions HTML). Never point list pages back at the full tables; never
  write a config object read from a slim view back to `mock_test` (it would wipe
  instructions — fetch full config first).
- DB triggers must never block on synchronous HTTP (pg_net + EXCEPTION guard only);
  when portal breaks mysteriously, grep pg_proc prosrc for http calls first.
- Supabase project is in a US region; India-side slowness may be their gateway —
  check SQL Editor speed vs REST speed before blaming the database.

## Verification endpoints

Admin check: POST /api/isAdmin (auth token). Mock attempt page: pages/mock/[slug].js
(time-window gate only). Leaderboards: /api/leaderboard (canonical re-scoring).
