"use client";

import React from "react";
import { TEMPLATES, TemplateId } from "./templates/ResumeRenderer";

interface TemplateSelectorProps {
  selectedTemplate: TemplateId;
  onSelectTemplate: (id: TemplateId) => void;
  viewMode: "template" | "raw";
  onToggleViewMode: (mode: "template" | "raw") => void;
}

export function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  viewMode,
  onToggleViewMode,
}: TemplateSelectorProps) {
  return (
    <div className="template-selector-container">
      <div className="template-selector-header">
        <div className="template-selector-title">
          <i className="fa-solid fa-palette text-accent" />
          <div>
            <h3>Choose Resume Template</h3>
            <p>Select a design style optimized for your industry and target role</p>
          </div>
        </div>

        {/* View mode toggle (Styled vs Raw Text) */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "template" ? "active" : ""}`}
            onClick={() => onToggleViewMode("template")}
            title="Formatted Template View"
          >
            <i className="fa-solid fa-file-invoice" /> Styled Template
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "raw" ? "active" : ""}`}
            onClick={() => onToggleViewMode("raw")}
            title="Clean ATS Plain Text View"
          >
            <i className="fa-solid fa-align-left" /> Plain Text
          </button>
        </div>
      </div>

      {viewMode === "template" && (
        <div className="template-grid">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                className={`template-card ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectTemplate(tmpl.id)}
              >
                <div className="tmpl-card-top">
                  <span className="tmpl-badge" style={{ borderColor: tmpl.accentColor }}>
                    {tmpl.badge}
                  </span>
                  {isSelected && (
                    <span className="tmpl-selected-check">
                      <i className="fa-solid fa-circle-check" /> Active
                    </span>
                  )}
                </div>

                <div className="tmpl-mini-preview">
                  <div className={`mini-preview-mockup mini-tmpl-${tmpl.id}`}>
                    <div className="mini-header-line" />
                    <div className="mini-sub-line" />
                    <div className="mini-divider" />
                    <div className="mini-body-line line-long" />
                    <div className="mini-body-line line-med" />
                    <div className="mini-body-line line-short" />
                  </div>
                </div>

                <div className="tmpl-card-info">
                  <strong className="tmpl-card-name">
                    <i className={tmpl.icon} style={{ color: tmpl.accentColor }} /> {tmpl.name}
                  </strong>
                  <p className="tmpl-card-tagline">{tmpl.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
