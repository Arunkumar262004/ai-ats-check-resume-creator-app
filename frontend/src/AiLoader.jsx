import { useEffect, useState } from "react";
import { Icon } from "./icons.jsx";
import "./modal.css"; // shared .overlay + pop animation
import "./loader.css";

/* Friendly animated robot (pure SVG + CSS). */
function Robot() {
  return (
    <svg className="robot" viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <linearGradient id="rbHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#dbe7f8" /></linearGradient>
        <linearGradient id="rbBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5aa9ee" /><stop offset="1" stopColor="#245a98" /></linearGradient>
        <radialGradient id="rbGlow"><stop offset="0" stopColor="#67e8f9" /><stop offset="1" stopColor="#67e8f9" stopOpacity="0" /></radialGradient>
      </defs>
      {/* ground shadow */}
      <ellipse className="rb-shadow" cx="60" cy="134" rx="26" ry="4" fill="#2f6db5" opacity=".18" />
      {/* antenna */}
      <line x1="60" y1="30" x2="60" y2="17" stroke="#8cc4f5" strokeWidth="3" strokeLinecap="round" />
      <circle className="rb-glow" cx="60" cy="13" r="9" fill="url(#rbGlow)" />
      <circle className="rb-tip" cx="60" cy="13" r="4.5" fill="#22d3ee" />
      {/* arms */}
      <rect x="20" y="92" width="11" height="28" rx="5.5" fill="#3d8bd9" />
      <g className="rb-wave"><rect x="89" y="92" width="11" height="28" rx="5.5" fill="#3d8bd9" /><circle cx="94.5" cy="121" r="6" fill="#c5dcf5" /></g>
      <circle cx="25.5" cy="121" r="6" fill="#c5dcf5" />
      {/* body */}
      <rect x="32" y="84" width="56" height="44" rx="16" fill="url(#rbBody)" />
      <rect x="45" y="96" width="30" height="20" rx="8" fill="#1b2d52" opacity=".55" />
      <g className="rb-lights"><circle cx="52" cy="106" r="3" fill="#22d3ee" /><circle cx="60" cy="106" r="3" fill="#fbbf24" /><circle cx="68" cy="106" r="3" fill="#f472b6" /></g>
      {/* neck + head */}
      <rect x="53" y="78" width="14" height="9" rx="3" fill="#8cc4f5" />
      <rect x="16" y="46" width="9" height="20" rx="4.5" fill="#5aa9ee" />
      <rect x="95" y="46" width="9" height="20" rx="4.5" fill="#5aa9ee" />
      <rect x="24" y="28" width="72" height="54" rx="20" fill="url(#rbHead)" stroke="#8cc4f5" strokeWidth="2" />
      <rect x="32" y="38" width="56" height="34" rx="14" fill="#0b1226" />
      <g className="rb-eyes">
        <ellipse className="rb-eye" cx="48" cy="54" rx="6.5" ry="8" fill="#67e8f9" />
        <ellipse className="rb-eye" cx="72" cy="54" rx="6.5" ry="8" fill="#67e8f9" />
      </g>
      <path d="M52 65 Q60 70.5 68 65" stroke="#67e8f9" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="39" cy="63" r="3" fill="#f472b6" opacity=".45" /><circle cx="81" cy="63" r="3" fill="#f472b6" opacity=".45" />
    </svg>
  );
}

/* Blurred popup with an animated robot illustration, rotating status lines and a loading bar. */
export default function AiLoader({ title, messages = [], chips = [] }) {
  const [i, setI] = useState(0);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % Math.max(messages.length, 1)), 2200);
    const s = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => { clearInterval(t); clearInterval(s); };
  }, [messages.length]);

  return (
    <div className="overlay">
      <div className="ai-card" role="dialog" aria-modal="true" aria-busy="true">
        <div className="orb-wrap">
          <span className="pulse p1" /><span className="pulse p2" /><span className="pulse p3" />
          <div className="orbit o1"><i /></div>
          <div className="orbit o2"><i /></div>
          <div className="orbit o3"><i /></div>
          <Robot />
          {chips.map((c, k) => (
            <span key={c} className={`float-chip fc${k % 4}`} style={{ animationDelay: `${k * 0.7}s` }}>{c}</span>
          ))}
        </div>
        <h3>{title}</h3>
        <p className="ai-msg" key={i}>{messages[i] || "Working…"}</p>
        <div className="bar"><span /></div>
        <small className="ai-time">{secs}s · this can take a few seconds</small>
      </div>
    </div>
  );
}
