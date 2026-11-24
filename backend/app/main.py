from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db, init_db
from .models import Job, Resume, ResumeChunk
from .services import llm, matching
from .services.embeddings import embed, embed_one
from .services.extract import chunk_text, extract_text


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="AI Resume Analyzer & Job Matcher", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resume_out(r: Resume, full: bool = False) -> dict:
    d = {
        "id": r.id, "filename": r.filename, "created_at": r.created_at,
        "name": r.parsed.get("name"), "skills": r.parsed.get("skills", []),
        "experience_years": r.parsed.get("total_experience_years"),
    }
    if full:
        d.update(parsed=r.parsed, text=r.text)
    return d


def _job_out(j: Job, full: bool = False) -> dict:
    d = {
        "id": j.id, "title": j.title, "company": j.company, "created_at": j.created_at,
        "required_skills": j.parsed.get("required_skills", []),
    }
    if full:
        d.update(parsed=j.parsed, description=j.description)
    return d


# ---------- Resumes ----------
@app.post("/api/resumes")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await file.read()
    try:
        text = extract_text(file.filename or "resume", data)
    except ValueError as e:
        raise HTTPException(400, str(e))

    def work() -> Resume:
        parsed = llm.parse_resume(text)
        chunks = chunk_text(text)
        vecs = embed(chunks)
        # embed a compact profile for whole-document matching
        profile = f"{parsed.get('summary', '')}\nSkills: {', '.join(parsed.get('skills', []))}\n{text[:2000]}"
        r = Resume(filename=file.filename, text=text, parsed=parsed, embedding=embed_one(profile))
        r.chunks = [ResumeChunk(idx=i, content=c, embedding=v) for i, (c, v) in enumerate(zip(chunks, vecs))]
        db.add(r)
        db.commit()
        return r

    try:
        r = await run_in_threadpool(work)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    return _resume_out(r, full=True)


@app.get("/api/resumes")
def list_resumes(db: Session = Depends(get_db)):
    return [_resume_out(r) for r in db.scalars(select(Resume).order_by(Resume.id.desc()))]


@app.get("/api/resumes/{rid}")
def get_resume(rid: int, db: Session = Depends(get_db)):
    r = db.get(Resume, rid)
    if not r:
        raise HTTPException(404, "Resume not found")
    return _resume_out(r, full=True)


@app.delete("/api/resumes/{rid}")
def delete_resume(rid: int, db: Session = Depends(get_db)):
    r = db.get(Resume, rid)
    if not r:
        raise HTTPException(404, "Resume not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


@app.post("/api/resumes/{rid}/review")
async def review_resume(rid: int, db: Session = Depends(get_db)):
    r = db.get(Resume, rid)
    if not r:
        raise HTTPException(404, "Resume not found")
    try:
        return await run_in_threadpool(llm.review_resume, r.text, r.parsed)
    except (RuntimeError, ValueError) as e:
        raise HTTPException(500, str(e))


@app.post("/api/resumes/{rid}/structured")
async def structured_resume(rid: int, db: Session = Depends(get_db)):
    """Section-by-section version of the resume for the template generator (cached after first call)."""
    r = db.get(Resume, rid)
    if not r:
        raise HTTPException(404, "Resume not found")
    cached = (r.parsed or {}).get("structured")
    if cached:
        return cached
    try:
        data = await run_in_threadpool(llm.structure_resume, r.text)
    except (RuntimeError, ValueError) as e:
        raise HTTPException(500, str(e))
    r.parsed = {**(r.parsed or {}), "structured": data}  # reassign so SQLAlchemy sees the JSON change
    db.commit()
    return data


@app.get("/api/resumes/{rid}/matches")
def resume_matches(rid: int, db: Session = Depends(get_db)):
    r = db.get(Resume, rid)
    if not r:
        raise HTTPException(404, "Resume not found")
    return matching.rank_jobs_for_resume(db, r)


# ---------- Jobs ----------
class JobIn(BaseModel):
    title: str
    company: str = ""
    description: str


@app.post("/api/jobs")
def create_job(body: JobIn, db: Session = Depends(get_db)):
    try:
        parsed = llm.parse_job(body.title, body.description)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    text = f"{body.title}\n{body.description[:2000]}\nSkills: {', '.join(parsed.get('required_skills', []))}"
    j = Job(
        title=body.title, company=body.company, description=body.description,
        parsed=parsed, embedding=embed_one(text),
    )
    db.add(j)
    db.commit()
    return _job_out(j, full=True)


@app.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
    return [_job_out(j) for j in db.scalars(select(Job).order_by(Job.id.desc()))]


@app.get("/api/jobs/{jid}")
def get_job(jid: int, db: Session = Depends(get_db)):
    j = db.get(Job, jid)
    if not j:
        raise HTTPException(404, "Job not found")
    return _job_out(j, full=True)


@app.delete("/api/jobs/{jid}")
def delete_job(jid: int, db: Session = Depends(get_db)):
    j = db.get(Job, jid)
    if not j:
        raise HTTPException(404, "Job not found")
    db.delete(j)
    db.commit()
    return {"ok": True}


@app.get("/api/jobs/{jid}/candidates")
def job_candidates(jid: int, db: Session = Depends(get_db)):
    j = db.get(Job, jid)
    if not j:
        raise HTTPException(404, "Job not found")
    return matching.rank_resumes_for_job(db, j)


# ---------- RAG analysis ----------
class AnalyzeIn(BaseModel):
    resume_id: int
    job_id: int


@app.post("/api/analyze")
async def analyze(body: AnalyzeIn, db: Session = Depends(get_db)):
    r, j = db.get(Resume, body.resume_id), db.get(Job, body.job_id)
    if not r or not j:
        raise HTTPException(404, "Resume or job not found")
    try:
        return await run_in_threadpool(matching.analyze, db, r, j)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
