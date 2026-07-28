import { Document, Paragraph, TextRun } from "docx";
import type { Locale, ResumeData } from "@/lib/schema/resume";
import { DOCX_PAGE_SIZES } from "@/lib/export/docx/page-size";
import type { DocxTheme } from "@/lib/export/docx/blocks";
import {
  docxAchievementsSection,
  docxCertificationsSection,
  docxEducationSection,
  docxExperienceSection,
  docxLanguagesSection,
  docxProjectsSection,
  docxPublicationsSection,
  docxSkillsSection,
  docxSummarySection,
} from "@/lib/export/docx/sections";
import { getLocaleProfile } from "@/lib/locale";

const theme: DocxTheme = { font: "Source Sans 3", accentColorHex: "111827", mutedColorHex: "595959" };

// Adds Publications, promotes Education — see index.tsx. Word paginates a
// long CV automatically; no special handling needed.
export function buildAcademicCvDocx(data: ResumeData, locale: Locale): Document {
  const pageSize = DOCX_PAGE_SIZES[getLocaleProfile(locale).pageSize];
  const { personal } = data;

  const contactLine = [personal.location, personal.email, personal.phone].filter(Boolean).join("   •   ");
  const linkLine = personal.links.map((l) => l.url).join("   •   ");

  return new Document({
    sections: [
      {
        properties: {
          page: { size: pageSize, margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: personal.fullName ?? "Your Name", bold: true, font: theme.font, size: 32 })],
          }),
          ...(personal.headline
            ? [
                new Paragraph({
                  children: [new TextRun({ text: personal.headline, font: theme.font, size: 22, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...(contactLine
            ? [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: contactLine, font: theme.font, size: 18, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...(linkLine
            ? [
                new Paragraph({
                  spacing: { after: 120 },
                  children: [new TextRun({ text: linkLine, font: theme.font, size: 18, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...docxSummarySection(theme, data),
          ...docxEducationSection(theme, data),
          ...docxPublicationsSection(theme, data),
          ...docxExperienceSection(theme, data),
          ...docxProjectsSection(theme, data),
          ...docxSkillsSection(theme, data),
          ...docxCertificationsSection(theme, data),
          ...docxAchievementsSection(theme, data),
          ...docxLanguagesSection(theme, data),
        ],
      },
    ],
  });
}
