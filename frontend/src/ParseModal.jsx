import { useEffect, useState } from "react";
import "./modal.css";

function useCount(target, ms = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let raf, t0;
    const tick = (t) => {
      t0 = t0 ?? t;
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

const Sk = ({ w = "100%", h = 7 }) => <span className="sk" style={{ width: w, height: h }} />;

/* The resume "sheet": skeleton lines until real parsed data arrives, then the real content. */
function Sheet({ file, resume, scanning }) {
  const p = resume?.parsed;
  return (
    <div className="sheet">
      <div className="sheet-file">{file.name}</div>
      {p ? (
        <div className="sheet-body reveal">
          <div className="sheet-name">{p.name || "Unnamed"}</div>
          <div className="sheet-sub">{[p.email, p.phone].filter(Boolean).join("  ·  ")}</div>
          {p.summary && <p className="sheet-p">{p.summary.slice(0, 150)}{p.summary.length > 150 ? "…" : ""}</p>}
          <div className="sheet-h">Skills</div>
          <div className="sheet-chips">
            {(p.skills || []).slice(0, 12).map((s) => <span key={s}>{s}</span>)}
          </div>
          <div className="sheet-h">Experience</div>
          {(p.experience || []).slice(0, 3).map((x, i) => (
            <div key={i} className="sheet-exp"><b>{x.title}</b> <span>{x.company}</span></div>
          ))}
        </div>
      ) : (
        <div className="sheet-body">
          <Sk w="55%" h={12} /><Sk w="38%" />
          <div style={{ height: 6 }} />
          <Sk /><Sk w="92%" /><Sk w="70%" />
          <div style={{ height: 6 }} />
          <Sk w="30%" h={9} /><Sk w="80%" /><Sk /><Sk w="60%" />
          <div style={{ height: 6 }} />
          <Sk w="34%" h={9} /><Sk /><Sk w="88%" /><Sk w="75%" />
        </div>
      )}
      {scanning && <div className="beam" />}
    </div>
  );
}

function tagsFor(resume, review) {
  if (review?.sections?.length) {
    return review.sections.map((s) => ({ label: s.name, ok: s.status === "good" }));
  }
  const p = resume?.parsed;
  if (!p) return [];
  return [
    { label: "Contact", ok: !!(p.email || p.phone) },
    { label: "Summary", ok: !!p.summary },
    { label: "Work history", ok: !!p.experience?.length },
    { label: "Education", ok: !!p.education?.length },
    { label: "Skills", ok: !!p.skills?.length },
  ];
}

const STEPS = ["Reading & parsing resume", "Reviewing for improvements", "Report ready"];

function Progress({ phase, resume }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const idx = phase === "parsing" ? 0 : 1;
  const p = resume?.parsed;
  const rows = p ? [
    ["Name", p.name || "—"],
    ["Email", p.email || "—"],
    ["Phone", p.phone || "—"],
    ["Experience", p.total_experience_years != null ? `${p.total_experience_years} yrs` : "—"],
    ["Skills found", String((p.skills || []).length)],
    ["Education entries", String((p.education || []).length)],
  ] : [];
  return (
    <div className="panel">
      <h3>{phase === "parsing" ? "Parsing your resume" : "Resume parsed — reviewing"}</h3>
      <p className="muted">Live extraction · {secs}s</p>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>
            <span className="dot">{i < idx ? "✓" : i === idx ? <i className="spin" /> : ""}</span>{s}
          </li>
        ))}
      </ol>
      <div className="live">
        <div className="live-title">Extracted data</div>
        {rows.length === 0 && <div className="live-wait"><Sk w="60%" /><Sk w="45%" /><Sk w="52%" /></div>}
        {rows.map(([k, v], i) => (
          <div key={k} className="live-row" style={{ animationDelay: `${i * 120}ms` }}>
            <span>{k}</span><b>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Report({ review, onClose }) {
  const score = useCount(Math.max(0, Math.min(100, review.score ?? 0)));
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const icon = { good: "✓", improve: "!", missing: "✕" };
  return (
    <div className="panel report">
      <div className="score-row">
        <div className="ring" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #dfe6f1 0)` }}>
          <div><b>{score}</b><small>/ 100</small></div>
        </div>
        <div>
          <h3>Resume score</h3>
          <p className="muted">{review.improvements?.length || 0} improvements suggested</p>
        </div>
      </div>

      <div className="checks">
        {(review.sections || []).map((s) => (
          <div key={s.name} className={`check ${s.status}`}>
            <span className="ci">{icon[s.status] || "!"}</span>
            <div><b>{s.name}</b><small>{s.note}</small></div>
          </div>
        ))}
      </div>

      <div className="live-title" style={{ marginTop: 18 }}>How to improve</div>
      <ul className="imps">
        {(review.improvements || []).map((x, i) => (
          <li key={i} style={{ animationDelay: `${i * 90}ms` }}>
            <span className={`pri ${x.priority}`}>{x.priority}</span>
            <div><b>{x.title}</b><p>{x.detail}</p></div>
          </li>
        ))}
      </ul>
      <button className="btn" onClick={onClose}>Done — match with jobs</button>
    </div>
  );
}

export default function ParseModal({ run, onClose }) {
  const { file, phase, resume, review, error } = run;
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const working = phase === "parsing" || phase === "reviewing";
  const tags = tagsFor(resume, review);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        <div className="stage">
          <div className="paper">
            <Sheet file={file} resume={resume} scanning={working} />
            {tags.map((t, i) => (
              <span key={t.label} className={`tag ${t.ok ? "ok" : "warn"} ${i % 2 ? "r" : "l"}`}
                style={{ "--y": `${10 + i * 17}%`, animationDelay: `${i * 160}ms` }}>
                <i>{t.ok ? "✓" : "!"}</i>{t.label}
              </span>
            ))}
          </div>
        </div>
        {working && <Progress phase={phase} resume={resume} />}
        {phase === "done" && review && <Report review={review} onClose={onClose} />}
        {phase === "error" && (
          <div className="panel">
            <h3>Something went wrong</h3>
            <p className="error">{error}</p>
            {resume && <p className="muted">Your resume was saved — only the review step failed.</p>}
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
