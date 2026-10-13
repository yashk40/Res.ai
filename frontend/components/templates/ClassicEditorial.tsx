"use client";

import React from "react";
import type { ParsedResume } from "../../lib/resume-parser";

export function ClassicEditorialTemplate({ data }: { data: ParsedResume }) {
  return (
    <div className="resume-sheet template-editorial" id="resume-export-sheet">
      <header className="edit-header">
        <h1 className="edit-name">{data.name}</h1>
        {data.title && <p className="edit-title">{data.title}</p>}
        <div className="edit-contact-line">
          {[
            data.contact.email,
            data.contact.phone,
            data.contact.location,
            data.contact.linkedin,
            data.contact.github,
            ...data.contact.others,
          ]
            .filter(Boolean)
            .map((item, idx, arr) => (
              <React.Fragment key={idx}>
                <span>{item}</span>
                {idx < arr.length - 1 && <span className="edit-bullet">•</span>}
              </React.Fragment>
            ))}
        </div>
      </header>

      <div className="edit-divider-line" />

      {data.summary && (
        <section className="edit-section">
          <h2 className="edit-heading">Professional Summary</h2>
          <p className="edit-summary">{data.summary}</p>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="edit-section">
          <h2 className="edit-heading">Work Experience</h2>
          <div className="edit-exp-list">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="edit-exp-item">
                <div className="edit-exp-title-row">
                  <span className="edit-role">{exp.title}</span>
                  {exp.dates && <span className="edit-dates">{exp.dates}</span>}
                </div>
                {exp.company && <div className="edit-company">{exp.company}</div>}
                {exp.bullets.length > 0 && (
                  <ul className="edit-bullets">
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
        <section className="edit-section">
          <h2 className="edit-heading">Notable Projects</h2>
          <div className="edit-exp-list">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="edit-exp-item">
                <div className="edit-exp-title-row">
                  <span className="edit-role">{proj.name}</span>
                </div>
                {proj.details.length > 0 && (
                  <ul className="edit-bullets">
                    {proj.details.map((d, dIdx) => (
                      <li key={dIdx}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="edit-section">
          <h2 className="edit-heading">Areas of Expertise</h2>
          <p className="edit-skills-text">{data.skills.join("  •  ")}</p>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="edit-section">
          <h2 className="edit-heading">Education</h2>
          <div className="edit-edu-list">
            {data.education.map((edu, idx) => (
              <div key={idx} className="edit-edu-item">
                <div className="edit-exp-title-row">
                  <span className="edit-role">{edu.degree}</span>
                  {edu.dates && <span className="edit-dates">{edu.dates}</span>}
                </div>
                {edu.school && <div className="edit-company">{edu.school}</div>}
                {edu.details && <p className="edit-details">{edu.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="edit-section">
          <h2 className="edit-heading">Certifications</h2>
          <ul className="edit-bullets">
            {data.certifications.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
