import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { api } from "./api.js";
import { Icon } from "./icons.jsx";
import AiLoader from "./AiLoader.jsx";
import { ResumeDoc, TEMPLATES } from "./resumeTemplates.jsx";
import resumeCss from "./resume.css?raw";
import "./resume.css";
import "./studio.css";

const ACRONYMS = /^(css|html|es\d+|api|apis|sql|aws|ui|ux|rest|jwt|orm|sdk|ci\/cd|ci|cd|llm|llms|rag|ai|seo|json|xml|oop|tdd)$/i;
const pretty = (s) =>
  s.split(/(\s+|-)/).map((w) => (ACRONYMS.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join("");

const PAGE_W = 794;

export default function ResumeStudio({ resumeId, jobTitle, missing = [], mode = "generate", onClose }) {
  const viewOnly = mode === "view";
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tpl, setTpl] = useState("classic");
  const [off, setOff] = useState(() => new Set()); // skills the user un-ticked
  const [scale, setScale] = useState(1);
  const box = useRef(null);

  useEffect(() => {
    let live = true;
    api.structuredResume(resumeId).then((d) => live && setData(d)).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [resumeId]);

  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  // skills not already on the resume
  const candidates = useMemo(() => {
    if (!data) return [];
    const have = new Set((data.skill_groups || []).flatMap((g) => g.items).map((s) => s.toLowerCase()));
    return [...new Set(missing.map(pretty))].filter((s) => !have.has(s.toLowerCase()));
  }, [data, missing]);
  const added = candidates.filter((s) => !off.has(s));

  // fit the A4 page to the preview width
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, (e.contentRect.width - 32) / PAGE_W)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [data]);

  const toggle = (s) => setOff((o) => { const n = new Set(o); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const download = () => {
    const name = `${(data.name || "Resume").trim().replace(/\s+/g, "_")}_Resume`;
    const t = TEMPLATES.find((x) => x.key === tpl);
    const body = renderToStaticMarkup(<ResumeDoc data={data} added={added} template={tpl} />);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>
      @page { size:A4; margin:${t.fullBleed ? "0" : "10mm 0"}; } html,body{margin:0;background:#fff}
      ${resumeCss}</style></head><body>${body}</body></html>`;
    const f = document.createElement("iframe");
    f.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;height:1123px;border:0`;
    f.srcdoc = html;
    f.onload = () => {
      const oldTitle = document.title;
      document.title = name; // Chrome uses this as the suggested PDF file name
      const w = f.contentWindow;
      w.onafterprint = () => { document.title = oldTitle; setTimeout(() => f.remove(), 500); };
      w.focus(); w.print();
    };
    document.body.appendChild(f);
  };

  if (err) {
    return (
      <div className="overlay"><div className="ai-card"><h3>Couldn't prepare the resume</h3><p className="error">{err}</p><button className="btn" onClick={onClose}>Close</button></div></div>
    );
  }
  if (!data) {
    return (
      <AiLoader
        title="Preparing your resume"
        chips={["Summary", "Skills", "Experience", "Projects"]}
        messages={["Reading your resume section by section…", "Keeping your original wording…", "Getting the templates ready…"]}
      />
    );
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="studio" role="dialog" aria-modal="true">
        <button className="x" onClick={onClose} aria-label="Close">✕</button>

        <aside className="st-side">
          <h3>{viewOnly ? "Your resume" : "Generate tailored resume"}</h3>
          <p className="muted">
            {viewOnly ? <>Shown in the <b>Classic</b> layout of your upload. Try another template or download a PDF.</>
              : jobTitle ? <>For <b>{jobTitle}</b></> : "For the selected job"}
          </p>

          {!viewOnly && <div className="st-label">1 · Skills to add <small>({added.length} of {candidates.length})</small></div>}
          {!viewOnly && (candidates.length ? (
            <>
              <div className="st-skills">
                {candidates.map((s) => (
                  <button key={s} className={`st-skill ${off.has(s) ? "off" : "on"}`} onClick={() => toggle(s)}>
                    <Icon name={off.has(s) ? "plus" : "check"} size={12} />{s}
                  </button>
                ))}
              </div>
              <p className="st-warn">Add only skills you really have or can talk about in an interview. Added skills are highlighted yellow in the preview (not in the PDF) under “Additional Skills”.</p>
            </>
          ) : <p className="muted">Nothing to add — your resume already lists every skill this job asks for.</p>)}

          <div className="st-label">{viewOnly ? "Template" : "2 · Choose a template"}</div>
          <div className="tpl-grid">
            {TEMPLATES.map((t) => (
              <button key={t.key} className={`tpl ${tpl === t.key ? "on" : ""}`} onClick={() => setTpl(t.key)}>
                <span className="tpl-thumb"><span style={{ zoom: 0.17, display: "block" }}><ResumeDoc data={data} added={added} template={t.key} /></span></span>
                <b>{t.name}</b><small>{t.note}</small>
              </button>
            ))}
          </div>

          <button className="btn st-dl" onClick={download}><Icon name="download" size={16} />Download PDF</button>
          <small className="st-hint">Opens your print dialog — choose “Save as PDF”. The PDF keeps real, selectable text.</small>
        </aside>

        <section className="st-preview" ref={box}>
          <div className="st-paper" style={{ zoom: scale }}>
            <ResumeDoc data={data} added={added} template={tpl} />
          </div>
        </section>
      </div>
    </div>
  );
}
