/**
 * Res.ai API — Cloudflare Worker.
 *
 * TypeScript port of backend/main.py (FastAPI) so the API can run on
 * Cloudflare instead of a Python server. Same routes, same validation,
 * same error shape ({ detail }) and same response JSON:
 *
 *   GET  /health            -> { status, llm_configured }
 *   POST /api/customize     -> form { job_description, resume: PDF/DOCX } -> tailored resume + insights
 *   POST /api/export/docx   -> form { resume_text, filename } -> .docx download
 *
 * LLM: Workers AI binding (`env.AI`) in production, REST fallback
 * (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN) for `wrangler dev`.
 * No resume content is stored server-side — same as the FastAPI backend.
 */

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_JD_CHARS = 80;
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_ORIGINS = "http://localhost:3000";

interface Env {
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  ALLOWED_ORIGINS?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_AI_MODEL?: string;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Scoring helpers (port of keywords/match_score/llm_match_score in main.py)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "you", "your", "yours", "are", "our", "ours",
  "this", "that", "these", "those", "from", "will", "have", "has", "had", "into",
  "their", "theirs", "they", "them", "who", "whom", "which", "what", "when",
  "where", "how", "why", "not", "but", "all", "any", "can", "could", "should",
  "would", "may", "might", "must", "shall", "also", "very", "just", "about",
  "above", "after", "again", "against", "between", "both", "during", "each",
  "more", "most", "such", "than", "too", "own", "same", "using", "used",
  "use", "including", "include", "includes", "other", "others", "per", "via",
  "we", "us", "to", "of", "in", "on", "a", "an", "is", "it", "its", "as",
  "at", "by", "be", "been", "being", "was", "were", "or", "if", "so", "do",
  "does", "did", "done", "am", "no", "yes", "up", "out", "off",
  "over", "under", "then", "once", "here", "there", "s", "t", "re", "ll",
  "don", "within", "without", "across", "along",
  "among", "around", "towards", "through", "upon", "onto",
  "writing", "written", "collaborating", "collaboration", "problem",
  "solving", "solve", "ensure", "ensuring", "maintain", "maintaining",
  "support", "supporting", "develop", "developed", "developer", "developing",
  "design", "designed", "implement", "implemented", "implementing",
  "manage", "managed", "managing", "lead", "leading", "drive", "driving",
  "work", "working", "role", "roles", "team", "teams", "years", "year",
  "experience", "experiences", "experienced", "skills", "skill", "required",
  "requirements", "requirement", "responsibilities", "responsibility",
  "qualifications", "qualification", "looking", "seeking", "hiring", "join",
  "joins", "joined", "opportunity", "opportunities", "position", "positions",
  "company", "business", "candidate", "candidates", "ideal", "great",
  "excellent", "strong", "good", "best", "top", "fast", "paced", "growing",
  "dynamic", "passion", "passionate", "motivated", "ability", "able",
  "help", "helps", "day", "daily", "etc", "eg", "ie", "plus", "highly",
  "proven", "solid", "deep", "broad", "diverse", "various", "multiple",
  "knowledge", "understanding", "background", "detail", "details",
  "attention", "communication", "collaborat", "analytical", "analysis",
  "reports", "stakeholder", "product", "project", "designing", "building",
  "create", "creates", "analyze", "generate", "needed", "know",
  "seniority", "level",
]);

function cleanToken(raw: string): string {
  let word = raw.toLowerCase().trim();
  word = word.replace(/[.,;:!?]+$/, "");
  word = word.replace(/^[()/"'`]+|[()/"'`]+$/g, "");
  return word;
}

function keywords(text: string, limit = 30): string[] {
  const rawWords = text.toLowerCase().match(/[a-z][a-z0-9+#./-]{1,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const raw of rawWords) {
    const word = cleanToken(raw);
    if (word.length < 2) continue;
    if (STOP_WORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termInText(term: string, textLower: string): boolean {
  try {
    return new RegExp(`(?<!\\w)${escapeRegExp(term)}(?!\\w)`).test(textLower);
  } catch {
    return textLower.includes(term);
  }
}

function matchScore(jobDescription: string, resume: string): number {
  const jdTerms = new Set(keywords(jobDescription));
  if (jdTerms.size === 0) return 0;
  const resumeLower = resume.toLowerCase();
  let hits = 0;
  for (const term of jdTerms) {
    if (termInText(term, resumeLower)) hits += 1;
  }
  return Math.round((100 * hits) / jdTerms.size);
}

function llmMatchScore(
  matched: unknown,
  missing: unknown,
  fallback: number,
): number {
  const m = Array.isArray(matched) ? matched : [];
  const n = Array.isArray(missing) ? missing : [];
  const total = m.length + n.length;
  if (total === 0) return fallback;
  return Math.round((100 * m.length) / total);
}

// ---------------------------------------------------------------------------
// Resume text extraction (pypdf/python-docx  ->  unpdf/mammoth)
// ---------------------------------------------------------------------------

async function extractResumeText(content: Uint8Array, filename: string): Promise<string> {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
    : "";

  let text: string;
  try {
    if (ext === "pdf") {
      // Fresh copy: unpdf/pdf.js must own its buffer.
      const data = new Uint8Array(content);
      let out;
      try {
        const pdf = await getDocumentProxy(data);
        try {
          out = await extractText(pdf, { mergePages: true });
        } finally {
          try {
            await (pdf as unknown as { destroy?: () => Promise<unknown> }).destroy?.();
          } catch {
            // ignore cleanup errors
          }
        }
      } catch {
        // Fallback: extractText also accepts raw data directly.
        out = await extractText(data, { mergePages: true });
      }
      text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
    } else if (ext === "docx") {
      // NOTE: the bundled (Node) build of mammoth only accepts `{ buffer }`,
      // NOT `{ arrayBuffer }` — passing arrayBuffer throws "Could not find
      // file in options" and every DOCX upload fails.
      const ab = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ) as ArrayBuffer;
      let out;
      try {
        out = await mammoth.extractRawText({ buffer: Buffer.from(ab) });
      } catch {
        out = await mammoth.extractRawText({ arrayBuffer: ab });
      }
      text = out.value ?? "";
    } else {
      throw new HttpError(400, "Upload a PDF or DOCX file.");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error(`Resume parse failed (${ext}):`, err instanceof Error ? err.message : err);
    throw new HttpError(400, "We could not read that resume. Please upload a valid PDF or DOCX.");
  }

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 40) {
    throw new HttpError(
      400,
      "We couldn't extract text from this file — it may be a scanned/image PDF. Please export it as a text-based PDF or DOCX (File → Save as PDF / DOCX) and try again.",
    );
  }
  return text;
}

// ---------------------------------------------------------------------------
// LLM call (Cloudflare Workers AI — binding first, REST fallback)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "You are an expert resume editor. Create ATS-friendly resume content tailored to the job description, but never invent employers, education, dates, skills, achievements, qualifications, or metrics. Keep all facts grounded in the source resume. Return valid JSON only with these fields: tailored_resume (a polished plain-text resume, preserving known facts), matched_skills (array of strings), missing_keywords (array of strings), changes (array of concise strings).";

function contentFromAiOutput(out: unknown): string | null {
  if (typeof out === "string") return out;
  if (!out || typeof out !== "object") return null;
  const o = out as Record<string, unknown>;
  if (typeof o["response"] === "string") return o["response"] as string;
  const choices = o["choices"] as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (o["result"] !== undefined) return contentFromAiOutput(o["result"]);
  return null;
}

function stripCodeFences(content: string): string {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  }
  return text;
}

function restErrorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const errors = (data as Record<string, unknown>)["errors"];
    if (Array.isArray(errors) && errors.length > 0) {
      return errors
        .map((item) =>
          item && typeof item === "object" && "message" in item
            ? String((item as Record<string, unknown>)["message"])
            : String(item),
        )
        .join("; ");
    }
  }
  return "No error details returned";
}

async function tailorWithLlm(
  env: Env,
  jobDescription: string,
  resume: string,
): Promise<{
  tailored_resume: string;
  matched_skills: string[];
  missing_keywords: string[];
  changes: string[];
}> {
  const model = env.CLOUDFLARE_AI_MODEL || DEFAULT_MODEL;
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `JOB DESCRIPTION:\n${jobDescription}\n\nSOURCE RESUME:\n${resume}` },
  ];

  let content: string | null = null;

  // 1. Preferred: Workers AI binding (no token needed in production).
  if (env.AI) {
    try {
      const out = await env.AI.run(model, {
        temperature: 0.25,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages,
      });
      content = contentFromAiOutput(out);
    } catch (err) {
      throw new HttpError(
        502,
        `Cloudflare Workers AI rejected the request: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    // 2. Fallback: REST API (local `wrangler dev` without the AI binding).
    const accountId = env.CLOUDFLARE_ACCOUNT_ID || "";
    const apiToken = env.CLOUDFLARE_API_TOKEN || "";
    if (!accountId || !apiToken) {
      throw new HttpError(
        503,
        'Cloudflare Workers AI is not configured. Bind Workers AI ([ai] binding = "AI") or set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN secrets and redeploy.',
      );
    }
    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            temperature: 0.25,
            max_tokens: 4096,
            response_format: { type: "json_object" },
            messages,
          }),
        },
      );
    } catch (err) {
      throw new HttpError(
        502,
        "Could not reach Cloudflare Workers AI. Check your network and try again.",
      );
    }
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      throw new HttpError(502, "Cloudflare Workers AI returned an unreadable response. Please try again.");
    }
    if (!response.ok) {
      throw new HttpError(502, `Cloudflare Workers AI rejected the request: ${restErrorMessage(data)}`);
    }
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      (data as Record<string, unknown>)["success"] !== true
    ) {
      throw new HttpError(502, `Cloudflare Workers AI rejected the request: ${restErrorMessage(data)}`);
    }
    content = contentFromAiOutput(
      data && typeof data === "object" ? (data as Record<string, unknown>)["result"] ?? data : data,
    );
  }

  if (!content) {
    throw new HttpError(502, "Cloudflare Workers AI returned an unreadable response. Please try again.");
  }
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(stripCodeFences(content)) as Record<string, unknown>;
  } catch {
    throw new HttpError(502, "Cloudflare Workers AI returned an unreadable response. Please try again.");
  }
  if (typeof result["tailored_resume"] !== "string") {
    throw new HttpError(502, "The AI provider returned an invalid response. Please try again.");
  }
  return {
    tailored_resume: result["tailored_resume"] as string,
    matched_skills: Array.isArray(result["matched_skills"])
      ? (result["matched_skills"] as string[])
      : [],
    missing_keywords: Array.isArray(result["missing_keywords"])
      ? (result["missing_keywords"] as string[])
      : [],
    changes: Array.isArray(result["changes"]) ? (result["changes"] as string[]) : [],
  };
}

// ---------------------------------------------------------------------------
// DOCX export (python-docx  ->  docx npm package, same layout rules)
// ---------------------------------------------------------------------------

function buildResumeDocument(resumeText: string): Document {
  const lines = resumeText.trim().split("\n");
  const children: Paragraph[] = [];
  if (lines.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: lines[0].trim(), bold: true, size: 36 })],
      }),
    );
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        continue;
      }
      if (/^[-*•]/.test(trimmed)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: trimmed.replace(/^[-*•\s]+/, "") })],
          }),
        );
      } else if (
        trimmed.length < 40 &&
        /[a-zA-Z]/.test(trimmed) &&
        trimmed === trimmed.toUpperCase()
      ) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: trimmed })],
          }),
        );
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: trimmed })] }));
      }
    }
  }
  return new Document({ sections: [{ children }] });
}

// ---------------------------------------------------------------------------
// CORS + routing
// ---------------------------------------------------------------------------

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, request: Request, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request, env), "Content-Type": "application/json" },
  });
}

function err(request: Request, env: Env, status: number, detail: string): Response {
  return json({ detail }, request, env, status);
}

async function handleCustomize(request: Request, env: Env): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return err(request, env, 400, "Could not parse form data.");
  }

  const jdRaw = form.get("job_description");
  const jd = typeof jdRaw === "string" ? jdRaw.trim() : "";
  if (jd.length < MIN_JD_CHARS) {
    return err(
      request,
      env,
      400,
      `Please paste at least ${MIN_JD_CHARS} characters of the job description.`,
    );
  }

  const resume = form.get("resume");
  if (!(resume instanceof File) || !resume.name) {
    return err(request, env, 400, "Please select a resume file.");
  }
  if (resume.size > MAX_FILE_BYTES) {
    return err(request, env, 400, "Resume files must be 5 MB or smaller.");
  }
  const buffer = new Uint8Array(await resume.arrayBuffer());
  if (buffer.length === 0) {
    return err(request, env, 400, "The uploaded file is empty.");
  }

  try {
    const sourceText = await extractResumeText(buffer, resume.name);
    const result = await tailorWithLlm(env, jd, sourceText);
    const tailoredText = result.tailored_resume.trim();
    const keywordFallback = matchScore(jd, tailoredText);
    const score = llmMatchScore(result.matched_skills, result.missing_keywords, keywordFallback);
    return json(
      {
        tailored_resume: tailoredText,
        matched_skills: result.matched_skills,
        missing_keywords: result.missing_keywords,
        changes: result.changes,
        match_score: score,
        source_filename: resume.name,
      },
      request,
      env,
    );
  } catch (e) {
    if (e instanceof HttpError) return err(request, env, e.status, e.message);
    return err(request, env, 500, "Something went wrong.");
  }
}

async function handleExportDocx(request: Request, env: Env): Promise<Response> {
  let resumeText = "";
  let filename = "tailored-resume.docx";
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body["resume_text"] === "string") resumeText = body["resume_text"];
      if (typeof body["filename"] === "string" && body["filename"].trim()) {
        filename = body["filename"].trim();
      }
    } else {
      const form = await request.formData();
      const textValue = form.get("resume_text");
      if (typeof textValue === "string") resumeText = textValue;
      const nameValue = form.get("filename");
      if (typeof nameValue === "string" && nameValue.trim()) filename = nameValue.trim();
    }
  } catch {
    return err(request, env, 400, "Could not parse request body.");
  }

  if (!resumeText.trim()) {
    return err(request, env, 400, "Resume text is empty.");
  }

  const cleanName = filename.replace(/["\r\n]/g, "").trim() || "tailored-resume.docx";
  const downloadName = cleanName.endsWith(".docx") ? cleanName : `${cleanName}.docx`;

  try {
    const doc = buildResumeDocument(resumeText);
    const blob = await Packer.toBlob(doc);
    const buf = await blob.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders(request, env),
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) return err(request, env, e.status, e.message);
    return err(request, env, 500, "Could not generate the DOCX file.");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method === "GET" && (path === "/" || path === "/health")) {
      const llmConfigured = Boolean(
        env.AI || (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN),
      );
      if (path === "/") {
        return json(
          { status: "ok", service: "resai-api", llm_configured: llmConfigured },
          request,
          env,
        );
      }
      return json({ status: "ok", llm_configured: llmConfigured }, request, env);
    }

    if (path === "/api/customize") {
      if (request.method !== "POST") {
        return err(request, env, 405, "Method Not Allowed.");
      }
      return handleCustomize(request, env);
    }

    if (path === "/api/export/docx") {
      if (request.method !== "POST") {
        return err(request, env, 405, "Method Not Allowed.");
      }
      return handleExportDocx(request, env);
    }

    return err(request, env, 404, "Not Found.");
  },
};
