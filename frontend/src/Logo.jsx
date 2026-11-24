// App logo: blue robot head (antenna, ears, navy screen face, happy eyes). Pure SVG so it stays sharp at any size.
export default function Logo({ size = 42 }) {
  return (
    <svg className="logo-svg" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Resume Analyzer logo">
      <line x1="32" y1="11" x2="32" y2="20" stroke="#2b7de9" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="32" cy="8.5" r="4.6" fill="#2b7de9" />
      <rect x="3" y="32" width="8" height="15" rx="4" fill="#2b7de9" />
      <rect x="53" y="32" width="8" height="15" rx="4" fill="#2b7de9" />
      <rect x="9" y="19" width="46" height="38" rx="15" fill="#2b7de9" />
      <rect x="14.5" y="25" width="35" height="26" rx="11" fill="#0f2a5c" />
      <path d="M21.5 38.5 q4.5 -6 9 0" fill="none" stroke="#8fdcff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M33.5 38.5 q4.5 -6 9 0" fill="none" stroke="#8fdcff" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
