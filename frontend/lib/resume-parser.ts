export interface ExperienceItem {
  title: string;
  company: string;
  dates?: string;
  location?: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  dates?: string;
  details?: string;
}

export interface ProjectItem {
  name: string;
  details: string[];
}

export interface ParsedResume {
  name: string;
  title: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    others: string[];
  };
  summary: string;
  experience: ExperienceItem[];
  skills: string[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
  rawText: string;
}

export function parseResumeText(rawText: string): ParsedResume {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const nonEmptyLines = lines.filter((l) => l.length > 0);

  const result: ParsedResume = {
    name: "Professional Resume",
    title: "",
    contact: {
      others: [],
    },
    summary: "",
    experience: [],
    skills: [],
    education: [],
    projects: [],
    certifications: [],
    rawText,
  };

  if (nonEmptyLines.length === 0) return result;

  // 1. Identify Name (first non-empty line usually)
  let lineIdx = 0;
  const firstLine = nonEmptyLines[0];
  if (firstLine && !/^(summary|experience|skills|education|contact|profile)/i.test(firstLine)) {
    result.name = firstLine.replace(/^[#*_\s]+|[#*_\s]+$/g, "");
    lineIdx++;
  }

  // 2. Identify Title & Contact info from top lines before first major section header
  const sectionKeywords = /^(summary|professional summary|profile|about me|experience|work experience|employment history|skills|technical skills|core competencies|education|academic background|projects|key projects|certifications|awards|languages)$/i;

  while (lineIdx < nonEmptyLines.length) {
    const line = nonEmptyLines[lineIdx];
    const cleanHeader = line.replace(/^[#*_\s\-:]+|[#*_\s\-:]+$/g, "").trim();

    if (sectionKeywords.test(cleanHeader)) {
      break;
    }

    // Check if line contains email / phone / website
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !result.contact.email) {
      result.contact.email = emailMatch[0];
    }

    const phoneMatch = line.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch && !result.contact.phone) {
      result.contact.phone = phoneMatch[0];
    }

    if (/linkedin\.com/i.test(line) && !result.contact.linkedin) {
      const match = line.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
      result.contact.linkedin = match ? match[0] : "LinkedIn";
    }

    if (/github\.com/i.test(line) && !result.contact.github) {
      const match = line.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
      result.contact.github = match ? match[0] : "GitHub";
    }

    // Check if title (short line without email/phone, right after name)
    if (lineIdx === 1 && !emailMatch && !phoneMatch && !line.includes("|") && line.length < 60) {
      result.title = line.replace(/^[#*_\s]+|[#*_\s]+$/g, "");
    } else if (!emailMatch && !phoneMatch && !result.contact.linkedin && !result.contact.github) {
      // Split by pipe, bullet, or comma for contact tags
      const parts = line.split(/[|•·,]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (/^[a-zA-Z\s]{3,30},\s*[a-zA-Z\s]{2,20}$/i.test(part) && !result.contact.location) {
          result.contact.location = part;
        } else if (!part.includes("@") && !/\d{3}/.test(part)) {
          if (!result.title && part.length < 40 && lineIdx <= 2) {
            result.title = part;
          } else {
            result.contact.others.push(part);
          }
        }
      }
    }

    lineIdx++;
  }

  // 3. Parse Sections
  type Section = "summary" | "experience" | "skills" | "education" | "projects" | "certifications" | "other";
  let currentSection: Section = "other";
  const sectionContent: Record<Section, string[]> = {
    summary: [],
    experience: [],
    skills: [],
    education: [],
    projects: [],
    certifications: [],
    other: [],
  };

  for (; lineIdx < nonEmptyLines.length; lineIdx++) {
    const rawLine = nonEmptyLines[lineIdx];
    const stripped = rawLine.replace(/^[#*_\s\-:]+|[#*_\s\-:]+$/g, "").trim().toLowerCase();

    if (/^(summary|professional summary|profile|about me|executive summary)$/i.test(stripped)) {
      currentSection = "summary";
      continue;
    } else if (/^(experience|work experience|professional experience|employment history|work history)$/i.test(stripped)) {
      currentSection = "experience";
      continue;
    } else if (/^(skills|technical skills|core competencies|areas of expertise|technologies)$/i.test(stripped)) {
      currentSection = "skills";
      continue;
    } else if (/^(education|academic background|education & credentials)$/i.test(stripped)) {
      currentSection = "education";
      continue;
    } else if (/^(projects|key projects|notable projects|personal projects|technical projects|academic projects|selected projects|featured projects|software projects|project work|project experience)$/i.test(stripped) || /^projects\b/i.test(stripped) || /^(key|notable|personal|technical|academic|selected|featured|software)\s+projects\b/i.test(stripped)) {
      currentSection = "projects";
      continue;
    } else if (/^(certifications|licenses|certifications & licenses|credentials)$/i.test(stripped)) {
      currentSection = "certifications";
      continue;
    }

    sectionContent[currentSection].push(rawLine);
  }

  // Process Summary
  result.summary = sectionContent.summary.join(" ").replace(/\s+/g, " ").trim();

  // Process Skills
  const rawSkills = sectionContent.skills.join(" ");
  const skillTokens = rawSkills
    .split(/[,|•·;\n]/)
    .map((s) => s.replace(/^[•\-*#\s]+|[•\-*#\s]+$/g, "").trim())
    .filter((s) => s.length > 1 && s.length < 50 && !/^(skills|technologies):?$/i.test(s));
  result.skills = Array.from(new Set(skillTokens));

  // Process Experience
  let currentExp: ExperienceItem | null = null;
  for (const line of sectionContent.experience) {
    const isBullet = /^[•\-\*]\s+/.test(line);
    const cleanText = line.replace(/^[•\-\*]\s+/, "").trim();

    if (isBullet && currentExp) {
      currentExp.bullets.push(cleanText);
    } else if (!isBullet) {
      // Might be a job header (e.g. "Senior Frontend Engineer | Acme Corp | 2021 - Present")
      const parts = cleanText.split(/\s+[|–—\-•]\s+|\s{2,}/);
      if (parts.length >= 2 || (currentExp && currentExp.bullets.length > 0)) {
        if (currentExp) {
          result.experience.push(currentExp);
        }
        const role = parts[0] || cleanText;
        const comp = parts[1] || "";
        const datePart = parts.find((p) => /\d{4}|present|current/i.test(p)) || "";
        currentExp = {
          title: role,
          company: comp,
          dates: datePart,
          bullets: [],
        };
      } else if (currentExp) {
        // Additional description or bullet without marker
        currentExp.bullets.push(cleanText);
      } else {
        currentExp = {
          title: cleanText,
          company: "",
          bullets: [],
        };
      }
    }
  }
  if (currentExp) {
    result.experience.push(currentExp);
  }

  // Process Education
  let currentEdu: EducationItem | null = null;
  for (const line of sectionContent.education) {
    const isBullet = /^[•\-\*]\s+/.test(line);
    const cleanText = line.replace(/^[•\-\*]\s+/, "").trim();
    if (!isBullet) {
      const parts = cleanText.split(/\s+[|–—\-•]\s+|\s{2,}/);
      if (currentEdu) {
        result.education.push(currentEdu);
      }
      currentEdu = {
        degree: parts[0] || cleanText,
        school: parts[1] || "",
        dates: parts.find((p) => /\d{4}/.test(p)),
      };
    } else if (currentEdu) {
      currentEdu.details = (currentEdu.details ? currentEdu.details + "; " : "") + cleanText;
    }
  }
  if (currentEdu) {
    result.education.push(currentEdu);
  }

  // Process Projects
  let currentProj: ProjectItem | null = null;
  for (const line of sectionContent.projects) {
    const isBullet = /^[•\-\*]\s+/.test(line);
    const cleanText = line.replace(/^[•\-\*]\s+/, "").trim();
    if (!cleanText) continue;

    const colonIdx = cleanText.indexOf(":");
    const hasProjectColon = isBullet && colonIdx > 0 && colonIdx < 45;

    if ((!isBullet && cleanText.length < 100) || hasProjectColon) {
      if (currentProj) result.projects.push(currentProj);
      if (hasProjectColon) {
        const namePart = cleanText.substring(0, colonIdx).replace(/^\*\*|\*\*$/g, "").trim();
        const descPart = cleanText.substring(colonIdx + 1).trim();
        currentProj = { name: namePart, details: descPart ? [descPart] : [] };
      } else {
        currentProj = { name: cleanText.replace(/^\*\*|\*\*$/g, ""), details: [] };
      }
    } else if (currentProj) {
      currentProj.details.push(cleanText);
    } else {
      currentProj = { name: cleanText.replace(/^\*\*|\*\*$/g, ""), details: [] };
    }
  }
  if (currentProj) result.projects.push(currentProj);

  // Process Certifications
  result.certifications = sectionContent.certifications
    .map((l) => l.replace(/^[•\-*#\s]+|[•\-*#\s]+$/g, "").trim())
    .filter((l) => l.length > 2);

  // Fallback: if LLM returned plain text with no section headers, dump it into experience so template never looks empty
  const hasContent = result.summary || result.experience.length || result.skills.length || result.education.length || result.projects.length;
  if (!hasContent) {
    const otherLines = sectionContent.other.filter((l) => l.trim().length > 0);
    if (otherLines.length) {
      result.summary = otherLines.slice(0, 3).join(" ").slice(0, 600);
      for (let i = 3; i < otherLines.length; i++) {
        const line = otherLines[i];
        const isBullet = /^[•\-\*]\s+/.test(line);
        if (!isBullet && result.experience.length < 10) {
          result.experience.push({ title: line.replace(/^[•\-\*]\s+/, "").trim(), company: "", bullets: [] });
        } else if (result.experience.length) {
          result.experience[result.experience.length - 1].bullets.push(line.replace(/^[•\-\*]\s+/, "").trim());
        }
      }
      if (!result.experience.length) {
        result.experience.push({ title: "Professional Experience", company: "", bullets: otherLines.slice(0, 12) });
      }
    }
  }

  return result;
}
