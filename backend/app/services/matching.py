from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Job, Resume, ResumeChunk
from . import llm
from .embeddings import embed, embed_one

SEM_WEIGHT = 0.6
SKILL_WEIGHT = 0.4


def _norm(skills) -> set[str]:
    return {s.strip().lower() for s in (skills or []) if isinstance(s, str) and s.strip()}


def semantic_score(cosine_distance: float) -> float:
    """Map cosine similarity (MiniLM docs typically land in 0.2-0.7) to 0..1."""
    sim = 1 - cosine_distance
    return max(0.0, min(1.0, (sim - 0.2) / 0.5))


def skill_overlap(resume_parsed: dict, job_parsed: dict) -> tuple[float, list[str], list[str]]:
    have = _norm(resume_parsed.get("skills"))
    req = _norm(job_parsed.get("required_skills"))
    nice = _norm(job_parsed.get("nice_to_have_skills"))
    matched = sorted(req & have)
    missing = sorted(req - have)
    if not req and not nice:
        return 0.0, matched, missing
    # required skills count double vs nice-to-have
    total = 2 * len(req) + len(nice)
    got = 2 * len(req & have) + len(nice & have)
    return got / total, matched, missing


def combine(sem: float, skill: float) -> int:
    return round(100 * (SEM_WEIGHT * sem + SKILL_WEIGHT * skill))


def cosine_distance(a, b) -> float:
    """Embeddings are L2-normalized, so cosine similarity is the dot product."""
    if a is None or b is None:
        return 1.0
    return 1 - sum(x * y for x, y in zip(a, b))


def rank_jobs_for_resume(db: Session, resume: Resume, limit: int = 20) -> list[dict]:
    rows = sorted(
        ((j, cosine_distance(j.embedding, resume.embedding)) for j in db.scalars(select(Job))),
        key=lambda t: t[1],
    )[:limit]
    out = []
    for job, d in rows:
        sem = semantic_score(d)
        skill, matched, missing = skill_overlap(resume.parsed, job.parsed)
        out.append({
            "job_id": job.id, "title": job.title, "company": job.company,
            "score": combine(sem, skill), "semantic": round(sem, 3), "skill_match": round(skill, 3),
            "matched_skills": matched, "missing_skills": missing,
        })
    return sorted(out, key=lambda x: -x["score"])


def rank_resumes_for_job(db: Session, job: Job, limit: int = 20) -> list[dict]:
    rows = sorted(
        ((r, cosine_distance(r.embedding, job.embedding)) for r in db.scalars(select(Resume))),
        key=lambda t: t[1],
    )[:limit]
    out = []
    for r, d in rows:
        sem = semantic_score(d)
        skill, matched, missing = skill_overlap(r.parsed, job.parsed)
        out.append({
            "resume_id": r.id, "name": r.parsed.get("name") or r.filename, "filename": r.filename,
            "score": combine(sem, skill), "semantic": round(sem, 3), "skill_match": round(skill, 3),
            "experience_years": r.parsed.get("total_experience_years"),
            "matched_skills": matched, "missing_skills": missing,
        })
    return sorted(out, key=lambda x: -x["score"])


def retrieve_evidence(db: Session, resume_id: int, job: Job, k: int = 2) -> list[dict]:
    """RAG retrieval: for each job requirement, pull top-k resume chunks by cosine similarity."""
    p = job.parsed or {}
    reqs = (p.get("required_skills") or [])[:10] + (p.get("responsibilities") or [])[:4]
    if not reqs:
        reqs = [job.title]
    vecs = embed(reqs)
    evidence = []
    for req, v in zip(reqs, vecs):
        chunks = db.scalars(select(ResumeChunk).where(ResumeChunk.resume_id == resume_id)).all()
        top = sorted(chunks, key=lambda c: cosine_distance(c.embedding, v))[:k]
        evidence.append({"requirement": req, "passages": [c.content for c in top]})
    return evidence


def analyze(db: Session, resume: Resume, job: Job) -> dict:
    evidence = retrieve_evidence(db, resume.id, job)
    result = llm.analyze_match({"title": job.title, "company": job.company, "parsed": job.parsed}, evidence)
    dist = 1 - float(
        sum(a * b for a, b in zip(resume.embedding, job.embedding))
    )
    sem = semantic_score(dist)
    skill, matched, missing = skill_overlap(resume.parsed, job.parsed)
    result["vector_score"] = combine(sem, skill)
    result["evidence"] = evidence
    return result
