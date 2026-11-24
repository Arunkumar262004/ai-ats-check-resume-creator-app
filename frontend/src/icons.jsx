// Small inline SVG icon set (stroke icons, inherit currentColor) — no dependency needed.
const P = {
  upload: "M12 16V4m0 0L7 9m5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6",
  briefcase: "M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3",
  plus: "M12 5v14M5 12h14",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  volume: "M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18 5.5a9 9 0 0 1 0 13",
  play: "M7 4.5v15l12-7.5-12-7.5Z",
  stop: "M6 6h12v12H6z",
  eye:"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  download:"M12 4v12m0 0 5-5m-5 5-5-5M4 20h16",
  wand: "M15 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2ZM4 20 15 9m-3 0 3 3M6 6l.7 1.3L8 8l-1.3.7L6 10l-.7-1.3L4 8l1.3-.7L6 6Z",
  cursor:"M5 4l14 6-6 2-2 6L5 4Z",
};

export const Icon = ({ name, size = 18, className = "" }) => (
  <svg className={`ico ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={P[name]} />
  </svg>
);
