"use client";

import React from "react";
import type { ParsedResume } from "../../lib/resume-parser";

export function MinimalTechTemplate({ data }: { data: ParsedResume }) {
  return (
    <div className="resume-sheet template-minimal" id="resume-export-sheet">
      <header className="min-header">
        <h1 className="min-name">{data.name}</h1>
        {data.title && <p className="min-title">{data.title}</p>}
        <div className="min-contact-row">
          {data.contact.email && <span>{data.contact.email}</span>}
          {data.contact.phone && <span>{data.contact.phone}</span>}
          {data.contact.location && <span>{data.contact.location}</span>}
          {data.contact.linkedin && <span>{data.contact.linkedin}</span>}
          {data.contact.github && <span>{data.contact.github}</span>}
          {data.contact.others.map((item, idx) => (
            <span key={idx}>{item}</span>
          ))}
        </div>
      </header>

      {data.summary && (
        <section className="min-section">
          <h2 className="min-heading">SUMMARY</h2>
          <p className="min-summary">{data.summary}</p>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="min-section">
          <h2 className="min-heading">TECHNICAL SKILLS</h2>
          <div className="min-skills-wrap">
            {data.skills.map((s, idx) => (
              <span key={idx} className="min-skill-tag">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="min-section">
          <h2 className="min-heading">EXPERIENCE</h2>
          <div className="min-timeline">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="min-item">
                <div className="min-item-top">
                  <div>
                    <span className="min-role">{exp.title}</span>
                    {exp.company && <span className="min-company"> // {exp.company}</span>}
                  </div>
                  {exp.dates && <span className="min-dates">{exp.dates}</span>}
                </div>
                {exp.bullets.length > 0 && (
                  <ul className="min-bullets">
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
        <section className="min-section">
          <h2 className="min-heading">KEY PROJECTS</h2>
          <div className="min-timeline">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="min-item">
                <div className="min-item-top">
                  <span className="min-role">{proj.name}</span>
                </div>
                {proj.details.length > 0 && (
                  <ul className="min-bullets">
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

      {data.education.length > 0 && (
        <section className="min-section">
          <h2 className="min-heading">EDUCATION</h2>
          <div className="min-edu-list">
            {data.education.map((edu, idx) => (
              <div key={idx} className="min-item">
                <div className="min-item-top">
                  <div>
                    <span className="min-role">{edu.degree}</span>
                    {edu.school && <span className="min-company"> // {edu.school}</span>}
                  </div>
                  {edu.dates && <span className="min-dates">{edu.dates}</span>}
                </div>
                {edu.details && <p className="min-details">{edu.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="min-section">
          <h2 className="min-heading">CERTIFICATIONS</h2>
          <ul className="min-bullets">
            {data.certifications.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
