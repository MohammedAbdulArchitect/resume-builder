import { Paragraph } from "docx";
import type { ResumeData } from "@/lib/schema/resume";
import { formatDateRange } from "@/templates/shared/date-range";
import { docxBullets, docxEntryHeader, docxPlainParagraph, docxSectionHeading, type DocxTheme } from "@/lib/export/docx/blocks";

/** DOCX counterpart of pdf/sections.tsx — same "theme + arrangement" idea. */

export function docxSummarySection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (!data.summary) return [];
  return [docxSectionHeading(theme, "Summary"), docxPlainParagraph(theme, data.summary.text)];
}

export function docxExperienceSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.experience.length === 0) return [];
  const paragraphs: Paragraph[] = [docxSectionHeading(theme, "Experience")];
  for (const entry of data.experience) {
    paragraphs.push(
      ...docxEntryHeader(
        theme,
        [entry.title, entry.company].filter(Boolean).join(", ") || "—",
        formatDateRange(entry.start, entry.end, entry.current),
        entry.location,
      ),
      ...docxBullets(theme, entry.bullets),
    );
  }
  return paragraphs;
}

export function docxEducationSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.education.length === 0) return [];
  const paragraphs: Paragraph[] = [docxSectionHeading(theme, "Education")];
  for (const entry of data.education) {
    paragraphs.push(
      ...docxEntryHeader(
        theme,
        [entry.degree, entry.field].filter(Boolean).join(", ") || "—",
        formatDateRange(entry.start, entry.end),
        [entry.institution, entry.grade].filter(Boolean).join(" • "),
      ),
      ...docxBullets(theme, entry.highlights),
    );
  }
  return paragraphs;
}

export function docxProjectsSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.projects.length === 0) return [];
  const paragraphs: Paragraph[] = [docxSectionHeading(theme, "Projects")];
  for (const entry of data.projects) {
    paragraphs.push(
      ...docxEntryHeader(
        theme,
        [entry.name, entry.role].filter(Boolean).join(" — ") || "—",
        undefined,
        entry.stack.length > 0 ? entry.stack.join(", ") : undefined,
      ),
      ...docxBullets(theme, entry.bullets),
    );
  }
  return paragraphs;
}

export function docxSkillsSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.skills.length === 0) return [];
  return [docxSectionHeading(theme, "Skills"), docxPlainParagraph(theme, data.skills.map((s) => s.name).join(", "))];
}

export function docxCertificationsSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.certifications.length === 0) return [];
  return [
    docxSectionHeading(theme, "Certifications"),
    ...docxBullets(
      theme,
      data.certifications.map((c) =>
        [c.name, c.issuer ? `— ${c.issuer}` : "", c.date ? `(${c.date})` : ""].filter(Boolean).join(" "),
      ),
    ),
  ];
}

export function docxAchievementsSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.achievements.length === 0) return [];
  return [docxSectionHeading(theme, "Achievements"), ...docxBullets(theme, data.achievements)];
}

export function docxLanguagesSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.languages.length === 0) return [];
  return [
    docxSectionHeading(theme, "Languages"),
    docxPlainParagraph(theme, data.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ")),
  ];
}

export function docxPublicationsSection(theme: DocxTheme, data: ResumeData): Paragraph[] {
  if (data.publications.length === 0) return [];
  return [
    docxSectionHeading(theme, "Publications"),
    ...docxBullets(
      theme,
      data.publications.map((p) =>
        [p.title, p.publisher ? `— ${p.publisher}` : "", p.date ? `(${p.date})` : ""].filter(Boolean).join(" "),
      ),
    ),
  ];
}
