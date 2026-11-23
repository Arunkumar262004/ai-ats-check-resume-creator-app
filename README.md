# AI Resume Analyzer & Job Matcher

Python (FastAPI) · SQLite (cosine search in Python) · RAG · Claude LLM · React (Vite)

## How it works
1. **Upload resume** → text extracted (PDF/DOCX/TXT) → LLM parses structured data (skills, experience) → text chunked, embedded (sentence-transformers) and stored in SQLite.
2. **Add job** → LLM extracts required/nice-to-have skills → embedded and stored.
3. **Matching** → cosine search, blended with skill overlap (60% semantic / 40% skills). Works both ways: best jobs for a resume, best candidates for a job.
4. **RAG analysis** → for each job requirement, top resume chunks are retrieved by cosine similarity; the LLM judges fit using only that evidence (strengths, gaps, resume tips, interview questions).

## Run
```powershell
# No database server needed: SQLite file backend/resume.db is created on first start

cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env                     # then set ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000

cd ..\frontend
npm install
npm run dev                                # http://localhost:5173
```
First upload downloads the embedding model (~90 MB). API docs: http://localhost:8000/docs
