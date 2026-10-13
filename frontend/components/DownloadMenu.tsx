"use client";

import React, { useState, useRef, useEffect } from "react";
import { exportToDocx, exportToPdf, exportToTxt, printResume } from "../lib/resume-export";
import { parseResumeText } from "../lib/resume-parser";
import { TemplateId } from "./templates/ResumeRenderer";

interface DownloadMenuProps {
  rawText: string;
  sourceFilename: string;
  selectedTemplate: TemplateId;
}

export function DownloadMenu({
  rawText,
  sourceFilename,
  selectedTemplate,
}: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const baseFilename = (sourceFilename.replace(/\.[^/.]+$/, "") || "tailored-resume") + "-tailored";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleDownloadPdf() {
    setDownloading("pdf");
    try {
      await exportToPdf("resume-export-sheet", `${baseFilename}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      // Fallback to browser print dialog
      printResume();
    } finally {
      setDownloading(null);
      setOpen(false);
    }
  }

  async function handleDownloadDocx() {
    setDownloading("docx");
    try {
      const parsed = parseResumeText(rawText);
      await exportToDocx(parsed, selectedTemplate, `${baseFilename}.docx`);
    } catch (err) {
      console.error("DOCX export failed:", err);
      alert("Could not generate Word document. Please try Plain Text export.");
    } finally {
      setDownloading(null);
      setOpen(false);
    }
  }

  function handleDownloadTxt() {
    exportToTxt(rawText, `${baseFilename}.txt`);
    setOpen(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setOpen(false);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }

  return (
    <div className="download-menu-wrapper" ref={menuRef}>
      {/* Primary PDF button for quick 1-click download */}
      <button
        type="button"
        className="primary-download-btn"
        onClick={handleDownloadPdf}
        disabled={Boolean(downloading)}
      >
        {downloading === "pdf" ? (
          <>
            <span className="spinner" /> Generating PDF...
          </>
        ) : (
          <>
            <i className="fa-solid fa-file-pdf" /> Download PDF
          </>
        )}
      </button>

      {/* Primary Word DOCX button for quick 1-click download */}
      <button
        type="button"
        className="docx-download-btn"
        onClick={handleDownloadDocx}
        disabled={Boolean(downloading)}
      >
        {downloading === "docx" ? (
          <>
            <span className="spinner" /> Generating Word...
          </>
        ) : (
          <>
            <i className="fa-solid fa-file-word" /> Download DOCX
          </>
        )}
      </button>

      {/* More formats dropdown */}
      <div className="download-dropdown-container">
        <button
          type="button"
          className="more-formats-btn"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          title="More download formats & actions"
        >
          <span>More formats</span>
          <i className="fa-solid fa-chevron-down" />
        </button>

        {open && (
          <div className="download-dropdown-popover">
            <div className="dropdown-section-title">EXPORT OPTIONS</div>

            <button
              type="button"
              className="dropdown-format-item"
              onClick={handleDownloadPdf}
              disabled={Boolean(downloading)}
            >
              <span className="format-icon pdf">
                <i className="fa-solid fa-file-pdf" />
              </span>
              <div className="format-meta">
                <strong>PDF Document (.pdf)</strong>
                <small>High-resolution print ready</small>
              </div>
            </button>

            <button
              type="button"
              className="dropdown-format-item"
              onClick={handleDownloadDocx}
              disabled={Boolean(downloading)}
            >
              <span className="format-icon docx">
                <i className="fa-solid fa-file-word" />
              </span>
              <div className="format-meta">
                <strong>Word Document (.docx)</strong>
                <small>Editable Microsoft Word format</small>
              </div>
            </button>

            <button
              type="button"
              className="dropdown-format-item"
              onClick={handleDownloadTxt}
            >
              <span className="format-icon txt">
                <i className="fa-solid fa-file-lines" />
              </span>
              <div className="format-meta">
                <strong>Plain Text (.txt)</strong>
                <small>Clean ATS-friendly raw text</small>
              </div>
            </button>

            <div className="dropdown-divider" />

            <button
              type="button"
              className="dropdown-format-item"
              onClick={printResume}
            >
              <span className="format-icon print">
                <i className="fa-solid fa-print" />
              </span>
              <div className="format-meta">
                <strong>Print / Save as PDF</strong>
                <small>Browser vector print dialog</small>
              </div>
            </button>

            <button
              type="button"
              className="dropdown-format-item"
              onClick={handleCopy}
            >
              <span className="format-icon copy">
                <i className="fa-solid fa-copy" />
              </span>
              <div className="format-meta">
                <strong>{copied ? "Copied to Clipboard!" : "Copy Full Text"}</strong>
                <small>Copy tailored resume content</small>
              </div>
            </button>
          </div>
        )}
      </div>

      {copied && (
        <span className="toast-badge">
          <i className="fa-solid fa-check" /> Copied to clipboard!
        </span>
      )}
    </div>
  );
}
