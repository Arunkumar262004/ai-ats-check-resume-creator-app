import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { englishVoices, loadVoices, pickMaleVoice, saveVoice, savedVoice, speak, stopSpeaking, supported } from "./voice.js";
import "./voice.css";

// Each step: what the narrator says + which section of the page to highlight.
const STEPS = [
  { title: "Welcome", target: null,
    say: "Hello, and welcome to the Resume Analyzer and Job Matcher. I'll walk you through it in six quick steps." },
  { title: "Upload your resume", target: "sec-resumes",
    say: "Step one. Upload your resume. Click the upload box and choose a PDF, Word, or text file. The AI reads it, picks out your skills and experience, and then gives you a score with clear tips to improve." },
  { title: "Add a job", target: "sec-jobs",
    say: "Step two. Add a job. Type the job title and the company, paste the full job description, and click Add job. The AI pulls out the skills the employer is looking for." },
  { title: "Check the match", target: "sec-matches",
    say: "Step three. Select your resume and your job, then click Check match. You'll see a percentage score. Skills in green are the ones you already have, and skills in red are the ones you're missing." },
  { title: "AI analysis", target: "sec-matches",
    say: "Step four. Click A I analysis on a job. You'll get a friendly explanation of exactly where you need to improve, with the reason each skill matters and how to show it on your resume." },
  { title: "Generate your resume", target: "sec-matches",
    say: "Step five. Click Generate resume. Choose which missing skills to add. Please add only the skills you genuinely have. Then pick one of the six templates and watch the preview update live." },
  { title: "Download the PDF", target: "sec-matches",
    say: "Step six. Click Download PDF, and choose Save as PDF in the print window. Your tailored resume is ready to send. Good luck with the application!" },
];

function focusSection(id) {
  document.querySelectorAll(".guide-focus").forEach((el) => el.classList.remove("guide-focus"));
  if (!id) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const el = document.getElementById(id);
  if (el) { el.classList.add("guide-focus"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
}

export default function VoiceGuide() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState(savedVoice());
  const [rate, setRate] = useState(0.95);
  const live = useRef({ playing: false, rate: 0.95, voice: null });

  useEffect(() => { loadVoices().then((v) => { const en = englishVoices(v); setVoices(en); if (!savedVoice()) { const m = pickMaleVoice(v); if (m) setVoiceName(m.name); } }); }, []);
  const currentVoice = () => voices.find((v) => v.name === voiceName) || null;
  useEffect(() => { live.current.voice = currentVoice(); live.current.rate = rate; }, [voices, voiceName, rate]);

  const stop = useCallback(() => {
    live.current.playing = false; setPlaying(false); stopSpeaking(); focusSection("__none__");
    document.querySelectorAll(".guide-focus").forEach((el) => el.classList.remove("guide-focus"));
  }, []);

  const playStep = useCallback((i) => {
    if (i >= STEPS.length) { stop(); setStep(0); return; }
    live.current.playing = true; setPlaying(true); setStep(i);
    focusSection(STEPS[i].target);
    speak(STEPS[i].say, {
      voice: live.current.voice, rate: live.current.rate,
      onend: () => { if (live.current.playing) setTimeout(() => live.current.playing && playStep(i + 1), 500); },
      onerror: () => stop(),
    });
  }, [stop]);

  useEffect(() => () => { stopSpeaking(); }, []);

  if (!supported) return null;

  return (
    <>
      <button className={`vg-fab ${playing ? "on" : ""}`} onClick={() => setOpen(!open)} aria-label="Voice guide">
        <Icon name="volume" size={20} /><span>{playing ? "Speaking…" : "Voice guide"}</span>
      </button>

      {open && (
        <div className="vg-panel" role="dialog" aria-label="Voice guide">
          <div className="vg-head">
            <b><Icon name="volume" size={16} /> Voice guide</b>
            <button className="vg-x" onClick={() => { stop(); setOpen(false); }} aria-label="Close">✕</button>
          </div>
          <p className="vg-sub">A calm male voice explains each step and highlights where to look.</p>

          <ol className="vg-steps">
            {STEPS.map((s, i) => (
              <li key={i} className={i === step ? (playing ? "now" : "sel") : i < step && playing ? "done" : ""}>
                <button onClick={() => playStep(i)}><span className="vg-n">{i === 0 ? "★" : i}</span>{s.title}</button>
              </li>
            ))}
          </ol>

          <div className="vg-ctl">
            {playing
              ? <button className="btn small" onClick={stop}><Icon name="stop" size={14} />Stop</button>
              : <button className="btn small" onClick={() => playStep(step)}><Icon name="play" size={14} />{step ? "Play from step " + step : "Start guide"}</button>}
            <button className="btn small ghost" disabled={step === 0} onClick={() => playStep(step - 1)}>Prev</button>
            <button className="btn small ghost" disabled={step >= STEPS.length - 1} onClick={() => playStep(step + 1)}>Next</button>
          </div>

          <div className="vg-opts">
            <label>Voice
              <select value={voiceName} onChange={(e) => { setVoiceName(e.target.value); saveVoice(e.target.value); }}>
                {voices.map((v) => <option key={v.name} value={v.name}>{v.name.replace(/^Microsoft |^Google /, "")} ({v.lang})</option>)}
              </select>
            </label>
            <label>Speed
              <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
                <option value={0.8}>Slow</option><option value={0.95}>Normal</option><option value={1.12}>Fast</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </>
  );
}

/** Small "Listen" button that reads any text aloud in the chosen male voice. */
export function ListenButton({ text, label = "Listen" }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!supported) return null;
  const toggle = () => {
    if (on) { stopSpeaking(); setOn(false); return; }
    setOn(true);
    speak(text, { onend: () => setOn(false), onerror: () => setOn(false) });
  };
  return (
    <button className="listen-btn" onClick={toggle} title="Read this aloud">
      <Icon name={on ? "stop" : "volume"} size={14} />{on ? "Stop" : label}
    </button>
  );
}
