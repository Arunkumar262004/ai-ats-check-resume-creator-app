import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import ParseModal from "./ParseModal.jsx";
import { Icon } from "./icons.jsx";
import AiLoader from "./AiLoader.jsx";
import ResumeStudio from "./ResumeStudio.jsx";
import BackgroundDots from "./BackgroundDots.jsx";
import Logo from "./Logo.jsx";
import VoiceGuide, { ListenButton } from "./VoiceGuide.jsx";

const Chips = ({ items = [], kind = "" }) => (
  <div className="chips">
    {items.map((s) => <span key={s} className={`chip ${kind}`}>{s}</span>)}
  </div>
);

const ScoreBadge = ({ score }) => (
  <span className={`score ${score >= 70 ? "hi" : score >= 45 ? "mid" : "lo"}`}>{score}%</span>
);

function ResumesTab({ resumes, reload, onPick, selected }) {
  const [run, setRun] = useState(null); // { file, phase, resume, review, error }
  const token = useRef(0);
  const [view, setView] = useState(null); // resume id being viewed
  const busy = run && (run.phase === "parsing" || run.phase === "reviewing");

  const upload = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const id = ++token.current;
    const live = (p) => token.current === id && setRun((r) => ({ ...r, ...p }));
    setRun({ file: f, phase: "parsing" });
    try {
      const r = await api.uploadResume(f);
      live({ phase: "reviewing", resume: r });
      reload(); onPick(r.id);
      live({ phase: "done", review: await api.reviewResume(r.id) });
    } catch (ex) { live({ phase: "error", error: ex.message }); }
  };
  const closeModal = () => { token.current++; setRun(null); };

  return (
    <section className="card" id="sec-resumes">
      <div className="card-head"><span className="step"><Icon name="file" size={15} /></span><h2>Resumes</h2></div>
      <label className="drop">
        <span className="drop-ico"><Icon name="upload" size={22} /></span>
        <strong>Click to upload a resume</strong>
        <small>PDF, DOCX or TXT</small>
        <input type="file" accept=".pdf,.docx,.txt" onChange={upload} disabled={busy} hidden />
      </label>
      {run && <ParseModal run={run} onClose={closeModal} />}
      {view && <ResumeStudio resumeId={view} mode="view" onClose={() => setView(null)} />}
      <ul className="list">
        {resumes.map((r) => (
          <li key={r.id} className={selected === r.id ? "active" : ""} onClick={() => onPick(r.id)}>
            <span className="avatar"><Icon name="file" size={17} /></span>
            <div>
              <strong>{r.name || r.filename}</strong>
              <small>{r.experience_years ?? "?"} yrs · {r.skills.length} skills</small>
            </div>
            {selected === r.id && <span className="picked"><Icon name="check" size={14} /> Selected</span>}
            <button className="view-btn" title="View resume" onClick={(e) => { e.stopPropagation(); setView(r.id); }}><Icon name="eye" size={15} />View</button>
            <button className="link" title="Delete" onClick={async (e) => { e.stopPropagation(); await api.deleteResume(r.id); reload(); }}><Icon name="trash" size={16} /></button>
          </li>
        ))}
        {!resumes.length && <li className="empty">No resumes yet.</li>}
      </ul>
    </section>
  );
}

function JobsTab({ jobs, reload, onPick, selected }) {
  const [f, setF] = useState({ title: "", company: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { const j = await api.createJob(f); setF({ title: "", company: "", description: "" }); await reload(); onPick(j.id); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  return (
    <section className="card" id="sec-jobs">
      <div className="card-head"><span className="step"><Icon name="briefcase" size={15} /></span><h2>Jobs</h2></div>
      <form onSubmit={submit} className="form">
        <input placeholder="Job title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input placeholder="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
        <textarea placeholder="Paste job description…" required rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <button className="btn" disabled={busy}><Icon name="plus" size={16} />{busy ? "Analyzing job…" : "Add job"}</button>
      </form>
      {err && <p className="error">{err}</p>}
      {busy && (
        <AiLoader
          title="Analyzing job description"
          chips={["Skills", "Requirements", "Seniority", "Duties"]}
          messages={["Reading the job description…", "Extracting required skills…", "Spotting nice-to-haves…", "Embedding it for matching…"]}
        />
      )}
      <ul className="list">
        {jobs.map((j) => (
          <li key={j.id} className={selected === j.id ? "active" : ""} onClick={() => onPick(j.id)}>
            <span className="avatar"><Icon name="briefcase" size={17} /></span>
            <div><strong>{j.title}</strong><small>{j.company || "—"}</small></div>
            {selected === j.id && <span className="picked"><Icon name="check" size={14} /> Selected</span>}
            <button className="link" title="Delete" onClick={async (e) => { e.stopPropagation(); await api.deleteJob(j.id); reload(); }}><Icon name="trash" size={16} /></button>
          </li>
        ))}
        {!jobs.length && <li className="empty">No jobs yet.</li>}
      </ul>
    </section>
  );
}

/* ---- readable "proof" cards for the retrieved resume passages ---- */
const STOP = new Set(["and", "the", "for", "with", "using", "use", "that", "from", "have", "has", "work", "working", "experience", "strong", "good", "ability", "skills", "knowledge", "development"]);
const keywords = (req) =>
  [...new Set(req.toLowerCase().split(/[^a-z0-9+#.]+/).map((w) => w.replace(/^\.+|\.+$/g, "")).filter((w) => w.length >= 3 && !STOP.has(w)))];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, words }) {
  if (!words.length) return text;
  const re = new RegExp(`(${words.map(esc).join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    words.includes(part.toLowerCase()) ? <mark key={i}>{part}</mark> : part
  );
}

function ProofCard({ item }) {
  const [full, setFull] = useState(false);
  const words = keywords(item.requirement);
  // merge passages, split into lines, and drop repeats caused by overlapping chunks
  const seen = new Set();
  const lines = item.passages
    .flatMap((p) => p.split(/\n+/))
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1 && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()));
  const hit = (l) => words.some((w) => l.toLowerCase().includes(w));
  const hits = lines.map(hit);
  const found = hits.some(Boolean);

  // excerpt = matching lines plus one line of context either side; otherwise the first few lines
  const keep = new Set();
  hits.forEach((h, i) => { if (h) [i - 1, i, i + 1].forEach((k) => k >= 0 && k < lines.length && keep.add(k)); });
  const excerpt = found ? lines.filter((_, i) => keep.has(i)).slice(0, 6) : lines.slice(0, 3);
  const shown = full ? lines : excerpt;

  return (
    <div className={`proof-card ${found ? "found" : "missing"}`}>
      <div className="proof-top">
        <span className="proof-req">{item.requirement}</span>
        <span className={`proof-tag ${found ? "ok" : "warn"}`}>
          <Icon name={found ? "check" : "target"} size={12} />{found ? "Found" : "Not mentioned"}
        </span>
      </div>
      {shown.length ? (
        <ul className="proof-lines">
          {shown.map((l, i) => <li key={i}><Highlight text={l} words={found ? words : []} /></li>)}
        </ul>
      ) : <p className="proof-none">No related text found in your resume.</p>}
      {lines.length > shown.length || full ? (
        <button className="proof-more" onClick={() => setFull(!full)}>{full ? "Show less" : `Show full passage (${lines.length} lines)`}</button>
      ) : null}
    </div>
  );
}

function Analysis({ data }) {
  const L = ({ title, items, kind }) => items?.length ? (
    <div><h4>{title}</h4><ul className="bul">{items.map((x, i) => <li key={i} className={kind}>{x}</li>)}</ul></div>
  ) : null;
  return (
    <div className="analysis">
      <div className="head">
        <ScoreBadge score={data.fit_score} />
        <span className="verdict">{data.verdict}</span>
        <small>Match score: {data.vector_score}%</small>
      </div>
      <p>{data.summary}</p>
      {data.improvement_plan && (
        <div className="plan">
          <div className="plan-head"><span className="ph-ico"><Icon name="target" size={20} /></span><h3>Where you need to improve</h3>
            <ListenButton text={[data.improvement_plan.intro, ...(data.improvement_plan.skills_to_add || []).map((s) => `${s.skill}. ${s.why} ${s.how}`)].join(" ")} label="Listen to advice" />
          </div>
          <p className="plan-intro">{data.improvement_plan.intro}</p>
          <ul className="plan-list">
            {(data.improvement_plan.skills_to_add || []).map((s, i) => (
              <li key={i}>
                <span className="plan-skill"><Icon name="plus" size={13} />{s.skill}</span>
                <div>
                  <p><b>Why it matters:</b> {s.why}</p>
                  <p><b>How to add it:</b> {s.how}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="cols">
        <L title="Strengths" items={data.strengths} />
        <L title="Gaps" items={data.gaps} />
      </div>
      <h4>Matched skills</h4><Chips items={data.matched_skills} kind="ok" />
      <h4>Missing skills</h4><Chips items={data.missing_skills} kind="bad" />
      <L title="Resume suggestions" items={data.resume_suggestions} />
      <L title="Interview questions" items={data.interview_questions} />
      <details className="proof">
        <summary><Icon name="search" size={15} /> See the proof from your resume</summary>
        <p className="proof-help">
          For every requirement in the job, these are the lines of your resume the AI read to judge it.
          <b className="ok-t"> Found</b> means your resume mentions it; <b className="warn-t">Not mentioned</b> means it didn't see it.
        </p>
        <div className="proof-grid">
          {data.evidence.map((e, i) => <ProofCard key={i} item={e} />)}
        </div>
      </details>
    </div>
  );
}

function Results({ resumeId, jobId }) {
  const [mode, setMode] = useState("jobs"); // jobs for resume | candidates for job
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aBusy, setABusy] = useState(false);
  const [err, setErr] = useState("");

  const [ran, setRan] = useState(false);
  const [studio, setStudio] = useState(null); // { title, missing } → resume generator popup
  const analysisRef = useRef(null);
  useEffect(() => {
    if (analysis) analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [analysis]);
  const pickedId = mode === "jobs" ? resumeId : jobId;

  // Matching only runs when the user clicks "Check match"; changing the selection clears old results.
  useEffect(() => { setRows([]); setAnalysis(null); setErr(""); setRan(false); }, [mode, resumeId, jobId]);

  const check = async () => {
    if (!pickedId) return;
    setLoading(true); setErr(""); setAnalysis(null); setRan(false);
    try { setRows(await (mode === "jobs" ? api.resumeMatches(pickedId) : api.jobCandidates(pickedId))); setRan(true); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const analyze = async (r) => {
    setABusy(true); setErr(""); setAnalysis(null);
    try { setAnalysis(await api.analyze(r.resume_id ?? resumeId, r.job_id ?? jobId)); }
    catch (e) { setErr(e.message); }
    setABusy(false);
  };

  return (
    <section className="card wide" id="sec-matches">
      <div className="card-head"><span className="step"><Icon name="target" size={15} /></span><h2>Matches</h2></div>
      <div className="match-bar">
        <div className="tabs">
          <button className={mode === "jobs" ? "on" : ""} onClick={() => setMode("jobs")}><Icon name="briefcase" size={15} /> Best jobs for resume</button>
          <button className={mode === "cands" ? "on" : ""} onClick={() => setMode("cands")}><Icon name="users" size={15} /> Best candidates for job</button>
        </div>
        <button className="btn" disabled={!pickedId || loading} onClick={check}>
          <Icon name={loading ? "sparkles" : "search"} size={16} />{loading ? "Checking…" : "Check match"}
        </button>
      </div>
      {!pickedId && (
        <div className="placeholder">
          <span className="ph-ico"><Icon name={mode === "jobs" ? "file" : "briefcase"} size={26} /></span>
          <b>{mode === "jobs" ? "Select a resume above" : "Select a job above"}</b>
          <small>then click <em>Check match</em> to see {mode === "jobs" ? "the best jobs" : "the best candidates"}</small>
        </div>
      )}
      {pickedId && !ran && !loading && !err && (
        <div className="placeholder ready">
          <span className="ph-ico"><Icon name="cursor" size={26} /></span>
          <b>Ready when you are</b>
          <small>Click <em>Check match</em> to start</small>
        </div>
      )}
      {loading && (
        <AiLoader
          title="Finding your best matches"
          chips={["Semantic fit", "Skills", "Experience", "Score"]}
          messages={["Comparing embeddings…", "Checking skill overlap…", "Scoring every match…", "Ranking the results…"]}
        />
      )}
      {ran && !rows.length && <p className="hint">Nothing to compare yet — add at least one {mode === "jobs" ? "job" : "resume"}.</p>}
      {err && <p className="error">{err}</p>}
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.job_id ?? r.resume_id}>
              <td><ScoreBadge score={r.score} /></td>
              <td>
                <strong>{r.title ?? r.name}</strong> <small>{r.company ?? r.filename}</small>
                <Chips items={r.matched_skills} kind="ok" />
                <Chips items={r.missing_skills} kind="bad" />
                {r.missing_skills?.length > 0 && (
                  <p className="human">
                    <Icon name="target" size={14} />
                    {mode === "jobs" ? "To improve this match, add" : "This candidate is missing"}{" "}
                    <b>{r.missing_skills.slice(0, 4).join(", ")}</b>
                    {r.missing_skills.length > 4 && ` and ${r.missing_skills.length - 4} more`}
                    {mode === "jobs" && " to your resume — click AI analysis for how."}
                  </p>
                )}
              </td>
              <td>
                <div className="row-actions">
                  <button className="btn small ghost" disabled={aBusy} onClick={() => analyze(r)}><Icon name="sparkles" size={14} />AI analysis</button>
                  {mode === "jobs" && (
                    <button className="btn small" onClick={() => setStudio({ title: r.title, missing: r.missing_skills || [] })}>
                      <Icon name="wand" size={14} />Generate resume
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {studio && <ResumeStudio resumeId={resumeId} jobTitle={studio.title} missing={studio.missing} onClose={() => setStudio(null)} />}
      {aBusy && (
        <AiLoader
          title="Running AI analysis"
          chips={["Evidence", "Strengths", "Gaps", "Interview Qs"]}
          messages={["Retrieving evidence from the resume…", "Judging fit per requirement…", "Finding strengths and gaps…", "Drafting tips & interview questions…"]}
        />
      )}
      <div ref={analysisRef}>{analysis && <Analysis data={analysis} />}</div>
    </section>
  );
}

export default function App() {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [rid, setRid] = useState(null);
  const [jid, setJid] = useState(null);

  const loadR = () => api.listResumes().then(setResumes).catch(() => {});
  const loadJ = () => api.listJobs().then(setJobs).catch(() => {});
  useEffect(() => { loadR(); loadJ(); }, []);

  return (
    <>
      <BackgroundDots />
      <VoiceGuide />
      <div className="app">
      <header>
        <div className="header-in">
          <Logo size={44} />
          <div><h1>Resume Analyzer & Job Matcher</h1><p>Upload resumes, add jobs, see the best fit</p></div>
        </div>
      </header>
      <main>
        <ResumesTab resumes={resumes} reload={loadR} onPick={setRid} selected={rid} />
        <JobsTab jobs={jobs} reload={loadJ} onPick={setJid} selected={jid} />
        <Results resumeId={rid} jobId={jid} />
      </main>
      </div>
    </>
  );
}
