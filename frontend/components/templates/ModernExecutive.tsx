"use client";

import React from "react";
import type { ParsedResume } from "../../lib/resume-parser";

export function ModernExecutiveTemplate({ data }: { data: ParsedResume }) {
  return (
    <div className="resume-sheet template-modern" id="resume-export-sheet">
      <header className="tmpl-header">
        <div className="tmpl-header-left">
          <h1 className="tmpl-name">{data.name}</h1>
          {data.title && <p className="tmpl-title">{data.title}</p>}
        </div>
        <div className="tmpl-contact-grid">
          {data.contact.email && (
            <span className="tmpl-contact-item">
              <i className="fa-solid fa-envelope" /> {data.contact.email}
            </span>
          )}
          {data.contact.phone && (
            <span className="tmpl-contact-item">
              <i className="fa-solid fa-phone" /> {data.contact.phone}
            </span>
          )}
          {data.contact.location && (
            <span className="tmpl-contact-item">
              <i className="fa-solid fa-location-dot" /> {data.contact.location}
            </span>
          )}
          {data.contact.linkedin && (
            <span className="tmpl-contact-item">
              <i className="fa-brands fa-linkedin" /> {data.contact.linkedin}
            </span>
          )}
          {data.contact.github && (
            <span className="tmpl-contact-item">
              <i className="fa-brands fa-github" /> {data.contact.github}
            </span>
          )}
          {data.contact.others.map((item, idx) => (
            <span className="tmpl-contact-item" key={idx}>
              <i className="fa-solid fa-link" /> {item}
            </span>
          ))}
        </div>
      </header>

      <div className="tmpl-divider" />

      {data.summary && (
        <section className="tmpl-section">
          <h2 className="tmpl-section-title">
            <span className="tmpl-accent-bar" /> Professional Summary
          </h2>
          <p className="tmpl-summary-text">{data.summary}</p>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="tmpl-section">
          <h2 className="tmpl-section-title">
            <span className="tmpl-accent-bar" /> Experience
          </h2>
          <div className="tmpl-exp-list">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="tmpl-exp-item">
                <div className="tmpl-exp-header">
                  <div>
                    <strong className="tmpl-exp-role">{exp.title}</strong>
                    {exp.company && <span className="tmpl-exp-company"> · {exp.company}</span>}
                  </div>
                  {exp.dates && <span className="tmpl-exp-dates">{exp.dates}</span>}
                </div>
                {exp.bullets.length > 0 && (
                  <ul className="tmpl-bullets">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.projects && data.projects.length > 0 && (
        <section className="tmpl-section">
          <h2 className="tmpl-section-title">
            <span className="tmpl-accent-bar" /> Projects
          </h2>
          <div className="tmpl-proj-list">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="tmpl-proj-item">
                <strong className="tmpl-proj-name">{proj.name}</strong>
                {proj.details.length > 0 && (
                  <ul className="tmpl-bullets">
                    {proj.details.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="tmpl-section">
          <h2 className="tmpl-section-title">
            <span className="tmpl-accent-bar" /> Core Competencies & Skills
          </h2>
          <div className="tmpl-skills-cloud">
            {data.skills.map((skill, idx) => (
              <span key={idx} className="tmpl-skill-pill">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="tmpl-section">
          <h2 className="tmpl-section-title">
            <span className="tmpl-accent-bar" /> Education
          </h2>
          <div className="tmpl-edu-list">
            {data.education.map((edu, idx) => (
              <div key={idx} className="tmpl-edu-item">
                <div className="tmpl-edu-header">
                  <div>
                    <strong className="tmpl-edu-degree">{edu.degree}</strong>
                    {edu.school && <span className="tmpl-edu-school"> — {edu.school}</span>}
                  </div>
                  {edu.dates && <span className="tmpl-edu-dates">{edu.dates}</span>}
                </div>
                {edu.details && <p className="tmpl-edu-details">{edu.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="tmpl-section">
          <h2 className="tmpl-section-title">
            <span className="tmpl-accent-bar" /> Certifications & Honors
          </h2>
          <ul className="tmpl-bullets">
            {data.certifications.map((cert, idx) => (
              <li key={idx}>{cert}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
