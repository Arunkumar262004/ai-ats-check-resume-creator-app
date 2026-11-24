import json
import re
import time
from datetime import date

import anthropic

from ..config import settings

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set in backend/.env")
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


_gemini = None


def _complete_gemini(system: str, user: str, max_tokens: int) -> str:
    global _gemini
    from google import genai
    from google.genai import types

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    if _gemini is None:
        _gemini = genai.Client(api_key=settings.gemini_api_key)
    last = None
    for attempt in range(5):
        try:
            r = _gemini.models.generate_content(
                model=settings.gemini_model,
                contents=user,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    # thinking tokens count against the limit, so leave generous headroom
                    max_output_tokens=max(max_tokens, 8192),
                ),
            )
            return r.text or ""
        except Exception as e:  # retry on overload / rate limit
            last = e
            if any(c in str(e) for c in ("503", "429", "500")):
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"Gemini error: {str(e)[:300]}")
    raise RuntimeError(f"Gemini unavailable after retries: {str(last)[:200]}")


def complete(system: str, user: str, max_tokens: int = 2000) -> str:
    if settings.llm_provider == "gemini":
        return _complete_gemini(system, user, max_tokens)
    resp = _get_client().messages.create(
        model=settings.llm_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if b.type == "text")


def complete_json(system: str, user: str, max_tokens: int = 2000) -> dict:
    raw = complete(system + "\nRespond with a single valid JSON object only, no prose.", user, max_tokens)
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        raise ValueError(f"LLM returned no JSON (got: {raw[:200]!r})")
    return json.loads(m.group(0))


RESUME_SCHEMA = """{
  "name": str, "email": str, "phone": str, "summary": str,
  "skills": [str],            // normalized, lowercase technical & soft skills
  "total_experience_years": number,
  "education": [{"degree": str, "institution": str, "year": str}],
  "experience": [{"title": str, "company": str, "duration": str, "highlights": [str]}]
}"""

JOB_SCHEMA = """{
  "required_skills": [str],   // normalized, lowercase
  "nice_to_have_skills": [str],
  "min_experience_years": number,
  "seniority": str,
  "responsibilities": [str]
}"""


def parse_resume(text: str) -> dict:
    return complete_json(
        f"You extract structured data from resumes. Use this schema (empty values if unknown):\n{RESUME_SCHEMA}",
        text[:12000],
    )


def parse_job(title: str, description: str) -> dict:
    return complete_json(
        f"You extract structured requirements from job postings. Use this schema:\n{JOB_SCHEMA}",
        f"Title: {title}\n\n{description[:8000]}",
    )


def analyze_match(job: dict, requirement_evidence: list[dict]) -> dict:
    """RAG step: the LLM only sees the resume passages retrieved for each job requirement."""
    system = (
        "You are a rigorous technical recruiter. Judge the candidate ONLY from the evidence "
        "passages provided; do not invent experience. Schema:\n"
        '{"fit_score": int 0-100, "verdict": "strong|good|partial|weak", "summary": str,'
        ' "strengths": [str], "gaps": [str], "matched_skills": [str], "missing_skills": [str],'
        ' "resume_suggestions": [str], "interview_questions": [str],'
        ' "improvement_plan": {"intro": str, "skills_to_add": [{"skill": str, "why": str, "how": str}]}}\n'
        "improvement_plan is written TO the candidate in a warm, plain, human voice (use 'you' and 'your resume'). "
        "intro: 2-3 sentences saying honestly where they stand for this job and what to improve first. "
        "skills_to_add: up to 6 of the most important missing skills; 'why' = one sentence on why this job needs it; "
        "'how' = one concrete sentence on how to show it on the resume (e.g. which section or project to mention it in). "
        "If the evidence shows no experience with a skill, advise learning it via a small project instead of claiming it."
    )
    user = (
        f"JOB: {job['title']} at {job.get('company') or 'N/A'}\n"
        f"Parsed requirements: {json.dumps(job['parsed'])}\n\n"
        "RETRIEVED RESUME EVIDENCE (per requirement):\n"
        + "\n\n".join(
            f"[{e['requirement']}]\n" + "\n---\n".join(e["passages"]) for e in requirement_evidence
        )
    )
    return complete_json(system, user, max_tokens=2500)


def review_resume(text: str, parsed: dict) -> dict:
    """General resume quality review: per-section status plus concrete improvements."""
    system = (
        "You are an expert resume coach. Review the resume using ONLY what is in it; never invent facts. "
        "Be specific and actionable (quote or point to the actual weak line/section). Schema:\n"
        '{"score": int 0-100,'
        ' "sections": [{"name": "Contact|Summary|Work history|Education|Skills", "status": "good|improve|missing", "note": str}],'
        ' "improvements": [{"priority": "high|medium|low", "title": str, "detail": str}]}\n'
        "Return exactly those 5 sections and 4-7 improvements ordered by priority. Keep notes under 20 words."
    )
    user = (
        f"Today's date is {date.today():%B %Y}; do not flag dates up to today as being in the future.\n\n"
        f"PARSED DATA: {json.dumps(parsed)[:3000]}\n\nRESUME TEXT:\n{text[:10000]}"
    )
    return complete_json(system, user, max_tokens=2500)


STRUCT_SCHEMA = """{
  "name": str, "headline": str,
  "contact": {"phone": str, "email": str, "location": str},
  "links": [str],
  "summary": str,
  "skill_groups": [{"group": str, "items": [str]}],
  "experience": [{"title": str, "company": str, "location": str, "period": str, "bullets": [str]}],
  "projects": [{"name": str, "link": str, "tech": str, "bullets": [str]}],
  "education": [{"degree": str, "institution": str, "period": str}]
}"""


def structure_resume(text: str) -> dict:
    """Faithful, section-by-section copy of the resume so it can be re-rendered in any template."""
    system = (
        "You convert resume text into structured JSON for re-formatting. Copy the content FAITHFULLY: "
        "do not rewrite, shorten, add or invent anything; keep bullets exactly as written. "
        "Keep skills grouped the way the resume groups them (group = the label, items = the skills); "
        "if the resume has no groups, create sensible ones. Use empty strings/arrays when a field is absent. "
        f"Schema:\n{STRUCT_SCHEMA}"
    )
    return complete_json(system, text[:14000], max_tokens=8192)
