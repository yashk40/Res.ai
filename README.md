# Res.ai — AI Resume Tailoring

> Paste a Job Description. Upload your Resume. Get a tailored, ATS-ready resume in seconds — without inventing facts.

Res.ai uses Cloudflare Workers AI to rewrite your existing resume to match a target job description. It preserves your real experience, highlights relevant skills, and lets you export in 4 designer templates as **PDF, DOCX, and TXT**.

**Stack:** Next.js 16 · FastAPI · Supabase Auth · Cloudflare Workers AI (Llama 3.1 8B)

---

## ✨ Features

- **JD-aware tailoring** — LLM prompt strictly forbids hallucinating employers, dates, or skills
- **Smart scoring** — transparent keyword-overlap match score + LLM-extracted insights
- **4 Designer Templates** — Modern Executive, Minimal Tech, Creative Accent, Classic Editorial
- **Multi-format export** — PDF (jsPDF + html2canvas), DOCX (docx), TXT, Print
- **Auth & History** — Supabase Auth + per-user history drawer (local + optional DB sync)
- **Insight chips** — Matched strengths · Missing keywords · What we improved
- **Validation** — 5 MB limit, PDF/DOCX only, 80-char JD minimum, CORS lockdown
- **Fully responsive** — capsule navbar, mobile drawer, vector PDF output

## 🖼️ Preview

| Landing + Workspace | Result + Templates | History Drawer |
|---|---|---|
| JD paste + file dropzone | Radial score + 4 templates + export menu | Saved resumes per user |

> Add screenshots to `frontend/public/` and link them here.

## 🏗️ Architecture

```
Browser (Next.js)
   │  multipart/form-data  POST /api/customize  { job_description, resume: PDF/DOCX }
   ▼
FastAPI  ──►  pypdf / python-docx  ──►  Cloudflare Workers AI  (@cf/meta/llama-3.1-8b-instruct)
   │                                              │
   │         { tailored_resume, matched_skills, missing_keywords, changes, match_score }
   ▼                                              ▼
React UI  ◄──  JSON response  ──  Template Renderer + Download Menu + Supabase History
```

## 📁 Project Structure

```
resai/
├── backend/
│   ├── main.py              # FastAPI app, PDF/DOCX extraction, LLM call, /api/customize, /api/export/docx, /health
│   ├── requirements.txt
│   └── .env                 # not committed — see .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Workspace, result, template switching
│   │   ├── layout.tsx
│   │   └── globals.css      # Design system, navbar, templates, responsive
│   ├── components/
│   │   ├── UserMenu.tsx / DownloadMenu.tsx / HistoryDrawer.tsx / TemplateSelector.tsx
│   │   └── templates/       # ResumeRenderer + 4 templates + parser/export
│   ├── lib/
│   │   ├── auth-context.tsx # Supabase auth + history
│   │   ├── supabase.ts
│   │   ├── resume-parser.ts
│   │   └── resume-export.ts # PDF/DOCX/TXT/print
│   ├── proxy.ts
│   └── .env.local           # not committed — see .env.local.example
├── .env.example             # Backend + Frontend env template
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Python 3.10+
- Cloudflare account + Workers AI token
- Supabase project (for Auth; DB optional)

### 1. Clone

```bash
git clone https://github.com/yashk40/Res.ai.git
cd Res.ai
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy ..\.env.example .env   # then fill CLOUDFLARE_* and ALLOWED_ORIGINS
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` — check `http://localhost:8000/health` and `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd ../frontend
npm install
copy .env.local.example .env.local   # fill NEXT_PUBLIC_* vars
npm run dev
```

Frontend runs at `http://localhost:3000`.

## 🔑 Environment Variables

Create `backend/.env`:

```env
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct
ALLOWED_ORIGINS=http://localhost:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> `.env.example` at the repo root documents both.

## 🔌 API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ status, llm_configured }` |
| `POST` | `/api/customize` | Form: `job_description` (≥80 chars) + `resume` (PDF/DOCX ≤5 MB) → tailored resume + insights |
| `POST` | `/api/export/docx` | Form: `resume_text` + `filename` → DOCX file |

Interactive docs: `http://localhost:8000/docs`

## 🗄️ Supabase Setup (Optional — for persistent history)

Auth works immediately. To persist history to Supabase instead of localStorage only, run in SQL Editor:

```sql
create table public.tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_filename text not null,
  job_description text not null,
  tailored_resume text not null,
  match_score integer not null,
  matched_skills text[] default array[]::text[],
  missing_keywords text[] default array[]::text[],
  changes text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tailored_resumes enable row level security;

create policy "Users can manage their own tailored resumes"
  on public.tailored_resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## ☁️ Deployment

- **Frontend → Vercel:** set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Backend → Render / Railway / Fly:** set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
- **Backend → Cloudflare Workers (no Python server needed):** `cd worker && npm install && npm run deploy` — see `worker/README.md`. Then set `NEXT_PUBLIC_API_URL` to the Worker URL.
- Never expose `CLOUDFLARE_API_TOKEN` to the frontend.

## 🛡️ Security & Trade-offs

- File type + size validation on client and server; CORS restricted via `ALLOWED_ORIGINS`
- System prompt explicitly bans invented facts — grounded tailoring only
- Match score is keyword-overlap (transparent, deterministic) rather than embedding similarity
- Primary export is client-side (jsPDF/docx) for instant download; server DOCX endpoint as fallback
- History is per-user via Supabase RLS; no server-side resume storage

## 📜 Scripts

```bash
# frontend
npm run dev      # start dev server
npm run build    # production build
npm run lint     # next lint

# backend
uvicorn main:app --reload --port 8000
```

## 🤝 Contributing

PRs welcome. Please keep secrets in `.env` / `.env.local` — never commit them.

## 📄 License

MIT

---

Built with ❤️ by [@yashk40](https://github.com/yashk40) — if you like it, give it a ⭐
