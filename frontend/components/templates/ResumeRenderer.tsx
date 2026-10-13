"use client";

import React, { useMemo } from "react";
import { parseResumeText, ParsedResume } from "../../lib/resume-parser";
import { ModernExecutiveTemplate } from "./ModernExecutive";
import { MinimalTechTemplate } from "./MinimalTech";
import { ClassicEditorialTemplate } from "./ClassicEditorial";
import { CreativeAccentTemplate } from "./CreativeAccent";

export type TemplateId = "modern" | "minimal" | "editorial" | "creative";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  tagline: string;
  badge: string;
  icon: string;
  accentColor: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "modern",
    name: "Modern Executive",
    tagline: "Bold headers, two-tone structure & contemporary clean layout",
    badge: "Most Popular",
    icon: "fa-solid fa-briefcase",
    accentColor: "#5e7f09",
  },
  {
    id: "minimal",
    name: "Silicon Valley Tech",
    tagline: "High-density, ATS-optimized layout with subtle timeline markers",
    badge: "ATS Favorite",
    icon: "fa-solid fa-code",
    accentColor: "#1e281d",
  },
  {
    id: "editorial",
    name: "Classic Editorial",
    tagline: "Timeless serif typography, balanced margins & classic elegance",
    badge: "Corporate & Law",
    icon: "fa-solid fa-feather-pointed",
    accentColor: "#1e281d",
  },
  {
    id: "creative",
    name: "Emerald Modern",
    tagline: "Vibrant olive/lime accents, pill skill tags & fresh startup vibe",
    badge: "Creative & Startup",
    icon: "fa-solid fa-sparkles",
    accentColor: "#71940c",
  },
];

interface ResumeRendererProps {
  rawText: string;
  templateId: TemplateId;
  viewMode: "template" | "raw";
}

export function ResumeRenderer({ rawText, templateId, viewMode }: ResumeRendererProps) {
  const parsed = useMemo(() => parseResumeText(rawText), [rawText]);

  if (viewMode === "raw") {
    return (
      <div className="resume-raw-sheet" id="resume-export-sheet">
        <pre className="resume-raw-pre">{rawText}</pre>
      </div>
    );
  }

  switch (templateId) {
    case "minimal":
      return <MinimalTechTemplate data={parsed} />;
    case "editorial":
      return <ClassicEditorialTemplate data={parsed} />;
    case "creative":
      return <CreativeAccentTemplate data={parsed} />;
    case "modern":
    default:
      return <ModernExecutiveTemplate data={parsed} />;
  }
}
