// ============================================================
// ExamPlayer — real-exam style mock screen (owner-approved preview,
// Nov 2026). Rendered by pages/mock/[slug].js when the test's
// config.exam_ui === true (pilot first, then every mock).
//
// Colours follow the actual exam portal (dark top bar, blue strips,
// green/red/grey/purple palette shapes); every POPUP uses the IPM
// Careers gold theme. No em dashes in student-facing text (owner).
//
// Answer rules (same as the real exam): a choice is SAVED only by
// "Save & Next" or "Mark for Review & Next". Clicking a palette
// number or Previous moves without saving (a toast warns when an
// unsaved choice is left behind). Marked + answered IS evaluated.
//
// All test state (answers, visited/review statuses, section, timer,
// submit) stays in the parent page; this component owns only view
// state (pending choice, popups, calculator, zoom, tab-switch count).
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

const C = {
  ink: "#1d1d1f", muted: "#5f6368", line: "#dcdfe4", bg: "#f4f6f9",
  blue: "#2f80ed", blueD: "#1f6fd6", blueT: "#e8f1fd", navy: "#1e2433",
  title: "#f5a623", subbg: "#dbe9fb", subbtn: "#58a6ff", start: "#18265a",
  ok: "#4caf50", bad: "#e4501f", gold: "#C48425", goldD: "#9a6417", goldT: "#fbf1e1",
};

// ---------- avatars (original drawings, gender-matched) ----------
function Avatar({ gender }) {
  if (gender === "male") {
    return (
      <svg viewBox="0 0 84 96" width="100%" height="100%" aria-hidden="true">
        <rect width="84" height="96" fill="#eef3fa" />
        <path d="M14 96c0-20 12-31 28-31s28 11 28 31z" fill="#2d4f8b" />
        <path d="M36 66l6 8 6-8z" fill="#fff" />
        <path d="M40.5 70h3l1.5 14-3 4-3-4z" fill="#c62828" />
        <path d="M34 60h16v8a8 8 0 0 1-16 0z" fill="#e2a982" />
        <ellipse cx="42" cy="44" rx="14" ry="17" fill="#eebc96" />
        <path d="M27 42c-1-16 8-22 16-22 9 0 15 6 14 22-2-7-6-11-15-11s-13 4-15 11z" fill="#2a1d14" />
        <circle cx="36.5" cy="45" r="1.8" fill="#2b2b2b" />
        <circle cx="47.5" cy="45" r="1.8" fill="#2b2b2b" />
        <path d="M37.5 53q4.5 2.5 9 0" stroke="#a0523f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (gender === "female") {
    return (
      <svg viewBox="0 0 84 96" width="100%" height="100%" aria-hidden="true">
        <rect width="84" height="96" fill="#eef3fa" />
        <path d="M14 96c0-20 12-31 28-31s28 11 28 31z" fill="#c2185b" />
        <path d="M34 62h16v9a8 8 0 0 1-16 0z" fill="#e9b48f" />
        <path d="M22 44c0-22 9-32 20-32s20 10 20 32c0 14-3 22-6 26H28c-3-4-6-12-6-26z" fill="#3b2418" />
        <ellipse cx="42" cy="44" rx="14" ry="17" fill="#f2c4a0" />
        <path d="M27 38c4-12 22-16 30-4-6-3-18-4-30 4z" fill="#3b2418" />
        <circle cx="36.5" cy="45" r="1.8" fill="#2b2b2b" />
        <circle cx="47.5" cy="45" r="1.8" fill="#2b2b2b" />
        <path d="M37.5 53q4.5 3 9 0" stroke="#b5574b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 84 96" width="100%" height="100%" aria-hidden="true">
      <rect width="84" height="96" fill="#eef3fa" />
      <path d="M14 96c0-20 12-31 28-31s28 11 28 31z" fill="#c9d3e3" />
      <ellipse cx="42" cy="44" rx="14" ry="17" fill="#c9d3e3" />
    </svg>
  );
}

function Owl() {
  return (
    <svg width="150" height="130" viewBox="0 0 150 130" aria-hidden="true">
      <ellipse cx="75" cy="122" rx="46" ry="6" fill="#eee" />
      <path d="M30 72 Q30 22 75 22 Q120 22 120 72 Q120 118 75 118 Q30 118 30 72Z" fill="#C48425" />
      <path d="M38 30 L48 8 L58 26Z M112 30 L102 8 L92 26Z" fill="#9a6417" />
      <circle cx="58" cy="62" r="18" fill="#fff" />
      <circle cx="92" cy="62" r="18" fill="#fff" />
      <circle cx="62" cy="64" r="8" fill="#1f2430" />
      <circle cx="96" cy="64" r="8" fill="#1f2430" />
      <circle cx="64" cy="61" r="2.5" fill="#fff" />
      <circle cx="98" cy="61" r="2.5" fill="#fff" />
      <path d="M70 78 L75 88 L80 78Z" fill="#f2c37a" />
      <path d="M40 46 Q58 36 72 46" stroke="#1f2430" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M78 46 Q92 36 110 46" stroke="#1f2430" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M52 98 Q75 110 98 98" stroke="#9a6417" strokeWidth="3" fill="none" />
    </svg>
  );
}

// ---------- palette status ----------
function statusOf(qid, answered, miscData) {
  const isAns = (answered || []).some((a) => sameId(a.id, qid) && a.value != null && String(a.value) !== "");
  const m = (miscData || []).find((x) => sameId(x.id, qid));
  if (!m && !isAns) return "nv";
  const mk = m?.status === "review";
  if (isAns && mk) return "am";
  if (mk) return "mr";
  if (isAns) return "an";
  return "na";
}
function Shape({ kind, n, small, current, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"xp-st xp-" + kind + (small ? " xp-sm" : "") + (current ? " xp-cur" : "")}
      tabIndex={onClick ? 0 : -1}
    >
      {n}
    </button>
  );
}

const fmt = (t) => {
  t = Math.max(0, Math.floor(Number(t) || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
};

// Long passage / data set on the left, the question on the right.
function splitStem(html) {
  const blocks = String(html || "").match(/<p[\s\S]*?<\/p>|<table[\s\S]*?<\/table>|<img[^>]*>|<ol[\s\S]*?<\/ol>|<ul[\s\S]*?<\/ul>/g);
  if (!blocks || blocks.length < 3) return null;
  const text = String(html).replace(/<[^>]+>/g, "");
  if (text.length < 700) return null;
  const last = blocks[blocks.length - 1];
  if (/<(table|img)/i.test(last)) return null;
  return [blocks.slice(0, -1).join(""), last];
}

// ---------- calculator (mouse only, fixed position) ----------
function Calculator({ onClose, scientific }) {
  const [cv, setCv] = useState("0");
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(false);
  const [mem, setMem] = useState(0);
  const calc = (a, b, o) => (o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : b === 0 ? NaN : a / b);
  const p = (x) => String(+Number(x).toPrecision(12));
  const d = (k) => {
    if (fresh || (cv === "0" && k !== ".")) { setCv(k === "." ? "0." : k); setFresh(false); return; }
    if (k === "." && cv.includes(".")) return;
    setCv(cv + k);
  };
  const doOp = (o) => {
    const v = parseFloat(cv);
    if (acc != null && !fresh) { const r = calc(acc, v, op); setAcc(r); setCv(p(r)); }
    else if (acc == null) setAcc(v);
    setOp(o); setFresh(true);
  };
  const eq = () => { if (acc == null) return; setCv(p(calc(acc, parseFloat(cv), op))); setAcc(null); setOp(null); setFresh(true); };
  const un = (t) => { let v = parseFloat(cv); v = t === "sqrt" ? Math.sqrt(v) : t === "inv" ? 1 / v : acc != null ? (acc * v) / 100 : v / 100; setCv(p(v)); setFresh(true); };
  const m = (k) => { const v = parseFloat(cv); if (k === "MC") setMem(0); if (k === "MR") { setCv(p(mem)); setFresh(true); } if (k === "MS") setMem(v); if (k === "M+") setMem(mem + v); if (k === "M-") setMem(mem - v); };
  const K = ({ children, onClick, cls, span }) => (
    <button type="button" onClick={onClick} className={"xp-k " + (cls || "")} style={span ? { gridColumn: "span 2" } : null}>{children}</button>
  );
  return (
    <div className="xp-calc">
      <div className="xp-calch">Calculator <button type="button" onClick={onClose} aria-label="Close calculator">×</button></div>
      {scientific ? (
        <iframe title="Scientific calculator" src="https://ipmkanpur.tcyonline.com/onlinefiles/scientific_calculator/GATECalculator.htm#nogo" style={{ width: "100%", height: 340, border: 0 }} />
      ) : (
        <>
          <div className="xp-scr">
            <div className="xp-scr-e">{acc != null ? p(acc) + " " + ({ "/": "÷", "*": "×", "-": "−", "+": "+" }[op] || "") : ""}</div>
            <div className="xp-scr-v">{cv}</div>
          </div>
          <div className="xp-keys">
            {["MC", "MR", "MS", "M+", "M-"].map((k) => <K key={k} cls="xp-km" onClick={() => m(k)}>{k === "M-" ? "M−" : k}</K>)}
            <K cls="xp-kc" onClick={() => setCv(cv.length > 1 ? cv.slice(0, -1) : "0")}>⌫</K>
            <K cls="xp-kc" onClick={() => { setCv("0"); setAcc(null); setOp(null); }}>C</K>
            <K onClick={() => setCv(p(-parseFloat(cv)))}>±</K>
            <K onClick={() => un("sqrt")}>√</K>
            <K onClick={() => un("pct")}>%</K>
            <K onClick={() => d("7")}>7</K><K onClick={() => d("8")}>8</K><K onClick={() => d("9")}>9</K>
            <K onClick={() => doOp("/")}>÷</K><K onClick={() => un("inv")}>1/x</K>
            <K onClick={() => d("4")}>4</K><K onClick={() => d("5")}>5</K><K onClick={() => d("6")}>6</K>
            <K onClick={() => doOp("*")}>×</K>
            <button type="button" className="xp-k xp-keq" onClick={eq}>=</button>
            <K onClick={() => d("1")}>1</K><K onClick={() => d("2")}>2</K><K onClick={() => d("3")}>3</K>
            <K onClick={() => doOp("-")}>−</K>
            <K span onClick={() => d("0")}>0</K><K onClick={() => d(".")}>.</K><K onClick={() => doOp("+")}>+</K>
          </div>
        </>
      )}
      <div className="xp-calcnote">Mouse clicks only. Like the real exam, the calculator cannot be moved and the keyboard does not work on it.</div>
    </div>
  );
}

// ---------- SA keypad ----------
function Keypad({ value, onChange }) {
  const v = String(value || "");
  const add = (ch) => {
    if (ch === "." && v.includes(".")) return;
    if (ch === "-") { onChange(v.startsWith("-") ? v.slice(1) : "-" + v); return; }
    onChange(v + ch);
  };
  return (
    <div className="xp-pad">
      {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "-"].map((k) => (
        <button type="button" key={k} className="xp-k" onClick={() => add(k)}>{k}</button>
      ))}
      <button type="button" className="xp-k" style={{ gridColumn: "span 2" }} onClick={() => onChange(v.slice(0, -1))}>Backspace</button>
      <button type="button" className="xp-k" onClick={() => onChange("")}>Clear</button>
    </div>
  );
}

// ============================================================
export default function ExamPlayer(props) {
  const {
    testTitle, cfg, organized, questions, subjectSections,
    currentSection, setCurrentSection, currentQ, setCurrentQ,
    answered, miscData, addMiscItem, recordAnswer, clearResponse,
    gamestate, onStart, remaining, onSubmit, userDetails,
    gender, onSetGender, draft, onResume, onDiscardDraft, onTabSwitch, tabSwitches,
  } = props;

  const locked = cfg?.switch_section === false;
  const [pend, setPend] = useState({});
  const [modal, setModal] = useState(null); // ins | qp | tab | resume | sub | sec
  const [calc, setCalc] = useState(false);
  const [zoom, setZoom] = useState(2);
  const [agree, setAgree] = useState(false);
  const [palOpen, setPalOpen] = useState(false);
  const [secEnded, setSecEnded] = useState(null);
  const [qStart, setQStart] = useState(Date.now());
  const [, tick] = useState(0);
  const prevSecRef = useRef(currentSection);
  const fiveRef = useRef({});

  const secs = useMemo(
    () => (organized || []).map((o, i) => ({
      title: o.title,
      ids: (o.child || []).map((c) => c.id),
      pos: Number(subjectSections?.[i]?.pos) || 4,
      neg: subjectSections?.[i]?.neg == null || subjectSections?.[i]?.neg === "" ? 1 : Math.abs(Number(subjectSections[i].neg)),
      time: Number(subjectSections?.[i]?.time) || 0,
    })),
    [organized, subjectSections],
  );
  const q = questions?.[currentQ];
  const sec = secs[currentSection] || { ids: [], title: "" };
  const idxInSec = q ? sec.ids.findIndex((id) => sameId(id, q.id)) : -1;
  const savedOf = (qid) => {
    const a = (answered || []).find((x) => sameId(x.id, qid));
    return a ? a.value : null;
  };
  const curPend = q ? (Object.prototype.hasOwnProperty.call(pend, q.id) ? pend[q.id] : savedOf(q.id)) : null;

  // resume prompt on load
  useEffect(() => { if (draft && gamestate === 0) setModal("resume"); }, [draft, gamestate]);

  // per-question clock + the "time on this question" display
  useEffect(() => { setQStart(Date.now()); }, [currentQ]);
  useEffect(() => {
    if (gamestate !== 1) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [gamestate]);

  // 5-minute alert, once per section
  useEffect(() => {
    if (gamestate === 1 && remaining > 0 && remaining <= 300 && !fiveRef.current[currentSection]) {
      fiveRef.current[currentSection] = true;
      toast(locked ? `5 minutes left in ${sec.title}` : "5 minutes left", { icon: "⏰" });
    }
  }, [remaining, gamestate, currentSection, locked, sec.title]);

  // section-end summary when a locked section's time runs out
  useEffect(() => {
    if (gamestate === 1 && locked && currentSection > prevSecRef.current) {
      setSecEnded(prevSecRef.current);
      setModal("sec");
    }
    prevSecRef.current = currentSection;
  }, [currentSection, gamestate, locked]);

  // tab switches: warn + count (owner directive)
  useEffect(() => {
    if (gamestate !== 1) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        onTabSwitch && onTabSwitch();
      } else {
        setModal("tab");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [gamestate, onTabSwitch]);

  const qIndex = (id) => (questions || []).findIndex((x) => sameId(x.id, id));
  const goToId = (id, warn = true) => {
    if (!q) return;
    if (warn) {
      const p = Object.prototype.hasOwnProperty.call(pend, q.id) ? pend[q.id] : null;
      const s = savedOf(q.id);
      if (p != null && String(p) !== "" && String(p) !== String(s ?? "")) {
        toast(`Your choice on Question ${idxInSec + 1} was not saved. Use Save & Next to save an answer.`, { icon: "⚠️" });
      }
      setPend((m) => { const n = { ...m }; delete n[q.id]; return n; });
    }
    const i = qIndex(id);
    if (i < 0) return;
    setCurrentQ(i);
    addMiscItem({ id, status: "pending" });
  };
  const goSection = (d, toLast = false) => {
    const ids = secs[d]?.ids || [];
    if (!ids.length) return;
    setCurrentSection(d);
    goToId(toLast ? ids[ids.length - 1] : ids[0], false);
  };
  const next = () => {
    if (idxInSec < sec.ids.length - 1) { goToId(sec.ids[idxInSec + 1], false); return; }
    if (!locked && currentSection < secs.length - 1) { goSection(currentSection + 1); return; }
    toast(locked ? `This is the last question of ${sec.title}.` : "This is the last question. Click Submit when you are done.");
  };
  const commit = () => {
    if (!q) return;
    const v = curPend;
    if (v != null && String(v) !== "") {
      const text = q.type === "options" ? q.options?.[Number(v) - 1]?.title ?? null : undefined;
      recordAnswer({ id: q.id, value: String(v), ...(text !== undefined ? { text } : {}) });
    }
    setPend((m) => { const n = { ...m }; delete n[q.id]; return n; });
  };
  const saveNext = () => {
    if (!q) return;
    commit();
    addMiscItem({ id: q.id, status: "saved" }); // Save & Next removes a review mark
    next();
  };
  const markNext = () => {
    if (!q) return;
    commit();
    addMiscItem({ id: q.id, status: "review" });
    next();
  };
  const clearR = () => {
    if (!q) return;
    clearResponse(q.id);
    setPend((m) => ({ ...m, [q.id]: null }));
  };
  const prev = () => {
    if (idxInSec > 0) { goToId(sec.ids[idxInSec - 1]); return; }
    if (!locked && currentSection > 0) { goSection(currentSection - 1, true); return; }
    toast(locked ? "This is the first question of this section. Finished sections cannot be reopened." : "This is the first question.");
  };

  const counts = (ids) => {
    const c = { an: 0, na: 0, nv: 0, mr: 0, am: 0 };
    ids.forEach((id) => { c[statusOf(id, answered, miscData)]++; });
    return c;
  };
  const sumTable = (rows) => (
    <table className="xp-sum">
      <thead><tr><th>Section</th><th>Questions</th><th>Answered</th><th>Not answered</th><th>Marked</th><th>Answered and marked</th><th>Not visited</th></tr></thead>
      <tbody>
        {rows.map((s) => {
          const c = counts(s.ids);
          return (
            <tr key={s.title}><td><b>{s.title}</b></td><td>{s.ids.length}</td><td style={{ color: C.ok, fontWeight: 700 }}>{c.an}</td><td style={{ color: C.bad }}>{c.na}</td><td>{c.mr}</td><td>{c.am}</td><td>{c.nv}</td></tr>
          );
        })}
      </tbody>
    </table>
  );

  const totalQs = secs.reduce((a, s) => a + s.ids.length, 0);
  const totalMax = secs.reduce((a, s) => a + s.ids.length * s.pos, 0);
  const totalMin = Math.round((Number(cfg?.timeout) || 0) / 60);
  const hasSA = (questions || []).some((x) => x.type === "input");
  const name = userDetails?.user_metadata?.full_name || "Student";

  const renderInstructions = () => (
    <div>
      <div>
        The paper is <b>{totalMin} minutes</b> long and has <b>{secs.length} section{secs.length === 1 ? "" : "s"}</b>
        {locked ? ", taken one after another:" : ". You can move between sections freely at any time:"}
      </div>
      <table className="xp-mk">
        <thead><tr><th>Section</th><th>Questions</th>{locked && <th>Time</th>}<th>Correct</th><th>Wrong</th><th>Not attempted</th><th>Max marks</th></tr></thead>
        <tbody>
          {secs.map((s) => (
            <tr key={s.title}>
              <td><b>{s.title}</b></td><td>{s.ids.length}</td>
              {locked && <td>{Math.round(s.time / 60)} min</td>}
              <td style={{ color: C.ok }}>+{s.pos}</td>
              <td style={{ color: s.neg > 0 ? C.bad : C.muted }}>{s.neg > 0 ? "−" + s.neg : "0"}</td>
              <td>0</td><td>{s.ids.length * s.pos}</td>
            </tr>
          ))}
          <tr className="xp-tot"><td>Total</td><td>{totalQs}</td>{locked && <td>{totalMin} min</td>}<td colSpan={3} /><td>{totalMax}</td></tr>
        </tbody>
      </table>
      {hasSA && <div style={{ fontSize: 13.5, color: C.muted }}>Short-answer questions have no negative marking: type the number using the on-screen keypad.</div>}
      <div className="xp-h">How the question palette works</div>
      <div className="xp-leg">
        <div><Shape kind="nv" n={1} />Not visited yet</div>
        <div><Shape kind="na" n={2} />Visited but not answered</div>
        <div><Shape kind="an" n={3} />Answered</div>
        <div><Shape kind="mr" n={4} />Marked for review, not answered</div>
        <div><Shape kind="am" n={5} /><span>Answered and marked for review. <b>This answer IS counted.</b></span></div>
      </div>
      <div className="xp-h">During the test</div>
      <ol className="xp-ol">
        {locked
          ? <li>Sections run in this order: {secs.map((s) => s.title).join(", ")}. When a section&apos;s time ends, the next one opens automatically; you cannot go back to a finished section.</li>
          : <li>There is one timer for the whole paper. Use the section tabs to move between sections at any time.</li>}
        <li>Choose an option and click <b>Save &amp; Next</b> to save it. Moving away by clicking a question number or Previous does not save an unsaved choice.</li>
        <li><b>Mark for Review &amp; Next</b> saves your choice and flags the question so you can come back to it.</li>
        <li><b>Question Paper</b> (top bar) shows every question of the current section in one scroll.{cfg?.calculator_allowed ? " The on-screen Calculator works with mouse clicks only, like the real exam." : ""}</li>
        <li>Long passages and data sets open on the left with the question on the right, so you never lose the passage while you answer.</li>
        <li>Stay on this tab. Switching tabs or windows is recorded and shown in your result.</li>
        <li>Your answers are saved on this device as you go. If your internet or power goes, reopen the mock and choose <b>Resume</b>.</li>
      </ol>
    </div>
  );

  // plain <style> (not styled-jsx) so the build never trips over nesting rules
  const styles = (
    <style dangerouslySetInnerHTML={{ __html: `
      .xp-root{position:fixed;inset:0;z-index:50;background:#fff;color:${C.ink};font-family:Inter,-apple-system,"Segoe UI",Arial,sans-serif;font-size:15px;display:flex;flex-direction:column}
      .xp-root *{box-sizing:border-box}
      .xp-btn{border:1px solid ${C.line};background:#fff;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer;font-weight:500;font-family:inherit;color:${C.ink}}
      .xp-btn:hover{background:#f7f8fa}
      .xp-pri{background:${C.blue};border-color:${C.blue};color:#fff;font-weight:600}.xp-pri:hover{background:${C.blueD}}
      .xp-subm{background:${C.subbtn};border-color:${C.subbtn};color:#fff;font-weight:600;width:100%}
      .xp-st{flex-shrink:0;width:38px;height:36px;display:grid;place-items:center;font-size:13px;font-weight:600;cursor:pointer;user-select:none;position:relative;border:0;padding:0;font-family:inherit}
      .xp-st.xp-sm{width:30px;height:28px;font-size:12px;cursor:default}
      .xp-nv{background:linear-gradient(#fafafa,#dcdcdc);border:1px solid #b9b9b9;border-radius:5px;color:#222}
      .xp-na{background:linear-gradient(#f26a3a,#d63d10);color:#fff;clip-path:polygon(0 0,100% 0,100% 70%,50% 100%,0 70%)}
      .xp-an{background:linear-gradient(#7ccf3f,#3d9a1f);color:#fff;clip-path:polygon(50% 0,100% 30%,100% 100%,0 100%,0 30%)}
      .xp-mr,.xp-am{background:linear-gradient(#8a5fd6,#5a2fa3);color:#fff;border-radius:50%;width:36px;height:36px}
      .xp-st.xp-sm.xp-mr,.xp-st.xp-sm.xp-am{width:28px;height:28px}
      .xp-am:after{content:"";position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:3px;background:#4caf50;border:2px solid #fff}
      .xp-cur{outline:2px solid ${C.navy};outline-offset:3px}
      .xp-ins{max-width:980px;margin:0 auto;padding:22px 22px 170px;overflow:auto;flex:1;width:100%;line-height:1.6}
      .xp-ins h1{font-weight:700;font-size:26px;margin:4px 0 2px}
      .xp-mk{border-collapse:collapse;margin:10px 0 6px;font-size:14px}.xp-mk th,.xp-mk td{border:1px solid ${C.line};padding:8px 14px;text-align:center}.xp-mk th{background:${C.bg}}.xp-mk td:first-child,.xp-mk th:first-child{text-align:left}.xp-tot td{background:${C.bg};font-weight:700}
      .xp-h{font-weight:700;margin:20px 0 8px;font-size:15px}
      .xp-ol{margin:0;padding-left:22px;line-height:1.75}
      .xp-leg{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px 18px;margin:8px 0}.xp-leg>div{display:flex;align-items:center;gap:10px;font-size:14px}
      .xp-startbar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.line};padding:12px 22px 14px;display:flex;flex-direction:column;gap:10px;z-index:51}
      .xp-startbar label{font-size:13.5px;display:flex;gap:8px;align-items:center}
      .xp-start{background:${C.start};border:0;color:#fff;font-weight:600;width:100%;padding:13px;border-radius:8px;font-size:15px;cursor:pointer;font-family:inherit}
      .xp-gender{display:flex;gap:10px;align-items:center;font-size:13.5px;flex-wrap:wrap}
      .xp-gender button{border:1px solid ${C.line};background:#fff;border-radius:999px;padding:5px 14px;cursor:pointer;font-family:inherit;font-size:13px}
      .xp-gender button.on{border-color:${C.blue};background:${C.blueT};font-weight:600}
      .xp-top{background:${C.navy};color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14px;height:46px;flex-shrink:0;gap:10px}
      .xp-top .t{font-weight:600;color:${C.title};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .xp-top .lk{display:flex;gap:2px;flex-shrink:0}.xp-top .lk button{background:none;border:0;color:#e9e9ea;font-size:13.5px;padding:8px 10px;border-radius:6px;cursor:pointer;font-family:inherit}.xp-top .lk button:hover{background:rgba(255,255,255,.1)}
      .xp-body{flex:1;display:flex;min-height:0}
      .xp-main{flex:1;display:flex;flex-direction:column;min-width:0}
      .xp-secbar{display:flex;justify-content:space-between;align-items:center;padding:6px 14px;border-bottom:1px solid ${C.line};gap:10px}
      .xp-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.xp-tabs>span{font-size:12px;color:${C.muted};margin-right:4px}
      .xp-tab{border:1px solid ${C.line};background:#fff;border-radius:6px;padding:6px 14px;font-weight:600;font-size:13.5px;cursor:pointer;font-family:inherit;color:${C.ink}}
      .xp-tab.on{background:${C.blue};border-color:${C.blue};color:#fff}.xp-tab.lock{color:#aaa;cursor:not-allowed}
      .xp-timer{font-variant-numeric:tabular-nums;font-weight:700;font-size:15px;padding:6px 4px;white-space:nowrap}.xp-timer.red{color:${C.bad};animation:xpbl 1s infinite}
      @keyframes xpbl{50%{opacity:.55}}
      .xp-strip{background:${C.blue};color:#fff;padding:6px 14px;font-weight:600;font-size:14.5px}
      .xp-qbar{background:#fff;border-bottom:1px solid ${C.line};display:flex;justify-content:space-between;align-items:center;padding:7px 14px;font-size:13.5px;gap:10px;flex-wrap:wrap}
      .xp-qbar b{font-size:14.5px}.xp-qbar .mk2{display:flex;gap:12px;color:${C.muted}}.xp-qbar em{font-style:normal;font-weight:700}
      .xp-qarea{flex:1;overflow:auto;display:flex;min-height:0}
      .xp-pane{padding:18px 22px;overflow:auto;line-height:1.7}.xp-pane p{margin:0 0 12px}.xp-pane img{max-width:100%;height:auto}.xp-pane table{border-collapse:collapse;max-width:100%}
      .xp-left{flex:1;border-right:1px solid ${C.line}}.xp-right{flex:1}
      .xp-z1 .xp-pane{font-size:14px}.xp-z2 .xp-pane{font-size:15.5px}.xp-z3 .xp-pane{font-size:17.5px}
      .xp-opt{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid ${C.line};border-radius:8px;margin:8px 0;cursor:pointer;background:#fff;width:100%;text-align:left;font-family:inherit;font-size:inherit;color:${C.ink};line-height:1.55}
      .xp-opt:hover{border-color:#a9c7f2}.xp-opt.sel{border-color:${C.blue};background:${C.blueT}}
      .xp-radio{width:16px;height:16px;border-radius:50%;border:2px solid #8a94a6;flex-shrink:0;margin-top:4px;display:grid;place-items:center}.sel .xp-radio{border-color:${C.blue}}.sel .xp-radio:after{content:"";width:8px;height:8px;border-radius:50%;background:${C.blue}}
      .xp-sa{border:1px solid ${C.line};border-radius:8px;padding:10px 12px;font-size:18px;width:260px;max-width:100%;font-variant-numeric:tabular-nums;font-family:inherit}
      .xp-pad{display:grid;grid-template-columns:repeat(3,64px);gap:6px;margin-top:10px}
      .xp-foot{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-top:1px solid ${C.line};gap:8px;flex-wrap:wrap;flex-shrink:0}.xp-foot .g{display:flex;gap:8px;flex-wrap:wrap}
      .xp-side{width:310px;border-left:1px solid ${C.line};display:flex;flex-direction:column;background:#fff;flex-shrink:0;min-height:0}
      .xp-who{display:flex;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid ${C.line}}
      .xp-av{width:84px;height:96px;border-radius:6px;border:1px solid #c9d6ea;overflow:hidden;flex-shrink:0}
      .xp-who small{display:block;color:${C.muted};font-size:12px}
      .xp-legs{display:grid;grid-template-columns:1fr 1fr;gap:10px 8px;padding:12px 14px;border-bottom:1px solid ${C.line};font-size:12px;color:${C.muted}}.xp-legs>div{display:flex;align-items:center;gap:8px}.xp-legs .w{grid-column:1/-1}
      .xp-palstrip{background:${C.blue};color:#fff;padding:7px 14px;font-weight:600;font-size:15px}
      .xp-palh{padding:10px 14px 4px;font-weight:700;font-size:13.5px;display:flex;justify-content:space-between}.xp-palh span{font-weight:500;color:${C.muted};font-size:12px}
      .xp-pal{display:grid;grid-template-columns:repeat(5,1fr);gap:10px 6px;padding:8px 14px 14px;overflow:auto;justify-items:center;align-content:start;flex:1;min-height:0}
      .xp-sidefoot{padding:12px 14px;border-top:1px solid ${C.line};background:${C.subbg}}
      .xp-ov{position:fixed;inset:0;background:rgba(20,22,28,.45);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:70;padding:16px}
      .xp-md{background:#fff;border-radius:16px;max-width:780px;width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25)}
      .xp-mh{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid ${C.line};font-weight:700;font-size:17px}.xp-mh button{border:0;background:none;font-size:22px;cursor:pointer;color:${C.muted}}
      .xp-mb{padding:16px 20px;overflow:auto;line-height:1.65}.xp-mb img{max-width:100%}
      .xp-mf{padding:14px 20px;border-top:1px solid ${C.line};display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
      .xp-md.sm{max-width:440px;text-align:center}.xp-md.sm .xp-mb{padding:24px 26px 8px}.xp-md.sm .xp-mf{justify-content:center}
      .xp-gb{background:${C.gold};border:1px solid ${C.gold};color:#fff;font-weight:600;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer;font-family:inherit}.xp-gb:hover{background:${C.goldD};border-color:${C.goldD}}
      .xp-go{background:#fff;border:1px solid #e3d3b5;color:#7a5313;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer;font-family:inherit;font-weight:500}.xp-go:hover{background:${C.goldT}}
      .xp-sum{border-collapse:collapse;width:100%;font-size:14px}.xp-sum th,.xp-sum td{border:1px solid ${C.line};padding:8px;text-align:center}.xp-sum th{background:${C.bg}}
      .xp-qp{border-bottom:1px solid ${C.line};padding:12px 0}.xp-qp h4{margin:0 0 6px}
      .xp-calc{position:fixed;top:52px;right:8px;width:300px;background:#fff;border:1px solid ${C.line};border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.18);z-index:60;user-select:none}
      .xp-calch{background:#2a6db5;color:#fff;border-radius:12px 12px 0 0;padding:8px 12px;display:flex;justify-content:space-between;font-weight:600;font-size:14px}.xp-calch button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer}
      .xp-scr{margin:10px;border:1px solid ${C.line};border-radius:8px;padding:6px 10px;text-align:right;font-variant-numeric:tabular-nums}.xp-scr-e{font-size:12px;color:${C.muted};min-height:16px}.xp-scr-v{font-size:22px;font-weight:600;min-height:28px;word-break:break-all}
      .xp-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:0 10px 10px}
      .xp-k{height:38px;border:1px solid ${C.line};border-radius:7px;background:#fafafa;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;color:${C.ink}}
      .xp-km{font-size:11.5px;color:${C.muted}}.xp-kc{background:#e8453c;color:#fff;border-color:#e8453c}.xp-keq{background:#2fb344;color:#fff;border-color:#2fb344;grid-row:span 2;height:auto}
      .xp-calcnote{font-size:12px;color:${C.muted};padding:0 12px 10px}
      .xp-palbtn{display:none}
      @media (max-width:900px){
        .xp-side{position:fixed;right:0;top:46px;bottom:0;z-index:55;box-shadow:-8px 0 24px rgba(0,0,0,.15);transform:translateX(105%);transition:transform .2s}
        .xp-side.open{transform:none}
        .xp-palbtn{display:inline-block}
        .xp-qarea{flex-direction:column}.xp-left{border-right:0;border-bottom:1px solid ${C.line};flex:none;max-height:45vh}
        .xp-calc{right:8px;top:52px}
      }
    ` }} />
  );

  // ---------------- popups (IPM Careers gold theme) ----------------
  const renderModals = () => {
    if (!modal) return null;
    const close = () => setModal(null);
    if (modal === "ins") {
      return (
        <div className="xp-ov" onClick={close}><div className="xp-md" onClick={(e) => e.stopPropagation()}>
          <div className="xp-mh">Instructions <button type="button" onClick={close} aria-label="Close">×</button></div>
          <div className="xp-mb">{renderInstructions()}</div>
          <div className="xp-mf"><button type="button" className="xp-gb" onClick={close}>Back to the test</button></div>
        </div></div>
      );
    }
    if (modal === "qp") {
      const list = sec.ids.map((id) => questions[qIndex(id)]).filter(Boolean);
      return (
        <div className="xp-ov" onClick={close}><div className="xp-md" onClick={(e) => e.stopPropagation()}>
          <div className="xp-mh">Question Paper: {sec.title} <button type="button" onClick={close} aria-label="Close">×</button></div>
          <div className="xp-mb">
            {list.map((x, i) => (
              <div className="xp-qp" key={x.id}>
                <h4>Question {i + 1}</h4>
                <div dangerouslySetInnerHTML={{ __html: x.question }} />
                {x.type === "options" ? (
                  <div>{(x.options || []).map((o, k) => <div key={k}><b>({k + 1})</b> {o.title}</div>)}</div>
                ) : <div style={{ color: C.muted, fontSize: 13 }}>Type-in answer</div>}
              </div>
            ))}
            <p style={{ color: C.muted, fontSize: 13 }}>Read-only view. Close it to answer.</p>
          </div>
        </div></div>
      );
    }
    if (modal === "tab") {
      return (
        <div className="xp-ov"><div className="xp-md sm">
          <div className="xp-mb">
            <Owl />
            <h3 style={{ margin: "8px 0 6px" }}>Eyes on the paper!</h3>
            <div style={{ color: C.muted, fontSize: 14.5 }}>You left the test window. The real exam won&apos;t let you, and answers found online won&apos;t help on the day.</div>
            <div style={{ margin: "12px 0 4px", fontSize: 13 }}>Tab switches so far: <b style={{ color: C.bad }}>{tabSwitches}</b> · shown in your result</div>
          </div>
          <div className="xp-mf"><button type="button" className="xp-gb" onClick={close}>Back to my test</button></div>
        </div></div>
      );
    }
    if (modal === "resume" && draft) {
      const dsec = secs[draft.section || 0]?.title;
      return (
        <div className="xp-ov"><div className="xp-md sm">
          <div className="xp-mb">
            <h3 style={{ margin: "0 0 8px" }}>Continue where you left off?</h3>
            <div style={{ color: C.muted, fontSize: 14.5 }}>
              You have an unfinished attempt of <b>{testTitle}</b> on this device
              {dsec ? <>: <b>{dsec}</b></> : ""}, {(draft.report || []).length} answered
              {draft.remaining != null ? <>, {fmt(draft.remaining)} left{locked ? " in the section" : ""}</> : ""}.
            </div>
          </div>
          <div className="xp-mf">
            <button type="button" className="xp-go" onClick={() => { close(); onDiscardDraft(); }}>Start again</button>
            <button type="button" className="xp-gb" onClick={() => { close(); onResume(); }}>Resume</button>
          </div>
        </div></div>
      );
    }
    if (modal === "sub") {
      return (
        <div className="xp-ov" onClick={close}><div className="xp-md" onClick={(e) => e.stopPropagation()}>
          <div className="xp-mh">Submit the mock? <button type="button" onClick={close} aria-label="Close">×</button></div>
          <div className="xp-mb">{sumTable(secs)}
            <p style={{ color: C.muted, fontSize: 13.5, marginTop: 12 }}>Once submitted you cannot change any answer. Questions you marked for review <b>and</b> answered will be counted.</p></div>
          <div className="xp-mf"><button type="button" className="xp-go" onClick={close}>Keep working</button><button type="button" className="xp-gb" onClick={() => { close(); onSubmit(); }}>Yes, submit</button></div>
        </div></div>
      );
    }
    if (modal === "sec" && secEnded != null && secs[secEnded]) {
      return (
        <div className="xp-ov"><div className="xp-md">
          <div className="xp-mh">{secs[secEnded].title} time is over</div>
          <div className="xp-mb">{sumTable([secs[secEnded]])}
            <p style={{ color: C.muted, fontSize: 13.5, marginTop: 12 }}>{sec.title} ({sec.ids.length} questions{sec.time ? `, ${Math.round(sec.time / 60)} minutes` : ""}) has started. You can&apos;t return to {secs[secEnded].title}.</p></div>
          <div className="xp-mf"><button type="button" className="xp-gb" onClick={close}>Continue to {sec.title}</button></div>
        </div></div>
      );
    }
    return null;
  };

  // ---------------- instructions page ----------------
  if (gamestate === 0) {
    const canStart = agree && (gender === "male" || gender === "female");
    return (
      <div className="xp-root">
        {styles}
        <div className="xp-ins">
          <h1>{testTitle}</h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>Please read the instructions carefully before you start.</div>
          {renderInstructions()}
        </div>
        <div className="xp-startbar">
          {!(gender === "male" || gender === "female") && (
            <div className="xp-gender">Your exam-screen picture:
              <button type="button" className={gender === "female" ? "on" : ""} onClick={() => onSetGender("female")}>Female</button>
              <button type="button" className={gender === "male" ? "on" : ""} onClick={() => onSetGender("male")}>Male</button>
            </div>
          )}
          <label><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read the instructions. I will attempt this mock honestly, in one sitting, without outside help.</label>
          <button
            type="button" className="xp-start"
            onClick={() => {
              if (!agree) { toast.error("Please tick the declaration first"); return; }
              if (!canStart) { toast.error("Please choose your exam-screen picture"); return; }
              onStart();
            }}
          >
            Start Mock →
          </button>
        </div>
        {renderModals()}
      </div>
    );
  }

  // ---------------- exam screen ----------------
  const split = q ? splitStem(q.question) : null;
  const qSecs = Math.floor((Date.now() - qStart) / 1000);
  const renderOptions = () => {
    if (!q) return null;
    if (q.type === "input") {
      return (
        <div style={{ marginTop: 6 }}>
          <input
            className="xp-sa" inputMode="decimal" value={curPend ?? ""} placeholder="Type your answer"
            onChange={(e) => {
              const cleaned = String(e.target.value).replace(/[^0-9.\-]/g, "").replace(/(?!^)-/g, "").replace(/(\..*)\./g, "$1");
              setPend((m) => ({ ...m, [q.id]: cleaned }));
            }}
          />
          <Keypad value={curPend ?? ""} onChange={(v) => setPend((m) => ({ ...m, [q.id]: v }))} />
        </div>
      );
    }
    return (
      <div>
        {(q.options || []).map((o, k) => {
          const v = String(k + 1);
          const on = curPend != null && String(curPend) === v;
          return (
            <button type="button" key={k} className={"xp-opt" + (on ? " sel" : "")} onClick={() => setPend((m) => ({ ...m, [q.id]: v }))}>
              <span className="xp-radio" />
              {o?.image ? <img src={o.image} alt={"Option " + (k + 1)} style={{ height: 64, width: "auto" }} /> : <span>{o.title}</span>}
            </button>
          );
        })}
      </div>
    );
  };
  const stem = (html) => (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {q?.questionimage && <img src={q.questionimage} alt="Question" style={{ maxHeight: "30vh" }} />}
    </>
  );
  const c = counts(sec.ids);

  return (
    <div className="xp-root">
      {styles}
      <div className="xp-top">
        <div className="t">IPM Careers · {testTitle}</div>
        <div className="lk">
          <button type="button" onClick={() => setModal("ins")}>Instructions</button>
          <button type="button" onClick={() => setModal("qp")}>Question Paper</button>
          {cfg?.calculator_allowed && <button type="button" onClick={() => setCalc((x) => !x)}>Calculator</button>}
          <button type="button" onClick={() => setZoom((z) => (z % 3) + 1)} title="Text size">A<span style={{ fontSize: 11 }}>A</span></button>
          <button type="button" className="xp-palbtn" onClick={() => setPalOpen((x) => !x)}>Questions</button>
        </div>
      </div>
      <div className="xp-body">
        <div className={"xp-main xp-z" + zoom}>
          <div className="xp-secbar">
            <div className="xp-tabs"><span>Sections</span>
              {secs.map((s, d) => {
                const done = locked && d < currentSection;
                const later = locked && d > currentSection;
                return (
                  <button
                    type="button" key={s.title + d}
                    className={"xp-tab" + (d === currentSection ? " on" : "") + (done ? " lock" : "")}
                    onClick={() => {
                      if (d === currentSection) return;
                      if (done) { toast("Finished sections are locked"); return; }
                      if (later) { toast(`${s.title} opens after the current section ends`); return; }
                      goSection(d);
                    }}
                  >
                    {done ? "🔒 " : ""}{s.title}
                  </button>
                );
              })}
            </div>
            <div className={"xp-timer" + (remaining < 300 ? " red" : "")}>Time Left: {fmt(remaining)}</div>
          </div>
          <div className="xp-strip">{sec.title}</div>
          <div className="xp-qbar">
            <b>Question {idxInSec + 1} of {sec.ids.length}</b>
            <div className="mk2">
              <span>Marks <em style={{ color: C.ok }}>+{sec.pos}</em> / <em style={{ color: q?.type === "input" ? C.muted : C.bad }}>{q?.type === "input" ? "0" : "−" + sec.neg}</em></span>
              <span>Time on this question <em>{fmt(qSecs)}</em></span>
            </div>
          </div>
          <div className="xp-qarea">
            {split ? (
              <>
                <div className="xp-pane xp-left">{stem(split[0])}</div>
                <div className="xp-pane xp-right"><div dangerouslySetInnerHTML={{ __html: split[1] }} />{renderOptions()}</div>
              </>
            ) : (
              <div className="xp-pane xp-right" style={{ maxWidth: 1000 }}>{stem(q?.question)}{renderOptions()}</div>
            )}
          </div>
          <div className="xp-foot">
            <div className="g">
              <button type="button" className="xp-btn" onClick={markNext}>Mark for Review &amp; Next</button>
              <button type="button" className="xp-btn" onClick={clearR}>Clear Response</button>
            </div>
            <div className="g">
              <button type="button" className="xp-btn" onClick={prev}>← Previous</button>
              <button type="button" className="xp-btn xp-pri" onClick={saveNext}>Save &amp; Next →</button>
            </div>
          </div>
        </div>
        <div className={"xp-side" + (palOpen ? " open" : "")}>
          <div className="xp-who">
            <div className="xp-av"><Avatar gender={gender} /></div>
            <div><b>{name}</b><small>{testTitle}</small></div>
          </div>
          <div className="xp-legs">
            <div><Shape kind="an" n={c.an} small />Answered</div>
            <div><Shape kind="na" n={c.na} small />Not answered</div>
            <div><Shape kind="nv" n={c.nv} small />Not visited</div>
            <div><Shape kind="mr" n={c.mr} small />Marked for review</div>
            <div className="w"><Shape kind="am" n={c.am} small />Answered and marked (counted)</div>
          </div>
          <div className="xp-palstrip">IPM Careers Mocks</div>
          <div className="xp-palh">Choose a question <span>{sec.title} · {sec.ids.length} questions</span></div>
          <div className="xp-pal">
            {sec.ids.map((id, i) => (
              <Shape key={id} kind={statusOf(id, answered, miscData)} n={i + 1} current={q && sameId(q.id, id)} onClick={() => { goToId(id); setPalOpen(false); }} />
            ))}
          </div>
          <div className="xp-sidefoot"><button type="button" className="xp-btn xp-subm" onClick={() => setModal("sub")}>Submit Mock</button></div>
        </div>
      </div>
      {calc && <Calculator scientific={!!cfg?.is_scientific} onClose={() => setCalc(false)} />}
      {renderModals()}
    </div>
  );
}
