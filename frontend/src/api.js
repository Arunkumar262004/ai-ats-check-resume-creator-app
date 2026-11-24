async function req(path, opts) {
  const res = await fetch(`/api${path}`, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  listResumes: () => req("/resumes"),
  uploadResume: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return req("/resumes", { method: "POST", body: fd });
  },
  reviewResume: (id) => req(`/resumes/${id}/review`, { method: "POST" }),
  structuredResume: (id) => req(`/resumes/${id}/structured`, { method: "POST" }),
  deleteResume: (id) => req(`/resumes/${id}`, { method: "DELETE" }),
  resumeMatches: (id) => req(`/resumes/${id}/matches`),
  listJobs: () => req("/jobs"),
  createJob: (job) => req("/jobs", json("POST", job)),
  deleteJob: (id) => req(`/jobs/${id}`, { method: "DELETE" }),
  jobCandidates: (id) => req(`/jobs/${id}/candidates`),
  analyze: (resume_id, job_id) => req("/analyze", json("POST", { resume_id, job_id })),
};
