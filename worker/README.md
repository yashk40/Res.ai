# Res.ai API — Cloudflare Worker

TypeScript port of `backend/main.py` (FastAPI). Same routes, same validation,
same `{ detail }` error shape and same response JSON — the frontend works
unchanged, just point `NEXT_PUBLIC_API_URL` at the deployed Worker URL.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ status, llm_configured }` |
| `POST` | `/api/customize` | Form: `job_description` (≥80 chars) + `resume` (PDF/DOCX ≤5 MB) → tailored resume + insights |
| `POST` | `/api/export/docx` | Form (or JSON): `resume_text` + `filename` → DOCX download |

## How it works

- **PDF text** → `unpdf` (serverless PDF.js build, Workers-safe)
- **DOCX text** → `mammoth` (`extractRawText`)
- **DOCX export** → `docx` npm package (same layout rules as `python-docx` in `main.py`:
  first line = bold title, `-`/`*`/`•` lines = bullets, short UPPERCASE lines = headings)
- **LLM** → Workers AI binding (`env.AI`, model `@cf/meta/llama-3.1-8b-instruct`).
  REST fallback (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`) is used only
  for local `wrangler dev` when the AI binding is unavailable.
- **CORS** → restricted via `ALLOWED_ORIGINS` (same idea as FastAPI's `CORSMiddleware`).
- Nothing is stored server-side — same as the FastAPI backend.

## Prerequisites

- Cloudflare account with **Workers AI** enabled
- Node.js 18+ and `wrangler` (installed as a devDependency here)

## Local dev

```bash
cd worker
npm install
copy .dev.vars.example .dev.vars   # fill CLOUDFLARE_* for REST fallback (optional if AI binding works)
npm run dev                        # http://localhost:8787
```

Health check: `http://localhost:8787/health`

## Deploy

```bash
cd worker
npm install
npx wrangler login
npm run deploy
```

Then configure:

1. **Workers AI binding** — `wrangler.toml` already declares `[ai] binding = "AI"`.
   No token needed in production.
2. **Allowed frontend origin:**
   ```bash
   npx wrangler vars put ALLOWED_ORIGINS
   # e.g. https://your-frontend.vercel.app
   ```
3. **Frontend** — set `NEXT_PUBLIC_API_URL` to the Worker URL
   (e.g. `https://resai-api.<your-subdomain>.workers.dev`) and redeploy the frontend.

Verify:

```bash
curl https://<your-worker>.workers.dev/health
```

## Parity notes vs `backend/main.py`

- Scoring (`keywords` / `match_score` / `llm_match_score`), `STOP_WORDS`,
  `SYSTEM_PROMPT`, file-type/size/JD-length validation and every user-facing
  error message are ported 1:1, so the UI behaves identically.
- FastAPI's interactive `/docs` (Swagger) has no equivalent here;
  `GET /` returns `{ status, service, llm_configured }` instead.
- The 503 message mentions binding Workers AI instead of `backend/.env`.
