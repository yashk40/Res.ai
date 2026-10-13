"use client";

import React from "react";
import type { ParsedResume } from "../../lib/resume-parser";

export function CreativeAccentTemplate({ data }: { data: ParsedResume }) {
  return (
    <div className="resume-sheet template-creative" id="resume-export-sheet">
      <header className="crt-header">
        <div className="crt-header-badge">CURATED RESUME</div>
        <h1 className="crt-name">{data.name}</h1>
        {data.title && <p className="crt-title">{data.title}</p>}

        <div className="crt-contact-bar">
          {data.contact.email && (
            <span className="crt-contact-chip">
              <i className="fa-solid fa-envelope" /> {data.contact.email}
            </span>
          )}
          {data.contact.phone && (
            <span className="crt-contact-chip">
              <i className="fa-solid fa-phone" /> {data.contact.phone}
            </span>
          )}
          {data.contact.location && (
            <span className="crt-contact-chip">
              <i className="fa-solid fa-location-dot" /> {data.contact.location}
            </span>
          )}
          {data.contact.linkedin && (
            <span className="crt-contact-chip">
              <i className="fa-brands fa-linkedin" /> {data.contact.linkedin}
            </span>
          )}
          {data.contact.github && (
            <span className="crt-contact-chip">
              <i className="fa-brands fa-github" /> {data.contact.github}
            </span>
          )}
          {data.contact.others.map((item, idx) => (
            <span className="crt-contact-chip" key={idx}>
              <i className="fa-solid fa-asterisk" /> {item}
            </span>
          ))}
        </div>
      </header>

      {data.summary && (
        <section className="crt-section">
          <div className="crt-section-heading">
            <i className="fa-solid fa-sparkles crt-icon" />
            <h2>ABOUT ME</h2>
          </div>
          <p className="crt-summary">{data.summary}</p>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="crt-section">
          <div className="crt-section-heading">
            <i className="fa-solid fa-layer-group crt-icon" />
            <h2>CORE STRENGTHS & SKILLS</h2>
          </div>
          <div className="crt-skills-grid">
            {data.skills.map((skill, idx) => (
              <span key={idx} className="crt-skill-badge">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="crt-section">
          <div className="crt-section-heading">
            <i className="fa-solid fa-briefcase crt-icon" />
            <h2>EXPERIENCE</h2>
          </div>
          <div className="crt-exp-cards">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="crt-exp-card">
                <div className="crt-exp-header">
                  <div>
                    <h3 className="crt-exp-role">{exp.title}</h3>
                    {exp.company && <span className="crt-exp-company">{exp.company}</span>}
                  </div>
                  {exp.dates && <span className="crt-exp-dates">{exp.dates}</span>}
                </div>
                {exp.bullets.length > 0 && (
                  <ul className="crt-bullets">
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
        <section className="crt-section">
          <div className="crt-section-heading">
            <i className="fa-solid fa-code-fork crt-icon" />
            <h2>PROJECTS</h2>
          </div>
          <div className="crt-exp-cards">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="crt-exp-card">
                <div className="crt-exp-header">
                  <h3 className="crt-exp-role">{proj.name}</h3>
                </div>
                {proj.details.length > 0 && (
                  <ul className="crt-bullets">
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

      {data.education.length > 0 && (
        <section className="crt-section">
          <div className="crt-section-heading">
            <i className="fa-solid fa-graduation-cap crt-icon" />
            <h2>EDUCATION</h2>
          </div>
          <div className="crt-edu-list">
            {data.education.map((edu, idx) => (
              <div key={idx} className="crt-edu-item">
                <div className="crt-edu-header">
                  <strong>{edu.degree}</strong>
                  {edu.dates && <span className="crt-edu-dates">{edu.dates}</span>}
                </div>
                {edu.school && <div className="crt-edu-school">{edu.school}</div>}
                {edu.details && <p className="crt-edu-details">{edu.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="crt-section">
          <div className="crt-section-heading">
            <i className="fa-solid fa-award crt-icon" />
            <h2>CERTIFICATIONS</h2>
          </div>
          <ul className="crt-bullets">
            {data.certifications.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
