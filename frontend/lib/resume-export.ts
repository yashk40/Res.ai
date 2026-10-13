import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { ParsedResume } from "./resume-parser";

/**
 * Downloads a Blob as a file with the given filename
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Export plain text format
 */
export function exportToTxt(rawText: string, filename = "tailored-resume.txt") {
  const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, filename.endsWith(".txt") ? filename : `${filename}.txt`);
}

/**
 * Export to PDF using html2canvas & jsPDF
 */
export async function exportToPdf(elementId: string, filename = "tailored-resume.pdf") {
  const target = document.getElementById(elementId);
  if (!target) {
    throw new Error("Resume container not found for PDF export.");
  }

  // Dynamic import so it only loads in browser
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Temporarily ensure high quality render
  const originalWidth = target.style.width;
  const canvas = await html2canvas(target, {
    scale: 2, // 2x DPI for ultra-crisp fonts
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: 1200,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  // Add pages if content exceeds 1 page
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * Print resume using browser's native vector print (saves as 100% vector PDF)
 */
export function printResume() {
  window.print();
}

/**
 * Generate and download a styled Microsoft Word (.docx) document
 */
export async function exportToDocx(
  parsed: ParsedResume,
  template = "modern",
  filename = "tailored-resume.docx"
) {
  const isCreative = template === "creative";
  const isEditorial = template === "editorial";
  const primaryColor = isCreative ? "059669" : isEditorial ? "1e293b" : "2563eb"; // emerald, slate, royal blue
  const fontFace = isEditorial ? "Georgia" : "Calibri";

  const children: Paragraph[] = [];

  // Header - Name
  children.push(
    new Paragraph({
      alignment: isEditorial ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: parsed.name || "Tailored Resume",
          bold: true,
          size: 44, // 22pt
          color: isCreative ? "059669" : "111827",
          font: fontFace,
        }),
      ],
    })
  );

  // Subtitle / Title
  if (parsed.title) {
    children.push(
      new Paragraph({
        alignment: isEditorial ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: parsed.title,
            italics: true,
            size: 26, // 13pt
            color: "4b5563",
            font: fontFace,
          }),
        ],
      })
    );
  }

  // Contact line
  const contactParts: string[] = [];
  if (parsed.contact.email) contactParts.push(parsed.contact.email);
  if (parsed.contact.phone) contactParts.push(parsed.contact.phone);
  if (parsed.contact.location) contactParts.push(parsed.contact.location);
  if (parsed.contact.linkedin) contactParts.push(parsed.contact.linkedin);
  if (parsed.contact.github) contactParts.push(parsed.contact.github);
  contactParts.push(...parsed.contact.others);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: isEditorial ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 280 },
        children: [
          new TextRun({
            text: contactParts.join("   •   "),
            size: 19, // 9.5pt
            color: "6b7280",
            font: fontFace,
          }),
        ],
      })
    );
  }

  // Helper for section headings
  function addSectionHeading(title: string) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: primaryColor,
            space: 4,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            color: primaryColor,
            font: fontFace,
          }),
        ],
      })
    );
  }

  // Summary
  if (parsed.summary) {
    addSectionHeading("Professional Summary");
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: parsed.summary,
            size: 21, // 10.5pt
            color: "374151",
            font: fontFace,
          }),
        ],
      })
    );
  }

  // Experience
  if (parsed.experience.length > 0) {
    addSectionHeading("Experience");
    for (const exp of parsed.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 22,
              color: "111827",
              font: fontFace,
            }),
            new TextRun({
              text: exp.company ? `  —  ${exp.company}` : "",
              bold: true,
              size: 21,
              color: "4b5563",
              font: fontFace,
            }),
            new TextRun({
              text: exp.dates ? `   (${exp.dates})` : "",
              italics: true,
              size: 19,
              color: "6b7280",
              font: fontFace,
            }),
          ],
        })
      );

      for (const bullet of exp.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: bullet,
                size: 20,
                color: "374151",
                font: fontFace,
              }),
            ],
          })
        );
      }
    }
  }

  // Projects
  if (parsed.projects && parsed.projects.length > 0) {
    addSectionHeading("Projects");
    for (const proj of parsed.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: proj.name,
              bold: true,
              size: 21,
              color: "111827",
              font: fontFace,
            }),
          ],
        })
      );
      for (const bullet of proj.details) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: bullet,
                size: 20,
                color: "374151",
                font: fontFace,
              }),
            ],
          })
        );
      }
    }
  }

  // Skills
  if (parsed.skills.length > 0) {
    addSectionHeading("Core Competencies & Skills");
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: parsed.skills.join("   •   "),
            size: 20,
            color: "374151",
            font: fontFace,
          }),
        ],
      })
    );
  }

  // Education
  if (parsed.education.length > 0) {
    addSectionHeading("Education");
    for (const edu of parsed.education) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: edu.degree,
              bold: true,
              size: 21,
              color: "111827",
              font: fontFace,
            }),
            new TextRun({
              text: edu.school ? `  |  ${edu.school}` : "",
              size: 20,
              color: "4b5563",
              font: fontFace,
            }),
            new TextRun({
              text: edu.dates ? `   (${edu.dates})` : "",
              italics: true,
              size: 19,
              color: "6b7280",
              font: fontFace,
            }),
          ],
        })
      );
      if (edu.details) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: edu.details,
                size: 19,
                color: "4b5563",
                font: fontFace,
              }),
            ],
          })
        );
      }
    }
  }

  // Certifications / Projects
  if (parsed.certifications.length > 0) {
    addSectionHeading("Certifications");
    for (const cert of parsed.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: cert,
              size: 20,
              color: "374151",
              font: fontFace,
            }),
          ],
        })
      );
    }
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: children.length > 0 ? children : [
          new Paragraph({
            children: [new TextRun({ text: parsed.rawText, font: fontFace })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}
