// Six resume templates. "classic" reproduces the layout of the uploaded resume; the other five are new designs.
// One <ResumeDoc> component renders any template from the same structured data.

export const TEMPLATES = [
  { key: "classic", name: "Classic", note: "Your original layout", layout: "single", skills: "table", fullBleed: false },
  { key: "executive", name: "Executive", note: "Serif, formal", layout: "single", skills: "table", fullBleed: false },
  { key: "minimal", name: "Minimal", note: "Clean & airy", layout: "single", skills: "table", fullBleed: false },
  { key: "banner", name: "Bold Banner", note: "Colour header", layout: "single", skills: "chips", fullBleed: true },
  { key: "sidebar", name: "Modern Sidebar", note: "Two columns", layout: "sidebar", skills: "chips", fullBleed: true },
  { key: "timeline", name: "Timeline", note: "Career timeline", layout: "single", skills: "chips", fullBleed: false },
];

const Bullets = ({ items = [] }) =>
  items.length ? <ul className="r-ul">{items.map((b, i) => <li key={i}>{b}</li>)}</ul> : null;

function Skills({ groups, mode }) {
  if (mode === "chips") {
    return (
      <div className="r-skills chips">
        {groups.map((g, i) => (
          <div key={i} className="r-sg">
            <b>{g.group}</b>
            <div className="r-chips">{g.items.map((s, k) => <span key={k} className={g.extra ? "added" : ""}>{s}</span>)}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="r-skills table">
      {groups.map((g, i) => (
        <div key={i} className="r-sg">
          <b>{g.group}</b>
          <span>{g.items.map((s, k) => (
            <span key={k} className={g.extra ? "added" : ""}>{s}{k < g.items.length - 1 ? ", " : ""}</span>
          ))}</span>
        </div>
      ))}
    </div>
  );
}

const Experience = ({ list = [] }) => list.map((x, i) => (
  <div key={i} className="r-item">
    <div className="r-row"><b>{[x.title, x.company].filter(Boolean).join(" — ")}{x.location ? `, ${x.location}` : ""}</b><span className="r-date">{x.period}</span></div>
    <Bullets items={x.bullets} />
  </div>
));

const Projects = ({ list = [] }) => list.map((p, i) => (
  <div key={i} className="r-item">
    <div className="r-row"><b>{p.name}</b><span className="r-date">{p.link}</span></div>
    {p.tech && <div className="r-tech">{p.tech}</div>}
    <Bullets items={p.bullets} />
  </div>
));

const Education = ({ list = [] }) => list.map((e, i) => (
  <div key={i} className="r-row r-edu"><span><b>{e.degree}</b>{e.institution ? ` — ${e.institution}` : ""}</span><span className="r-date">{e.period}</span></div>
));

export function ResumeDoc({ data, added = [], template = "classic" }) {
  const t = TEMPLATES.find((x) => x.key === template) || TEMPLATES[0];
  const d = data || {};
  const groups = [...(d.skill_groups || [])];
  if (added.length) groups.push({ group: "Additional Skills", items: added, extra: true });
  const contact = [d.contact?.phone, d.contact?.email, d.contact?.location].filter(Boolean);
  const links = d.links || [];

  if (t.layout === "sidebar") {
    return (
      <div className={`rdoc t-${t.key}`}>
        <aside className="r-side">
          <div className="r-avatar">{(d.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
          <h3>Contact</h3>
          <div className="r-contact">{contact.map((c, i) => <div key={i}>{c}</div>)}{links.map((l, i) => <div key={"l" + i}>{l}</div>)}</div>
          <h3>Skills</h3>
          <Skills groups={groups} mode="chips" />
          {d.education?.length > 0 && <><h3>Education</h3><div className="r-edu-side">{d.education.map((e, i) => (
            <div key={i}><b>{e.degree}</b><div>{e.institution}</div><div className="r-date">{e.period}</div></div>
          ))}</div></>}
        </aside>
        <main className="r-main">
          <h1>{d.name}</h1>
          <div className="r-title">{d.headline}</div>
          {d.summary && <section className="r-sec"><h2>Profile</h2><p>{d.summary}</p></section>}
          {d.experience?.length > 0 && <section className="r-sec"><h2>Experience</h2><Experience list={d.experience} /></section>}
          {d.projects?.length > 0 && <section className="r-sec"><h2>Projects</h2><Projects list={d.projects} /></section>}
        </main>
      </div>
    );
  }

  return (
    <div className={`rdoc t-${t.key}`}>
      <header className="r-head">
        <h1>{d.name}</h1>
        <div className="r-title">{d.headline}</div>
        <div className="r-contact">{contact.join("  |  ")}</div>
        {links.length > 0 && <div className="r-links">{links.join("  |  ")}</div>}
      </header>
      <div className="r-body">
        {d.summary && <section className="r-sec"><h2>Professional Summary</h2><p>{d.summary}</p></section>}
        {groups.length > 0 && <section className="r-sec"><h2>Core Skills</h2><Skills groups={groups} mode={t.skills} /></section>}
        {d.experience?.length > 0 && <section className="r-sec tl"><h2>Work Experience</h2><Experience list={d.experience} /></section>}
        {d.projects?.length > 0 && <section className="r-sec"><h2>Projects</h2><Projects list={d.projects} /></section>}
        {d.education?.length > 0 && <section className="r-sec"><h2>Education</h2><Education list={d.education} /></section>}
      </div>
    </div>
  );
}
