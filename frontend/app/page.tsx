"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useAuth, TailoredResumeRecord } from "../lib/auth-context";
import { UserMenu } from "../components/UserMenu";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { TemplateSelector } from "../components/TemplateSelector";
import { ResumeRenderer, TemplateId, TEMPLATES } from "../components/templates/ResumeRenderer";
import { DownloadMenu } from "../components/DownloadMenu";

type Result = {
  tailored_resume: string;
  matched_skills: string[];
  missing_keywords: string[];
  changes: string[];
  match_score: number;
  source_filename: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const { user, openAuthModal, saveToHistory } = useAuth();
  const [jd, setJd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern");
  const [viewMode, setViewMode] = useState<"template" | "raw">("template");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Mobile nav: close on Escape / desktop resize, lock background scroll while open
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setError("");
    if (picked && !/\.(pdf|docx)$/i.test(picked.name)) {
      setError("Please upload a PDF or DOCX resume.");
      event.target.value = "";
      return;
    }
    if (picked && picked.size > 5 * 1024 * 1024) {
      setError("Resume files must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(picked);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (jd.trim().length < 80) return setError("Add at least 80 characters of the job description.");
    if (!file) return setError("Upload your resume to continue.");

    const data = new FormData();
    data.append("job_description", jd);
    data.append("resume", file);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/customize`, { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? "Something went wrong.");

      setResult(payload);

      // Persist to user's history if signed in
      if (user) {
        saveToHistory({
          source_filename: payload.source_filename,
          job_description: jd,
          tailored_resume: payload.tailored_resume,
          match_score: payload.match_score,
          matched_skills: payload.matched_skills,
          missing_keywords: payload.missing_keywords,
          changes: payload.changes,
        });
      }

      setTimeout(() => document.querySelector(".result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to tailor your resume.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectHistory(item: TailoredResumeRecord) {
    setResult({
      tailored_resume: item.tailored_resume,
      matched_skills: item.matched_skills ?? [],
      missing_keywords: item.missing_keywords ?? [],
      changes: item.changes ?? [],
      match_score: item.match_score,
      source_filename: item.source_filename,
    });
    setJd(item.job_description);
    setTimeout(() => document.querySelector(".result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  // Calculate circumference for the radial score gauge
  const score = result?.match_score ?? 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <main>
      <nav className="top-nav-shell">
        {mobileMenuOpen && (
          <div
            className="nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <div className="top-nav-pill">
          <a className="nav-brand" href="#">
            <span className="nav-brand-mark">
              <i className="fa-solid fa-wand-magic-sparkles" />
            </span>
            <span className="nav-brand-text">Res<span>.ai</span></span>
          </a>

          <button
            type="button"
            className="nav-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <i className={`fa-solid ${mobileMenuOpen ? "fa-xmark" : "fa-bars"}`} />
          </button>

          <div className={`nav-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
            <div className="nav-links">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
              <a href="#workspace" onClick={() => setMobileMenuOpen(false)}>Create resume</a>
              <a href="#results" onClick={() => setMobileMenuOpen(false)}>Templates</a>
            </div>

            <div className="nav-tools">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="nav-social-link"
                title="GitHub Repository"
              >
                <i className="fa-brands fa-github" />
              </a>
              {!user ? (
                <div className="auth-actions">
                  <button
                    type="button"
                    className="signup-button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal("sign-up");
                    }}
                  >
                    Log in <i className="fa-solid fa-arrow-right" />
                  </button>
                </div>
              ) : (
                <div className="account-menu">
                  <UserMenu
                    onOpenHistory={() => {
                      setMobileMenuOpen(false);
                      setHistoryDrawerOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-pulse" />
            <i className="fa-solid fa-wand-magic-sparkles" /> AI-POWERED RESUME TAILORING
          </div>
          <h1>
            Land the role
            <br />
            <em>you deserve.</em>
          </h1>
          <p className="hero-copy">
            Transform your resume into a targeted, role-specific application. Highlight relevant achievements, pass ATS screeners, and export in custom designer templates.
          </p>
          <div className="hero-proof">
            <span>
              <i className="fa-solid fa-circle-check" /> 100% Grounded in your experience
            </span>
            <span>
              <i className="fa-solid fa-circle-check" /> Zero invented facts
            </span>
            <span>
              <i className="fa-solid fa-circle-check" /> Multi-template PDF & DOCX export
            </span>
          </div>
        </div>

        <aside className="hero-card">
          <div className="hero-card-glow" />
          <div className="hero-card-header">
            <p>INTELLIGENT TAILORING</p>
            <span className="card-badge">LIVE AI</span>
          </div>
          <div className="orbit">
            <i className="fa-solid fa-brain" />
          </div>
          <div className="hero-score">
            <b>4+</b>
            <span>
              Designer
              <br />
              Templates
            </span>
          </div>
          <div className="hero-card-footer">
            <small>Export as PDF, Word (.docx) & Plain Text</small>
          </div>
        </aside>
      </section>

      <section className="intro" id="how-it-works">
        <div className="intro-headline-wrap">
          <span className="intro-badge">
            <i className="fa-solid fa-wand-magic-sparkles" /> THE WORKFLOW
          </span>
          <p>Two inputs. One compelling, customized application.</p>
        </div>
        <div className="intro-steps">
          <div className="step-pill">
            <span className="step-circle">1</span>
            <span>Target JD</span>
          </div>
          <i className="fa-solid fa-arrow-right step-arrow" />
          <div className="step-pill">
            <span className="step-circle">2</span>
            <span>Upload Resume</span>
          </div>
          <i className="fa-solid fa-arrow-right step-arrow" />
          <div className="step-pill">
            <span className="step-circle">3</span>
            <span>Export Resume</span>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="workspace" id="workspace">
        <section className="card jd-card">
          <div className="step">STEP 01</div>
          <div className="card-heading">
            <span className="icon-wrap">
              <i className="fa-solid fa-briefcase" />
            </span>
            <div>
              <h2>Tell us about the role</h2>
              <p>Paste the job description you are targeting.</p>
            </div>
          </div>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here (requirements, responsibilities, tech stack)..."
            maxLength={12000}
          />
          <div className="field-footer">
            <span>{jd.length.toLocaleString()} / 12,000 characters</span>
            <span className={jd.length >= 80 ? "valid" : "invalid"}>
              {jd.length >= 80 ? (
                <>
                  <i className="fa-solid fa-circle-check" /> Ready
                </>
              ) : (
                "80 character minimum"
              )}
            </span>
          </div>
        </section>

        <section className="card upload-card">
          <div className="step">STEP 02</div>
          <div className="card-heading">
            <span className="icon-wrap">
              <i className="fa-regular fa-file-lines" />
            </span>
            <div>
              <h2>Add your resume</h2>
              <p>We preserve your genuine experience without inventing facts.</p>
            </div>
          </div>
          <input
            ref={fileInput}
            onChange={selectFile}
            type="file"
            accept=".pdf,.docx"
            hidden
          />
          <button
            type="button"
            className={`dropzone ${file ? "has-file" : ""}`}
            onClick={() => fileInput.current?.click()}
          >
            {file ? (
              <>
                <span className="uploaded-icon">
                  <i className="fa-solid fa-file-circle-check" />
                </span>
                <strong>{file.name}</strong>
                <small>{(file.size / 1024).toFixed(1)} KB &middot; Click to replace</small>
                <span className="replace">
                  <i className="fa-solid fa-arrows-rotate" /> Choose another file
                </span>
              </>
            ) : (
              <>
                <span className="upload-icon">
                  <i className="fa-solid fa-cloud-arrow-up" />
                </span>
                <strong>Drop your resume here</strong>
                <small>or click to browse &middot; PDF or DOCX &middot; max 5 MB</small>
              </>
            )}
          </button>
        </section>

        <div className="action-row">
          {error ? (
            <p className="error" role="alert">
              <i className="fa-solid fa-circle-exclamation" /> {error}
            </p>
          ) : user ? (
            <p className="safe-note">
              <span>
                <i className="fa-solid fa-circle-check" />
              </span>{" "}
              Synced with your account.
            </p>
          ) : (
            <p className="safe-note">
              <span>
                <i className="fa-solid fa-shield-halved" />
              </span>{" "}
              Your details are private. Sign in to save history.
            </p>
          )}
          <button className="primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Tailoring your resume...
              </>
            ) : (
              <>
                Create tailored resume <i className="fa-solid fa-wand-magic-sparkles" />
              </>
            )}
          </button>
        </div>
      </form>

      {result && (
        <section className="result" id="results">
          <header className="result-header">
            <div>
              <p className="eyebrow">
                <i className="fa-solid fa-wand-magic-sparkles" /> YOUR TAILORED APPLICATION
              </p>
              <h2>
                Your next application
                <br />
                is looking <em>sharp.</em>
              </h2>
              <p className="result-subtitle">
                Based on <strong>{result.source_filename}</strong>. Review insights, switch templates, and download in your preferred format.
              </p>
            </div>

            {/* Radial Match Score Gauge */}
            <div className="radial-score-card">
              <div className="radial-score-svg-wrap">
                <svg className="radial-svg" width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    className="radial-bg"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="8"
                  />
                  <circle
                    className="radial-progress"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="radial-text">
                  <b>{result.match_score}%</b>
                  <span>MATCH</span>
                </div>
              </div>
              <span className="radial-caption">Role alignment score</span>
            </div>
          </header>

          <div className="insights">
            <Insight
              title="Matched strengths"
              icon="fa-solid fa-circle-check"
              items={result.matched_skills}
              type="strength"
            />
            <Insight
              title="Keywords to consider"
              icon="fa-solid fa-lightbulb"
              items={result.missing_keywords}
              type="keyword"
              light
            />
            <Insight
              title="What we improved"
              icon="fa-solid fa-wand-magic-sparkles"
              items={result.changes}
              type="changes"
            />
          </div>

          {/* Interactive Template Selector */}
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
          />

          {/* Resume Preview Canvas */}
          <article className="resume-canvas-wrapper">
            <div className="resume-canvas-bar">
              <div className="canvas-meta">
                <span className="canvas-badge">
                  <i className="fa-regular fa-file-lines" /> Tailored Resume
                </span>
                <span className="canvas-template-tag">
                  Template: <strong>{TEMPLATES.find((t) => t.id === selectedTemplate)?.name}</strong>
                </span>
              </div>
              <div className="canvas-source">
                Source: <code>{result.source_filename}</code>
              </div>
            </div>

            <div className="resume-paper-container">
              <ResumeRenderer
                rawText={result.tailored_resume}
                templateId={selectedTemplate}
                viewMode={viewMode}
              />
            </div>
          </article>

          {/* Action Row with PDF & DOCX Download Options */}
          <div className="result-actions">
            <DownloadMenu
              rawText={result.tailored_resume}
              sourceFilename={result.source_filename}
              selectedTemplate={selectedTemplate}
            />

            {user && (
              <span className="saved-history-badge">
                <i className="fa-solid fa-circle-check" /> Saved
              </span>
            )}
          </div>
        </section>
      )}

      <footer>
        <a className="brand" href="#">
          <span className="footer-brand-mark">
            <i className="fa-solid fa-wand-magic-sparkles" />
          </span>
          <span className="nav-brand-text">Res<span>.ai</span></span>
        </a>
        <span>Crafted for intentional career moves.</span>
        <span>Never invents experience.</span>
        <div className="footer-socials">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            title="GitHub"
            className="footer-social-link"
          >
            <i className="fa-brands fa-github" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
            title="LinkedIn"
            className="footer-social-link"
          >
            <i className="fa-brands fa-linkedin" />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            title="X (Twitter)"
            className="footer-social-link"
          >
            <i className="fa-brands fa-x-twitter" />
          </a>
        </div>
      </footer>

      <HistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        onSelectRecord={handleSelectHistory}
      />
    </main>
  );
}

function Insight({
  title,
  icon,
  items,
  type = "default",
  light = false,
}: {
  title: string;
  icon?: string;
  items: string[];
  type?: "strength" | "keyword" | "changes" | "default";
  light?: boolean;
}) {
  return (
    <div className={`insight insight-${type}`}>
      <h3>
        {icon && <i className={`${icon} insight-icon`} />} {title}
      </h3>
      <div className="insight-chips-wrap">
        {items.length ? (
          items.map((item, index) => (
            <span className={light ? "chip light" : "chip"} key={index}>
              {item}
            </span>
          ))
        ) : (
          <span className="muted">None identified</span>
        )}
      </div>
    </div>
  );
}
